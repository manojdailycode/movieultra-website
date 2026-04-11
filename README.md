# 🎬 Movie Ultra

Personal movie, series & anime tracking app — no login, no cloud, just yours.

🔗 **Live**: https://movieultra-webapp.vercel.app

## Features
- Add movies, series, anime to your library
- Watch Status per item: Planned / Watching / Completed / Dropped
- Detail modal: tap any card to see overview, genres, backdrop
- Personal star rating (1–5) per item
- Status change inside modal
- Live worldwide trending via TMDB
- Watchlist for saving items
- Analytics breakdown
- Excel import & export
- Dark mode

## Stack
HTML · CSS · Vanilla JS · TMDB API · OMDb API · TVMaze API · Jikan API · Vercel

## Run Locally
1. Add these environment variables:
   - `TMDB_KEY`
   - `OMDB_KEY`
   - `TVMAZE_KEY` (optional; TVMaze endpoints here work without key)
   - `JIKAN_KEY` (not required; kept for parity if you want to manage it in one place)
2. `npm start` → open `http://localhost:8000`

## Author
Manoj Kumar · v1.7.0
