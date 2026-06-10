'use strict';

import { card } from '../components/card.js';
import { state as histState, histClearDirect } from '../store/history.js';
import { toast } from '../components/toast.js';

export function renderHistoryGrid() {
  const grid = document.getElementById('historyGrid');
  if (!grid) return;
  grid.innerHTML = histState.watchHist.length
    ? histState.watchHist.map(i => card(i, { showWatched: true })).join('')
    : '<p class="placeholder-msg">No watch history yet.</p>';
}

export function initHistoryListeners() {
  document.getElementById('clearHistoryBtn')?.addEventListener('click', () => {
    if (!confirm('Clear all watch history?')) return;
    histClearDirect();
    toast('History cleared', 'info');
  });
}
