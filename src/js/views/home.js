'use strict';

import { h } from '../utils/escape.js';
import { card } from '../components/card.js';
import { spinRow } from '../components/skeleton.js';
import { getTrendingTMDB, fromTMDB } from '../api/tmdb.js';
import { getTopAnime, fromJikan } from '../api/jikan.js';
import { state as libState, libAdd } from '../store/library.js';
import { state as histState } from '../store/history.js';
import { toast } from '../components/toast.js';
import { playTrailer } from '../components/trailer.js';

export let heroItem = null;

export function renderLibraryRow() {
  const el = document.getElementById('libraryRow');
  if (!el) return;
  el.innerHTML = libState.library.length
    ? libState.library.slice(0, 20).map(i => card(i, { showRemove: true })).join('')
    : '<p class="row-empty">Library empty — search above to add titles!</p>';
}

export function renderHistoryRow() {
  const el = document.getElementById('historyRow');
  if (!el) return;
  el.innerHTML = histState.watchHist.length
    ? histState.watchHist.slice(0, 20).map(i => card(i)).join('')
    : '<p class="row-empty">No history yet — mark items as watched!</p>';
}

export async function renderTrendRow() {
  const el = document.getElementById('trendRow');
  if (!el) return;
  spinRow(el);
  try {
    const d = await getTrendingTMDB(1, 'all');
    const results = (d.results || []).map(r => fromTMDB(r));
    el.innerHTML = results.slice(0, 15).map(i => card(i, { showAdd: true })).join('');
  } catch (err) {
    el.innerHTML = `<p class="row-empty">⚠️ ${h(err.message)}</p>`;
  }
}

export async function renderAnimeHomeRow() {
  const el = document.getElementById('animeHomeRow');
  if (!el) return;
  spinRow(el);
  try {
    const d = await getTopAnime('bypopularity', 1, 15);
    el.innerHTML = (d.data || []).map(a => card(fromJikan(a), { showAdd: true })).join('');
  } catch (err) {
    el.innerHTML = `<p class="row-empty">⚠️ ${h(err.message)}</p>`;
  }
}

export async function loadHero() {
  try {
    const d = await getTrendingTMDB(1, 'all');
    const results = (d.results || []).map(r => fromTMDB(r));
    const pick = results.find(r => r.backdrop) || results[0];
    if (!pick) return;
    heroItem = pick;
    const safeUrl = heroItem.backdrop || heroItem.poster;
    const heroBackdrop = document.getElementById('heroBackdrop');
    if (heroBackdrop) {
      if (heroBackdrop.tagName === 'IMG') {
        heroBackdrop.src = safeUrl;
      } else {
        heroBackdrop.style.backgroundImage = `url('${safeUrl}')`;
      }
    }
    const heroTitle = document.getElementById('heroTitle');
    if (heroTitle) heroTitle.textContent = heroItem.title;
    const heroOverview = document.getElementById('heroOverview');
    if (heroOverview) heroOverview.textContent = heroItem.overview.slice(0, 240) + (heroItem.overview.length > 240 ? '…' : '');

    const parts = [];
    if (heroItem.rating !== 'N/A') parts.push(`<span class="hero-rating">★ ${h(heroItem.rating)}</span>`);
    if (heroItem.year !== 'N/A')   parts.push(`<span>${h(heroItem.year)}</span>`);
    parts.push(`<span>${h(heroItem.type === 'tv' ? 'Series' : heroItem.type === 'anime' ? 'Anime' : 'Movie')}</span>`);
    
    const heroMeta = document.getElementById('heroMeta');
    if (heroMeta) heroMeta.innerHTML = parts.join('<span style="opacity:.3;margin:0 2px">•</span>');
  } catch (err) {
    console.error('[MovieUltra] loadHero failed:', err);
    const heroTitle = document.getElementById('heroTitle');
    if (heroTitle) heroTitle.textContent = 'Could not load featured title';
  }
}

export function initHeroListeners() {
  document.getElementById('heroTrailerBtn')?.addEventListener('click', async () => {
    if (!heroItem) return;
    if (heroItem.type === 'anime') {
      toast('Trailers not available for anime via TMDB', 'info');
      return;
    }
    if (!heroItem.id) {
      toast('No trailer available', 'info');
      return;
    }
    await playTrailer(heroItem.type, heroItem.id);
  });

  document.getElementById('heroAddBtn')?.addEventListener('click', () => {
    if (heroItem) {
      libAdd(heroItem);
    }
  });
}
