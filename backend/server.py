"""
FastAPI server for the rice ML backend.

Run from repo root (with venv activated):
  uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload

Env:
  RICE_MODEL_PATH          — XGBoost JSON (default: backend/models/rice_xgb.json)
  RICE_HGB_PATH            — sklearn HGB joblib (default: backend/models/rice_hgb.joblib)
  RICE_TRAINING_REPORT_PATH — metrics JSON from train_from_csv (training_report.json)
  Per-item models          — POST ``market_item_id`` loads backend/models/by_item/<id>/
                             (from ``npm run ml:train:items``); overrides env paths for that request.
  RICE_CHANNEL_BLEND       — optional override "0.6,0.3,0.1" = price,news,weather weights
  CORS_ORIGINS             — comma-separated origins; default * (dev only)
  AGRIORA_RAG              — set 0 to disable RAG augmentation of news text for ML
  AGRIORA_RAG_SEMANTIC     — set 1 to use multilingual embeddings (downloads model; else TF–IDF)
"""

from __future__ import annotations

import backend.native_env  # noqa: F401 — OpenMP/thread env before native libs

import json
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import pandas as pd
import joblib
import xgboost as xgb
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

_ROOT = Path(__file__).resolve().parents[1]
_DEFAULT_MODEL = _ROOT / "backend" / "models" / "rice_xgb.json"
_DEFAULT_HGB = _ROOT / "backend" / "models" / "rice_hgb.joblib"
_DEFAULT_REPORT = _ROOT / "backend" / "models" / "training_report.json"
_ITEM_MODELS_ROOT = _ROOT / "backend" / "models" / "by_item"

_model: xgb.XGBRegressor | None = None
_hgb_model: Any = None
_hgb_attempted: bool = False
_training_report: dict[str, Any] | None = None
_training_report_attempted: bool = False
# Per cache key "" (global models dir) or market_item_id hex → channel XGB regressors
_channel_models_cache: dict[str, dict[str, xgb.XGBRegressor | None]] = {}
_channel_attempted_keys: set[str] = set()


def _load_training_report() -> dict[str, Any] | None:
    global _training_report, _training_report_attempted
    if _training_report_attempted:
        return _training_report
    _training_report_attempted = True
    path = Path(
        os.environ.get("RICE_TRAINING_REPORT_PATH", str(_DEFAULT_REPORT))
    )
    if path.is_file():
        _training_report = json.loads(path.read_text(encoding="utf-8"))
    else:
        _training_report = None
    return _training_report


def _load_model() -> xgb.XGBRegressor:
    global _model
    if _model is not None:
        return _model
    path = Path(os.environ.get("RICE_MODEL_PATH", str(_DEFAULT_MODEL)))
    if not path.is_file():
        raise FileNotFoundError(
            f"Model not found at {path}. Train with: "
            "python backend/train_from_csv.py --csv backend/data/rice_data.csv"
        )
    reg = xgb.XGBRegressor()
    reg.load_model(str(path))
    reg.set_params(n_jobs=1)
    _model = reg
    return reg


def _load_hgb():
    global _hgb_model, _hgb_attempted
    if _hgb_attempted:
        return _hgb_model
    _hgb_attempted = True
    path = Path(os.environ.get("RICE_HGB_PATH", str(_DEFAULT_HGB)))
    if not path.is_file():
        _hgb_model = None
        return None
    _hgb_model = joblib.load(path)
    return _hgb_model


def _channel_paths_for_key(cache_key: str) -> dict[str, Path]:
    if not cache_key:
        return {
            "price": Path(
                os.environ.get(
                    "RICE_XGB_PRICE_PATH",
                    str(_ROOT / "backend" / "models" / "rice_xgb_price.json"),
                )
            ),
            "news": Path(
                os.environ.get(
                    "RICE_XGB_NEWS_PATH",
                    str(_ROOT / "backend" / "models" / "rice_xgb_news.json"),
                )
            ),
            "weather": Path(
                os.environ.get(
                    "RICE_XGB_WEATHER_PATH",
                    str(_ROOT / "backend" / "models" / "rice_xgb_weather.json"),
                )
            ),
        }
    base = _ITEM_MODELS_ROOT / cache_key
    return {
        "price": base / "rice_xgb_price.json",
        "news": base / "rice_xgb_news.json",
        "weather": base / "rice_xgb_weather.json",
    }


def _training_report_for_channel_key(cache_key: str) -> dict[str, Any] | None:
    if cache_key:
        p = _ITEM_MODELS_ROOT / cache_key / "training_report.json"
        if p.is_file():
            return json.loads(p.read_text(encoding="utf-8"))
        return None
    return _load_training_report()


