"""
FastAPI server for the rice ML backend.

Run from repo root (with venv activated):
  uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload

Env:
  RICE_MODEL_PATH   — path to XGBoost JSON from train_from_csv (default: backend/models/rice_xgb.json)
  CORS_ORIGINS      — comma-separated origins; default * (dev only)
"""

from __future__ import annotations

import backend.native_env  # noqa: F401 — OpenMP/thread env before native libs

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import xgboost as xgb

_ROOT = Path(__file__).resolve().parents[1]
_DEFAULT_MODEL = _ROOT / "backend" / "models" / "rice_xgb.json"

_model: xgb.XGBRegressor | None = None


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


@asynccontextmanager
async def _lifespan(app: FastAPI):
    try:
        _load_model()
    except (FileNotFoundError, OSError, ValueError):
        pass  # /predict will 503 until trained
    yield


app = FastAPI(title="Agriora Rice ML", version="0.1.0", lifespan=_lifespan)

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
    ok = _model is not None or Path(
        os.environ.get("RICE_MODEL_PATH", str(_DEFAULT_MODEL))
    ).is_file()
    return {"ok": True, "model_loaded": _model is not None, "model_path_ok": ok}


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


def _confidence_hint(y_pct: float, sentiment: float) -> float:
    """Rough 0–1 “strength” from move size + news feature magnitude."""
    ay = min(abs(y_pct) / 0.40, 1.0)
    asent = min(abs(sentiment) / 0.35, 1.0)
    v = 0.25 + 0.45 * ay + 0.30 * asent
    return float(min(0.95, max(0.30, v)))


@app.post("/api/sentiment", response_model=SentimentResponse)
async def api_sentiment(body: SentimentRequest) -> SentimentResponse:
    # async handler: run on the event-loop thread. Sync def would use Starlette's
    # thread pool → PyTorch + duplicate libomp → SIGSEGV on macOS (see crash report).
    from backend.sentiment import get_rice_market_sentiment

    score = float(get_rice_market_sentiment(body.headlines))
    return SentimentResponse(score=score)


@app.post("/api/predict/next-day-pct", response_model=PredictResponse)
async def api_predict(body: PredictRequest) -> PredictResponse:
    try:
        reg = _load_model()
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
    y = float(reg.predict(X)[0])
    sent = float(meta["sentiment_score"])
    return PredictResponse(
        next_day_pct_change=y,
        sentiment_score=sent,
        price_change_1d_pct=float(meta["price_change_1d_pct"]),
        price_change_7d_pct=float(meta["price_change_7d_pct"]),
        temp_c=float(meta["temp_c"]),
        rainfall_mm=float(meta["rainfall_mm"]),
        confidence_hint=_confidence_hint(y, sent),
    )
