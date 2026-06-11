# Changelog

All notable changes to this project will be documented in this file.

## [2.0.1] - 2026-06-11
### Bug Fixes
- Fix: Prevent bottom navigation from overlapping the search overlay on mobile by hiding the bottom nav while the overlay is open.
- Misc: Version bump to 2.0.1 and minor metadata updates.


## [2.0.0] - 2026-06-10
### Re-Architected Production Release
- **Separation of Concerns:** Split single HTML bundle `MovieUltra_FINAL(1).html` into an HTML skeleton, 8 CSS stylesheets (main, reset, layout, tokens, animations, view layers, anime components), and 25 JavaScript modules.
- **Vercel Serverless Function Proxies:** Added `api/` directory with Node.js proxies for TMDB and Jikan, masking API keys and utilizing Edge-caching controls.
- **Rate-Limited Queue:** Integrated `JikanQueue` rate-limiter on anime lookups to restrict API calls to MAL guidelines, avoiding 429 server codes.
- **9 UI Themes Support:** Expanded theme selectors in `tokens.css` with 4 new options: Forest, Cyberpunk, Sakura, and Sunset.
- **PWA Service Worker Caching (v2.0.0):** Standardized cache scopes and offline templates inside `sw.js`.
- **Local Fallback Mode:** Enabled client-side fail-safes so modular files can run directly in typical local server environments without Vercel backend proxy services.
- **CI Github Workflows:** Configured Github Actions workflows for automated code style validations and syntax lintings.
