'use strict';

import { card } from '../components/card.js';
import { getFilteredWatchlist, setWatchlistFilter, state as watchlistState } from '../store/watchlist.js';

export function renderWatchlist() {
  const grid = document.getElementById('watchlistGrid');
  if (!grid) return;

  const items = getFilteredWatchlist();
  if (!items.length) {
    const filter = watchlistState.watchlistFilter;
    const name = filter === 'tv' ? 'series' : (filter === 'all' ? 'titles' : filter);
    grid.innerHTML = `<p class="placeholder-msg">No ${name} yet.<br><small>Add from Home or Trending!</small></p>`;
    return;
  }

  grid.innerHTML = items.map(i => card(i, { showRemove: true, showWatched: true })).join('');
}

export function initWatchlistListeners() {
  document.getElementById('view-watchlist')?.addEventListener('click', e => {
    const chip = e.target.closest('[data-wf]');
    if (!chip) return;

    setWatchlistFilter(chip.dataset.wf);
    document.querySelectorAll('[data-wf]').forEach(c => c.classList.toggle('active', c === chip));
    renderWatchlist();
  });
}
