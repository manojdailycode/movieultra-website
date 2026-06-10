'use strict';

import { h } from '../utils/escape.js';
import { card } from '../components/card.js';
import { spinGrid } from '../components/skeleton.js';
import { getTrendingTMDB, fromTMDB } from '../api/tmdb.js';
import { getTopAnime, fromJikan } from '../api/jikan.js';

export const state = {
  trendPage: 1,
  trendFilter: 'all',
  absoluteMaxPage: Infinity,
  lastPageLength: 20
};

const trendCache = {};

export async function getTrending(page = 1, filter = 'all') {
  const key = `${filter}:${page}`;
  if (trendCache[key]) return trendCache[key];
  
  let results = [];
  if (filter === 'anime') {
    const d = await getTopAnime('bypopularity', page, 20);
    results = (d.data || []).map(fromJikan);
  } else {
    const d = await getTrendingTMDB(page, filter);
    results = (d.results || []).map(r => fromTMDB(r));
  }
  
  trendCache[key] = results;
  return results;
}

export async function renderTrendingGrid(page = 1) {
  page = Math.max(1, Math.min(page, state.absoluteMaxPage));
  state.trendPage = page;
  
  const grid = document.getElementById('trendingGrid');
  if (!grid) return;
  
  spinGrid(grid);
  
  try {
    const res = await getTrending(page, state.trendFilter);
    state.lastPageLength = res.length;
    if (res.length < 20) {
      state.absoluteMaxPage = page;
    }
    
    syncPager(page);
    
    grid.innerHTML = res.length 
      ? res.map(i => card(i, { showAdd: true })).join('') 
      : '<p class="placeholder-msg">No results.</p>';
      
    // Scroll view wrapper to top gently
    const targetSection = document.getElementById('view-trending');
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (err) {
    grid.innerHTML = `<p class="placeholder-msg">⚠️ ${h(err.message)}</p>`;
  }
}

function syncPager(page) {
  const prev = document.getElementById('trendPrev');
  if (prev) prev.disabled = page <= 1;

  const next = document.getElementById('trendNext');
  if (next) {
    next.disabled = page >= state.absoluteMaxPage || state.lastPageLength < 20;
  }

  const maxDisplay = state.absoluteMaxPage < Infinity ? state.absoluteMaxPage : Math.ceil(page / 10) * 10;
  const info = document.getElementById('trendPageInfo');
  if (info) info.textContent = `Page ${page} / ${maxDisplay}`;
}

export function initTrendingListeners() {
  document.getElementById('trendPrev')?.addEventListener('click', () => {
    renderTrendingGrid(state.trendPage - 1);
  });
  document.getElementById('trendNext')?.addEventListener('click', () => {
    renderTrendingGrid(state.trendPage + 1);
  });

  document.getElementById('trendFilterBar')?.addEventListener('click', e => {
    const chip = e.target.closest('[data-tfilter]');
    if (!chip) return;
    
    state.trendFilter = chip.dataset.tfilter;
    state.trendPage = 1;
    state.absoluteMaxPage = Infinity;
    state.lastPageLength = 20;
    
    document.querySelectorAll('#trendFilterBar .fchip').forEach(c => {
      c.classList.toggle('active', c === chip);
    });
    
    renderTrendingGrid(1);
  });
}
