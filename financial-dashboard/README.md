# Financial Dashboard

A single-page application (SPA) built with **React + TypeScript + Vite** that displays live and historical financial data.

## Features

| Panel | Description | Data source |
|---|---|---|
| **10-Year Government Bond Yields** | US Treasury, German Bund, French OAT, Euro-area composite | Historical mock data (Jan 2024 – Apr 2026) |
| **Bitcoin (BTC)** | Price history in EUR / USD / CHF with 24 h change | CoinGecko API (live) |
| **Inflation — Historical & Forecasts** | EU HICP and US CPI actual values + ECB / Fed projections to Dec 2027 | Eurostat, BLS, ECB, Fed SEP |
| **Forex — Exchange Rate** | Configurable pair (EUR/CHF, USD/CHF, EUR/USD …) with historical area chart | Frankfurter API / ECB reference rates (live) |

### Global currency selector

Use the **€ EUR / $ USD / CHF** buttons in the header to switch the display currency.  
Bitcoin prices are fetched in the selected currency directly from CoinGecko.

## Getting started

```bash
cd financial-dashboard
npm install
npm run dev          # development server on http://localhost:5173
npm run build        # production build → dist/
npm run preview      # preview production build locally
```

## Architecture

```
src/
├── types/          # Shared TypeScript types and constants
├── data/           # Static mock data (bonds, inflation)
├── services/       # API clients (CoinGecko, Frankfurter)
└── components/
    ├── Header.tsx
    ├── CurrencySelector.tsx
    ├── BondYieldsChart.tsx
    ├── BitcoinChart.tsx
    ├── InflationChart.tsx
    └── ForexChart.tsx
```

## External APIs (free, no authentication needed)

| API | Endpoint | Purpose |
|---|---|---|
| **CoinGecko** | `https://api.coingecko.com/api/v3` | Bitcoin price history & current price |
| **Frankfurter** | `https://api.frankfurter.app` | ECB reference exchange rates |

Both APIs are proxied through Vite's dev server (configured in `vite.config.ts`) to avoid CORS issues during development.

## Notes

- Bond yield data is **realistic historical mock data** based on publicly available yield curves.  
  Free real-time bond APIs typically require API keys; swap `src/data/bondData.ts` with a live service when a key is available.
- Inflation data combines **official historical readings** (Eurostat, BLS) with the latest ECB/Fed projections.
