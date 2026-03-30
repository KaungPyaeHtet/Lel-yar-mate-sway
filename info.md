# Agriora — Judge Briefing (What, Why, How)

## 1) Problem We Solve

Smallholder farmers and traders in Myanmar often do not have one simple place to:

- check market prices,
- read relevant policy/news signals,
- account for weather disruptions,
- and turn those signals into an actionable next-day estimate.

Most tools are either data-heavy, fragmented, or not friendly for quick daily decisions.

## 2) Our Purpose

**Agriora helps farmers make better short-term selling/holding decisions** by combining:

- historical market price movement,
- curated agriculture and Myanmar-related news,
- weather context,
- and an ML-driven next-day direction + estimated price range.

This is a decision-support app (not financial advice).

## 3) What We Built

Agriora is a monorepo app with:

- **Web app** (React + Vite)
- **Mobile app** (Expo + React Native)
- **Shared core package** (`@agriora/core`) for data logic, i18n, market helpers, and ML API client
- **Python ML backend** (FastAPI + XGBoost)

The same logic powers both web and mobile to keep behavior consistent.

## 4) Key User Features

### Market
- Search and browse commodity items
- View recent price trend chart
- See **tomorrow estimated midpoint price**
- See **rough low-high range** for tomorrow
- Receive simple advice: **Hold / Sell / Wait** with explanation

### News
- Aggregates multiple relevant feeds (Myanmar + international context)
- Includes DOA-related coverage via Google News RSS query on `doa.gov.mm`
- Used both for UI and for ML/news context scoring

### Weather
- Uses Open-Meteo current + historical weather signals
- Supports location-aware fallback behavior

### Language
- Burmese-first UX with English support

## 5) Data Pipeline

### Market source
- Primary source: `data.xlsx`
- Converted into app-ready TypeScript data: `packages/core/src/marketData.generated.ts`

### Food data for demo coverage
- CSV source: `backend/data/food_cleaned.csv` / `food_prices_cleaned.csv`
- We expanded category ingestion to include:
  - vegetables and fruits
  - meat, fish and eggs
  - cereals and tubers
  - oil and fats
  - pulses and nuts
  - miscellaneous food

Result after sync: **22 food-series items** are now included (more than your requested 10).

## 6) ML Approach (Practical and Demo-Fast)

### Prediction target
- Next-day **percentage price change**

### Inputs/features
- Price lags and trend-related features
- News sentiment + lexical topic signals
- Weather rolling aggregates

### Model design
- Channel models: **price / news / weather** XGBoost heads
- Blended output for final next-day estimate
- Per-item model support for better commodity-specific behavior

### Per-item speed strategy
- We train separate lightweight models per `market_item_id`
- Stored under: `backend/models/by_item/<id>/`
- Backend caches loaded models in memory, so repeated demo queries are fast

### Reliability guard
- If an item model’s validation MAE is above threshold, backend auto-falls back to global model
- This prevents weak per-item models from hurting live demo quality

## 7) Accuracy Snapshot (Current Run)

From latest run on this repo:

- Walk-forward backtest (next-day %):
  - **MAE: 0.0106%**
  - **Direction accuracy: 100%** on evaluated walk-forward rows

- Per-item training summary (channel blend MAE):
  - count: 100 items evaluated in that run
  - mean: 0.4314
  - median: 0.1847
  - p90: 1.1180

Note: live market behavior can shift; we show these as current validation signals, not guarantees.

## 8) Tech Stack (Concise)

### Frontend
- TypeScript, React 19, Vite
- Expo / React Native
- Shared package `@agriora/core`

### Backend
- Python, FastAPI, Uvicorn
- Pandas, NumPy, XGBoost, scikit-learn
- Optional transformer sentiment path (with mock mode for speed)

### External data/services
- Open-Meteo (weather)
- RSS feeds + RSS2JSON fallback

## 9) Why Judges Should Care

- **Local relevance:** Myanmar-focused data + Burmese UX
- **Actionability:** Converts noisy signals into simple next-day guidance
- **Scalability path:** Per-item model architecture is ready for more commodities and better data
- **Practical deployment mindset:** fallback rules, quality gates, and cached inference

## 10) Clear Limitations (Honest)

- Forecast is short-horizon and illustrative, not a trading recommendation
- Accuracy depends on input data quality and recency
- Some commodities have sparse history; fallback behavior is intentionally conservative

## 11) Demo Script (2-3 minutes)

1. Open Market and choose a commodity with clear trend
2. Show chart + tomorrow midpoint + range
3. Open advice details (why hold/sell/wait)
4. Switch item to show model changes by commodity
5. Open News tab and show Myanmar/International filters
6. Mention weather and location integration
7. Close with purpose: helping farmers make better daily decisions quickly

## 12) Run Commands (for live demo prep)

```bash
npm run market:sync
npm run ml:train:items
npm run ml:api
npm run web
```

## 13) Final Statement

Agriora is a farmer-facing intelligence layer: we unify price history, weather, and policy/news context into an understandable next-day signal, delivered in a Burmese-first product that is fast enough for live use and practical enough to iterate after the hackathon.
