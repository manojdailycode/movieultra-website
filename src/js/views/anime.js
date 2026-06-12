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
  lastPageLength: 24
};

export async function renderAnimeGrid(filter, genreId, page = 1) {
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
    if (d.pagination && typeof d.pagination.last_visible_page === 'number') {
      state.absoluteMaxPage = d.pagination.last_visible_page;
    } else if (results.length < 24) {
      state.absoluteMaxPage = state.animePage;
    }
    
    syncPager(state.animePage);
    
    grid.innerHTML = results.length
      ? results.map(a => card(fromJikan(a), { showAdd: true })).join('')
      : '<p class="placeholder-msg">No results.</p>';

    // Scroll view wrapper to top gently
    const targetSection = document.getElementById('view-anime');
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (err) {
    grid.innerHTML = `<p class="placeholder-msg">⚠️ ${h(err.message)}</p>`;
  }
}

function syncPager(page) {
  const prev = document.getElementById('animePrev');
  if (prev) prev.disabled = page <= 1;

  const next = document.getElementById('animeNext');
  if (next) {
    next.disabled = page >= state.absoluteMaxPage || state.lastPageLength < 24;
  }

  const maxDisplay = state.absoluteMaxPage < Infinity ? state.absoluteMaxPage : Math.ceil(page / 50) * 50;
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
