'use strict';

import { h } from '../utils/escape.js';
import { card } from '../components/card.js';
import { spinRow } from '../components/skeleton.js';
import {
  getTrendingTMDB, getPopularTMDB, getTopRatedTMDB,
  getNowPlayingTMDB, getUpcomingTMDB, getAiringTodayTMDB, fromTMDB
} from '../api/tmdb.js';
import { getTopAnime, fromJikan } from '../api/jikan.js';
import { state as libState, libAdd } from '../store/library.js';
import { state as histState } from '../store/history.js';
import { getContinueWatching } from '../store/progress.js';
import { toast } from '../components/toast.js';
import { playTrailer } from '../components/trailer.js';
import { openWatchView } from './watch.js';

const W500 = 'https://image.tmdb.org/t/p/w500';
const W1280 = 'https://image.tmdb.org/t/p/w1280';
const NOPOSTER = 'https://placehold.co/300x450/1c1c1c/555?text=No+Image';

export let heroItem = null;
let _heroItems = [];
let _heroIndex = 0;
let _heroTimer = null;
let _heroTransitioning = false;

/* ── HERO CAROUSEL ──────────────────────────────── */

function buildHeroMeta(item, fullData = null) {
  const parts = [];
  if (item.rating && item.rating !== 'N/A') {
    parts.push(`<span class="hero-rating" aria-label="Rating">★ ${h(String(item.rating))}</span>`);
  }
  if (item.year && item.year !== 'N/A') {
    parts.push(`<span>${h(String(item.year))}</span>`);
  }
  if (fullData?.runtime) {
    const hrs = Math.floor(fullData.runtime / 60);
    const mins = fullData.runtime % 60;
    parts.push(`<span>${hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`}</span>`);
  }
  const typeLabel = item.type === 'tv' ? 'Series' : item.type === 'anime' ? 'Anime' : 'Movie';
  parts.push(`<span class="hero-type-badge ${h(item.type || 'movie')}">${typeLabel}</span>`);
  return parts.join('<span class="hero-dot" aria-hidden="true">•</span>');
}

function applyHeroItem(item, animate = false) {
  heroItem = item;
  window._heroItem = item;

  const backdrop = document.getElementById('heroBackdrop');
  const title = document.getElementById('heroTitle');
  const overview = document.getElementById('heroOverview');
  const meta = document.getElementById('heroMeta');
  const genres = document.getElementById('heroGenres');

  if (backdrop) {
    if (animate) {
      backdrop.style.opacity = '0';
      setTimeout(() => {
        backdrop.src = item.backdrop || item.poster || '';
        backdrop.style.transition = 'opacity 0.7s ease';
        backdrop.style.opacity = '1';
      }, 100);
    } else {
      backdrop.src = item.backdrop || item.poster || '';
    }
  }

  if (title) {
    if (animate) {
      title.style.opacity = '0';
      title.style.transform = 'translateY(12px)';
      setTimeout(() => {
        title.textContent = item.title;
        title.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        title.style.opacity = '1';
        title.style.transform = 'translateY(0)';
      }, 180);
    } else {
      title.textContent = item.title;
    }
  }

  if (overview) {
    const ov = item.overview || '';
    overview.textContent = ov.slice(0, 250) + (ov.length > 250 ? '…' : '');
    if (animate) {
      overview.style.opacity = '0';
      setTimeout(() => {
        overview.style.transition = 'opacity 0.5s ease';
        overview.style.opacity = '1';
      }, 240);
    }
  }

  if (meta) {
    meta.innerHTML = buildHeroMeta(item);
  }

  if (genres && item.genre) {
    const tags = item.genre.split(',').slice(0, 4).map(g => g.trim()).filter(Boolean);
    genres.innerHTML = tags.map(g => `<span class="hero-genre-chip">${h(g)}</span>`).join('');
  } else if (genres) {
    genres.innerHTML = '';
  }

  // Update dots
  updateHeroDots();
}

function updateHeroDots() {
  const dots = document.querySelectorAll('.hero-dot-btn');
  dots.forEach((d, i) => d.classList.toggle('active', i === _heroIndex));
}

function nextHero() {
  if (_heroItems.length < 2 || _heroTransitioning) return;
  _heroTransitioning = true;
  _heroIndex = (_heroIndex + 1) % _heroItems.length;
  applyHeroItem(_heroItems[_heroIndex], true);
  setTimeout(() => { _heroTransitioning = false; }, 800);
}

function prevHero() {
  if (_heroItems.length < 2 || _heroTransitioning) return;
  _heroTransitioning = true;
  _heroIndex = (_heroIndex - 1 + _heroItems.length) % _heroItems.length;
  applyHeroItem(_heroItems[_heroIndex], true);
  setTimeout(() => { _heroTransitioning = false; }, 800);
}

function goToHero(idx) {
  if (idx === _heroIndex || _heroTransitioning) return;
  _heroTransitioning = true;
  _heroIndex = idx;
  applyHeroItem(_heroItems[_heroIndex], true);
  setTimeout(() => { _heroTransitioning = false; }, 800);
}

function startHeroTimer() {
  stopHeroTimer();
  const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (isReduced || _heroItems.length < 2) return;
  _heroTimer = setInterval(() => {
    if (!document.hidden) nextHero();
  }, 8000);
}

function stopHeroTimer() {
  if (_heroTimer) clearInterval(_heroTimer);
  _heroTimer = null;
}

// Parallax on scroll
let _lastScrollY = 0;
let _scrollRafPending = false;
function onHeroScroll() {
  if (_scrollRafPending) return;
  _scrollRafPending = true;
  requestAnimationFrame(() => {
    const backdrop = document.getElementById('heroBackdrop');
    if (backdrop && window.activeView === 'home') {
      const offset = window.scrollY * 0.25;
      backdrop.style.transform = `translateY(${offset}px) scale(1.04)`;
    }
    _scrollRafPending = false;
  });
}

export async function loadHero() {
  try {
    const d = await getTrendingTMDB(1, 'all');
    const results = (d.results || []).map(r => fromTMDB(r));
    const picks = results.filter(r => r.backdrop).slice(0, 6);
    if (!picks.length) return;

    _heroItems = picks;
    _heroIndex = 0;
    applyHeroItem(_heroItems[0], false);
    buildHeroDotsBar();
    startHeroTimer();
  } catch (err) {
    console.error('[MovieUltra] loadHero failed:', err);
    const heroTitle = document.getElementById('heroTitle');
    if (heroTitle) heroTitle.textContent = 'Could not load featured title';
  }
}

function buildHeroDotsBar() {
  const dotsEl = document.getElementById('heroDots');
  if (!dotsEl || _heroItems.length < 2) return;
  dotsEl.innerHTML = _heroItems.map((_, i) =>
    `<button class="hero-dot-btn ${i === 0 ? 'active' : ''}" data-hero-idx="${i}" aria-label="Go to slide ${i + 1}"></button>`
  ).join('');
  dotsEl.querySelectorAll('.hero-dot-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      stopHeroTimer();
      goToHero(Number(btn.dataset.heroIdx));
      startHeroTimer();
    });
  });
}

export function initHeroListeners() {
  // Trailer
  document.getElementById('heroTrailerBtn')?.addEventListener('click', async () => {
    if (!heroItem) return;
    if (!heroItem.id) { toast('No trailer available', 'info'); return; }
    await playTrailer(heroItem.type, heroItem.id);
  });

  // Watch
  document.getElementById('heroWatchBtn')?.addEventListener('click', () => {
    if (heroItem) openWatchView(heroItem.type, heroItem.id);
  });

  // Add to watchlist
  document.getElementById('heroAddBtn')?.addEventListener('click', () => {
    if (heroItem) libAdd(heroItem);
  });

  // Prev / Next
  document.getElementById('heroPrevBtn')?.addEventListener('click', () => {
    stopHeroTimer();
    prevHero();
    startHeroTimer();
  });
  document.getElementById('heroNextBtn')?.addEventListener('click', () => {
    stopHeroTimer();
    nextHero();
    startHeroTimer();
  });

  // Pause on hover
  const hero = document.querySelector('.hero');
  hero?.addEventListener('mouseenter', stopHeroTimer);
  hero?.addEventListener('mouseleave', startHeroTimer);

  // Scroll parallax
  window.addEventListener('scroll', onHeroScroll, { passive: true });
}

/* ── ROWS ──────────────────────────────────────── */

export function renderLibraryRow() {
  const el = document.getElementById('libraryRow');
  if (!el) return;
  el.innerHTML = libState.library.length
    ? libState.library.slice(0, 20).map(i => card(i, { showRemove: true })).join('')
    : '<p class="row-empty">Watchlist empty — search above to add titles!</p>';
}

export function renderHistoryRow() {
  const el = document.getElementById('historyRow');
  if (!el) return;
  el.innerHTML = histState.watchHist.length
    ? histState.watchHist.slice(0, 20).map(i => card(i)).join('')
    : '<p class="row-empty">No history yet — mark items as watched!</p>';
}

export function renderContinueWatching() {
  const el = document.getElementById('continueWatchingRow');
  const section = document.getElementById('continueWatchingSection');
  if (!el) return;

  const inProgress = getContinueWatching();
  if (!inProgress.length) {
    if (section) section.style.display = 'none';
    return;
  }
  if (section) section.style.display = '';

  el.innerHTML = inProgress.map(p => {
    const pct = Math.min(100, Math.max(0, Math.round(p.percent || 0)));
    const poster = p.poster || NOPOSTER;
    const title = h(p.title || 'Unknown');
    const safeP = encodeURIComponent(poster);
    const safeB = encodeURIComponent(p.backdrop || '');
    const safeOv = encodeURIComponent(p.overview || '');
    const typeLabel = { movie: 'Movie', tv: 'Series', anime: 'Anime' }[p.type] || p.type;
    const epInfo = p.season ? ` · S${p.season}:E${p.episode || 1}` : '';

    return `
      <div class="continue-card" role="button" tabindex="0"
        data-id="${h(String(p.id))}" data-type="${h(p.type)}"
        data-title="${title}"
        data-poster="${h(safeP)}" data-backdrop="${h(safeB)}" data-ov="${h(safeOv)}"
        aria-label="Resume ${title}">
        <div class="continue-poster-wrap">
          <img class="continue-poster" src="${h(poster)}" alt="${title}" loading="lazy"
            onerror="this.onerror=null;this.src='${NOPOSTER}'">
          <div class="continue-overlay">
            <button class="continue-play-btn" data-id="${h(String(p.id))}" data-type="${h(p.type)}" aria-label="Resume watching">▶ Resume</button>
          </div>
          <div class="continue-progress-bar">
            <div class="continue-progress-fill" style="width:${pct}%"></div>
          </div>
          <button class="continue-remove-btn" data-id="${h(String(p.id))}" data-type="${h(p.type)}" aria-label="Remove from continue watching">✕</button>
          <span class="card-type ${h(p.type)}">${h(typeLabel)}</span>
        </div>
        <div class="continue-info">
          <p class="continue-title" title="${title}">${title}</p>
          <p class="continue-meta">${pct}%${h(epInfo)}</p>
        </div>
      </div>`;
  }).join('');

  // Wire events
  el.querySelectorAll('.continue-play-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const type = btn.dataset.type;
      const p = inProgress.find(x => String(x.id) === id && x.type === type);
      openWatchView(type, id, { season: p?.season || null, episode: p?.episode || null });
    });
  });

  el.querySelectorAll('.continue-remove-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const type = btn.dataset.type;
      const { removeProgress } = window._progressStore || {};
      if (removeProgress) removeProgress(id, type);
      else {
        import('../store/progress.js').then(({ removeProgress: rp }) => {
          rp(id, type);
          renderContinueWatching();
          toast('Removed from continue watching', 'info');
        });
        return;
      }
      renderContinueWatching();
      toast('Removed from continue watching', 'info');
    });
  });

  el.querySelectorAll('.continue-card').forEach(c => {
    const open = () => {
      if (!c.dataset.id) return;
      window.openModal?.({
        id: c.dataset.id,
        type: c.dataset.type || 'movie',
        title: c.dataset.title || '',
        poster: decodeURIComponent(c.dataset.poster || ''),
        backdrop: decodeURIComponent(c.dataset.backdrop || ''),
        overview: decodeURIComponent(c.dataset.ov || ''),
      });
    };
    c.addEventListener('click', e => {
      if (e.target.closest('button')) return;
      open();
    });
    c.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });
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

export async function renderPopularMoviesRow() {
  const el = document.getElementById('popularMoviesRow');
  if (!el) return;
  spinRow(el);
  try {
    const d = await getPopularTMDB('movie', 1);
    el.innerHTML = (d.results || []).slice(0, 15).map(r => card(fromTMDB(r, 'movie'), { showAdd: true })).join('');
  } catch (err) {
    el.innerHTML = `<p class="row-empty">⚠️ ${h(err.message)}</p>`;
  }
}

export async function renderTopRatedRow() {
  const el = document.getElementById('topRatedRow');
  if (!el) return;
  spinRow(el);
  try {
    const d = await getTrendingTMDB(1, 'all');
    // Top 10 numbered cards
    el.innerHTML = (d.results || []).slice(0, 10).map((r, i) =>
      card(fromTMDB(r), { showAdd: true, topNum: i + 1 })
    ).join('');
  } catch (err) {
    el.innerHTML = `<p class="row-empty">⚠️ ${h(err.message)}</p>`;
  }
}

export async function renderNowPlayingRow() {
  const el = document.getElementById('nowPlayingRow');
  if (!el) return;
  spinRow(el);
  try {
    const d = await getNowPlayingTMDB(1);
    el.innerHTML = (d.results || []).slice(0, 15).map(r => card(fromTMDB(r, 'movie'), { showAdd: true })).join('');
  } catch (err) {
    el.innerHTML = `<p class="row-empty">⚠️ ${h(err.message)}</p>`;
  }
}

export async function renderUpcomingRow() {
  const el = document.getElementById('upcomingRow');
  if (!el) return;
  spinRow(el);
  try {
    const d = await getUpcomingTMDB(1);
    el.innerHTML = (d.results || []).slice(0, 15).map(r => card(fromTMDB(r, 'movie'), { showAdd: true })).join('');
  } catch (err) {
    el.innerHTML = `<p class="row-empty">⚠️ ${h(err.message)}</p>`;
  }
}

export async function renderPopularSeriesRow() {
  const el = document.getElementById('popularSeriesRow');
  if (!el) return;
  spinRow(el);
  try {
    const d = await getPopularTMDB('tv', 1);
    el.innerHTML = (d.results || []).slice(0, 15).map(r => card(fromTMDB(r, 'tv'), { showAdd: true })).join('');
  } catch (err) {
    el.innerHTML = `<p class="row-empty">⚠️ ${h(err.message)}</p>`;
  }
}

export async function renderAiringTodayRow() {
  const el = document.getElementById('airingTodayRow');
  if (!el) return;
  spinRow(el);
  try {
    const d = await getAiringTodayTMDB(1);
    el.innerHTML = (d.results || []).slice(0, 15).map(r =>
      card(fromTMDB(r, 'tv'), { showAdd: true, isAiringToday: true })
    ).join('');
  } catch (err) {
    el.innerHTML = `<p class="row-empty">⚠️ ${h(err.message)}</p>`;
  }
}

/* ── PERSONALIZED "BECAUSE YOU WATCHED" ROWS ──── */

export async function renderPersonalizedRows() {
  const container = document.getElementById('personalizedRowsContainer');
  if (!container) return;

  const history = histState.watchHist;
  const library = libState.library;
  const all = [...history, ...library];

  if (all.length < 2) {
    container.style.display = 'none';
    return;
  }

  // Collect genre preferences
  const genreCounts = {};
  all.forEach(item => {
    if (!item.genre) return;
    item.genre.split(',').forEach(g => {
      const gn = g.trim();
      if (gn) genreCounts[gn] = (genreCounts[gn] || 0) + 1;
    });
  });

  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([g]) => g);

  if (!topGenres.length) {
    container.style.display = 'none';
    return;
  }

  container.style.display = '';

  // Hide ALL personalized rows initially. We only show the ones matching top genres.
  const allPersonalizedRows = container.querySelectorAll('.content-row');
  allPersonalizedRows.forEach(row => row.style.display = 'none');

  // Pick a recent watched item for "Because you watched X"
  const recentItem = history[0] || library[library.length - 1];
  const basedOnTitle = recentItem?.title || topGenres[0];

  // Use top genre to discover similar content via TMDB
  const GENRE_MAP = {
    'Action': 28, 'Adventure': 12, 'Animation': 16, 'Comedy': 35,
    'Crime': 80, 'Drama': 18, 'Fantasy': 14, 'Horror': 27,
    'Mystery': 9648, 'Romance': 10749, 'Sci-Fi': 878, 'Science Fiction': 878,
    'Thriller': 53, 'Family': 10751,
  };

  const { discoverTMDB } = await import('../api/tmdb.js');

  for (const genre of topGenres.slice(0, 2)) {
    const genreId = GENRE_MAP[genre];
    if (!genreId) continue;

    const rowEl = document.getElementById(`becauseRow_${genre.replace(/\s/g, '_')}`);
    if (!rowEl) continue;

    const parentRow = rowEl.closest('.content-row');

    try {
      const d = await discoverTMDB('movie', { with_genres: genreId, sort_by: 'popularity.desc', page: 1 });
      const results = (d.results || []).slice(0, 15);
      if (results.length) {
        rowEl.innerHTML = results.map(r => card(fromTMDB(r, 'movie'), { showAdd: true })).join('');
        if (parentRow) parentRow.style.display = '';
      }
    } catch {
      if (parentRow) parentRow.style.display = 'none';
    }
  }

  // Update the "because you watched" label
  const lbl = document.getElementById('becauseWatchedLabel');
  if (lbl) lbl.textContent = `Because you watched ${basedOnTitle}`;
}
