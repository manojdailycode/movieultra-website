'use strict';

import { fetchJikan } from '../utils/request.js';

const NOPOSTER = 'https://placehold.co/300x450/1c1c1c/555?text=No+Image';

/**
 * Normalizes Jikan results to internal MovieUltra schema.
 */
export function fromJikan(a) {
  const genres = (a.genres || []).map(g => g.name).join(', ');
  let ytId = '';
  if (a.trailer) {
    if (a.trailer.youtube_id) {
      ytId = a.trailer.youtube_id;
    } else {
      const url = a.trailer.embed_url || a.trailer.url || '';
      const match = url.match(/(?:youtube(?:-nocookie)?\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
      if (match) ytId = match[1];
    }
  }

  return {
    id: a.mal_id,
    title: a.title_english || a.title || 'Unknown',
    year: a.aired?.prop?.from?.year ? String(a.aired.prop.from.year) : 'N/A',
    rating: a.score ? String(a.score) : 'N/A',
    poster: a.images?.jpg?.large_image_url || NOPOSTER,
    backdrop: '',
    overview: (a.synopsis || '').slice(0, 500),
    genre: genres,
    platform: 'Crunchyroll',
    status: 'Planned',
    note: '',
    type: 'anime',
    trailer: ytId,
  };
}

export async function getTopAnime(filter = 'bypopularity', page = 1, limit = 24) {
  return fetchJikan(`/top/anime?filter=${filter}&page=${page}&limit=${limit}`);
}

export async function searchAnime(query, limit = 6) {
  return fetchJikan(`/anime?q=${encodeURIComponent(query)}&limit=${limit}`);
}

export async function getAnimeByGenre(genreId, page = 1, limit = 24) {
  return fetchJikan(`/anime?genres=${genreId}&order_by=score&sort=desc&page=${page}&limit=${limit}`);
}

export async function getAnimeDetails(id) {
  return fetchJikan(`/anime/${id}/full`);
}
