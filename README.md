# MovieUltra — Premium Movie, Series & Anime Discovery

A cinematic, feature-rich discovery and tracking web application for movies, TV series, and anime. Built as a production-quality PWA.

---

## ✨ Features

### Discovery
- **Cinematic Hero** with trending backdrop, trailer & watchlist CTA
- **10+ Home Rows**: Continue Watching, My Watchlist, Recently Watched, Trending, Popular Movies, Top Rated, Now Playing, Upcoming, Popular Series, Airing Today, Popular Anime
- **Trending Grid** with All / Movies / Series / Anime filter
- **Movies, Series & Anime grids** with harmonized, bounded pagination (prev/next controls, page caps, and request-locking)

### Details
- **Full movie/series/anime detail modal** with:
  - Cinematic backdrop + poster hero
  - Cast carousel → Person modal → Filmography
  - Crew (Director, Writer, Producer, Cinematographer…)
  - Trailers & Videos (YouTube)
  - Photo Gallery with fullscreen lightbox
  - Multi-source Ratings (TMDB + IMDb + Rotten Tomatoes + Metacritic)
  - **Your Rating** (1–10 star widget, stored locally)
  - Where to Watch (via TMDB/JustWatch data)
  - Collection / Franchise timeline
  - TV Season selector + Episode list with watched tracking
  - Reviews (live from TMDB API)
  - More Like This + Recommended For You carousels

### Watch Experience
- `/watch` view with configurable `SourceManager`
- Official YouTube trailer player
- **Legitimate source architecture** — only authorized sources (no unauthorized streaming integrations)
- Episode picker for TV series
- Resume from progress (Continue Watching)

### Library & Tracking
- **Watchlist** with type tabs, search, sort (Added / Title / Rating / Year)
- **Watch History** with clear all
- **Continue Watching** progress cards with resume button and progress bar
- **Local User Ratings** (stored in localStorage)
- **Insights** — animated stats: library breakdown, status, genres, ratings distribution, watch time

### Search
- Full-text search across Movies, Series, Anime, People
- **Search tabs**: All / Movies / Series / Anime / People
- **Recent Searches** with clear/remove
- Keyboard shortcut: `Ctrl+K` / `Cmd+K`
- Live suggestions with type badges

### User Experience
- **9 themes**: Dark, Light, AMOLED, Cinema, Blue, Forest, Cyberpunk, Sakura, Sunset
- Dark/Light system preference detection
- **PWA** — installable on desktop & mobile
- Offline capable via Service Worker
- Firebase Auth (sign up / sign in / forgot password / demo account)
- Edit Profile (avatar, banner, bio, username, favorite genre)
- Responsive: 320px → 1440px+
- Accessible: ARIA labels, keyboard navigation, focus trapping, `prefers-reduced-motion`
- SEO: Open Graph meta tags

---

## 🚀 Setup

### 1. Get a TMDB API Key

