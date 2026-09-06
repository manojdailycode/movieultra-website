'use strict';

import { h } from '../utils/escape.js';
import { libHas, state as libState } from '../store/library.js';
import { histHas } from '../store/history.js';
import { getProgress } from '../store/progress.js';

const NOPOSTER = 'https://placehold.co/300x450/1c1c1c/555?text=No+Image';

/**
 * Compute match % between user's favorite genre and item genre string.
 * Returns null when insufficient data.
 */
function computeMatch(item) {
  try {
    const userGenre = window._userState?.favoriteGenre || '';
    if (!userGenre || !item.genre) return null;
    const favClean = userGenre.replace(/[^a-z]/gi, '').toLowerCase();
    const genres = (item.genre || '').toLowerCase();
    if (!genres) return null;
    if (genres.includes(favClean)) return Math.floor(Math.random() * 12 + 88); // 88-99%
    // Partial match
    const genreWords = genres.split(/[,\s]+/);
    const favWords = favClean.split(/[,\s]+/).filter(Boolean);
    const overlap = genreWords.filter(g => favWords.some(fw => g.startsWith(fw.slice(0, 4)))).length;
    if (overlap > 0) return Math.floor(Math.random() * 18 + 70); // 70-87%
    return null;
  } catch { return null; }
}

/**
 * Creates HTML for a standard movie/series/anime card.
 * Supports: hover pop-out, match %, top-10 overlay, new episode badge, progress bar.
 */
