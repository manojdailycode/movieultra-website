'use strict';

import { h } from '../utils/escape.js';
import { card } from '../components/card.js';
import { spinGrid } from '../components/skeleton.js';
import { getPopularTMDB, getTopRatedTMDB, getNowPlayingTMDB, getUpcomingTMDB, fromTMDB } from '../api/tmdb.js';

export const state = {
  moviesFilter: 'popular',
  moviesPage: 1,
  absoluteMaxPage: Infinity,
  lastPageLength: 20,
  isLoading: false
};

export async function renderMoviesGrid(filter, page = 1) {
  if (state.isLoading) return;

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
  
  const prevBtn = document.getElementById('moviesPrev');
  const nextBtn = document.getElementById('moviesNext');
  if (prevBtn) prevBtn.disabled = true;
  if (nextBtn) nextBtn.disabled = true;

  state.isLoading = true;
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
    if (d.total_pages && typeof d.total_pages === 'number') {
      state.absoluteMaxPage = Math.min(d.total_pages, 500);
    } else if (results.length < 20) {
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
    syncPager(state.moviesPage);
  } finally {
    state.isLoading = false;
    syncPager(state.moviesPage);
  }
}

function syncPager(page) {
  const prev = document.getElementById('moviesPrev');
  if (prev) prev.disabled = page <= 1 || state.isLoading;

  const next = document.getElementById('moviesNext');
  if (next) {
    next.disabled = page >= state.absoluteMaxPage || state.lastPageLength < 20 || state.isLoading;
  }

  // 25-page progressive window: 1..25 -> / 25, 26..50 -> / 50, 51..75 -> / 75
  const batchEnd = Math.ceil(page / 25) * 25;
  const maxDisplay = Math.min(state.absoluteMaxPage, batchEnd);
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