1. Create a free account at [themoviedb.org](https://www.themoviedb.org)
2. Go to **Settings → API**
3. Generate or copy your **API Key (v3 auth)**

### 2. Environment Variables

Copy `.env.example` to `.env`:

```env
# TMDB API
TMDB_KEY=your_tmdb_api_key_here
JIKAN_KEY=KEY_NOT_REQUIRED

# Firebase Configuration
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id

# Security & Stream Privacy
STREAM_SECRET=generate_a_random_32_character_secret_key_here
SITE_URL=http://localhost:3000
```

For Vercel production deployment, set these in **Vercel Dashboard → Project Settings → Environment Variables**.

### 3. Firebase Authentication

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Email/Password and/or Google authentication
3. Populate the `FIREBASE_*` variables in `.env` (or Vercel environment variables)
4. Without Firebase, the **Load Demo Account** button runs in local-only mock mode.

### 4. Run Locally

```bash
npm install
npm run dev        # Local dev server with API routing & streaming proxy at http://localhost:3000
```

### 5. Deploy to Vercel

```bash
vercel deploy --prod
```

Configure `TMDB_KEY`, `STREAM_SECRET`, `SITE_URL`, and `FIREBASE_*` variables in the Vercel dashboard.

---

## 🔒 Playback Sources & Stream Privacy Architecture

MovieUltra implements a **Server-Side Stream URL Masking Architecture** to prevent streaming providers and raw host URLs from being exposed in client-side code:

1. **Server-Side Host Definitions (`api/stream.js`)**: All streaming host URLs and path templates (`quantum`, `nova`, `astro`, `movio`, `turbo`, `vidnest`, `vidhawk`) live strictly on the server.
2. **HMAC-SHA256 Signed Tokens**: The client requests a short-lived token via `/api/stream?action=token`. The backend verifies origin and returns an HMAC token valid for **5 minutes only**.
3. **Sandboxed Embed Proxy**: The player renders `/api/stream?action=embed&token=...` inside the player frame with `X-Frame-Options: SAMEORIGIN` and `Referrer-Policy: no-referrer`. Raw provider URLs are never visible in DevTools or DOM attributes.
4. **Official Trailers**: Official YouTube trailers are always provided via TMDB video metadata.

To add or update a streaming provider, configure the URL pattern in `api/stream.js` and register its metadata in `src/js/services/sourceManager.js`:

```javascript
// Server: api/stream.js
SOURCES.movie['custom-source'] = (id) => `https://provider.example.com/movie/${id}`;

// Client: src/js/services/sourceManager.js
{ id: 'custom-source', name: 'Custom Source', mediaTypes: ['movie', 'tv'], priority: 1, tag: '⚡ 4K' }
```

---

## 📡 API Attribution

MovieUltra uses:
- **TMDB** (The Movie Database) for movie, series, cast, crew, ratings, images, and watch provider data
- **Jikan** (unofficial MyAnimeList API) for anime data
- **OMDB** for extended IMDb / Rotten Tomatoes ratings
- **TVMaze** for television schedule data

This product uses the TMDB API but is not endorsed or certified by TMDB.

![TMDB Logo](https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg)

---

## 🗂 Architecture

```
movieultra-website-updated/
├── api/
│   ├── lib/
│   │   └── security.js       CORS origin check, rate limiting & path validation
│   ├── firebase-config.js    Origin-verified Firebase config endpoint
│   ├── jikan.js              Jikan/MAL anime proxy with path validation
│   ├── omdb.js               OMDb ratings proxy with rate limiting
│   ├── stream.js             HMAC-SHA256 signed stream token & embed proxy
│   ├── tmdb.js               TMDB proxy with DNS fallback & path whitelisting
│   └── tvmaze.js             TVMaze episode proxy
├── src/
│   ├── css/
│   │   ├── tokens.css        Design tokens & themes
│   │   ├── layout.css        Nav, sidebar, grid
│   │   ├── components.css    Cards, chips, suggestions
│   │   ├── details.css       Modal sections, cast, ratings
│   │   ├── views.css         View-specific styles
│   │   ├── watch.css         Watch view & continue watching
│   │   ├── anime.css         Anime-specific styles
│   │   └── animations.css    Keyframes, transitions
│   ├── js/
│   │   ├── api/
│   │   │   ├── tmdb.js       TMDB API client
│   │   │   ├── jikan.js      Jikan (anime) API client
│   │   │   └── omdb.js       OMDB API client
│   │   ├── components/
│   │   │   ├── modal.js      Details modal (cast, ratings, reviews, seasons…)
│   │   │   ├── card.js       Movie/mini/watchlist cards
│   │   │   ├── trailer.js    Trailer modal
│   │   │   ├── sidebar.js    Sidebar nav
│   │   │   ├── skeleton.js   Loading skeletons
│   │   │   └── toast.js      Toast notifications
│   │   ├── services/
│   │   │   └── sourceManager.js Secure stream token resolution & source metadata
│   │   ├── store/
│   │   │   ├── library.js    Watchlist / collection
│   │   │   ├── history.js    Watch history
│   │   │   ├── progress.js   Continue watching progress
│   │   │   ├── ratings.js    User star ratings
│   │   │   ├── recentSearches.js Recent search history
│   │   │   ├── watchlist.js  Watchlist filters & sort
│   │   │   ├── user.js       User profile & theme
│   │   │   └── events.js     Cross-module event bus
│   │   ├── utils/
│   │   │   ├── debounce.js
│   │   │   ├── escape.js     XSS sanitisation
│   │   │   ├── storage.js    localStorage helpers
│   │   │   ├── request.js    HTTP client with proxy routing
│   │   │   └── date.js
│   │   ├── views/
│   │   │   ├── home.js       Home rows (10+ rails)
│   │   │   ├── watch.js      Secure watch experience & player
│   │   │   ├── trending.js
│   │   │   ├── movies.js
│   │   │   ├── series.js
│   │   │   ├── anime.js
│   │   │   ├── watchlist.js
│   │   │   ├── history.js
│   │   │   ├── analytics.js  Insights dashboard
│   │   │   ├── profile.js
│   │   │   ├── settings.js
│   │   │   └── feedback.js
│   │   ├── firebase/
│   │   │   ├── auth.js
│   │   │   └── config.js
│   │   └── app.js            App bootstrap & routing
│   └── ...
├── dev-server.js             Local server with full Vercel function parity
├── vercel.json               Security headers (CSP, HSTS, SAMEORIGIN) & rewrites
└── sw.js                     Service Worker (offline caching)
```

---

## 📋 Version History

- **v2.1.0** (Latest) — **Security Hardening, Stream Privacy & Feature Expansion**: Server-side stream URL masking (`api/stream.js`) with HMAC-SHA256 signed tokens, origin-restricted CORS, sliding-window rate limiting, CSP/HSTS headers; harmonized pagination & Jikan resilience; Continue Watching progress tracking, Watch view with `SourceManager`, user ratings, live reviews, search tabs & recent searches, 10+ home rows, and enhanced analytics.
- **v2.0.2** — Bug fixes for modal back navigation and TMDB `append_to_response` caching improvements.
- **v2.0.0** — TMDB full details, cast/crew/seasons/trailers, OMDB ratings, 9 themes, PWA.
- **v1.0.0** — Initial release.

---

## License

MIT © MovieUltra
