# Stock Market Dashboard Frontend

This React client is part of the Stock Market Alert System and has been enhanced to better match a frontend dashboard assignment evaluation.

## Assignment-Focused Enhancements

The dashboard (`/dashboard`) now includes:

- Role-based UI simulation
	- Viewer (read-only)
	- Admin (can add/remove watchlist symbols and create alerts)
- Improved filtering
	- Watchlist symbol search
	- Indicator filter: RSI, MACD crossovers, SMA signals
- Insights section
	- Most viewed stocks
	- Highest RSI alert stocks
	- MACD crossovers detected
- Persisted frontend state
	- Role preference
	- Viewed stock counters

## Existing Features Retained

- Market overview cards
- Stock search and watchlist tracking
- Detailed stock view with technical indicators
- Responsive layout and interactive UI

## Run the Client

From the `client/` directory:

```bash
cp .env.example .env
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000), login, and open `/dashboard`.

If your backend runs on a different host, set:

```bash
REACT_APP_API_URL=https://your-api-domain/api
```

## Build

```bash
npm run build
```
