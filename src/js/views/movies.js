'use strict';

import { h } from '../utils/escape.js';
import { card } from '../components/card.js';
import { spinGrid } from '../components/skeleton.js';
import { getPopularTMDB, getTopRatedTMDB, getNowPlayingTMDB, getUpcomingTMDB, fromTMDB } from '../api/tmdb.js';

export const state = {
  moviesFilter: 'popular',
  moviesPage: 1,
  absoluteMaxPage: Infinity,
  lastPageLength: 20
};

export async function renderMoviesGrid(filter, page = 1) {
  if (filter) {
    state.moviesFilter = filter;
    state.moviesPage = 1;
    state.absoluteMaxPage = Infinity;
    state.lastPageLength = 20;
  } else {
    state.moviesPage = Math.max(1, Math.min(page, state.absoluteMaxPage));
  }
  
  const grid = document.getElementById('moviesGrid');
  if (!grid) return;
  
  spinGrid(grid);
  
  try {
    let d;
    switch (state.moviesFilter) {
      case 'top_rated':
        d = await getTopRatedTMDB('movie', state.moviesPage);
        break;
      case 'now_playing':
        d = await getNowPlayingTMDB(state.moviesPage);
        break;
      case 'upcoming':
        d = await getUpcomingTMDB(state.moviesPage);
        break;
      case 'popular':
      default:
        d = await getPopularTMDB('movie', state.moviesPage);
        break;
    }
    
    const results = d.results || [];
    state.lastPageLength = results.length;
    if (results.length < 20) {
      state.absoluteMaxPage = state.moviesPage;
    }
    
    syncPager(state.moviesPage);
    
    grid.innerHTML = results.length
      ? results.map(i => card(fromTMDB(i, 'movie'), { showAdd: true })).join('')
      : '<p class="placeholder-msg">No results.</p>';
    
    // Scroll view wrapper to top gently
    const targetSection = document.getElementById('view-movies');
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (err) {
    grid.innerHTML = `<p class="placeholder-msg">⚠️ ${h(err.message)}</p>`;
  }
}

function syncPager(page) {
  const prev = document.getElementById('moviesPrev');
  if (prev) prev.disabled = page <= 1;

  const next = document.getElementById('moviesNext');
  if (next) {
    next.disabled = page >= state.absoluteMaxPage || state.lastPageLength < 20;
  }

  const maxDisplay = state.absoluteMaxPage < Infinity ? state.absoluteMaxPage : Math.ceil(page / 50) * 50;
  const info = document.getElementById('moviesPageInfo');
  if (info) info.textContent = `Page ${page} / ${maxDisplay}`;
}

export function initMoviesListeners() {
  document.getElementById('moviesFilterBar')?.addEventListener('click', e => {
    const chip = e.target.closest('[data-mf]');
    if (!chip) return;
    
    document.querySelectorAll('#moviesFilterBar .fchip').forEach(c => {
      c.classList.toggle('active', c === chip);
    });
    
    renderMoviesGrid(chip.dataset.mf, 1);
  });

  document.getElementById('moviesPrev')?.addEventListener('click', () => {
    renderMoviesGrid(null, state.moviesPage - 1);
  });
  document.getElementById('moviesNext')?.addEventListener('click', () => {
    renderMoviesGrid(null, state.moviesPage + 1);
  });
}
