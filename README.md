# Agriora

Hackathon monorepo: a **Vite + React** web app and an **Expo (React Native)** mobile app, sharing logic in **`@agriora/core`**. The UI defaults to **Burmese**; use the **ချိန်ညှိမှု / Settings** tab to switch to **English** (saved separately in the browser’s `localStorage` and on-device via AsyncStorage).

## Prerequisites

- **Node.js** 20 or newer (LTS recommended)
- **npm** 9 or newer (ships with Node)
- For **iOS Simulator**: Xcode (macOS only)
- For **Android**: Android Studio / emulator or a physical device with USB debugging
- For **Expo Go** on a phone: [Expo Go](https://expo.dev/go) from the App Store or Play Store

## Quick start

Clone the repo, then from the **repository root** (the folder that contains this `README.md`):

```bash
npm install
```

`postinstall` builds the shared package `@agriora/core`. If you change code under `packages/core/src`, rebuild with:

```bash
npm run build:core
```

### Web (React + Vite)

```bash
npm run web
```

Open the URL Vite prints (usually **http://localhost:5173**). Use the **Market** tab to browse prices from `data.xlsx` and run a **demo** forecast (news + optional weather). The **News** tab loads headlines over the network (sources and RSS fallbacks are configured in `@agriora/core`). Use the **Weather** tab for regional forecasts; **Use my location** needs HTTPS (or localhost) and browser permission.

### Mobile (Expo / React Native)

From the repo root:

```bash
npm run mobile
```

Or from `apps/mobile`:

```bash
cd apps/mobile
npx expo start
```

Then:

- Press **`i`** for iOS Simulator, **`a`** for Android emulator, or scan the QR code with **Expo Go** (same LAN as your computer).

The **Market** tab uses a generated snapshot from `data.xlsx` (see below). The **Weather** tab loads current conditions for **Yangon**, **Mandalay**, and other states/regions (see `packages/core/src/myanmarRegions.ts`). **Use my location** uses **GPS** (`expo-location`) after you allow location on the device. Weather data is from **[Open-Meteo](https://open-meteo.com/)** (free, no API key; requires internet).

To clear Metro’s cache after config or dependency changes:

```bash
cd apps/mobile
npx expo start --clear
```

## Project layout

| Path | Description |
|------|-------------|
| `apps/web` | Vite + React (`npm run web`) |
| `apps/mobile` | Expo SDK **54** (`npm run mobile`) |
| `packages/core` | Shared TypeScript: `MARKET_ITEMS` / `predictItemPrice`, `loadAggregatedHeadlines` (RSS), news `analyzeWithRules`, `MYANMAR_PLACES`, `fetchCurrentWeather` |
| `data.xlsx` | Source spreadsheet for Myanmar market lows/highs by date; regenerate TS after edits |
| `scripts/xlsx_to_market.py` | Exports `packages/core/src/marketData.generated.ts` + `backend/data/rice_data.csv` for XGBoost (Python + `openpyxl`) |
| `App.tsx` (repo root) | Re-exports the mobile app entry so Expo’s `AppEntry` resolves correctly when `expo` is hoisted in the workspace |

## Monorepo notes

- Install and run **npm scripts from the repo root** unless a command says otherwise.
- Root **`package.json`** uses **npm overrides** so `expo` stays on **SDK 54** across the workspace.
- **`apps/mobile/metro.config.js`** points Metro at the nested `@expo/cli` install (common npm workspaces issue). If you see Metro SHA-1 / missing `@expo/cli` errors, use `npx expo start --clear` from `apps/mobile`.

## Updating market data (`data.xlsx`)

After you change the root **`data.xlsx`**, regenerate the bundled snapshot and rebuild core.

**macOS / Linux:**

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements-market.txt
.venv/bin/python scripts/xlsx_to_market.py
npm run build:core
```

From the repo root you can instead run **`npm run market:sync`** (same as the two commands above).

The script also writes **`backend/data/rice_data.csv`**: daily mid-prices for **March 1–24** in the sheet’s month (flat carry before the first / after the last survey column), built from the best **စပါး/ဆန်** row with prices, or—if those cells are empty—the **most complete priced row** (often ဂျုံ), or a synthetic demo series. Retrain the API model with:

```bash
npm run market:train
```

(use a real venv with `backend` deps if `python3` lacks `xgboost`). For quick training without downloading transformers, the script sets **`RICE_SENTIMENT_MOCK=1`**.

**Windows (PowerShell or Command Prompt):**

```powershell
py -3 -m venv .venv
.venv\Scripts\pip install -r requirements-market.txt
.venv\Scripts\python scripts\xlsx_to_market.py
npm run build:core
```

If `py` is not available, use `python` or `python3` instead of `py -3`, depending on how Python is installed.

The script writes **`packages/core/src/marketData.generated.ts`** (committed so `npm install` works without Python). Forecasts in the app are **illustrative** (trend + keyword news + simple weather modifiers), not trading or policy advice.

## Useful scripts

| Command | Action |
|---------|--------|
| `npm install` | Install all workspaces + build `@agriora/core` |
| `npm run web` | Start Vite dev server |
| `npm run mobile` | Start Expo dev server |
| `npm run build:web` | Production build of the web app |
| `npm run build:core` | Rebuild `packages/core` only |
| `npm run market:sync` | Regenerate `marketData.generated.ts` + `rice_data.csv` from `data.xlsx`, then build core |
| `npm run market:train` | Train `backend/models/rice_xgb.json` from `backend/data/rice_data.csv` (mock sentiment) |

## Troubleshooting

- **`EADDRINUSE` / port in use**: Stop the other dev server or change the port (Vite: `apps/web/vite.config.ts`; Expo: use CLI flags).
- **Web import errors from `@agriora/core`**: Run `npm run build:core` and ensure `packages/core/dist` exists.
- **Expo “Unable to resolve App”**: Run Expo from `apps/mobile` or use `npm run mobile`; keep the root `App.tsx` file as in this repo.
- **Clean reinstall**: From the repo root, delete `node_modules`, `apps/*/node_modules`, and `package-lock.json`, then run `npm install` again.

## License

Use and modify for your hackathon team as needed.
