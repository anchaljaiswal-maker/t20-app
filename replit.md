# IPL 2026 Fantasy Dashboard

A simple web dashboard that ranks fantasy teams based on player points scraped from a public cricket data source.

## Stack
- **Backend**: Node.js + Express (`server.js`)
- **Frontend**: Static `index.html` (vanilla HTML/CSS/JS) served by Express
- **Scraper**: `scraper.py` (Python, uses `requests`) — fetches player points from the public S3 JSON endpoint and writes `player-points.json`

## Run / Dev
- Workflow `Start application` runs `node server.js` on port 5000 (host `0.0.0.0`).
- Server runs the scraper on startup and then every 6 hours.
- Players JSON is cached on disk (`player-points.json`) and in memory.

## API
- `GET /api/players` — cached player points
- `GET /api/health` — health check
- `GET /api/refresh?key=<password>` — manually trigger a refresh (rate-limited to once every 5 minutes). Password defaults to `t20refresh` and can be overridden with the `REFRESH_PASSWORD` env var.

## Deployment
- Configured for **autoscale** with run command `node server.js`.

## Replit-specific changes
- Server now binds to `0.0.0.0:5000` (was `localhost:3000`) so the Replit preview proxy can reach it.
- Added cache-busting headers in dev so the iframe preview always sees fresh content.
- `requirements.txt` simplified to just `requests` (the previous `selenium`/`webdriver-manager` deps were unused — `scraper.py` uses `requests`).