export function card(item, opts = {}) {
  const { showRemove = false, topNum = null, isAiringToday = false } = opts;
  const id = h(item.id != null ? String(item.id) : '');
  const title = h(item.title || 'Unknown');
  const type = item.type || 'movie';
  const year = h(String(item.year || ''));
  const rating = h(String(item.rating || ''));
  const poster = item.poster || NOPOSTER;
  const backdrop = item.backdrop || '';
  const overview = item.overview || '';
  const genre = item.genre || '';
  const typeLabel = { movie: 'Movie', tv: 'Series', anime: 'Anime' }[type] || type;
  
  const inLib = libHas(item.id, item.title, type);
  const inHist = histHas(item.id, type);
  let status = '';
  if (inLib) {
    const libItem = libState.library.find(i => String(i.id) === String(item.id) && (!type || i.type === type));
    status = libItem?.status || item.status || 'Planned';
  } else if (inHist) {
    status = 'Completed';
  }

  // Watch progress
  const progress = item.id ? getProgress(item.id, type) : null;
  const progressPct = progress ? Math.min(100, Math.max(0, Math.round(progress.percent || 0))) : 0;

  // Match % (genre-based personalization)
  const matchPct = computeMatch(item);

  const btns = [];
  // Quick status segmented selector right inside the card overlay
  btns.push(`
    <div class="card-overlay-status-row" role="group" aria-label="Set Watch Status">
      <button class="card-st-btn ${status === 'Planned' ? 'active' : ''}" data-ca="set-status" data-status="Planned" title="Plan to Watch" aria-label="Plan to Watch">📋 Plan</button>
      <button class="card-st-btn ${status === 'Watching' ? 'active' : ''}" data-ca="set-status" data-status="Watching" title="Currently Watching" aria-label="Currently Watching">👁️ Watching</button>
      <button class="card-st-btn ${status === 'Completed' ? 'active' : ''}" data-ca="set-status" data-status="Completed" title="Mark Completed" aria-label="Mark Completed">✅ Done</button>
    </div>
  `);
  btns.push(`<button class="card-btn card-btn-info" data-ca="info" aria-label="View details">ℹ Info</button>`);
  btns.push(`<button class="card-btn card-btn-play" data-ca="watch-now" aria-label="Watch now">▶ Watch</button>`);
  if (inLib || inHist || showRemove) {
    btns.push(`<button class="card-btn c-remove" data-ca="remove" aria-label="Remove from library" title="Remove from Library">✕</button>`);
  }

  const dp = encodeURIComponent(poster);
  const db = encodeURIComponent(backdrop);
  const do_ = encodeURIComponent(overview);
  const dg = encodeURIComponent(genre);
  
  const statusBadge = (inLib || inHist) && status
    ? `<div class="card-status ${status.toLowerCase()}" data-ca="cycle-status" role="button" title="Status: ${status} (Click to change)">${status === 'Watching' ? '👁️ Watching' : status === 'Completed' ? '✅ Done' : '📋 Planned'}</div>` 
    : '';

  // Top-10 number overlay
  const topNumHtml = topNum ? `<div class="card-top-num" aria-hidden="true">${topNum}</div>` : '';

  // New episode badge for airing today
  const newEpBadge = isAiringToday ? `<div class="card-new-badge">New</div>` : '';

  // Progress bar
  const progressBar = progressPct > 0 
    ? `<div class="card-progress-bar"><div class="card-progress-fill" style="width:${progressPct}%"></div></div>`
    : '';

  // Match % pill
  const matchPill = matchPct ? `<div class="card-match-pill">${matchPct}% Match</div>` : '';

  // Watched overlay
  const watchedBadge = inHist && !progressPct
    ? `<div class="card-watched-badge" aria-label="Watched">✓</div>` : '';

  return `<div class="movie-card" role="button" tabindex="0"
    aria-label="${title}${item.year ? ` (${h(String(item.year))})` : ''}"
    data-id="${id}" data-type="${h(type)}" data-title="${title}"
    data-year="${year}" data-rating="${rating}" data-status="${h(status)}"
    data-poster="${h(dp)}" data-backdrop="${h(db)}" data-ov="${h(do_)}" data-genre="${h(dg)}"
    ${opts.listId ? `data-list-id="${h(opts.listId)}"` : ''}>
    ${topNumHtml}
    <div class="card-poster-wrap">
      <img class="card-poster" src="${h(poster)}" alt="${title} poster" loading="lazy"
        onerror="this.onerror=null;this.src='${NOPOSTER}'">
      ${rating ? `<div class="card-rating">★ ${rating}</div>` : ''}
      <div class="card-type ${h(type)}">${h(typeLabel)}</div>
      ${newEpBadge}
      ${statusBadge}
      ${watchedBadge}
      ${progressBar}
      <div class="card-overlay"><div class="card-actions">${btns.join('')}</div></div>
      <!-- Hover pop-out card (desktop) -->
      <div class="card-hover-popup" aria-hidden="true">
        <div class="chp-backdrop" style="background-image:url('${h(backdrop || poster)}')"></div>
        <div class="chp-gradient"></div>
        <div class="chp-body">
          ${matchPill}
          <div class="chp-title">${title}</div>
          <div class="chp-meta">${year ? `<span>${year}</span>` : ''}${rating ? `<span class="chp-rating">★ ${rating}</span>` : ''}<span class="chp-type-badge ${h(type)}">${h(typeLabel)}</span></div>
          <p class="chp-overview">${h((overview || '').slice(0, 130))}${overview.length > 130 ? '…' : ''}</p>
          <!-- Status Selector Strip -->
          <div class="chp-status-strip" role="group" aria-label="Set Watch Status">
            <button class="chp-status-chip ${status === 'Planned' ? 'active' : ''}" data-ca="set-status" data-status="Planned" title="Plan to Watch">📋 Plan</button>
            <button class="chp-status-chip ${status === 'Watching' ? 'active' : ''}" data-ca="set-status" data-status="Watching" title="Currently Watching">👁️ Watching</button>
            <button class="chp-status-chip ${status === 'Completed' ? 'active' : ''}" data-ca="set-status" data-status="Completed" title="Completed">✅ Done</button>
          </div>
          <div class="chp-actions">
            <button class="chp-btn chp-btn-play" data-ca="watch-now" aria-label="Watch now">▶ Watch</button>
            <button class="chp-btn chp-btn-info" data-ca="info" aria-label="View details">ℹ Info</button>
            ${inLib ? `<button class="chp-btn chp-btn-remove" data-ca="remove" aria-label="Remove from library" title="Remove from Library">✕ Remove</button>` : ''}
            <button class="chp-btn chp-btn-insights" data-ca="go-insights" title="View My Insights" aria-label="View Insights">📊</button>
          </div>
        </div>
      </div>
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
    genre: decodeURIComponent(el.dataset.genre || ''),
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
