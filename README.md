# 🎬 Movie Ultra

> Your personal movie, series & anime tracker — built with vanilla JS + TMDB API

🔗 **Live App**: https://movieultra-webapp.vercel.app

## Features
- Search & add movies, series, anime to your library
- Worldwide trending content
- Watchlist to save for later
- Analytics with library breakdown
- Import / Export Excel
- Dark mode (persisted)
- Fully offline — data saved in browser

## Tech Stack
HTML · CSS · Vanilla JavaScript · TMDB API · Jikan API · Vercel Serverless

## Setup (Local)
1. Clone the repo
2. Copy `src/config.example.js` → `src/config.js`
3. Add your TMDB key inside `src/config.js`
4. Run: `npm start` → open `http://localhost:8000`

## Project Structure
```text
movieultra-webapp/
├── api/tmdb.js         ← Vercel serverless (hides TMDB key)
├── src/
│   ├── script.js       ← All app logic
│   ├── styles.css      ← All styles
│   └── logo.svg
└── index.html
```

## Version
v1.0.0 — Stable release

## Author
Manoj Kumar