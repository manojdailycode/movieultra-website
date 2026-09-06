# MovieUltra Changelog

## v2.1.0 — Security Hardening, Stream Privacy & Feature Expansion (Latest)

### Security & Privacy
- **Server-Side Stream URL Masking (`api/stream.js`)**:
  - Moved all streaming provider URLs (`vidlink`, `vidfast`, `hexa`, `vidsrc`, `vidnest`, `vidhawk`) off the frontend into the serverless backend.
  - Client JS no longer contains third-party streaming domains or constructs embed URLs in the DOM.
  - Implemented stateless HMAC-SHA256 signed tokens with 5-minute expiration (`exp: 300s`) to prevent hotlinking and URL harvesting.
  - Sandboxed HTML embed wrapper served with `X-Frame-Options: SAMEORIGIN` and `Referrer-Policy: no-referrer`.
- **API Credential Isolation**:
  - Eradicated hardcoded TMDB API keys from frontend (`src/js/utils/request.js`) and serverless fallback (`api/tmdb.js`).
  - Added comprehensive `.gitignore` preventing `.env`, `.env.local`, and node dependencies from being committed.
  - Sanitized `.env.example` with safe placeholder tokens and added `STREAM_SECRET` and `SITE_URL` configuration.
- **Origin-Locked CORS & Rate Limiting (`api/lib/security.js`)**:
  - Replaced wildcard CORS (`Access-Control-Allow-Origin: *`) across all API routes with verified origin checking.
  - Implemented sliding-window in-memory rate limiting (60 req/min per IP) returning HTTP 429 when limits are exceeded.
  - Added strict path sanitization guarding `api/tmdb.js` and `api/jikan.js` against path traversal (`..`, `//`, `\`, encoded characters) and restricting access to whitelisted API prefixes.
  - Secured `api/firebase-config.js` with strict origin verification, blocking cross-origin credential scraping.
- **Enterprise Security Headers (`vercel.json`)**:
  - Implemented Content Security Policy (CSP) whitelisting TMDB, SheetJS CDN, Google Fonts, MyAnimeList, and Firebase.
  - Enforced HTTP Strict Transport Security (HSTS) with `max-age=63072000; includeSubDomains; preload`.
  - Added `Permissions-Policy` and updated `X-Frame-Options` to `SAMEORIGIN`.

### New Features & Discovery
- **Watch Experience** (`SourceManager`): `/watch` view with configurable legitimate playback source architecture and asynchronous HMAC signed token resolution. Official YouTube trailers always shown.
- **Continue Watching**: Progress tracking with resume cards and animated progress bars on the home page.
- **User Ratings**: 1–10 star widget in every movie/series/anime detail modal, persisted locally.
- **Reviews Section**: Live TMDB review data with expand/collapse, per-reviewer star scores.
- **10+ Home Rows**: Continue Watching, My Watchlist, Recently Watched, Trending Today, Popular Movies, Top Rated, Now Playing, Upcoming, Popular Series, Airing Today, Popular Anime.
- **Enhanced Search**: Search tabs (All / Movies / Series / Anime / People), recent searches with remove/clear, keyboard shortcut `Ctrl+K` / `Cmd+K`.
- **Watchlist Sort & Search**: Sort by Recently Added / Title / Rating / Year; live search filter.
- **Enhanced Analytics**: Genre chart, ratings distribution, in-progress tracker, estimated watch time, most-watched year.
- **People Search**: Search for cast/crew directly from the search overlay.

### Improvements & Bug Fixes
- **Anime Section Pagination Harmonization (`src/js/views/anime.js`)**:
  - Fixed infinite page expansion where clicking next arrows allowed unbounded scrolling into 1,200+ pages.
  - Capped maximum page count at 500 (`Math.min(d.pagination.last_visible_page, 500)`), identical to Movies and Series sections.
  - Properly checked Jikan's `d.pagination.has_next_page` to immediately lock `absoluteMaxPage` and disable the Next arrow when no more pages exist.
  - Added `isLoading` state lock and disabled pager buttons (`animePrev`, `animeNext`) during in-flight network requests, preventing rapid click spamming and request queue congestion.
- **Jikan Resilience & Fallback Metadata (`src/js/api/jikan.js`)**:
  - Added structured pagination metadata (`last_visible_page: 1`, `has_next_page: false`) to fallback responses when Jikan is down or rate-limited.
  - Prevented infinite fallback looping on `page > 1` by returning an empty result set rather than repeating page 1 items endlessly.
  - Wrapped `searchAnime` with try/catch fallback to prevent search UI breakage on Jikan outages.
- **Global Pager Protections (`src/js/views/trending.js`, `src/js/views/movies.js`, `src/js/views/series.js`, `index.html`)**:
  - Capped anime results in Trending view at 500 pages and added `isLoading` guards to Movies, Series, and Trending views.
  - Updated initial HTML `#animePageInfo` placeholder to `Page 1 / 50` for visual consistency.
- **UI & Navigation Enhancements**:
  - Hero now features distinct **Watch** and **Trailer** buttons.
  - Episode rows improved with play button direct wiring to Watch view.
  - Modal Watch button opens Watch view directly.
  - `openPersonModal` is exported and accessible globally.

### Architecture & Infrastructure
- **Source Management (`src/js/services/sourceManager.js`)**: Asynchronously resolves short-lived signed tokens via `/api/stream?action=token`, builds proxy embed URLs, and manages provider fallback & health status.
- **Player Integration (`src/js/views/watch.js`, `src/css/watch.css`)**: Player loader with token resolution, loading spinner, and fallback controls.
- **Local Dev Server (`dev-server.js`)**: Added `mockRes.send()` for stream HTML rendering and blocked external HTTP access to internal helper libraries (`api/lib/*`).
- **Local Data Stores**: Robust stores for watch progress (`progress.js`), user star ratings (`ratings.js`), and search history (`recentSearches.js`).

---

## v2.0.2

- Bug fixes for modal back navigation
- TMDB append_to_response caching improvements

## v2.0.0

- Full TMDB integration with cast, crew, seasons, trailers
- OMDB ratings (IMDb, Rotten Tomatoes, Metacritic)
- 9 visual themes
- PWA / Service Worker
- Firebase auth
- Edit Profile (avatar, banner, bio)
- Photo lightbox, trailer modal
- Where to Watch (TMDB/JustWatch)
- Collection/Franchise support
- Similar & Recommended carousels

## v1.0.0

- Initial release
