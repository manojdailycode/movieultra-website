// api/mockDb.js
import fs from 'fs';

const MOCK_MOVIES = [
  {
    id: 693134,
    title: "Dune: Part Two",
    release_date: "2024-02-27",
    vote_average: 8.3,
    poster_path: "/1pdfPmNdcgUjJv0z7XwAsV6rjxe.jpg",
    backdrop_path: "/xOMo8jYZkisw7qd2zP4qLDpp1Z5.jpg",
    overview: "Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a path of revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the universe, he endeavors to prevent a terrible future only he can foresee.",
    media_type: "movie",
    genres: [{ id: 878, name: "Science Fiction" }, { id: 12, name: "Adventure" }],
    videos: {
      results: [
        { key: "Way9DexNy3w", site: "YouTube", type: "Trailer", name: "Official Trailer" }
      ]
    },
    credits: {
      cast: [
        { id: 1190668, name: "Timothée Chalamet", character: "Paul Atreides", profile_path: "/BE7w1mG2tW521Wd2WJ2XW2tW521.jpg" },
        { id: 505710, name: "Zendaya", character: "Chani", profile_path: "/7b53xW2tW521Wd2WJ2XW2tW521.jpg" }
      ]
    }
  },
  {
    id: 872585,
    title: "Oppenheimer",
    release_date: "2023-07-19",
    vote_average: 8.1,
    poster_path: "/8Gxv2Z7oGmqPA2QGg5jZ67562iU.jpg",
    backdrop_path: "/fm640zN62FTOW2kr5e2uXSOvVBN.jpg",
    overview: "The story of J. Robert Oppenheimer's role in the development of the atomic bomb during World War II, charting his rise to prominence and his later struggle with the political fallout of his creation.",
    media_type: "movie",
    genres: [{ id: 18, name: "Drama" }, { id: 36, name: "History" }],
    videos: {
      results: [
        { key: "uYPbbksJxIg", site: "YouTube", type: "Trailer", name: "Official Trailer" }
      ]
    },
    credits: {
      cast: [
        { id: 2037, name: "Cillian Murphy", character: "J. Robert Oppenheimer" },
        { id: 56734, name: "Emily Blunt", character: "Kitty Oppenheimer" }
      ]
    }
  },
  {
    id: 569094,
    title: "Spider-Man: Across the Spider-Verse",
    release_date: "2023-05-31",
    vote_average: 8.4,
    poster_path: "/8vt6mAw9cLHJ2XBTXIGmPB1qq5l.jpg",
    backdrop_path: "/4XM8LIgR37rm5jjJMj7Tx5mc2j9.jpg",
    overview: "After reuniting with Gwen Stacy, Brooklyn’s full-time, friendly neighborhood Spider-Man is catapulted across the Multiverse, where he encounters the Spider-Society, a team of Spider-People charged with protecting its very existence.",
    media_type: "movie",
    genres: [{ id: 16, name: "Animation" }, { id: 28, name: "Action" }, { id: 12, name: "Adventure" }],
    videos: {
      results: [
        { key: "cqGjhVJWtEg", site: "YouTube", type: "Trailer" }
      ]
    },
    credits: {
      cast: [
        { id: 1533036, name: "Shameik Moore", character: "Miles Morales / Spider-Man" },
        { id: 1248008, name: "Hailee Steinfeld", character: "Gwen Stacy / Spider-Woman" }
      ]
    }
  },
  {
    id: 157336,
    title: "Interstellar",
    release_date: "2014-11-05",
    vote_average: 8.4,
    poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    backdrop_path: "/pbrkL804c8yAv3zBZR4QPEafpAR.jpg",
    overview: "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.",
    media_type: "movie",
    genres: [{ id: 878, name: "Science Fiction" }, { id: 18, name: "Drama" }, { id: 12, name: "Adventure" }],
    videos: {
      results: [
        { key: "zSWdZAWr3Lk", site: "YouTube", type: "Trailer" }
      ]
    },
    credits: {
      cast: [
        { id: 10297, name: "Matthew McConaughey", character: "Cooper" },
        { id: 1813, name: "Anne Hathaway", character: "Brand" }
      ]
    }
  },
  {
    id: 155,
    title: "The Dark Knight",
    release_date: "2008-07-16",
    vote_average: 8.5,
    poster_path: "/qJ21wZ1ctFrC2o2f3641wSn28gl.jpg",
    backdrop_path: "/nMKDE8466827iSafe0o9gg44e6Z.jpg",
    overview: "Batman raises the stakes in his war on crime. With the help of Lt. Jim Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations that plague the streets.",
    media_type: "movie",
    genres: [{ id: 28, name: "Action" }, { id: 80, name: "Crime" }, { id: 18, name: "Drama" }],
    videos: {
      results: [
        { key: "EXeTwQWrcwY", site: "YouTube", type: "Trailer" }
      ]
    },
    credits: {
      cast: [
        { id: 3894, name: "Christian Bale", character: "Bruce Wayne / Batman" },
        { id: 1810, name: "Heath Ledger", character: "Joker" }
      ]
    }
  },
  {
    id: 27205,
    title: "Inception",
    release_date: "2010-07-15",
    vote_average: 8.4,
    poster_path: "/o0bg44hzISFRN5kBJv67Z770y1b.jpg",
    backdrop_path: "/s3TJZ1AYu4fgEUC0Bs2xoPhqdii.jpg",
    overview: "Cobb, a skilled thief who is absolute best in the dangerous art of extraction, steals valuable secrets from deep within the subconscious during the dream state, when the mind is at its most vulnerable.",
    media_type: "movie",
    genres: [{ id: 28, name: "Action" }, { id: 878, name: "Science Fiction" }],
    videos: {
      results: [
        { key: "YoHD9XEInc0", site: "YouTube", type: "Trailer" }
      ]
    },
    credits: {
      cast: [
        { id: 6193, name: "Leonardo DiCaprio", character: "Cobb" }
      ]
    }
  },
  {
    id: 238,
    title: "The Godfather",
    release_date: "1972-03-14",
    vote_average: 8.7,
    poster_path: "/3bhkrj58Vtu7enYsLMd5jE4dKEQ.jpg",
    backdrop_path: "/rSPw7tgCH9c6NqICZef4kZjFOQ5.jpg",
    overview: "Spanning the years 1945 to 1955, a chronicle of the fictional Italian-American Corleone crime family. When organized crime family patriarch, Vito Corleone, barely survives an attempt on his life, his youngest son, Michael, steps in.",
    media_type: "movie",
    genres: [{ id: 80, name: "Crime" }, { id: 18, name: "Drama" }],
    videos: {
      results: [
        { key: "sY1S34973zA", site: "YouTube", type: "Trailer" }
      ]
    },
    credits: {
      cast: [
        { id: 3084, name: "Marlon Brando", character: "Vito Corleone" },
        { id: 1158, name: "Al Pacino", character: "Michael Corleone" }
      ]
    }
  },
  {
    id: 680,
    title: "Pulp Fiction",
    release_date: "1994-09-10",
    vote_average: 8.5,
    poster_path: "/d5i2fMNPfVgGPCxJfs0YYa7cZMO.jpg",
    backdrop_path: "/sua7u0g7x6hyJu6217z1IQvUi5s.jpg",
    overview: "A burger-loving hitman, his philosophical partner, a drug-addled gangster's moll, and a washed-up boxer converge in this sprawling, comedic crime caper. Their adventures unfurl in three stories that weave in and out of chronological order.",
    media_type: "movie",
    genres: [{ id: 80, name: "Crime" }, { id: 53, name: "Thriller" }],
    videos: {
      results: [
        { key: "s7MAt3bGeM4", site: "YouTube", type: "Trailer" }
      ]
    },
    credits: {
      cast: [
        { id: 8891, name: "John Travolta", character: "Vincent Vega" },
        { id: 2231, name: "Samuel L. Jackson", character: "Jules Winnfield" }
      ]
    }
  }
];

