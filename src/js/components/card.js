'use strict';

import { h } from '../utils/escape.js';
import { libHas, state as libState } from '../store/library.js';
import { histHas } from '../store/history.js';

const NOPOSTER = 'https://placehold.co/300x450/1c1c1c/555?text=No+Image';

/**
 * Creates HTML for a standard movie/series/anime card.
 */
export function card(item, opts = {}) {
  const { showAdd = false, showRemove = false, showWatched = false } = opts;
  const id = h(item.id != null ? String(item.id) : '');
  const title = h(item.title || 'Unknown');
  const type = item.type || 'movie';
  const year = h(String(item.year || ''));
  const rating = h(String(item.rating || ''));
  const poster = item.poster || NOPOSTER;
  const backdrop = item.backdrop || '';
  const overview = item.overview || '';
  const typeLabel = { movie: 'Movie', tv: 'Series', anime: 'Anime' }[type] || type;
  
  const inLib = libHas(item.id, item.title);
  const inHist = histHas(item.id);
  let status = item.status || '';
  if (inLib && !status) {
    const libItem = libState.library.find(i => String(i.id) === String(item.id));
    if (libItem) status = libItem.status || 'Planned';
  }

  const btns = [];
  if (showAdd && !inLib) {
    btns.push(`<button class="card-btn" data-ca="add" aria-label="Add to library">＋ Add</button>`);
  }
  if (showRemove) {
    btns.push(`<button class="card-btn c-remove" data-ca="remove" aria-label="Remove from library">✕</button>`);
  }
  if (showWatched) {
    btns.push(inHist
      ? `<button class="card-btn c-watched" data-ca="unwatch" aria-label="Remove from watched">✓</button>`
      : `<button class="card-btn" data-ca="watch" aria-label="Mark as watched">👁</button>`);
  }

  const dp = encodeURIComponent(poster);
  const db = encodeURIComponent(backdrop);
  const do_ = encodeURIComponent(overview);
  
  const statusBadge = inLib && status
    ? `<div class="card-status ${status.toLowerCase()}">${status}</div>` 
    : '';

  return `<div class="movie-card" role="button" tabindex="0"
    aria-label="${title}${item.year ? ` (${h(String(item.year))})` : ''}"
    data-id="${id}" data-type="${h(type)}" data-title="${title}"
    data-year="${year}" data-rating="${rating}"
    data-poster="${h(dp)}" data-backdrop="${h(db)}" data-ov="${h(do_)}">
    <div class="card-poster-wrap">
      <img class="card-poster" src="${h(poster)}" alt="${title} poster" loading="lazy"
        onerror="this.onerror=null;this.src='${NOPOSTER}'">
      ${rating ? `<div class="card-rating">★ ${rating}</div>` : ''}
      <div class="card-type ${h(type)}">${h(typeLabel)}</div>
      ${statusBadge}
      <div class="card-overlay"><div class="card-actions">${btns.join('')}</div></div>
    </div>
    <div class="card-body">
      <p class="card-title" title="${title}">${title}</p>
      ${year ? `<p class="card-year">${year}</p>` : ''}
    </div>
  </div>`;
}

/**
 * Deserializes an item from a card's dataset.
 */
export function itemFrom(el) {
  return {
    id: el.dataset.id || null,
    type: el.dataset.type || 'movie',
    title: el.dataset.title || '',
    year: el.dataset.year || '',
    rating: el.dataset.rating || '',
    poster: decodeURIComponent(el.dataset.poster || encodeURIComponent(NOPOSTER)),
    backdrop: decodeURIComponent(el.dataset.backdrop || ''),
    overview: decodeURIComponent(el.dataset.ov || ''),
  };
}

/**
 * Creates HTML for a mini-card layout.
 */
export function miniCard(item) {
  const title = h(item.title || 'Unknown');
  const poster = item.poster || NOPOSTER;
  const rating = h(String(item.rating || ''));
  const year = h(String(item.year || ''));
  
  const dp = encodeURIComponent(poster);
  const db = encodeURIComponent(item.backdrop || '');
  const do_ = encodeURIComponent(item.overview || '');

  return `<div class="mini-card" role="button" tabindex="0"
    data-id="${h(String(item.id || ''))}" data-type="${h(item.type || 'movie')}" data-title="${title}"
    data-year="${year}" data-rating="${rating}"
    data-poster="${h(dp)}" data-backdrop="${h(db)}" data-ov="${h(do_)}">
    <div class="mini-poster-wrap">
      <img class="mini-poster" src="${h(poster)}" alt="${title}" loading="lazy" onerror="this.onerror=null;this.src='${NOPOSTER}'">
      ${rating ? `<div class="mini-rating">★ ${rating}</div>` : ''}
    </div>
    <div class="mini-title" title="${title}">${title}</div>
    ${year ? `<div class="mini-meta">${year}</div>` : ''}
  </div>`;
}

/**
 * Creates HTML for a watchlist preview card layout.
 */
export function wlPreviewCard(item) {
  const t = h(item.title || 'Unknown');
  const p = item.poster || NOPOSTER;
  const y = h(String(item.year || ''));
  const tp = item.type || 'movie';
  
  const dp = encodeURIComponent(p);
  const db = encodeURIComponent(item.backdrop || '');
  const do_ = encodeURIComponent(item.overview || '');

  return `<div class="wl-preview-card" role="button" tabindex="0"
    data-id="${h(String(item.id || ''))}" data-type="${h(tp)}" data-title="${t}"
    data-year="${y}" data-rating="${h(String(item.rating || ''))}"
    data-poster="${h(dp)}" data-backdrop="${h(db)}" data-ov="${h(do_)}">
    <div class="wl-poster-wrap">
      <img class="wl-poster" src="${h(p)}" alt="${t}" loading="lazy" onerror="this.onerror=null;this.src='${NOPOSTER}'">
      <div class="wl-type-badge ${h(tp)}">${{ movie: 'Movie', tv: 'Series', anime: 'Anime' }[tp] || tp}</div>
    </div>
    <div class="wl-title" title="${t}">${t}</div>
    ${y ? `<div class="wl-year">${y}</div>` : ''}
  </div>`;
}
