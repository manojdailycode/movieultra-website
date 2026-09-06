'use strict';

import { fetchJikan } from '../utils/request.js';

const NOPOSTER = 'https://placehold.co/300x450/1c1c1c/555?text=No+Image';
const ANILIST_URL = 'https://graphql.anilist.co';
const anilistCache = new Map();

export async function fetchAniList(query, variables = {}) {
  const cacheKey = JSON.stringify({ query, variables });
  if (anilistCache.has(cacheKey)) {
    return anilistCache.get(cacheKey);
  }

  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ query, variables })
  });

  if (!res.ok) {
    throw new Error(`AniList returned HTTP ${res.status}`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors[0].message || 'AniList GraphQL error');
  }

  anilistCache.set(cacheKey, json.data);
  return json.data;
}

const GENRE_MAP = {
  1: 'Action',
  2: 'Adventure',
  4: 'Comedy',
  10: 'Fantasy',
  22: 'Drama',
  24: 'Sci-Fi',
  30: 'Sports'
};

/**
 * Normalizes Jikan or AniList results to internal MovieUltra schema.
 */
export function fromJikan(a) {
  if (!a) return null;
  if (a.type === 'anime' && a.poster && a.id) return a;

  const rawGenres = a.genres || [];
  const genres = rawGenres.map(g => (typeof g === 'string' ? g : g.name || '')).filter(Boolean).join(', ');

  let ytId = '';
  if (a.trailer) {
    if (a.trailer.youtube_id) {
      ytId = a.trailer.youtube_id;
    } else if (a.trailer.id && (a.trailer.site === 'youtube' || !a.trailer.site)) {
      ytId = String(a.trailer.id).trim();
    } else {
      const url = a.trailer.embed_url || a.trailer.url || '';
      const match = url.match(/(?:youtube(?:-nocookie)?\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
      if (match) ytId = match[1];
    }
  }

  const malId = a.mal_id || a.idMal || a.id;
  const title = a.title_english || a.title?.english || a.title?.romaji || a.title || 'Unknown';
  const year = a.aired?.prop?.from?.year
    ? String(a.aired.prop.from.year)
    : (a.seasonYear ? String(a.seasonYear) : (a.year ? String(a.year) : 'N/A'));
  
  let rating = 'N/A';
  if (a.score) {
    rating = String(a.score);
  } else if (typeof a.averageScore === 'number' && a.averageScore > 0) {
    rating = (a.averageScore / 10).toFixed(1);
  }

  const poster = a.images?.jpg?.large_image_url ||
                 a.coverImage?.extraLarge ||
                 a.coverImage?.large ||
                 NOPOSTER;
  const backdrop = a.bannerImage || a.trailer?.images?.maximum_image_url || '';
  const overview = (a.synopsis || a.description || '').replace(/<[^>]*>/g, '').slice(0, 500);

  return {
    id: malId,
    mal_id: malId,
    ani_id: a.id,
    title,
    year,
    rating,
    poster,
    backdrop,
    overview,
    genre: genres,
    platform: 'Crunchyroll',
    status: '',
    airingStatus: a.status || '',
    note: '',
    type: 'anime',
    trailer: ytId,
  };
}

const ANILIST_PAGE_QUERY = `
  query ($page: Int, $perPage: Int, $sort: [MediaSort], $genre: String, $search: String) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        currentPage
        lastPage
        hasNextPage
      }
      media(type: ANIME, sort: $sort, genre: $genre, search: $search) {
        id
        idMal
        title {
          english
          romaji
        }
        coverImage {
          extraLarge
          large
        }
        bannerImage
        averageScore
        seasonYear
        genres
        description
        trailer {
          id
          site
        }
      }
    }
  }
`;

export async function getTopAnime(filter = 'bypopularity', page = 1, limit = 24) {
  // 1. Try high-reliability AniList GraphQL first
  try {
    const sort = filter === 'favorite' ? ['FAVOURITES_DESC'] : ['POPULARITY_DESC'];
    const data = await fetchAniList(ANILIST_PAGE_QUERY, {
      page,
      perPage: limit,
      sort
    });

    const pageInfo = data.Page?.pageInfo || {};
    const items = (data.Page?.media || []).map(m => ({
      ...m,
      mal_id: m.idMal || m.id
    }));

    return {
      data: items,
      pagination: {
        last_visible_page: pageInfo.lastPage || 208,
        has_next_page: Boolean(pageInfo.hasNextPage),
        current_page: page
      }
    };
  } catch (aniErr) {
    console.warn('[MovieUltra] AniList getTopAnime failed, attempting Jikan fallback:', aniErr.message);
  }

  // 2. Secondary fallback: Jikan REST API
  try {
    return await fetchJikan(`/top/anime?filter=${filter}&page=${page}&limit=${limit}`);
  } catch (err) {
    console.warn('[MovieUltra] Jikan getTopAnime failed, using static fallback:', err);
    if (page > 1) {
      return {
        data: [],
        pagination: {
          last_visible_page: 1,
          has_next_page: false,
          items: { count: 0, total: 10, per_page: limit }
        }
      };
    }
    const fallbackData = [
      { mal_id: 16498, title: 'Attack on Titan', score: 8.54, images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/10/47347l.jpg' } }, genres: [{ name: 'Action' }, { name: 'Drama' }] },
      { mal_id: 1535, title: 'Death Note', score: 8.62, images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/9/9453l.jpg' } }, genres: [{ name: 'Supernatural' }, { name: 'Suspense' }] },
      { mal_id: 5114, title: 'Fullmetal Alchemist: Brotherhood', score: 9.10, images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/1208/94745l.jpg' } }, genres: [{ name: 'Action' }, { name: 'Adventure' }] },
      { mal_id: 30276, title: 'One Punch Man', score: 8.50, images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/12/76049l.jpg' } }, genres: [{ name: 'Action' }, { name: 'Comedy' }] },
      { mal_id: 11757, title: 'Sword Art Online', score: 7.20, images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/11/39717l.jpg' } }, genres: [{ name: 'Action' }, { name: 'Fantasy' }] },
      { mal_id: 38000, title: 'Demon Slayer', score: 8.49, images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/1286/99889l.jpg' } }, genres: [{ name: 'Action' }, { name: 'Fantasy' }] },
      { mal_id: 20, title: 'Naruto', score: 7.99, images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/13/17405l.jpg' } }, genres: [{ name: 'Action' }, { name: 'Adventure' }] },
      { mal_id: 31964, title: 'My Hero Academia', score: 7.87, images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/10/78745l.jpg' } }, genres: [{ name: 'Action' }] },
      { mal_id: 11061, title: 'Hunter x Hunter (2011)', score: 9.04, images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/1337/99013l.jpg' } }, genres: [{ name: 'Action' }, { name: 'Adventure' }] },
      { mal_id: 22319, title: 'Tokyo Ghoul', score: 7.79, images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/1498/134443l.jpg' } }, genres: [{ name: 'Action' }, { name: 'Fantasy' }] }
    ];
    return {
      data: fallbackData.slice(0, limit),
      pagination: {
        last_visible_page: 1,
        has_next_page: false,
        items: { count: fallbackData.length, total: fallbackData.length, per_page: limit }
      }
    };
  }
}

export async function searchAnime(query, limit = 6) {
  // 1. Try AniList search
  try {
    const data = await fetchAniList(ANILIST_PAGE_QUERY, {
      page: 1,
      perPage: limit,
      search: query,
      sort: ['POPULARITY_DESC']
    });
    const items = (data.Page?.media || []).map(m => ({
      ...m,
      mal_id: m.idMal || m.id
    }));
    return { data: items };
  } catch (aniErr) {
    console.warn('[MovieUltra] AniList searchAnime failed, trying Jikan:', aniErr.message);
  }

  // 2. Try Jikan search
  try {
    return await fetchJikan(`/anime?q=${encodeURIComponent(query)}&limit=${limit}`);
  } catch (err) {
    console.warn('[MovieUltra] Jikan searchAnime failed:', err);
    return { data: [] };
  }
}

export async function getAnimeByGenre(genreId, page = 1, limit = 24) {
  const genreName = GENRE_MAP[genreId];

  // 1. Try AniList genre query
  if (genreName) {
    try {
      const data = await fetchAniList(ANILIST_PAGE_QUERY, {
        page,
        perPage: limit,
        genre: genreName,
        sort: ['POPULARITY_DESC']
      });

      const pageInfo = data.Page?.pageInfo || {};
      const items = (data.Page?.media || []).map(m => ({
        ...m,
        mal_id: m.idMal || m.id
      }));

      return {
        data: items,
        pagination: {
          last_visible_page: pageInfo.lastPage || 150,
          has_next_page: Boolean(pageInfo.hasNextPage),
          current_page: page
        }
      };
    } catch (aniErr) {
      console.warn(`[MovieUltra] AniList getAnimeByGenre (${genreName}) failed, trying Jikan:`, aniErr.message);
    }
  }

  // 2. Try Jikan genre query
  try {
    return await fetchJikan(`/anime?genres=${genreId}&order_by=score&sort=desc&page=${page}&limit=${limit}`);
  } catch (err) {
    console.warn('[MovieUltra] Jikan getAnimeByGenre failed, using static fallback:', err);
    if (page > 1) {
      return {
        data: [],
        pagination: {
          last_visible_page: 1,
          has_next_page: false,
          items: { count: 0, total: 8, per_page: limit }
        }
      };
    }
    const fallbackData = [
      { mal_id: 38000, title: 'Demon Slayer', score: 8.49, images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/1286/99889l.jpg' } }, genres: [{ name: 'Action' }, { name: 'Fantasy' }] },
      { mal_id: 31964, title: 'My Hero Academia', score: 7.87, images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/10/78745l.jpg' } }, genres: [{ name: 'Action' }] },
      { mal_id: 30276, title: 'One Punch Man', score: 8.50, images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/12/76049l.jpg' } }, genres: [{ name: 'Action' }, { name: 'Comedy' }] },
      { mal_id: 20, title: 'Naruto', score: 7.99, images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/13/17405l.jpg' } }, genres: [{ name: 'Action' }, { name: 'Adventure' }] },
      { mal_id: 11061, title: 'Hunter x Hunter (2011)', score: 9.04, images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/1337/99013l.jpg' } }, genres: [{ name: 'Action' }, { name: 'Adventure' }] },
      { mal_id: 5114, title: 'Fullmetal Alchemist: Brotherhood', score: 9.10, images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/1208/94745l.jpg' } }, genres: [{ name: 'Action' }, { name: 'Adventure' }] },
      { mal_id: 1535, title: 'Death Note', score: 8.62, images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/9/9453l.jpg' } }, genres: [{ name: 'Supernatural' }, { name: 'Suspense' }] },
      { mal_id: 16498, title: 'Attack on Titan', score: 8.54, images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/10/47347l.jpg' } }, genres: [{ name: 'Action' }, { name: 'Drama' }] }
    ];
    return {
      data: fallbackData.slice(0, limit),
      pagination: {
        last_visible_page: 1,
        has_next_page: false,
        items: { count: fallbackData.length, total: fallbackData.length, per_page: limit }
      }
    };
  }
}

const ANILIST_DETAILS_QUERY = `
  query ($idMal: Int) {
    Media(idMal: $idMal, type: ANIME) {
      id
      idMal
      title {
        english
        romaji
        native
      }
      description
      averageScore
      seasonYear
      episodes
      duration
      status
      genres
      bannerImage
      coverImage {
        extraLarge
        large
      }
      trailer {
        id
        site
      }
    }
  }
`;

export async function getAnimeDetails(id) {
  const numericId = parseInt(id, 10);

  // 1. Try AniList by MAL ID first
  if (numericId) {
    try {
      const data = await fetchAniList(ANILIST_DETAILS_QUERY, { idMal: numericId });
      const m = data?.Media;
      if (m) {
        return {
          data: {
            mal_id: m.idMal || m.id,
            title: m.title?.english || m.title?.romaji || 'Unknown',
            title_english: m.title?.english || '',
            title_japanese: m.title?.native || '',
            score: m.averageScore ? (m.averageScore / 10).toFixed(1) : null,
            year: m.seasonYear,
            episodes: m.episodes,
            duration: m.duration ? `${m.duration} min` : '',
            status: m.status,
            genres: (m.genres || []).map(name => ({ name })),
            synopsis: (m.description || '').replace(/<[^>]*>/g, ''),
            images: {
              jpg: {
                large_image_url: m.coverImage?.extraLarge || m.coverImage?.large || NOPOSTER
              }
            },
            trailer: {
              youtube_id: m.trailer?.site === 'youtube' ? (m.trailer.id || '').trim() : '',
              images: {
                maximum_image_url: m.bannerImage || ''
              }
            }
          }
        };
      }
    } catch (aniErr) {
      console.warn(`[MovieUltra] AniList getAnimeDetails (${id}) failed, trying Jikan:`, aniErr.message);
    }
  }

  // 2. Fallback to Jikan full details
  return fetchJikan(`/anime/${id}/full`);
}

