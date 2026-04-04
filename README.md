

A modern, professional web application for tracking and managing your personal movie, series, and anime library.

## Features

- **Personal Library**: Add and manage movies, TV series, and anime
- **Trending Content**: View worldwide trending movies and shows
- **Analytics**: Get insights into your library with visual statistics
- **Dark Mode**: Toggle between light and dark themes
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Offline Storage**: Your library is saved locally in your browser

## Technologies Used

- HTML5
- CSS3 (with CSS Variables for theming)
- Vanilla JavaScript (ES6+)
- TMDB API for movies and TV shows
- Jikan API for anime data

## Getting Started

### Prerequisites

- A modern web browser
- Internet connection for API calls

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/movieultra-webapp.git
   cd movieultra-webapp
   ```

2. Open `index.html` in your web browser, or run a local server:

   ```bash
   npm install
   npm start
   ```

   Then open `http://localhost:8000` in your browser.

## Usage

1. **Adding Content**: Use the search bar to find movies, series, or anime and add them to your library
2. **Browsing Trending**: Check out the trending section for popular content
3. **Viewing Analytics**: See statistics about your library in the analytics tab
4. **Managing Library**: Remove items from your library as needed

## API Keys

The app uses the following APIs:
- TMDB API (The Movie Database)
- Jikan API (MyAnimeList)

**Setup Instructions:**
1. Get a free API key from [TMDB](https://www.themoviedb.org/settings/api)
2. Copy `src/config.example.js` to `src/config.js`
3. Replace the placeholder key in `src/config.js` with your own:
   ```javascript
   const config = {
       TMDB_KEY: "your_tmdb_api_key_here"
   };
   ```
4. Do not commit `src/config.js` to Git. It is already ignored in `.gitignore`.

This keeps your private API key out of GitHub while letting the app run locally.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [The Movie Database (TMDB)](https://www.themoviedb.org/) for movie and TV data
- [Jikan API](https://jikan.moe/) for anime data
- [Google Fonts](https://fonts.google.com/) for typography