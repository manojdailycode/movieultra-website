'use strict';

const RATINGS_KEY = 'mu_user_ratings_v1';

function load() {
  try {
    return JSON.parse(localStorage.getItem(RATINGS_KEY) || '{}');
  } catch { return {}; }
}

export const state = { ratings: load() };

function persist() {
  localStorage.setItem(RATINGS_KEY, JSON.stringify(state.ratings));
}

export function setUserRating(id, type, rating) {
  const key = `${type}-${id}`;
  state.ratings[key] = {
    id: String(id),
    type,
    rating,               // 0.5–10, increments of 0.5
    timestamp: new Date().toISOString()
  };
  persist();
}

export function getUserRating(id, type) {
  return state.ratings[`${type}-${id}`] || null;
}

export function removeUserRating(id, type) {
  delete state.ratings[`${type}-${id}`];
  persist();
}

export function getAllUserRatings() {
  return Object.values(state.ratings);
}

export function getAverageUserRating() {
  const list = getAllUserRatings();
  if (!list.length) return null;
  return (list.reduce((s, r) => s + r.rating, 0) / list.length).toFixed(1);
}

export function getFavoriteGenresFromRatings(library) {
  // Returns genres weighted by high user ratings
  const genreCounts = {};
  for (const r of getAllUserRatings()) {
    if (r.rating < 7) continue;
    const item = library.find(i => String(i.id) === String(r.id) && i.type === r.type);
    if (!item?.genre) continue;
    const genres = item.genre.split(', ');
    genres.forEach(g => { genreCounts[g] = (genreCounts[g] || 0) + 1; });
  }
  return Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).map(([g]) => g);
}
