'use strict';

import { fetchTMDB } from '../utils/request.js';
import { configState } from '../store/config.js';

const NOPOSTER = 'https://placehold.co/300x450/1c1c1c/555?text=No+Image';

function getPosterPath(path) {
  if (!path) return NOPOSTER;
  const size = configState.imageQuality === 'low' ? 'w342' : 'w500';
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

function getBackdropPath(path) {
  if (!path) return '';
  const size = configState.imageQuality === 'low' ? 'w780' : 'w1280';
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

/**
 * Normalizes a TMDB result to the internal MovieUltra schema.
 */
export function fromTMDB(t, forceType) {
  const type = forceType || (t.media_type === 'movie' ? 'movie' : 'tv');
  return {
    id: t.id,
    title: t.title || t.name || 'Unknown',
    year: (t.release_date || t.first_air_date || '').split('-')[0] || 'N/A',
    rating: t.vote_average ? Number(t.vote_average).toFixed(1) : 'N/A',
    poster: getPosterPath(t.poster_path),
    backdrop: getBackdropPath(t.backdrop_path),
    overview: (t.overview || '').slice(0, 500),
    genre: '',
    platform: '',
    status: 'Planned',
    note: '',
    type,
  };
}

export async function getTrendingTMDB(page = 1, filter = 'all') {
  const endpoint = filter === 'movie' ? '/trending/movie/day' : filter === 'tv' ? '/trending/tv/day' : '/trending/all/day';
  const data = await fetchTMDB(endpoint, { page });
  return data;
}

export async function searchTMDB(query, type = 'movie') {
  const endpoint = type === 'all' ? '/search/multi' : `/search/${type}`;
  const data = await fetchTMDB(endpoint, { query });
  return data;
}

export async function getDetailsTMDB(type, id) {
  const params = { append_to_response: 'videos' };
  if (type === 'movie') {
    params.append_to_response = 'credits,videos,keywords,similar,recommendations,reviews,watch/providers,release_dates,external_ids';
  } else if (type === 'tv') {
    params.append_to_response = 'credits,videos,keywords,similar,recommendations,reviews,watch/providers,content_ratings,external_ids';
  }
  const data = await fetchTMDB(`/${type}/${id}`, params);
  return data;
}

export async function getPopularTMDB(type = 'movie', page = 1) {
  const data = await fetchTMDB(`/${type}/popular`, { page });
  return data;
}

export async function getTopRatedTMDB(type = 'movie', page = 1) {
  const data = await fetchTMDB(`/${type}/top_rated`, { page });
  return data;
}

export async function getNowPlayingTMDB(page = 1) {
  const data = await fetchTMDB('/movie/now_playing', { page });
  return data;
}

export async function getUpcomingTMDB(page = 1) {
  const data = await fetchTMDB('/movie/upcoming', { page });
  return data;
}

export async function getAiringTodayTMDB(page = 1) {
  const data = await fetchTMDB('/tv/airing_today', { page });
  return data;
}

export async function getOnTheAirTMDB(page = 1) {
  const data = await fetchTMDB('/tv/on_the_air', { page });
  return data;
}

export async function getSeasonDetailsTMDB(tvId, seasonNumber) {
  const data = await fetchTMDB(`/tv/${tvId}/season/${seasonNumber}`);
  return data;
}
