'use strict';

import { h } from '../utils/escape.js';
import { card } from '../components/card.js';
import { spinGrid } from '../components/skeleton.js';
import { getTopAnime, getAnimeByGenre, fromJikan } from '../api/jikan.js';

export const state = {
  animeFilter: 'bypopularity',
  animeGenreId: null,
  animePage: 1,
  absoluteMaxPage: Infinity,
  lastPageLength: 24,
  isLoading: false
};

export async function renderAnimeGrid(filter, genreId, page = 1) {
  if (state.isLoading) return;

  if (filter) {
    state.animeFilter = filter;
    state.animeGenreId = null;
    state.animePage = 1;
    state.absoluteMaxPage = Infinity;
    state.lastPageLength = 24;
  } else if (genreId !== undefined && genreId !== null) {
    state.animeFilter = null;
    state.animeGenreId = genreId;
    state.animePage = 1;
    state.absoluteMaxPage = Infinity;
    state.lastPageLength = 24;
  } else {
    state.animePage = Math.max(1, Math.min(page, state.absoluteMaxPage));
  }
  
  const grid = document.getElementById('animeGrid');
  if (!grid) return;
  
  // Disable pager buttons during fetch to prevent queue spamming
  const prevBtn = document.getElementById('animePrev');
  const nextBtn = document.getElementById('animeNext');
  if (prevBtn) prevBtn.disabled = true;
  if (nextBtn) nextBtn.disabled = true;

  state.isLoading = true;
  spinGrid(grid);
  
  try {
    let d;
    if (state.animeGenreId) {
      d = await getAnimeByGenre(state.animeGenreId, state.animePage);
    } else {
      d = await getTopAnime(state.animeFilter, state.animePage);
    }
    
    const results = d.data || [];
    state.lastPageLength = results.length;

    if (results.length === 0 && state.animePage > 1) {
      state.absoluteMaxPage = state.animePage - 1;
    } else if (d.pagination) {
      if (d.pagination.has_next_page === false) {
        state.absoluteMaxPage = state.animePage;
      } else if (typeof d.pagination.last_visible_page === 'number') {
        state.absoluteMaxPage = Math.min(d.pagination.last_visible_page, 500);
      }
    } else if (results.length < 24) {
      state.absoluteMaxPage = state.animePage;
    }
    
    syncPager(state.animePage);
    
    grid.innerHTML = results.length
      ? results.map(a => card(fromJikan(a), { showAdd: true })).join('')
      : '<p class="placeholder-msg">No results found.</p>';

    // Scroll view wrapper to top gently
    const targetSection = document.getElementById('view-anime');
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (err) {
    grid.innerHTML = `<p class="placeholder-msg">⚠️ ${h(err.message)}</p>`;
    syncPager(state.animePage);
  } finally {
    state.isLoading = false;
    syncPager(state.animePage);
  }
}

function syncPager(page) {
  const prev = document.getElementById('animePrev');
  if (prev) prev.disabled = page <= 1 || state.isLoading;

  const next = document.getElementById('animeNext');
  if (next) {
    next.disabled = page >= state.absoluteMaxPage || state.lastPageLength < 24 || state.isLoading;
  }

  // 25-page progressive window: 1..25 -> / 25, 26..50 -> / 50, 51..75 -> / 75
  const batchEnd = Math.ceil(page / 25) * 25;
  const maxDisplay = Math.min(state.absoluteMaxPage, batchEnd);
  const info = document.getElementById('animePageInfo');
  if (info) info.textContent = `Page ${page} / ${maxDisplay}`;
}

export function initAnimeListeners() {
  document.getElementById('animeFilterBar')?.addEventListener('click', e => {
    const chip = e.target.closest('[data-af], [data-af-genre]');
    if (!chip) return;
    
    document.querySelectorAll('#animeFilterBar .fchip').forEach(c => {
      c.classList.toggle('active', c === chip);
    });
    
    if (chip.dataset.afGenre) {
      renderAnimeGrid(null, parseInt(chip.dataset.afGenre, 10), 1);
    } else {
      renderAnimeGrid(chip.dataset.af, null, 1);
    }
  });

  document.getElementById('animePrev')?.addEventListener('click', () => {
    renderAnimeGrid(null, null, state.animePage - 1);
  });
  document.getElementById('animeNext')?.addEventListener('click', () => {
    renderAnimeGrid(null, null, state.animePage + 1);
  });
}
