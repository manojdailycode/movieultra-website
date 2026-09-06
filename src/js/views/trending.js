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
  lastPageLength: 20,
  isLoading: false
};

const trendCache = {};

export async function getTrending(page = 1, filter = 'all') {
  const key = `${filter}:${page}`;
  if (trendCache[key]) return trendCache[key];
  
  let results = [];
  let totalPages = Infinity;
  if (filter === 'anime') {
    const d = await getTopAnime('bypopularity', page, 20);
    results = (d.data || []).map(fromJikan);
    if (d.pagination) {
      if (d.pagination.has_next_page === false) {
        totalPages = page;
      } else if (typeof d.pagination.last_visible_page === 'number') {
        totalPages = Math.min(d.pagination.last_visible_page, 500);
      }
    }
  } else {
    const d = await getTrendingTMDB(page, filter);
    results = (d.results || []).map(r => fromTMDB(r));
    if (d.total_pages && typeof d.total_pages === 'number') {
      totalPages = Math.min(d.total_pages, 500);
    }
  }
  
  const data = { results, totalPages };
  trendCache[key] = data;
  return data;
}

export async function renderTrendingGrid(page = 1) {
  if (state.isLoading) return;

  page = Math.max(1, Math.min(page, state.absoluteMaxPage));
  state.trendPage = page;
  
  const grid = document.getElementById('trendingGrid');
  if (!grid) return;
  
  const prevBtn = document.getElementById('trendPrev');
  const nextBtn = document.getElementById('trendNext');
  if (prevBtn) prevBtn.disabled = true;
  if (nextBtn) nextBtn.disabled = true;

  state.isLoading = true;
  spinGrid(grid);
  
  try {
    const { results, totalPages } = await getTrending(page, state.trendFilter);
    state.lastPageLength = results.length;
    state.absoluteMaxPage = totalPages;
    if (results.length < 20) {
      state.absoluteMaxPage = page;
    }
    
    syncPager(page);
    
    grid.innerHTML = results.length 
      ? results.map(i => card(i, { showAdd: true })).join('') 
      : '<p class="placeholder-msg">No results.</p>';
      
    // Scroll view wrapper to top gently
    const targetSection = document.getElementById('view-trending');
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (err) {
    grid.innerHTML = `<p class="placeholder-msg">⚠️ ${h(err.message)}</p>`;
    syncPager(page);
  } finally {
    state.isLoading = false;
    syncPager(page);
  }
}

function syncPager(page) {
  const prev = document.getElementById('trendPrev');
  if (prev) prev.disabled = page <= 1 || state.isLoading;

  const next = document.getElementById('trendNext');
  if (next) {
    next.disabled = page >= state.absoluteMaxPage || state.lastPageLength < 20 || state.isLoading;
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