const MOCK_SERIES = [
  {
    id: 111453,
    name: "Shōgun",
    first_air_date: "2024-02-27",
    vote_average: 8.7,
    poster_path: "/7O4iV2n7YwYx6xiu5n59hVb5lP3.jpg",
    backdrop_path: "/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
    overview: "In Japan in the year 1600, at the dawn of a century-defining civil war, Lord Yoshii Toranaga is fighting for his life as his enemies on the Council of Regents unite against him, when a mysterious European ship is found marooned in a nearby fishing village.",
    media_type: "tv",
    genres: [{ id: 18, name: "Drama" }, { id: 36, name: "History" }],
    number_of_seasons: 1,
    number_of_episodes: 10,
    seasons: [
      { season_number: 1, episode_count: 10, poster_path: "/7O4iV2n7YwYx6xiu5n59hVb5lP3.jpg", air_date: "2024-02-27" }
    ],
    videos: {
      results: [
        { key: "yAN5S-G5WpA", site: "YouTube", type: "Trailer" }
      ]
    },
    credits: {
      cast: [
        { id: 22129, name: "Hiroyuki Sanada", character: "Yoshii Toranaga" },
        { id: 1542475, name: "Cosmo Jarvis", character: "John Blackthorne" }
      ]
    }
  },
  {
    id: 126308,
    name: "Fallout",
    first_air_date: "2024-04-10",
    vote_average: 8.4,
    poster_path: "/r7D4t565n59hVb5lP36C3636G29.jpg",
    backdrop_path: "/fr5CgXGv9q6U92v3H1z9gU1g3vG.jpg",
    overview: "The story of haves and have-nots in a world in which there’s almost nothing left to have. 200 years after the apocalypse, a peaceful denizen of a cozy fallout shelter is forced to return to the surface, and is shocked to discover the wasteland waiting for her.",
    media_type: "tv",
    genres: [{ id: 18, name: "Drama" }, { id: 878, name: "Sci-Fi" }],
    number_of_seasons: 1,
    number_of_episodes: 8,
    seasons: [
      { season_number: 1, episode_count: 8, poster_path: "/r7D4t565n59hVb5lP36C3636G29.jpg", air_date: "2024-04-10" }
    ],
    videos: {
      results: [
        { key: "V-mugKDQhfk", site: "YouTube", type: "Trailer" }
      ]
    },
    credits: {
      cast: [
        { id: 12389, name: "Ella Purnell", character: "Lucy MacLean" }
      ]
    }
  },
  {
    id: 1396,
    name: "Breaking Bad",
    first_air_date: "2008-01-20",
    vote_average: 9.5,
    poster_path: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
    backdrop_path: "/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
    overview: "A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine with a former student in order to secure his family's financial future.",
    media_type: "tv",
    genres: [{ id: 18, name: "Drama" }, { id: 80, name: "Crime" }],
    number_of_seasons: 5,
    number_of_episodes: 62,
    seasons: [
      { season_number: 1, episode_count: 7, poster_path: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg", air_date: "2008-01-20" },
      { season_number: 2, episode_count: 13, poster_path: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg", air_date: "2009-03-08" },
      { season_number: 3, episode_count: 13, poster_path: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg", air_date: "2010-03-21" },
      { season_number: 4, episode_count: 13, poster_path: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg", air_date: "2011-07-17" },
      { season_number: 5, episode_count: 16, poster_path: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg", air_date: "2012-07-15" }
    ],
    videos: {
      results: [
        { key: "HhesaQXLuRY", site: "YouTube", type: "Trailer" }
      ]
    },
    credits: {
      cast: [
        { id: 17419, name: "Bryan Cranston", character: "Walter White" },
        { id: 84497, name: "Aaron Paul", character: "Jesse Pinkman" }
      ]
    }
  },
  {
    id: 1399,
    name: "Game of Thrones",
    first_air_date: "2011-04-17",
    vote_average: 9.3,
    poster_path: "/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg",
    backdrop_path: "/suopoADq0k8YZr4dQXcU6pToj6s.jpg",
    overview: "Seven noble families fight for control of the mythical land of Westeros. Friction between the houses leads to full-scale war. All while a very ancient evil awakens in the farthest North.",
    media_type: "tv",
    genres: [{ id: 18, name: "Drama" }, { id: 10765, name: "Sci-Fi & Fantasy" }],
    number_of_seasons: 8,
    number_of_episodes: 73,
    seasons: [
      { season_number: 1, episode_count: 10, poster_path: "/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg", air_date: "2011-04-17" }
    ],
    videos: {
      results: [
        { key: "gcTkFNrK21s", site: "YouTube", type: "Trailer" }
      ]
    },
    credits: {
      cast: [
        { id: 22970, name: "Peter Dinklage", character: "Tyrion Lannister" }
      ]
    }
  }
];

const MOCK_ANIME = [
  {
    mal_id: 5114,
    title: "Fullmetal Alchemist: Brotherhood",
    title_english: "Fullmetal Alchemist: Brotherhood",
    score: 9.1,
    aired: { prop: { from: { year: 2009 } } },
    synopsis: "After a horrific alchemy experiment goes wrong in the Elric household, brothers Edward and Alphonse are left in catastrophic situations. Edward loses his left leg and sacrifices his right arm to bind Alphonse's soul to a suit of armor.",
    images: { jpg: { large_image_url: "https://image.tmdb.org/t/p/w500/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg" } },
    genres: [{ name: "Action" }, { name: "Fantasy" }, { name: "Military" }],
    trailer: { youtube_id: "BctT16g46Vw" }
  },
  {
    mal_id: 2904,
    title: "Code Geass: Lelouch of the Rebellion",
    title_english: "Code Geass: Lelouch of the Rebellion",
    score: 8.7,
    aired: { prop: { from: { year: 2006 } } },
    synopsis: "In the year 2010, the Holy Empire of Britannia is establishing itself as a dominant military nation, starting with the conquest of Japan. Renamed to Area 11, Japan has seen significant resistance against these tyrants.",
    images: { jpg: { large_image_url: "https://image.tmdb.org/t/p/w500/84Zub7CHo2veepn6961j6j7w0IE.jpg" } },
    genres: [{ name: "Action" }, { name: "Sci-Fi" }, { name: "Mecha" }],
    trailer: { youtube_id: "v-AGjx0N24U" }
  },
  {
    mal_id: 31964,
    title: "My Hero Academia",
    title_english: "My Hero Academia",
    score: 8.0,
    aired: { prop: { from: { year: 2016 } } },
    synopsis: "The appearance of quirks, newly discovered super powers, has been steadily increasing over the years. Around 80 percent of humanity possesses various quirks, from manipulation of elements to shapeshifting.",
    images: { jpg: { large_image_url: "https://image.tmdb.org/t/p/w500/6B9W5F2YF7079fKjM214jS9Lw5t.jpg" } },
    genres: [{ name: "Action" }, { name: "Comedy" }, { name: "Super Power" }],
    trailer: { youtube_id: "EPVkCeeCoC8" }
  },
  {
    mal_id: 40591,
    title: "Kaguya-sama: Love is War Season 2",
    title_english: "Kaguya-sama: Love is War Season 2",
    score: 8.6,
    aired: { prop: { from: { year: 2020 } } },
    synopsis: "At the prestigious Shuchiin Academy, Miyuki Shirogane and Kaguya Shinomiya are the student body's top representatives. Elite among the elite, they are both too proud to confess their love for one another.",
    images: { jpg: { large_image_url: "https://image.tmdb.org/t/p/w500/y2V3f8zWz8L4wW1K8PjLw5tWz2V.jpg" } },
    genres: [{ name: "Comedy" }, { name: "Romance" }, { name: "School" }],
    trailer: { youtube_id: "z7Wn58pLw5Q" }
  }
];

// Generates dummy episodes for season view
function generateEpisodes(tvId, seasonNum, count) {
  const episodes = [];
  for (let i = 1; i <= count; i++) {
    episodes.push({
      episode_number: i,
      name: `Episode ${i}`,
      overview: `This is the overview description for Episode ${i} of Season ${seasonNum} of show #${tvId}. It contains exciting developments and plot highlights.`,
      still_path: null,
      vote_average: (8 + Math.random() * 1.8).toFixed(1),
      air_date: `2024-03-${String(i).padStart(2, '0')}`
    });
  }
  return episodes;
}

export function getTrending(type, page = 1) {
  let list = [];
  if (type === 'movie') list = MOCK_MOVIES;
  else if (type === 'tv') list = MOCK_SERIES;
  else list = [...MOCK_MOVIES, ...MOCK_SERIES];
  return {
    page,
    results: list,
    total_pages: 1,
    total_results: list.length
  };
}

export function getPopular(type, page = 1) {
  return getTrending(type, page);
}

export function getTopRated(type, page = 1) {
  return getTrending(type, page);
}

export function getNowPlaying(page = 1) {
  return {
    page,
    results: MOCK_MOVIES.slice(0, 4),
    total_pages: 1,
    total_results: 4
  };
}

export function getUpcoming(page = 1) {
  return {
    page,
    results: MOCK_MOVIES.slice(4),
    total_pages: 1,
    total_results: 4
  };
}

export function getAiringToday(page = 1) {
  return {
    page,
    results: MOCK_SERIES.slice(0, 2),
    total_pages: 1,
    total_results: 2
  };
}

export function getOnTheAir(page = 1) {
  return {
    page,
    results: MOCK_SERIES.slice(2),
    total_pages: 1,
    total_results: 2
  };
}

export function searchMulti(query, type = 'all') {
  const q = String(query || '').toLowerCase();
  let pool = [];
  if (type === 'movie') pool = MOCK_MOVIES;
  else if (type === 'tv') pool = MOCK_SERIES;
  else pool = [...MOCK_MOVIES, ...MOCK_SERIES];

  const results = pool.filter(item => {
    const title = (item.title || item.name || '').toLowerCase();
    const overview = (item.overview || '').toLowerCase();
    return title.includes(q) || overview.includes(q);
  });

  return {
    page: 1,
    results,
    total_pages: 1,
    total_results: results.length
  };
}

export function getDetails(type, id) {
  const nid = parseInt(id);
  const pool = type === 'movie' ? MOCK_MOVIES : MOCK_SERIES;
  const match = pool.find(item => item.id === nid);
  if (match) {
    // Add similarity lists & details
    return {
      ...match,
      recommendations: {
        results: pool.filter(item => item.id !== nid).slice(0, 3)
      }
    };
  }
  // Fallback default detail card
  return {
    id: nid,
    title: type === 'movie' ? "Unknown Movie" : "Unknown TV Show",
    name: type === 'movie' ? "Unknown Movie" : "Unknown TV Show",
    overview: "Details could not be fetched from the database, showing offline dummy content.",
    vote_average: 7.0,
    genres: [{ id: 1, name: "Drama" }],
    credits: { cast: [] },
    recommendations: { results: [] },
    videos: { results: [] }
  };
}

export function getSeasonDetails(tvId, seasonNumber) {
  const nid = parseInt(tvId);
  const snum = parseInt(seasonNumber);
  const series = MOCK_SERIES.find(s => s.id === nid);
  const season = series?.seasons?.find(s => s.season_number === snum);
  const epCount = season ? season.episode_count : 10;
  return {
    id: nid,
    season_number: snum,
    name: `Season ${snum}`,
    episodes: generateEpisodes(nid, snum, epCount)
  };
}

export function getTopAnime(filter, page = 1) {
  return {
    data: MOCK_ANIME,
    pagination: {
      last_visible_page: 1,
      has_next_page: false
    }
  };
}

export function searchAnime(query, genreId, page = 1) {
  let list = MOCK_ANIME;
  if (query) {
    const q = String(query).toLowerCase();
    list = list.filter(a => {
      const title = (a.title_english || a.title || '').toLowerCase();
      return title.includes(q);
    });
  }
  if (genreId) {
    const gid = parseInt(genreId);
    // Action=1, Adventure=2, Comedy=4, Fantasy=10, Sci-Fi=24, Drama=22, Sports=30
    const genreMaps = {
      1: "Action",
      2: "Adventure",
      4: "Comedy",
      10: "Fantasy",
      24: "Sci-Fi",
      22: "Drama",
      30: "Sports"
    };
    const targetGenre = genreMaps[gid];
    if (targetGenre) {
      list = list.filter(a => a.genres.some(g => g.name === targetGenre));
    }
  }
  return {
    data: list,
    pagination: {
      last_visible_page: 1,
      has_next_page: false
    }
  };
}

export function getAnimeDetails(id) {
  const nid = parseInt(id);
  const match = MOCK_ANIME.find(a => a.mal_id === nid);
  if (match) {
    return { data: match };
  }
  return {
    data: {
      mal_id: nid,
      title: "Unknown Anime",
      score: 7.5,
      aired: { prop: { from: { year: 2024 } } },
      synopsis: "No details available offline.",
      images: { jpg: { large_image_url: "" } },
      genres: [],
      trailer: {}
    }
  };
}
