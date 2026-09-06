'use strict';

import { state as libState } from './library.js';
import { state as histState } from './history.js';
import { getAllLists } from './customLists.js';

export const state = {
  watchlistFilter: 'all',
  watchlistStatus: 'all',
  watchlistSort: 'added',
  watchlistSearch: '',
};

export function setWatchlistFilter(filter) { state.watchlistFilter = filter; }
export function setWatchlistStatus(status) { state.watchlistStatus = status; }
export function setWatchlistSort(sort)     { state.watchlistSort = sort; }
export function setWatchlistSearch(q)      { state.watchlistSearch = q; }

/**
 * Returns all unique items from the main library, custom lists, and watch history combined.
 */
export function getAllMasterItems() {
  const master = [...libState.library];
  const lists = getAllLists();
  lists.forEach(l => {
    (l.items || []).forEach(item => {
      const already = master.some(m => String(m.id) === String(item.id) && (!m.type || !item.type || m.type === item.type));
      if (!already) {
        master.push(item);
      }
    });
  });
  // Also include any items from watch history that might not be in library
  (histState.watchHist || []).forEach(item => {
    const already = master.some(m => String(m.id) === String(item.id) && (!m.type || !item.type || m.type === item.type));
    if (!already) {
      master.push({ ...item, status: 'Completed' });
    }
  });
  return master;
}

export function getFilteredWatchlist() {
  let items = getAllMasterItems();

  // Filter by type
  if (state.watchlistFilter !== 'all') {
    items = items.filter(i => i.type === state.watchlistFilter);
  }

  // Filter by status (Planned, Watching, Completed)
  if (state.watchlistStatus && state.watchlistStatus !== 'all') {
    items = items.filter(i => (i.status || 'Planned') === state.watchlistStatus);
  }

  // Search
  if (state.watchlistSearch.trim()) {
    const q = state.watchlistSearch.toLowerCase();
    items = items.filter(i => (i.title || '').toLowerCase().includes(q));
  }

  // Sort
  switch (state.watchlistSort) {
    case 'title':
      items.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      break;
    case 'rating':
      items.sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0));
      break;
    case 'year':
      items.sort((a, b) => parseInt(b.year || 0, 10) - parseInt(a.year || 0, 10));
      break;
    case 'added':
    default:
      items.sort((a, b) => new Date(b.addedAt || 0) - new Date(a.addedAt || 0));
      break;
  }

  return items;
}
