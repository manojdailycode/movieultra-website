<<<<<<< HEAD
# 🎬 MovieUltra — Premium Cinematic Tracker (v2.0.0)

🔗 **Live**: https://movieultra-webapp.vercel.app
[![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-green?logo=progressive-web-apps)](manifest.json)
[![Code Style: Clean ESLint](https://img.shields.io/badge/Style-ESLint-4B32C3?logo=eslint)](package.json)

MovieUltra is a premium tracker for movies, tv series, and anime. Re-architected in v2.0.0 to separate HTML markup, CSS stylesheet structures, client API layers, state storage, and dynamic templates into a modular, production-ready structure.

---

## Key Features

- **9 UI Themes:** Cycles theme modes dynamically (Dark, Light, AMOLED, Cinema, Blue, Forest, Cyberpunk, Sakura, Sunset).
- **Multi-API Caching Services:** Interacts with TMDB and MAL (via Jikan API) with built-in client memory caching.
- **Jikan Rate-Limit Queue:** Avoids MAL `429 Too Many Requests` API errors by queuing and spacing out search fetches.
- **Serverless API Proxies:** Includes pre-configured Vercel Serverless proxy handlers to mask keys and enable Edge-caching headers.
- **PWA Capabilities:** Integrates offline asset caching via Service Worker (v2.0.0), standalone presentation setups, and homescreen loading shortcuts.
- **Flexible Data Imports:** Export lists as formatted 9-column CSV or Excel sheets, and import files back into your tracker seamlessly.

---

## Project Structure

- `api/`: Vercel serverless Node.js backend proxy configurations.
- `public/`: SVGs, icons, and logo assets.
- `src/css/`: Separated CSS sheets (theme variables, layouts, view cards).
- `src/js/`: Separated JS components, state store, API wrappers, helper utilities, and home dashboard view renderers.

---

## Local Setup

1. **Clone the project** and navigate to the directory:
   ```bash
   cd movieultra-webapp
   ```

2. **Install dependencies** (required for offline asset serves and ESLint):
   ```bash
   npm install
   ```

3. **Start local serve server:**
   - In dev mode (auto-refresh, port 3000):
     ```bash
     npm run dev
     ```
   - In production serve mode (port 5000):
     ```bash
     npm run start
     ```

4. **API keys config:**
   - Copy `.env.example` to `.env` and configure your credentials.
   - *Note: If no env keys are detected, the app automatically falls back to client-side TMDB/Jikan direct routes.*
=======
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
Manoj Kumar · v1.8.0
>>>>>>> origin/main
