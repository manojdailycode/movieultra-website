// src/config.example.js
// Copy this file to src/config.js and replace the value with your own TMDB key.
const config = {
  TMDB_KEY: "YOUR_TMDB_API_KEY_HERE"
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = config;
}