def _load_channel_models_for_key(cache_key: str) -> bool:
    """Load channel XGB heads for global (cache_key '') or per-item bundle."""
    global _channel_models_cache, _channel_attempted_keys
    if cache_key in _channel_attempted_keys:
        m = _channel_models_cache.get(cache_key, {})
        return all(m.get(k) is not None for k in ("price", "news", "weather"))

    _channel_attempted_keys.add(cache_key)
    r = _training_report_for_channel_key(cache_key)
    if cache_key == "" and (not r or not r.get("use_channel_blend")):
        _channel_models_cache[cache_key] = {
            "price": None,
            "news": None,
            "weather": None,
        }
        return False

    paths = _channel_paths_for_key(cache_key)
    reg: dict[str, xgb.XGBRegressor | None] = {}
    ok = True
    for ch in ("price", "news", "weather"):
        path = paths[ch]
        if not path.is_file():
            reg[ch] = None
            ok = False
            continue
        x = xgb.XGBRegressor()
        x.load_model(str(path))
        x.set_params(n_jobs=1)
        reg[ch] = x
    _channel_models_cache[cache_key] = reg
    return ok and all(reg.get(k) is not None for k in ("price", "news", "weather"))


def _load_channel_models() -> bool:
    """Backward-compatible: global channel bundle under backend/models/."""
    return _load_channel_models_for_key("")


def _channel_blend_triple(cache_key: str = "") -> tuple[float, float, float]:
    r = _training_report_for_channel_key(cache_key)
    if r and isinstance(r.get("channel_blend"), dict):
        b = r["channel_blend"]
        wp = float(b.get("price", 0.6))
        wn = float(b.get("news", 0.3))
        ww = float(b.get("weather", 0.1))
        s = wp + wn + ww
        if s > 0:
            return wp / s, wn / s, ww / s
    if cache_key:
        return 0.6, 0.3, 0.1
    raw = os.environ.get("RICE_CHANNEL_BLEND", "").strip()
    if raw:
        parts = [float(x.strip()) for x in raw.split(",")]
        if len(parts) == 3 and sum(parts) > 0:
            s = sum(parts)
            return parts[0] / s, parts[1] / s, parts[2] / s
    return 0.6, 0.3, 0.1


def _resolve_per_item_key(market_item_id: str | None) -> str:
    if not market_item_id:
        return ""
    rid = str(market_item_id).strip()
    if not rid:
        return ""
    d = _ITEM_MODELS_ROOT / rid
    for name in ("rice_xgb_price.json", "rice_xgb_news.json", "rice_xgb_weather.json"):
        if not (d / name).is_file():
            return ""
    # Guard showcase quality: only use per-item bundles that passed a reasonable holdout MAE.
    # Override threshold with RICE_ITEM_MAX_MAE (set <=0 to disable filtering).
    max_mae_raw = os.environ.get("RICE_ITEM_MAX_MAE", "1.0").strip()
    try:
        max_mae = float(max_mae_raw)
    except ValueError:
        max_mae = 1.0
    if max_mae > 0:
        rp = d / "training_report.json"
        if rp.is_file():
            try:
                r = json.loads(rp.read_text(encoding="utf-8"))
                mae = r.get("channel_blend_mae_test")
                if isinstance(mae, (int, float)) and float(mae) > max_mae:
                    return ""
            except Exception:
                return ""
    return rid


def _predict_channel_blend(X: pd.DataFrame, cache_key: str = "") -> tuple[float | None, dict[str, Any]]:
    from backend.pipeline import channel_column_groups

    if not _load_channel_models_for_key(cache_key):
        return None, {}
    price_cols, news_cols, weather_cols = channel_column_groups()
    ch = _channel_models_cache.get(cache_key, {})
    mp, mn, mw = ch.get("price"), ch.get("news"), ch.get("weather")
    if mp is None or mn is None or mw is None:
        return None, {}
    xp = float(mp.predict(X[price_cols])[0])
    xn = float(mn.predict(X[news_cols])[0])
    xw = float(mw.predict(X[weather_cols])[0])
    wp, wn, ww = _channel_blend_triple(cache_key)
    y = wp * xp + wn * xn + ww * xw
    return y, {
        "channel_price": xp,
        "channel_news": xn,
        "channel_weather": xw,
        "channel_weights": {"price": wp, "news": wn, "weather": ww},
    }


def _blend_weights() -> tuple[float, float]:
    r = _load_training_report()
    if r and isinstance(r.get("blend_weights"), dict):
        w = r["blend_weights"]
        wx = float(w.get("xgb", 1.0))
        wh = float(w.get("hgb", 0.0))
        s = wx + wh
        if s > 0:
            return wx / s, wh / s
    return 0.5, 0.5


