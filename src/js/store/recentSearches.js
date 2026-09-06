'use strict';

const KEY = 'mu_recent_searches_v1';
const MAX = 8;

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

export const state = { searches: load() };

function persist() {
  localStorage.setItem(KEY, JSON.stringify(state.searches));
}

export function addRecentSearch(query) {
  query = query.trim();
  if (!query || query.length < 2) return;
  // Move to top if already exists
  state.searches = [query, ...state.searches.filter(s => s !== query)].slice(0, MAX);
  persist();
}

export function removeRecentSearch(query) {
  state.searches = state.searches.filter(s => s !== query);
  persist();
}

export function clearRecentSearches() {
  state.searches = [];
  persist();
}

export function getRecentSearches() {
  return [...state.searches];
}
