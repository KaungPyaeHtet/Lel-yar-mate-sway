"""
FastAPI server for the rice ML backend.

Run from repo root (with venv activated):
  uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload

Env:
  RICE_MODEL_PATH          — XGBoost JSON (default: backend/models/rice_xgb.json)
  RICE_HGB_PATH            — sklearn HGB joblib (default: backend/models/rice_hgb.joblib)
  RICE_TRAINING_REPORT_PATH — metrics JSON from train_from_csv (training_report.json)
  CORS_ORIGINS             — comma-separated origins; default * (dev only)
"""

from __future__ import annotations

import backend.native_env  # noqa: F401 — OpenMP/thread env before native libs

import json
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import joblib
import xgboost as xgb
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

_ROOT = Path(__file__).resolve().parents[1]
_DEFAULT_MODEL = _ROOT / "backend" / "models" / "rice_xgb.json"
_DEFAULT_HGB = _ROOT / "backend" / "models" / "rice_hgb.joblib"
_DEFAULT_REPORT = _ROOT / "backend" / "models" / "training_report.json"

_model: xgb.XGBRegressor | None = None
_hgb_model: Any = None
_hgb_attempted: bool = False
_training_report: dict[str, Any] | None = None
_training_report_attempted: bool = False


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
    except (FileNotFoundError, OSError, ValueError):
        pass
    yield


app = FastAPI(title="Agriora Rice ML", version="0.2.0", lifespan=_lifespan)

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
    return {
        "ok": True,
        "model_loaded": _model is not None,
        "model_path_ok": xgb_ok,
        "ensemble_hgb_loaded": _hgb_model is not None,
        "ensemble_hgb_path_ok": hgb_path.is_file(),
        "training_report_ok": _load_training_report() is not None,
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
    return {
        "service": "agriora-rice-ml",
        "api_version": app.version,
        "training": r,
        "runtime": {
            "xgb_loaded": _model is not None
            or Path(os.environ.get("RICE_MODEL_PATH", str(_DEFAULT_MODEL))).is_file(),
            "hgb_loaded": _hgb_model is not None,
        },
    }


class SentimentRequest(BaseModel):
    headlines: list[str] = Field(default_factory=list)


class SentimentResponse(BaseModel):
    score: float


class PredictRequest(BaseModel):
    avg_prices: list[float] = Field(..., min_length=8)
    rainfall_mm: float = 0.0
    temp_c: float = 28.0
    news_headline: str = ""


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


def _confidence_hint(y_pct: float, sentiment: float) -> float:
    """Rough 0–1 “strength” from move size + news feature magnitude."""
    ay = min(abs(y_pct) / 0.40, 1.0)
    asent = min(abs(sentiment) / 0.35, 1.0)
    v = 0.25 + 0.45 * ay + 0.30 * asent
    return float(min(0.95, max(0.30, v)))


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

        X, meta = build_inference_features_and_meta(
            body.avg_prices,
            body.rainfall_mm,
            body.temp_c,
            body.news_headline,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    y, br = _predict_ensemble(X)
    sent = float(meta["sentiment_score"])
    px = br.get("xgb")
    ph = br.get("hgb")
    return PredictResponse(
        next_day_pct_change=y,
        sentiment_score=sent,
        price_change_1d_pct=float(meta["price_change_1d_pct"]),
        price_change_7d_pct=float(meta["price_change_7d_pct"]),
        temp_c=float(meta["temp_c"]),
        rainfall_mm=float(meta["rainfall_mm"]),
        confidence_hint=_confidence_hint(y, sent),
        next_day_pct_xgb=float(px) if px is not None else None,
        next_day_pct_hgb=float(ph) if ph is not None else None,
    )
