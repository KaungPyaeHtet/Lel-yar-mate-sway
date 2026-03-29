# Agriora — tech stack & tooling

High-level reference for what this repo uses. Version pins may drift; check `package.json` / `requirements.txt` for exact ranges.

## Architecture

- **Monorepo** (npm workspaces): shared TypeScript library plus a web app and a mobile app.
- **Clients** call **optional** HTTP APIs: Python **FastAPI** ML server, **Open-Meteo** weather, RSS / RSS2JSON for news.

## JavaScript / TypeScript

| Area | Technology |
|------|------------|
| Language | **TypeScript** (~5.9) |
| Package manager | **npm** (workspaces) |
| Shared library | **`@agriora/core`** — `packages/core` (compiled to `dist/` via `tsc`) |
| UI framework | **React 19** |

### Web app (`apps/web`)

| Technology | Role |
|------------|------|
| **Vite** | Dev server & production build |
| **@vitejs/plugin-react** | React support |
| **ESLint** + **typescript-eslint** | Linting |

Dev-only: custom **Vite middleware** proxies allowed RSS hosts (CORS) via `/api/rss-fetch`.

### Mobile app (`apps/mobile`)

| Technology | Role |
|------------|------|
| **Expo** (~54) | Toolchain & dev client |
| **React Native** (0.81) | Native UI |
| **react-native-web** | Optional Expo web target |
| **expo-location** | Device / coarse location for weather |
| **@expo-google-fonts/noto-sans-myanmar** | Myanmar script typography |
| **@expo/vector-icons** (Ionicons) | Icons |
| **react-native-svg** | Charts |
| **@react-native-async-storage/async-storage** | Local persistence (e.g. locale) |

### Core package (`packages/core`) — main responsibilities

- **i18n** — Burmese / English UI strings (`appLocale.ts`).
- **Market data** — Generated `marketData.generated.ts` from Excel; price helpers, heuristics, ML request payloads.
- **Weather** — Open-Meteo URL builder + JSON parsing.
- **News** — RSS source list, fetch (direct + **rss2json.com** fallback), relevance scoring, aggregated context string for ML.
- **ML client** — `fetch` to FastAPI (`/api/predict/next-day-pct`, `/api/sentiment`); env: **`VITE_ML_API_URL`** (web), **`EXPO_PUBLIC_ML_API_URL`** (Expo).
- **Sentiment (client-side rules)** — `sentiment.ts` rule-based text analysis for UI / demo blending.

## Python — ML & data backend

| Package | Role |
|---------|------|
| **Python 3** | Runtime for scripts & API |
| **FastAPI** | HTTP API |
| **Uvicorn** | ASGI server (`npm run ml:api`) |
| **Pydantic** | Request/response models |
| **NumPy**, **Pandas** | Tabular data & features |
| **scikit-learn** | Metrics (e.g. MAE), splits |
| **XGBoost** | Regressor for next-day **%** price change; model file `backend/models/rice_xgb.json` |
| **Lexical news features** (`nf_*` in `backend/news_features.py`) | Counts of oil/energy, transport, policy, ag, weather, and up/down price words in `news_headline` (same text at train & inference) |
| **PyTorch** | Backend for **Transformers** |
| **Hugging Face Transformers** | **ClimateBERT** embeddings / optional sentiment head (`backend/sentiment.py`) |
| **Optional: `timesfm`** | Google TimesFM for extra series features; if missing, **statistical fallback** (`backend/timesfm_features.py`) |

### Python scripts / modules

| Path | Purpose |
|------|---------|
| `backend/server.py` | FastAPI app, CORS, loads XGBoost |
| `backend/pipeline.py` | Supervised frame, feature columns, training/inference helpers |
| `backend/sentiment.py` | Lexical + neural sentiment for `news_headline` feature |
| `backend/train_from_csv.py` | Train XGBoost from `backend/data/rice_data.csv` |
| `backend/backtest_window.py` | Date-window train/test evaluation |
| `scripts/xlsx_to_market.py` | Read root **`data.xlsx`** → `marketData.generated.ts` + optional `rice_data.csv` |
| `backend/native_env.py` | Thread / OpenMP guards (macOS + native libs) |

### Light Excel tooling

- **`openpyxl`** (`requirements-market.txt`) — workbook read in `scripts/xlsx_to_market.py` (separate from full ML venv if desired).

## External services (no API key by default)

| Service | Usage |
|---------|--------|
| **Open-Meteo** (`api.open-meteo.com`) | Current weather from lat/lon |
| **RSS feeds** | BBC Burmese, Irrawaddy, Mizzima, Google News query URLs, etc. (`packages/core/src/newsFeeds.ts`) |
| **rss2json.com** | Fallback when browser CORS blocks direct RSS fetch |
| **Hugging Face Hub** | Model download for ClimateBERT (when not using `RICE_SENTIMENT_MOCK=1`) |

## Data artifacts

| Artifact | Source |
|----------|--------|
| `data.xlsx` | Human-edited market sheet (low/high by date) |
| `packages/core/src/marketData.generated.ts` | Generated TS market rows |
| `backend/data/rice_data.csv` | Daily series for training (from generator + synthetic columns) |
| `backend/models/rice_xgb.json` | Trained XGBoost (JSON) |

## Environment variables (common)

| Variable | Where | Purpose |
|----------|--------|---------|
| `VITE_ML_API_URL` | Web `.env` | Base URL for FastAPI (Vite `define`) |
| `EXPO_PUBLIC_ML_API_URL` | Expo `.env` | Same for mobile |
| `RICE_SENTIMENT_MOCK=1` | Shell | Skip Transformers download; lexical/mock sentiment for train/dev |
| `RICE_MODEL_PATH` | Optional | Override path to `rice_xgb.json` |
| `CORS_ORIGINS` | Optional | FastAPI CORS (default `*` in dev) |

## npm scripts (repo root)

| Script | What it does |
|--------|----------------|
| `npm run web` | Vite dev (web) |
| `npm run mobile` | Expo start |
| `npm run ml:api` | Uvicorn on `:8000` (expects `.venv-ml` on PATH in script) |
| `npm run build:web` | Production web build |
| `npm run build:core` | Compile `@agriora/core` |
| `npm run market:sync` | `xlsx_to_market.py` + build core |
| `npm run market:train` | Train XGBoost from CSV (mock sentiment) |
| `npm run ml:backtest` | Walk-forward backtest on full CSV (more stable metrics) |
| `npm run ml:backtest:window` | Fixed train/test date window (small *n*, noisy) |
| `npm run ml:news-report` | Pearson *r* of sentiment + `nf_*` vs next-day % on `rice_data.csv` |

After changing headlines or feature schema, run `python scripts/xlsx_to_market.py` (or `npm run market:sync`) then **`npm run market:train`** so `rice_xgb.json` matches the API feature vector.

## Disclaimer

Models and forecasts are for **demonstration / education**, not trading or policy advice.