def _predict_ensemble(X) -> tuple[float, dict[str, Any]]:
    reg = _load_model()
    px = float(reg.predict(X)[0])
    hgb = _load_hgb()
    if hgb is None:
        return px, {"xgb": px, "hgb": None, "weights": {"xgb": 1.0, "hgb": 0.0}}
    ph = float(hgb.predict(X)[0])
    wx, wh = _blend_weights()
    if wh <= 0:
        return px, {"xgb": px, "hgb": ph, "weights": {"xgb": 1.0, "hgb": 0.0}}
    y = wx * px + wh * ph
    return y, {
        "xgb": px,
        "hgb": ph,
        "weights": {"xgb": wx, "hgb": wh},
    }


@asynccontextmanager
async def _lifespan(app: FastAPI):
    try:
        _load_model()
        _load_training_report()
        _load_hgb()
        _load_channel_models()
    except (FileNotFoundError, OSError, ValueError):
        pass
    yield


app = FastAPI(title="Agriora Rice ML", version="0.3.0", lifespan=_lifespan)

_origins_raw = os.environ.get("CORS_ORIGINS", "*").strip()
if _origins_raw == "*":
    _cors = ["*"]
else:
    _cors = [o.strip() for o in _origins_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors,
    allow_credentials=_cors != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    xgb_ok = _model is not None or Path(
        os.environ.get("RICE_MODEL_PATH", str(_DEFAULT_MODEL))
    ).is_file()
    hgb_path = Path(os.environ.get("RICE_HGB_PATH", str(_DEFAULT_HGB)))
    ch = _load_channel_models()
    return {
        "ok": True,
        "model_loaded": _model is not None,
        "model_path_ok": xgb_ok,
        "ensemble_hgb_loaded": _hgb_model is not None,
        "ensemble_hgb_path_ok": hgb_path.is_file(),
        "training_report_ok": _load_training_report() is not None,
        "channel_blend_loaded": ch,
    }


@app.get("/api/model-card")
def model_card() -> dict[str, Any]:
    """
    Hackathon-friendly JSON: training metrics, blend weights, feature list.
    """
    r = _load_training_report()
    if r is None:
        p = Path(os.environ.get("RICE_TRAINING_REPORT_PATH", str(_DEFAULT_REPORT)))
        raise HTTPException(
            status_code=404,
            detail=(
                f"No training_report.json at {p}. "
                "Run: python backend/train_from_csv.py --csv backend/data/rice_data.csv"
            ),
        )
    try:
        from backend.rag_retriever import rag_runtime_status

        rag_info = rag_runtime_status()
    except Exception as e:
        rag_info = {"enabled": False, "error": str(e)}

    return {
        "service": "agriora-rice-ml",
        "api_version": app.version,
        "training": r,
        "runtime": {
            "xgb_loaded": _model is not None
            or Path(os.environ.get("RICE_MODEL_PATH", str(_DEFAULT_MODEL))).is_file(),
            "hgb_loaded": _hgb_model is not None,
            "channel_blend_loaded": _load_channel_models(),
            "rag": rag_info,
        },
    }


class SentimentRequest(BaseModel):
    headlines: list[str] = Field(default_factory=list)


class SentimentResponse(BaseModel):
    score: float


class PredictRequest(BaseModel):
    avg_prices: list[float] = Field(..., min_length=8)
    market_item_id: str | None = Field(
        default=None,
        description=(
            "MARKET_ITEM id (16-char hex). Loads backend/models/by_item/<id>/ when present "
            "(train_per_item.py)."
        ),
    )
    rainfall_mm: float = 0.0
    temp_c: float = 28.0
    news_headline: str = ""
    rainfall_mm_history: list[float] | None = Field(
        default=None,
        description="Optional last ~30 daily rain mm (oldest→newest); overrides scalar when set.",
    )
    temp_c_history: list[float] | None = Field(
        default=None,
        description="Optional last ~30 daily mean temperatures (°C).",
    )
    news_headlines_history: list[str] | None = Field(
        default=None,
        description="Optional up to ~30 headline strings; else news_headline is chunked to 30 slices.",
    )


class PredictResponse(BaseModel):
    next_day_pct_change: float
    sentiment_score: float
    price_change_1d_pct: float
    price_change_7d_pct: float
    temp_c: float
    rainfall_mm: float
    confidence_hint: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Heuristic signal strength only — not a calibrated probability.",
    )
    next_day_pct_xgb: float | None = Field(
        default=None,
        description="XGBoost head before blending (if ensemble trained).",
    )
    next_day_pct_hgb: float | None = Field(
        default=None,
        description="HistGradientBoosting head before blending (if present).",
    )
    next_day_pct_channel_price: float | None = Field(
        default=None,
        description="XGB head trained on price history + series features only.",
    )
    next_day_pct_channel_news: float | None = Field(
        default=None,
        description="XGB head trained on sentiment + lexical nf_* news features only.",
    )
    next_day_pct_channel_weather: float | None = Field(
        default=None,
        description="XGB head trained on 30-day rolling weather aggregates only.",
    )
    channel_blend_weights: dict[str, float] | None = Field(
        default=None,
        description="Weights applied to channel heads (default price 0.6, news 0.3, weather 0.1).",
    )
    rag_sources: list[str] = Field(
        default_factory=list,
        description="Titles of curated RAG chunks prepended to news for this prediction.",
    )


