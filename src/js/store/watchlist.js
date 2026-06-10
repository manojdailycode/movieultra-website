'use strict';

import { state as libState } from './library.js';

export const state = {
  watchlistFilter: 'all'
};

export function setWatchlistFilter(filter) {
  state.watchlistFilter = filter;
}

export function getFilteredWatchlist() {
  const library = libState.library;
  if (state.watchlistFilter === 'all') {
    return library;
  }
  return library.filter(item => item.type === state.watchlistFilter);
}
