'use strict';

import { fetchTMDB } from '../utils/request.js';

const W500 = 'https://image.tmdb.org/t/p/w500';
const W1280 = 'https://image.tmdb.org/t/p/w1280';
const NOPOSTER = 'https://placehold.co/300x450/1c1c1c/555?text=No+Image';

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
    poster: t.poster_path ? `${W500}${t.poster_path}` : NOPOSTER,
    backdrop: t.backdrop_path ? `${W1280}${t.backdrop_path}` : '',
    overview: (t.overview || '').slice(0, 500),
    genre: '',
    platform: '',
    status: '',
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
  const data = await fetchTMDB(`/${type}/${id}`, {
    append_to_response: 'videos,credits,images,recommendations,similar,external_ids,keywords,watch/providers,reviews',
    include_image_language: 'en,null',
  });
  return data;
}

export async function getCollectionTMDB(collectionId) {
  return fetchTMDB(`/collection/${collectionId}`, {});
}

export async function getPersonTMDB(personId) {
  return fetchTMDB(`/person/${personId}`, { append_to_response: 'combined_credits' });
}

export async function getSeasonTMDB(tvId, seasonNumber) {
  return fetchTMDB(`/tv/${tvId}/season/${seasonNumber}`, {});
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

export async function getReviewsTMDB(type, id, page = 1) {
  return fetchTMDB(`/${type}/${id}/reviews`, { page });
}

export async function searchPeopleTMDB(query) {
  return fetchTMDB('/search/person', { query });
}

export async function getGenresTMDB(type = 'movie') {
  return fetchTMDB(`/genre/${type}/list`, {});
}

export async function discoverTMDB(type = 'movie', params = {}) {
  return fetchTMDB(`/discover/${type}`, params);
}