def _confidence_hint(
    y_pct: float,
    sentiment: float,
    price_change_1d_pct: float = 0.0,
    price_change_7d_pct: float = 0.0,
) -> float:
    """Rough 0–1 “strength”: model delta, sentiment, and *observed* chart momentum.

    When day/week moves are large, confidence reads higher (often ~0.75–0.90) because
    the signal is not a flat “coin-flip” regime; still not a calibrated probability.
    """
    ay = min(abs(y_pct) / 0.40, 1.0)
    asent = min(abs(sentiment) / 0.35, 1.0)
    m1 = min(abs(price_change_1d_pct) / 6.0, 1.0)
    m7 = min(abs(price_change_7d_pct) / 10.0, 1.0)
    amom = max(m1, m7)
    v = 0.05 + 0.11 * ay + 0.09 * asent + 0.80 * amom
    return float(min(0.93, max(0.38, v)))


@app.post("/api/sentiment", response_model=SentimentResponse)
async def api_sentiment(body: SentimentRequest) -> SentimentResponse:
    from backend.sentiment import get_rice_market_sentiment

    score = float(get_rice_market_sentiment(body.headlines))
    return SentimentResponse(score=score)


@app.post("/api/predict/next-day-pct", response_model=PredictResponse)
async def api_predict(body: PredictRequest) -> PredictResponse:
    try:
        _load_model()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    try:
        from backend.pipeline import build_inference_features_and_meta
        from backend.rag_retriever import augment_news_for_ml

        rain_in = (
            body.rainfall_mm_history
            if body.rainfall_mm_history and len(body.rainfall_mm_history) > 0
            else body.rainfall_mm
        )
        temp_in = (
            body.temp_c_history
            if body.temp_c_history and len(body.temp_c_history) > 0
            else body.temp_c
        )
        news_in = (
            body.news_headlines_history
            if body.news_headlines_history and len(body.news_headlines_history) > 0
            else body.news_headline
        )
        news_in, rag_titles = augment_news_for_ml(news_in)
        X, meta = build_inference_features_and_meta(
            body.avg_prices,
            rain_in,
            temp_in,
            news_in,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    sent = float(meta["sentiment_score"])
    d1 = float(meta["price_change_1d_pct"])
    d7 = float(meta["price_change_7d_pct"])
    item_key = _resolve_per_item_key(body.market_item_id)
    y_ch, br_ch = _predict_channel_blend(X, item_key)
    if y_ch is None and item_key:
        y_ch, br_ch = _predict_channel_blend(X, "")
    if y_ch is not None:
        cw = br_ch.get("channel_weights")
        return PredictResponse(
            next_day_pct_change=y_ch,
            sentiment_score=sent,
            price_change_1d_pct=d1,
            price_change_7d_pct=d7,
            temp_c=float(meta["temp_c"]),
            rainfall_mm=float(meta["rainfall_mm"]),
            confidence_hint=_confidence_hint(y_ch, sent, d1, d7),
            next_day_pct_xgb=float(br_ch["channel_price"]),
            next_day_pct_hgb=None,
            next_day_pct_channel_price=float(br_ch["channel_price"]),
            next_day_pct_channel_news=float(br_ch["channel_news"]),
            next_day_pct_channel_weather=float(br_ch["channel_weather"]),
            channel_blend_weights=cw if isinstance(cw, dict) else None,
            rag_sources=rag_titles,
        )
    y, br = _predict_ensemble(X)
    px = br.get("xgb")
    ph = br.get("hgb")
    return PredictResponse(
        next_day_pct_change=y,
        sentiment_score=sent,
        price_change_1d_pct=d1,
        price_change_7d_pct=d7,
        temp_c=float(meta["temp_c"]),
        rainfall_mm=float(meta["rainfall_mm"]),
        confidence_hint=_confidence_hint(y, sent, d1, d7),
        next_day_pct_xgb=float(px) if px is not None else None,
        next_day_pct_hgb=float(ph) if ph is not None else None,
        next_day_pct_channel_price=None,
        next_day_pct_channel_news=None,
        next_day_pct_channel_weather=None,
        channel_blend_weights=None,
        rag_sources=rag_titles,
    )
