'use strict';

import { h } from '../utils/escape.js';
import { card } from '../components/card.js';
import { spinGrid } from '../components/skeleton.js';
import { getPopularTMDB, getTopRatedTMDB, getAiringTodayTMDB, getOnTheAirTMDB, fromTMDB } from '../api/tmdb.js';

export const state = {
  seriesFilter: 'popular',
  seriesPage: 1,
  absoluteMaxPage: Infinity,
  lastPageLength: 20
};

export async function renderSeriesGrid(filter, page = 1) {
  if (filter) {
    state.seriesFilter = filter;
    state.seriesPage = 1;
    state.absoluteMaxPage = Infinity;
    state.lastPageLength = 20;
  } else {
    state.seriesPage = Math.max(1, Math.min(page, state.absoluteMaxPage));
  }

  const grid = document.getElementById('seriesGrid');
  if (!grid) return;
  
  spinGrid(grid);
  
  try {
    let d;
    switch (state.seriesFilter) {
      case 'top_rated':
        d = await getTopRatedTMDB('tv', state.seriesPage);
        break;
      case 'airing_today':
        d = await getAiringTodayTMDB(state.seriesPage);
        break;
      case 'on_the_air':
        d = await getOnTheAirTMDB(state.seriesPage);
        break;
      case 'popular':
      default:
        d = await getPopularTMDB('tv', state.seriesPage);
        break;
    }
    
    const results = d.results || [];
    state.lastPageLength = results.length;
    if (d.total_pages && typeof d.total_pages === 'number') {
      state.absoluteMaxPage = Math.min(d.total_pages, 500);
    } else if (results.length < 20) {
      state.absoluteMaxPage = state.seriesPage;
    }
    
    syncPager(state.seriesPage);
    
    grid.innerHTML = results.length
      ? results.map(i => card(fromTMDB(i, 'tv'), { showAdd: true })).join('')
      : '<p class="placeholder-msg">No results.</p>';

    // Scroll view wrapper to top gently
    const targetSection = document.getElementById('view-series');
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (err) {
    grid.innerHTML = `<p class="placeholder-msg">⚠️ ${h(err.message)}</p>`;
  }
}

function syncPager(page) {
  const prev = document.getElementById('seriesPrev');
  if (prev) prev.disabled = page <= 1;

  const next = document.getElementById('seriesNext');
  if (next) {
    next.disabled = page >= state.absoluteMaxPage || state.lastPageLength < 20;
  }

  const maxDisplay = state.absoluteMaxPage < Infinity ? state.absoluteMaxPage : Math.ceil(page / 50) * 50;
  const info = document.getElementById('seriesPageInfo');
  if (info) info.textContent = `Page ${page} / ${maxDisplay}`;
}

export function initSeriesListeners() {
  document.getElementById('seriesFilterBar')?.addEventListener('click', e => {
    const chip = e.target.closest('[data-sf]');
    if (!chip) return;
    
    document.querySelectorAll('#seriesFilterBar .fchip').forEach(c => {
      c.classList.toggle('active', c === chip);
    });
    
    renderSeriesGrid(chip.dataset.sf, 1);
  });

  document.getElementById('seriesPrev')?.addEventListener('click', () => {
    renderSeriesGrid(null, state.seriesPage - 1);
  });
  document.getElementById('seriesNext')?.addEventListener('click', () => {
    renderSeriesGrid(null, state.seriesPage + 1);
  });
}
