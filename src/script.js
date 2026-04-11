'use strict';

const VERSION = "1.8.0";

/* ── STORAGE KEYS ───────────────────────────── */
const SK = {
  lib:       'mu_lib_v1',
  watchlist: 'mu_watchlist_v1',
  theme:     'mu_theme',
  themeTone: 'mu_theme_tone',
};

const THEME_PRESETS = [
  { id: 'dark', name: 'Dark', icon: '🌑', colors: ['#070b12', '#111827', '#ef4444'], mode: 'dark' },
  { id: 'light', name: 'Light', icon: '☀️', colors: ['#f9fafb', '#e5e7eb', '#ef4444'], mode: 'light' },
  { id: 'amoled', name: 'AMOLED', icon: '⚫', colors: ['#000000', '#050505', '#ef4444'], mode: 'dark' },
  { id: 'midnight', name: 'Midnight', icon: '🌌', colors: ['#020617', '#0f172a', '#60a5fa'], mode: 'dark' },
  { id: 'ocean', name: 'Ocean', icon: '🌊', colors: ['#031525', '#0b253b', '#38bdf8'], mode: 'dark' },
  { id: 'sunset', name: 'Sunset', icon: '🌅', colors: ['#1a0f10', '#3f171b', '#fb923c'], mode: 'dark' },
  { id: 'cherry', name: 'Cherry', icon: '🌸', colors: ['#1a0d1a', '#31132f', '#ec4899'], mode: 'dark' },
  { id: 'forest', name: 'Forest', icon: '🌲', colors: ['#07140f', '#11231b', '#4ade80'], mode: 'dark' },
  { id: 'ruby', name: 'Ruby', icon: '❤️', colors: ['#13070b', '#2f0f16', '#f43f5e'], mode: 'dark' },
];

/* ── MIGRATE old keys ───────────────────────── */
(function migrate() {
  if (localStorage.getItem('mu_migrated_v1')) return;
  const old   = localStorage.getItem('v4_pro_db');
  const oldWl = localStorage.getItem('mu_watchlist');
  if (old   && !localStorage.getItem(SK.lib))       localStorage.setItem(SK.lib, old);
  if (oldWl && !localStorage.getItem(SK.watchlist)) localStorage.setItem(SK.watchlist, oldWl);
  localStorage.setItem('mu_migrated_v1', '1');
})();

/* ── STATUS CONFIG ──────────────────────────── */
const STATUS_LABELS = {
  Planned:   { icon: '📋', color: '#6b7280' },
  Watching:  { icon: '👁',  color: '#3b82f6' },
  Completed: { icon: '✅', color: '#10b981' },
  Dropped:   { icon: '❌', color: '#ef4444' },
};

const PLATFORM_COLORS = {
  'Netflix': '#E50914',
  'Prime': '#00A8E1',
  'Disney+': '#113CCF',
  'Hulu': '#1CE783',
  'HBO': '#8B00FF',
};

const PLATFORM_LIST = ['Netflix', 'Prime', 'Disney+', 'Hulu', 'HBO'];

/* ── STATE ──────────────────────────────────── */
let library   = JSON.parse(localStorage.getItem(SK.lib))      || [];
let watchlist = JSON.parse(localStorage.getItem(SK.watchlist)) || [];
let activeType          = 'movie';
let librarySearch       = '';
let librarySortBy       = 'recent';
let libraryStatusFilter = 'All';
let _modalIdx           = null;   // index of item currently open in modal
let trendingItems       = [];
let liveMovies          = [];
let liveSeries          = [];
let liveAnime           = [];

/* Ensure all items have required fields */
library = library.map(i => ({
  status:     'Planned',
  starRating: 0,
  platform:   '',
  ...i,
}));

watchlist = watchlist.map(i => ({
  status:     'Planned',
  starRating: 0,
  platform:   '',
  ...i,
}));

/* ── SAVE HELPERS ───────────────────────────── */
function saveLib()  { localStorage.setItem(SK.lib, JSON.stringify(library)); }
function saveWl()   { localStorage.setItem(SK.watchlist, JSON.stringify(watchlist)); }

function getSourceArray(source) {
  if (source === 'watchlist') return watchlist;
  if (source === 'trending') return trendingItems;
  if (source === 'live-movies') return liveMovies;
  if (source === 'live-series') return liveSeries;
  if (source === 'live-anime') return liveAnime;
  return library;
}

function persistSource(source) {
  if (source === 'watchlist') return saveWl();
  if (source === 'library') return saveLib();
}

/* ── TOAST ──────────────────────────────────── */
function showToast(msg) {
  let toast = document.getElementById('mu-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'mu-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = 'mu-toast mu-toast-show';
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.remove('mu-toast-show'), 3000);
}

function updateOfflineBanner() {
  const banner = document.getElementById('offlineBanner');
  if (!banner) return;
  banner.classList.toggle('show', !navigator.onLine);
}

/* ── SIDEBAR ────────────────────────────────── */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('active');
  document.getElementById('overlay').classList.toggle('active');
}

/* ── THEME ──────────────────────────────────── */
function toggleTheme() {
  const next = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
  applyTheme(next);
  renderSettings();
}

function updateSidebarLogo() {
  const logo = document.getElementById('sbLogoText');
  if (!logo) return;
  const isDark = document.body.classList.contains('dark-mode');
  logo.style.color = isDark ? '#f8fafc' : '#0f172a';
  logo.style.textShadow = isDark ? '0 0 18px rgba(244,63,94,0.16)' : 'none';
}

function applyTheme(themeId = 'dark') {
  const uniqueThemes = [...new Map(THEME_PRESETS.map(t => [t.id, t])).values()];
  const selected = uniqueThemes.find(t => t.id === themeId) || uniqueThemes[0];
  document.body.classList.toggle('dark-mode', selected.mode !== 'light');
  document.body.dataset.theme = selected.id;
  document.body.style.setProperty('--bg', selected.colors[0]);
  document.body.style.setProperty('--card-bg', selected.colors[1]);
  document.body.style.setProperty('--accent', selected.colors[2]);
  localStorage.setItem(SK.theme, selected.mode);
  localStorage.setItem(SK.themeTone, selected.id);
  updateSidebarLogo();
}

applyTheme(localStorage.getItem(SK.themeTone) || localStorage.getItem(SK.theme) || 'dark');

/* ── TYPE CHIPS ─────────────────────────────── */
function setType(type) {
  activeType = type;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  document.getElementById(`chip-${type}`)?.classList.add('active');
}

/* ── NAVIGATION ─────────────────────────────── */
function showView(viewName) {
  document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
  (document.getElementById(`view-${viewName}`) || document.getElementById('view-home'))
    .classList.add('active');

  document.getElementById('pageTitle').innerText = viewName.toUpperCase();
  document.getElementById('searchContainer').style.display = viewName === 'home' ? 'block' : 'none';

  document.querySelectorAll('.sb-item[data-view]').forEach(el =>
    el.classList.toggle('active', el.dataset.view === viewName));
  document.querySelectorAll('.b-item[data-view]').forEach(el =>
    el.classList.toggle('active', el.dataset.view === viewName));

  if (viewName === 'trending')  loadTrending();
  if (viewName === 'analytics') loadStats();
  if (viewName === 'movies')    loadLiveMovies();
  if (viewName === 'series')    loadLiveSeries();
  if (viewName === 'anime')     loadLiveAnime();
  if (viewName === 'watchlist') renderWatchlist();
  if (viewName === 'profile')   renderProfile();
  if (viewName === 'settings')  renderSettings();
  if (viewName === 'feedback')  renderFeedback();

  document.getElementById('sidebar').classList.remove('active');
  document.getElementById('overlay').classList.remove('active');
}

/* ── QUERY ENGINE ───────────────────────────── */
function getProcessedLibrary(type = null) {
  let items = library.map((item, idx) => ({ item, idx }));
  if (type) items = items.filter(({ item }) => item.type === type);

  const q = (librarySearch || '').trim().toLowerCase();
  if (q) {
    items = items.filter(({ item }) =>
      [item.title, item.year, item.type, item.status]
        .map(v => String(v || '').toLowerCase()).join(' ').includes(q)
    );
  }

  if (libraryStatusFilter !== 'All') {
    items = items.filter(({ item }) => (item.status || 'Planned') === libraryStatusFilter);
  }

  if (librarySortBy === 'rating') {
    items.sort((a, b) => {
      const n = v => { const x = parseFloat(v); return isFinite(x) ? x : -1; };
      return n(b.item.rating) - n(a.item.rating) || a.idx - b.idx;
    });
  } else if (librarySortBy === 'year') {
    items.sort((a, b) => {
      const n = v => { const x = parseInt(v, 10); return isFinite(x) ? x : 0; };
      return n(b.item.year) - n(a.item.year) || a.idx - b.idx;
    });
  } else {
    items.sort((a, b) => a.idx - b.idx);
  }
  return items;
}

/* ── LIBRARY TOOLS ──────────────────────────── */
function ensureLibraryTools() {
  if (document.getElementById('libraryTools')) return;
  const host = document.getElementById('searchContainer');
  if (!host) return;

  const tools = document.createElement('div');
  tools.id = 'libraryTools';
  tools.className = 'library-tools';
  tools.innerHTML = `
    <input id="librarySearchInput" class="library-tool-input" type="text" placeholder="Search inside library…">
    <select id="librarySortSelect" class="library-tool-select">
      <option value="recent">⏱ Recently Added</option>
      <option value="rating">⭐ Rating</option>
      <option value="year">📅 Year</option>
    </select>
    <select id="libraryStatusSelect" class="library-tool-select">
      <option value="All">🎯 All Status</option>
      <option value="Planned">📋 Planned</option>
      <option value="Watching">👁 Watching</option>
      <option value="Completed">✅ Completed</option>
      <option value="Dropped">❌ Dropped</option>
    </select>
    <button id="libraryToolsReset" class="library-tool-btn">Reset</button>`;
  host.appendChild(tools);

  const rerender = () => {
    render();
    renderFiltered('movie', 'moviesGrid');
    renderFiltered('tv',    'seriesGrid');
    renderFiltered('anime', 'animeGrid');
  };

  document.getElementById('librarySearchInput').addEventListener('input', e => {
    librarySearch = e.target.value || '';
    rerender();
  });
  document.getElementById('librarySortSelect').addEventListener('change', e => {
    librarySortBy = e.target.value;
    rerender();
  });
  document.getElementById('libraryStatusSelect').addEventListener('change', e => {
    libraryStatusFilter = e.target.value;
    rerender();
  });
  document.getElementById('libraryToolsReset').addEventListener('click', () => {
    librarySearch = ''; librarySortBy = 'recent'; libraryStatusFilter = 'All';
    document.getElementById('librarySearchInput').value = '';
    document.getElementById('librarySortSelect').value  = 'recent';
    document.getElementById('libraryStatusSelect').value = 'All';
    rerender();
    showToast('Filters reset');
  });
}

function filterView(type, gridId, query) {
  const saved = librarySearch;
  librarySearch = query || '';
  renderFiltered(type, gridId);
  librarySearch = saved;
}

/* ── CARD BUILDER ───────────────────────────── */
function buildCard({ item, idx, actions = [], showStatus = true, source = 'library' }) {
  const status = item.status || 'Planned';
  const s      = STATUS_LABELS[status] || STATUS_LABELS.Planned;
  const stars  = item.starRating || 0;
  const platform = item.platform || '';
  const pColor = PLATFORM_COLORS[platform] || '';
  const starBar = stars > 0
    ? `<div class="card-stars">${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}</div>` : '';

  const statusBadge = showStatus
    ? `<div class="status-badge" style="background:${s.color}">${s.icon} ${status}</div>` : '';

  const platformBadge = platform && pColor
    ? `<div class="platform-badge" style="background:${pColor}">${platform}</div>` : '';

  const statusSelect = showStatus ? `
    <select class="status-select" onchange="setStatus(${idx},this.value,'${source}')">
      <option value="Planned"   ${status==='Planned'   ?'selected':''}>📋 Planned</option>
      <option value="Watching"  ${status==='Watching'  ?'selected':''}>👁 Watching</option>
      <option value="Completed" ${status==='Completed' ?'selected':''}>✅ Completed</option>
      <option value="Dropped"   ${status==='Dropped'   ?'selected':''}>❌ Dropped</option>
    </select>` : '';

  const btns = actions.map(a =>
    `<button class="${a.cls}" onclick="${a.fn}">${a.label}</button>`).join('');

  return `
    <div class="movie-card" onclick="openModal(${idx},'${source}')" style="cursor:pointer">
      <div class="poster-container">
        <img src="${item.poster||''}" alt="${(item.title||'').replace(/"/g,'&quot;')}"
             loading="lazy" onerror="this.src=''">
        <div class="badge">★ ${item.rating||'N/A'}</div>
        ${platformBadge}
        ${statusBadge}
      </div>
      <div class="card-details" onclick="event.stopPropagation()">
        <h3 title="${(item.title||'').replace(/"/g,'&quot;')}">${item.title||''}</h3>
        <p class="card-meta">${item.year||'N/A'} · ${(item.type||'').toUpperCase()}</p>
        ${starBar}
        ${statusSelect}
        <div class="card-actions">${btns}</div>
      </div>
    </div>`;
}

/* ── STATUS UPDATE ──────────────────────────── */
function setStatus(idx, status, source) {
  const arr = getSourceArray(source);
  if (!arr[idx]) return;
  arr[idx] = { ...arr[idx], status };
  persistSource(source);
  showToast(`Status → ${status}`);
  render();
  renderFiltered('movie', 'moviesGrid');
  renderFiltered('tv',    'seriesGrid');
  renderFiltered('anime', 'animeGrid');
  if (source === 'watchlist') renderWatchlist();
}

/* ══════════════════════════════════════════════
   DETAIL MODAL
══════════════════════════════════════════════ */

function openModal(idx, source) {
  source = source || 'library';
  const arr = getSourceArray(source);
  const item = arr[idx];
  if (!item) return;
  _modalIdx = { idx, source };

  const modal = document.getElementById('detailModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  /* Fill static fields immediately */
  document.getElementById('modalTitle').textContent    = item.title || '';
  document.getElementById('modalOverview').textContent = item.overview || 'No overview available.';
  document.getElementById('modalBackdrop').src         = item.backdrop || item.poster || '';
  document.getElementById('modalPills').innerHTML      = buildModalPills(item);
  document.getElementById('modalGenres').innerHTML     = (item.genres || [])
    .map(g => `<span class="genre-tag">${g}</span>`).join('');

  /* Star rating */
  renderModalStars(item.starRating || 0);

  /* Status pills */
  renderModalStatus(item.status || 'Planned');

  /* Platform pills */
  renderModalPlatform(item.platform || '');

  /* Footer */
  document.getElementById('modalFoot').innerHTML = buildModalFoot(source);

  /* Fetch extra details from TMDB if item is movie or tv and has no overview */
  if ((item.type === 'movie' || item.type === 'tv') && (!item.overview || !item.backdrop)) {
    fetchItemDetails(item, idx, source);
  }
}

function buildModalPills(item) {
  const pills = [];
  const typeLabel = item.type === 'tv' ? 'Series' : item.type
    ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : '';
  if (typeLabel)  pills.push(`<span class="modal-pill">${typeLabel}</span>`);
  if (item.year)  pills.push(`<span class="modal-pill">${item.year}</span>`);
  if (item.rating && item.rating !== 'N/A')
    pills.push(`<span class="modal-pill gold">★ ${item.rating}</span>`);
  return pills.join('');
}

function buildModalFoot(source) {
  if (source === 'trending') {
    return `
      <button class="modal-btn-ghost"   onclick="openTrailerFromModal()">▶ Trailer</button>
      <button class="modal-btn-primary" onclick="modalAddToLibrary()">+ Add to Library</button>
      <button class="modal-btn-primary" onclick="modalAddToWatchlist()">⭐ Watchlist</button>
      <button class="modal-btn-ghost"   onclick="closeModal()">Close</button>`;
  }
  if (source === 'watchlist') {
    return `
      <button class="modal-btn-ghost"   onclick="openTrailerFromModal()">▶ Trailer</button>
      <button class="modal-btn-primary" onclick="modalAddToLibrary()">+ Add to Library</button>
      <button class="modal-btn-ghost"   onclick="closeModal()">Close</button>`;
  }
  return `
    <button class="modal-btn-ghost"   onclick="openTrailerFromModal()">▶ Trailer</button>
    <button class="modal-btn-primary" onclick="modalAddToWatchlist()">⭐ Watchlist</button>
    <button class="modal-btn-ghost"   onclick="closeModal()">Close</button>`;
}

function closeModal() {
  document.getElementById('detailModal')?.classList.add('hidden');
  document.body.style.overflow = '';
  _modalIdx = null;
}

/* Fetch extra TMDB details for movie/tv */
async function fetchItemDetails(item, idx, source) {
  try {
    let data, backdrop, overview, genres = [];

    if (item.type === 'movie' || item.type === 'tv') {
      /* search for id first, then get details */
      const searchPath = item.type === 'movie' ? 'search/movie' : 'search/tv';
      const sr = await fetch(`/api/tmdb?path=${searchPath}&query=${encodeURIComponent(item.title)}`);
      const sd = await sr.json();
      const first = sd.results?.[0];
      if (!first) return;

      const detailPath = item.type === 'movie' ? `movie/${first.id}` : `tv/${first.id}`;
      const dr = await fetch(`/api/tmdb?path=${detailPath}`);
      data = await dr.json();

      backdrop = data.backdrop_path
        ? `https://image.tmdb.org/t/p/w780${data.backdrop_path}` : item.poster || '';
      overview = data.overview || item.overview || '';
      genres   = (data.genres || []).map(g => g.name);
    }

    if (!backdrop && !overview) return;

    /* Update UI if modal still open for same item */
    if (_modalIdx && _modalIdx.idx === idx && _modalIdx.source === source) {
      if (backdrop) {
        const img = document.getElementById('modalBackdrop');
        if (img) img.src = backdrop;
      }
      if (overview) {
        const ov = document.getElementById('modalOverview');
        if (ov && ov.textContent === 'No overview available.') ov.textContent = overview;
      }
      if (genres.length) {
        const gEl = document.getElementById('modalGenres');
        if (gEl) gEl.innerHTML = genres.map(g => `<span class="genre-tag">${g}</span>`).join('');
      }
    }

    /* Persist to library for next time */
    const arr = getSourceArray(source);
    if (arr[idx]) {
      arr[idx] = { ...arr[idx], backdrop, overview, genres };
      persistSource(source);
    }
  } catch(e) { /* silently ignore */ }
}

/* Star rating UI */
function renderModalStars(current) {
  const container = document.getElementById('modalStars');
  const hint      = document.getElementById('starHint');
  if (!container) return;
  container.querySelectorAll('.star').forEach(btn => {
    const v = parseInt(btn.dataset.v, 10);
    btn.classList.toggle('active', v <= current);
  });
  if (hint) hint.textContent = current > 0 ? `${current} / 5` : 'Tap to rate';
}

/* Status pills inside modal */
function renderModalStatus(current) {
  document.querySelectorAll('.modal-status-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.s === current);
  });
}

function renderModalPlatform(current) {
  const wrap = document.getElementById('modalPlatformPills');
  if (!wrap) return;
  wrap.innerHTML = PLATFORM_LIST.map(name => {
    const active = name === current;
    const color = PLATFORM_COLORS[name];
    return `<button class="modal-platform-pill ${active ? 'active' : ''}" data-p="${name}" style="--p-color:${color}">${name}</button>`;
  }).join('');
}

function setPlatform(idx, platform, source) {
  const arr = getSourceArray(source);
  if (!arr[idx]) return;
  arr[idx] = { ...arr[idx], platform };
  persistSource(source);
  render();
  renderFiltered('movie', 'moviesGrid');
  renderFiltered('tv',    'seriesGrid');
  renderFiltered('anime', 'animeGrid');
  if (source === 'watchlist') renderWatchlist();
}

async function openTrailerFromModal() {
  if (!_modalIdx) return;
  const { idx, source } = _modalIdx;
  const arr = getSourceArray(source);
  const item = arr[idx];
  if (!item) return;

  if (item.type === 'anime') {
    showToast('Trailers not available for anime');
    return;
  }

  const searchType = item.type === 'tv' ? 'tv' : 'movie';
  try {
    const sr = await fetch(`/api/tmdb?path=search/${searchType}&query=${encodeURIComponent(item.title || '')}`);
    const sd = await sr.json();
    const tmdbId = sd.results?.[0]?.id;
    if (!tmdbId) {
      showToast('No trailer found ❌');
      return;
    }

    const vr = await fetch(`/api/tmdb?path=${searchType}/${tmdbId}/videos`);
    const vd = await vr.json();
    const trailer = (vd.results || []).find(v => v.type === 'Trailer' && v.site === 'YouTube' && v.key);
    if (!trailer) {
      showToast('No trailer found ❌');
      return;
    }
    openTrailerModal(trailer.key);
  } catch (e) {
    showToast('No trailer found ❌');
  }
}

function openTrailerModal(youtubeKey) {
  const modal = document.getElementById('trailerModal');
  const wrap  = document.getElementById('trailerFrameWrap');
  if (!modal || !wrap || !youtubeKey) return;
  wrap.innerHTML = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${youtubeKey}?autoplay=1" title="YouTube trailer" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeTrailerModal() {
  const modal = document.getElementById('trailerModal');
  const wrap  = document.getElementById('trailerFrameWrap');
  if (modal) modal.classList.add('hidden');
  if (wrap) wrap.innerHTML = '';
  if (document.getElementById('detailModal')?.classList.contains('hidden')) {
    document.body.style.overflow = '';
  }
}

/* Modal star click */
document.addEventListener('click', e => {
  const star = e.target.closest('.star');
  if (!star || !_modalIdx) return;
  const v      = parseInt(star.dataset.v, 10);
  const { idx, source } = _modalIdx;
  const arr    = getSourceArray(source);
  if (!arr[idx]) return;
  arr[idx] = { ...arr[idx], starRating: v };
  persistSource(source);
  renderModalStars(v);
  render();
  renderFiltered('movie', 'moviesGrid');
  renderFiltered('tv',    'seriesGrid');
  renderFiltered('anime', 'animeGrid');
  showToast(`Rated ${v} ★`);
});

/* Modal status pill click */
document.addEventListener('click', e => {
  const pill = e.target.closest('.modal-status-pill');
  if (!pill || !_modalIdx) return;
  const status = pill.dataset.s;
  const { idx, source } = _modalIdx;
  setStatus(idx, status, source);
  renderModalStatus(status);
});

/* Modal platform pill click */
document.addEventListener('click', e => {
  const pill = e.target.closest('.modal-platform-pill');
  if (!pill || !_modalIdx) return;
  const platform = pill.dataset.p || '';
  const { idx, source } = _modalIdx;
  setPlatform(idx, platform, source);
  renderModalPlatform(platform);
});

/* Modal close button + overlay click */
document.addEventListener('click', e => {
  if (e.target.id === 'modalClose') { closeModal(); return; }
  if (e.target.id === 'detailModal') { closeModal(); return; }
  if (e.target.id === 'trailerModal' || e.target.id === 'trailerClose') { closeTrailerModal(); return; }
});

/* Close on Escape */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeTrailerModal();
    closeModal();
  }
});

document.getElementById('modalClose')?.addEventListener('click', closeModal);

/* Watchlist add from modal */
function modalAddToWatchlist() {
  if (!_modalIdx) return;
  const { idx, source } = _modalIdx;
  const item = getSourceArray(source)[idx];
  if (!item) return;
  const dup = watchlist.some(w => w.title === item.title && w.type === item.type);
  if (dup) { showToast('Already in watchlist'); return; }
  watchlist.unshift({ ...item });
  saveWl();
  showToast('Saved to watchlist ⭐');
}

function modalAddToLibrary() {
  if (!_modalIdx) return;
  const { idx, source } = _modalIdx;
  const item = getSourceArray(source)[idx];
  if (!item) return;
  const dup = library.some(l => l.title === item.title && l.type === item.type);
  if (dup) { showToast('Already in library'); return; }
  library.unshift({ ...item });
  saveLib();
  render();
  showToast(`"${item.title}" added to library ✅`);
  closeModal();
}

/* ── API ────────────────────────────────────── */
async function fetchMedia(query, type) {
  try {
    if (type === 'anime') {
      const res  = await fetch(`/api/jikan?path=anime&q=${encodeURIComponent(query)}&limit=1`);
      const data = await res.json();
      if (data.data?.length > 0) {
        const a = data.data[0];
        return {
          title:      a.title,
          year:       a.aired?.prop?.from?.year || 'N/A',
          rating:     a.score ? String(parseFloat(a.score).toFixed(1)) : 'N/A',
          poster:     a.images?.jpg?.large_image_url || '',
          overview:   a.synopsis || '',
          type:       'anime',
          status:     'Planned',
          starRating: 0,
          platform:   '',
        };
      }
    } else {
      const res  = await fetch(`/api/tmdb?path=search/${type}&query=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.results?.length > 0) {
        const r = data.results[0];
        return {
          title:      r.title || r.name,
          year:       (r.release_date || r.first_air_date || 'N/A').split('-')[0],
          rating:     r.vote_average != null ? r.vote_average.toFixed(1) : 'N/A',
          poster:     r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : '',
          backdrop:   r.backdrop_path ? `https://image.tmdb.org/t/p/w780${r.backdrop_path}` : '',
          overview:   r.overview || '',
          type,
          status:     'Planned',
          starRating: 0,
          platform:   '',
        };
      }
      if (type === 'tv') {
        const tvRes = await fetch(`/api/tvmaze?path=search/shows&q=${encodeURIComponent(query)}`);
        const tvData = await tvRes.json();
        if (Array.isArray(tvData) && tvData.length > 0) {
          const s = tvData[0].show || {};
          let omdbRating = 'N/A';
          if (s.externals?.imdb) {
            const or = await fetch(`/api/omdb?i=${encodeURIComponent(s.externals.imdb)}`);
            const od = await or.json();
            if (od?.imdbRating && od.imdbRating !== 'N/A') omdbRating = od.imdbRating;
          }
          return {
            title:      s.name || query,
            year:       (s.premiered || 'N/A').split('-')[0],
            rating:     omdbRating !== 'N/A' ? omdbRating : (s.rating?.average != null ? String(s.rating.average) : 'N/A'),
            poster:     s.image?.original || s.image?.medium || '',
            backdrop:   s.image?.original || s.image?.medium || '',
            overview:   (s.summary || '').replace(/<[^>]*>/g, ''),
            type,
            status:     'Planned',
            starRating: 0,
            platform:   '',
          };
        }
      }
    }
  } catch(e) { console.error(e); }
  return null;
}

/* ── SEARCH ─────────────────────────────────── */
async function handleSearch() {
  const input = document.getElementById('smartInput');
  const btn   = document.getElementById('searchTrigger');
  const query = input.value.trim();
  if (!query) return;
  btn.disabled    = true;
  btn.textContent = '…';
  try {
    const result = await fetchMedia(query, activeType);
    if (result) {
      if (library.some(l => l.title === result.title && l.type === result.type)) {
        showToast('Already in library'); return;
      }
      library.unshift(result);
      saveLib();
      render();
      input.value = '';
      showToast(`"${result.title}" added ✅`);
    } else {
      showToast('Not found — try a different title ❌');
    }
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Add';
  }
}

document.getElementById('searchTrigger').addEventListener('click', handleSearch);
document.getElementById('smartInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleSearch();
});

/* ── TRENDING ────────────────────────────────── */
async function loadTrending() {
  const grid = document.getElementById('trendingGrid');
  grid.innerHTML = "<p class='placeholder-msg'>Loading…</p>";
  try {
    const res   = await fetch('/api/tmdb?path=trending/all/day');
    const data  = await res.json();
    const items = data.results || [];
    trendingItems = items.map(item => {
      const type = item.media_type === 'movie' ? 'movie' : 'tv';
      return {
        title: item.title || item.name || '',
        year: (item.release_date || item.first_air_date || 'N/A').split('-')[0],
        rating: item.vote_average != null ? item.vote_average.toFixed(1) : 'N/A',
        poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
        backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : '',
        overview: item.overview || '',
        type,
        status: 'Planned',
        starRating: 0,
        platform: '',
      };
    });

    if (!trendingItems.length) {
      grid.innerHTML = "<p class='placeholder-msg'>No results.</p>";
      return;
    }

    grid.innerHTML = trendingItems.map((item, idx) => {
      const title = item.title || '';
      const safe  = title.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return `
        <div class="movie-card" onclick="openModal(${idx},'trending')" style="cursor:pointer">
          <div class="poster-container">
            <img src="${item.poster || ''}" loading="lazy" onerror="this.src=''">
            <div class="badge">★ ${item.rating || 'N/A'}</div>
          </div>
          <div class="card-details" onclick="event.stopPropagation()">
            <h3 title="${title.replace(/"/g,'&quot;')}">${title}</h3>
            <p class="card-meta">${(item.type || '').toUpperCase()}</p>
            <div class="card-actions">
              <button class="btn-add" onclick="event.stopPropagation(); quickAdd('${safe}','${item.type}')">+ Library</button>
            </div>
          </div>
        </div>`;
    }).join('');
  } catch(e) {
    grid.innerHTML = `
      <p class='placeholder-msg'>Failed to load — check connection.</p>
      <button onclick="loadTrending()" class="btn-add" style="margin:20px auto;display:block">Retry</button>`;
  }
}

function renderLiveGrid(gridId, source, items) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  if (!items.length) {
    grid.innerHTML = "<p class='placeholder-msg'>No results.</p>";
    return;
  }
  grid.innerHTML = items.map((item, idx) => {
    const title = item.title || '';
    const safe  = title.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return `
      <div class="movie-card" onclick="openModal(${idx},'${source}')" style="cursor:pointer">
        <div class="poster-container">
          <img src="${item.poster || ''}" loading="lazy" onerror="this.src=''">
          <div class="badge">★ ${item.rating || 'N/A'}</div>
        </div>
        <div class="card-details" onclick="event.stopPropagation()">
          <h3 title="${title.replace(/"/g,'&quot;')}">${title}</h3>
          <p class="card-meta">${(item.type || '').toUpperCase()}</p>
          <div class="card-actions">
            <button class="btn-add" onclick="event.stopPropagation(); quickAdd('${safe}','${item.type}')">+ Library</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

async function loadLiveMovies() {
  const grid = document.getElementById('moviesGrid');
  if (!grid) return;
  grid.innerHTML = "<p class='placeholder-msg'>Loading live movies…</p>";
  try {
    const res = await fetch('/api/tmdb?path=movie/popular');
    const data = await res.json();
    liveMovies = (data.results || []).map(item => ({
      title: item.title || '',
      year: (item.release_date || 'N/A').split('-')[0],
      rating: item.vote_average != null ? item.vote_average.toFixed(1) : 'N/A',
      poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
      backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : '',
      overview: item.overview || '',
      type: 'movie',
      status: 'Planned',
      starRating: 0,
      platform: '',
    }));
    renderLiveGrid('moviesGrid', 'live-movies', liveMovies);
  } catch (e) {
    grid.innerHTML = "<p class='placeholder-msg'>Failed to load live movies.</p>";
  }
}

async function loadLiveSeries() {
  const grid = document.getElementById('seriesGrid');
  if (!grid) return;
  grid.innerHTML = "<p class='placeholder-msg'>Loading live series…</p>";
  try {
    const res = await fetch('/api/tvmaze?path=shows&page=1');
    const data = await res.json();
    liveSeries = (Array.isArray(data) ? data : []).slice(0, 30).map(item => ({
      title: item.name || '',
      year: (item.premiered || 'N/A').split('-')[0],
      rating: item.rating?.average != null ? String(item.rating.average) : 'N/A',
      poster: item.image?.original || item.image?.medium || '',
      backdrop: item.image?.original || item.image?.medium || '',
      overview: (item.summary || '').replace(/<[^>]*>/g, ''),
      type: 'tv',
      status: 'Planned',
      starRating: 0,
      platform: '',
    }));
    renderLiveGrid('seriesGrid', 'live-series', liveSeries);
  } catch (e) {
    grid.innerHTML = "<p class='placeholder-msg'>Failed to load live series.</p>";
  }
}

async function loadLiveAnime() {
  const grid = document.getElementById('animeGrid');
  if (!grid) return;
  grid.innerHTML = "<p class='placeholder-msg'>Loading live anime…</p>";
  try {
    const res = await fetch('/api/jikan?path=top/anime&limit=30');
    const data = await res.json();
    liveAnime = (data.data || []).map(item => ({
      title: item.title || '',
      year: item.year || (item.aired?.from || 'N/A').slice(0, 4),
      rating: item.score != null ? item.score.toFixed(2) : 'N/A',
      poster: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '',
      backdrop: item.trailer?.images?.maximum_image_url || item.images?.jpg?.large_image_url || '',
      overview: item.synopsis || '',
      type: 'anime',
      status: 'Planned',
      starRating: 0,
      platform: '',
    }));
    renderLiveGrid('animeGrid', 'live-anime', liveAnime);
  } catch (e) {
    grid.innerHTML = "<p class='placeholder-msg'>Failed to load live anime.</p>";
  }
}

async function quickAdd(title, type) {
  const result = await fetchMedia(title, type);
  if (!result) { showToast('Could not add — try again'); return; }
  if (library.some(l => l.title === result.title && l.type === result.type)) {
    showToast('Already in library'); return;
  }
  library.unshift(result);
  saveLib();
  showToast(`"${result.title}" added ✅`);
  render();
}

/* ── LIBRARY RENDER ─────────────────────────── */
function render() {
  const grid = document.getElementById('libraryGrid');
  if (!grid) return;
  const items = getProcessedLibrary();
  if (!library.length) {
    grid.innerHTML = "<p class='placeholder-msg'>Library is empty — search above to add!</p>";
    return;
  }
  if (!items.length) {
    grid.innerHTML = "<p class='placeholder-msg'>No items match current search/filter.</p>";
    return;
  }
  grid.innerHTML = items.map(({ item, idx }) =>
    buildCard({
      item, idx, source: 'library',
      actions: [
        { label: '⭐ Watchlist', cls: 'btn-add',   fn: `addToWatchlist(${idx})` },
        { label: '🗑 Remove',   cls: 'btn-remove', fn: `remove(${idx})` },
      ],
    })
  ).join('');
}

/* ── REMOVE ─────────────────────────────────── */
function remove(idx) {
  library.splice(idx, 1);
  saveLib();
  render();
  showToast('Removed from library');
}

/* ── WATCHLIST ──────────────────────────────── */
function addToWatchlist(idx) {
  const item = library[idx];
  if (!item) return;
  if (watchlist.some(w => w.title === item.title && w.type === item.type)) {
    showToast('Already in watchlist'); return;
  }
  watchlist.unshift({ ...item });
  saveWl();
  showToast('Saved to watchlist ⭐');
}

function removeFromWatchlist(idx) {
  watchlist.splice(idx, 1);
  saveWl();
  renderWatchlist();
  showToast('Removed from watchlist');
}

function addFromWatchlist(idx) {
  const item = watchlist[idx];
  if (!item) return;
  if (library.some(l => l.title === item.title && l.type === item.type)) {
    showToast('Already in library'); return;
  }
  library.unshift({ ...item });
  saveLib();
  render();
  showToast(`"${item.title}" added to library ✅`);
}

function renderWatchlist() {
  const grid = document.getElementById('watchlistGrid');
  if (!grid) return;
  if (!watchlist.length) {
    grid.innerHTML = "<p class='placeholder-msg'>Watchlist is empty.</p>";
    return;
  }
  grid.innerHTML = watchlist.map((item, idx) =>
    buildCard({
      item, idx, source: 'watchlist',
      actions: [
        { label: '+ Library', cls: 'btn-add',   fn: `addFromWatchlist(${idx})` },
        { label: '🗑 Remove', cls: 'btn-remove', fn: `removeFromWatchlist(${idx})` },
      ],
    })
  ).join('');
}

/* ── FILTERED VIEWS ─────────────────────────── */
function renderFiltered(type, gridId) {
  const grid  = document.getElementById(gridId);
  if (!grid) return;
  const items = getProcessedLibrary(type);
  if (!items.length) {
    grid.innerHTML = library.length
      ? "<p class='placeholder-msg'>No items match current search/filter.</p>"
      : "<p class='placeholder-msg'>Nothing here yet — add some!</p>";
    return;
  }
  grid.innerHTML = items.map(({ item, idx }) =>
    buildCard({
      item, idx, source: 'library',
      actions: [
        { label: '🗑 Remove', cls: 'btn-remove', fn: `removeFiltered(${idx},'${gridId}')` },
      ],
    })
  ).join('');
}

function removeFiltered(idx, gridId) {
  const type = library[idx]?.type;
  library.splice(idx, 1);
  saveLib();
  render();
  if (type && gridId) renderFiltered(type, gridId);
  showToast('Removed');
}

/* ── ANALYTICS ──────────────────────────────── */
function getCssVar(name, fallback = '') {
  const v = getComputedStyle(document.body).getPropertyValue(name).trim();
  return v || fallback;
}

function drawTypeDoughnut(canvas, typeCounts) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const total = typeCounts.movie + typeCounts.tv + typeCounts.anime;
  const textMain = getCssVar('--text-main', '#111827');
  const textSub  = getCssVar('--text-sub', '#6b7280');

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = 84;
  const innerR = 54;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (total === 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fillStyle = '#d1d5db';
    ctx.fill();

    ctx.fillStyle = textSub;
    ctx.font = '700 16px Plus Jakarta Sans';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Empty', cx, cy);
    return;
  }

  const segments = [
    { value: typeCounts.movie, color: '#3b82f6' },
    { value: typeCounts.tv,    color: '#10b981' },
    { value: typeCounts.anime, color: '#f59e0b' },
  ];

  let start = -Math.PI / 2;
  segments.forEach(seg => {
    if (!seg.value) return;
    const angle = (seg.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, start + angle);
    ctx.arc(cx, cy, innerR, start + angle, start, true);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
    start += angle;
  });

  ctx.fillStyle = textMain;
  ctx.font = '800 28px Plus Jakarta Sans';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(total), cx, cy);
}

function animateHorizontalBars(selector, duration = 600) {
  const bars = Array.from(document.querySelectorAll(selector));
  if (!bars.length) return;

  const targets = bars.map(b => parseFloat(b.dataset.target || '0'));
  const startAt = performance.now();

  function frame(now) {
    const p = Math.min((now - startAt) / duration, 1);
    bars.forEach((bar, i) => {
      bar.style.width = `${targets[i] * p}%`;
    });
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function loadStats() {
  const container = document.getElementById('statsContent');
  if (!container) return;

  const total = library.length;
  const typeCounts = library.reduce((a, i) => {
    a[i.type] = (a[i.type] || 0) + 1;
    return a;
  }, { movie: 0, tv: 0, anime: 0 });

  const statusCounts = library.reduce((a, i) => {
    const s = i.status || 'Planned';
    a[s] = (a[s] || 0) + 1;
    return a;
  }, { Planned: 0, Watching: 0, Completed: 0, Dropped: 0 });

  const rated = library.filter(i => (i.starRating || 0) > 0);
  const avgStar = rated.length
    ? (rated.reduce((s, i) => s + i.starRating, 0) / rated.length).toFixed(1)
    : '—';

  const ratingDist = [1, 2, 3, 4, 5].map(star =>
    rated.filter(i => i.starRating === star).length
  );
  const maxRatingCount = Math.max(...ratingDist, 0);

  const genreMap = library.reduce((acc, item) => {
    const list = Array.isArray(item.genres) ? item.genres : [];
    list.forEach(g => {
      const key = String(g || '').trim();
      if (!key) return;
      acc[key] = (acc[key] || 0) + 1;
    });
    return acc;
  }, {});
  const topGenres = Object.entries(genreMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const statusRows = [
    { name: 'Planned',   icon: '📋', color: '#6b7280', count: statusCounts.Planned },
    { name: 'Watching',  icon: '👁', color: '#3b82f6', count: statusCounts.Watching },
    { name: 'Completed', icon: '✅', color: '#10b981', count: statusCounts.Completed },
    { name: 'Dropped',   icon: '❌', color: '#ef4444', count: statusCounts.Dropped },
  ];
  const maxStatus = Math.max(...statusRows.map(r => r.count), 0);

  container.innerHTML = `
    <div class="stats-summary-grid">
      <div class="stats-summary-card">
        <div class="stats-summary-num">${total}</div>
        <div class="stats-summary-lbl">Total Items</div>
      </div>
      <div class="stats-summary-card">
        <div class="stats-summary-num">${statusCounts.Completed}</div>
        <div class="stats-summary-lbl">Completed</div>
      </div>
      <div class="stats-summary-card">
        <div class="stats-summary-num">${avgStar}</div>
        <div class="stats-summary-lbl">Avg Star Rating</div>
      </div>
      <div class="stats-summary-card">
        <div class="stats-summary-num">${watchlist.length}</div>
        <div class="stats-summary-lbl">Watchlist Size</div>
      </div>
    </div>

    <p class="stats-label">By Type</p>
    <div class="stats-doughnut-wrap">
      <canvas id="typeDoughnut" class="stats-doughnut-canvas" width="200" height="200"></canvas>
      <div class="stats-doughnut-legend">
        <div class="stats-legend-item"><span class="stats-legend-dot" style="background:#3b82f6"></span>Movies <strong>${typeCounts.movie}</strong></div>
        <div class="stats-legend-item"><span class="stats-legend-dot" style="background:#10b981"></span>Series <strong>${typeCounts.tv}</strong></div>
        <div class="stats-legend-item"><span class="stats-legend-dot" style="background:#f59e0b"></span>Anime <strong>${typeCounts.anime}</strong></div>
      </div>
    </div>

    <p class="stats-label">By Status</p>
    <div class="stats-hbar-wrap">
      ${statusRows.map(row => {
        const target = maxStatus ? (row.count / maxStatus) * 100 : 0;
        return `
          <div class="stats-hbar-row">
            <div class="stats-hbar-left">${row.icon} ${row.name}</div>
            <div class="stats-hbar-track">
              <div class="stats-hbar-fill" data-animate="status" data-target="${target.toFixed(2)}" style="background:${row.color};width:0%"></div>
            </div>
            <div class="stats-hbar-count">${row.count}</div>
          </div>`;
      }).join('')}
    </div>

    <p class="stats-label">Your Ratings</p>
    <div class="stats-ratings-wrap">
      ${rated.length ? [1, 2, 3, 4, 5].map(star => {
        const count = ratingDist[star - 1];
        const target = maxRatingCount ? (count / maxRatingCount) * 100 : 0;
        return `
          <div class="stats-hbar-row">
            <div class="stats-hbar-left">${'★'.repeat(star).padEnd(5, '☆')}</div>
            <div class="stats-hbar-track">
              <div class="stats-hbar-fill" data-animate="rating" data-target="${target.toFixed(2)}" style="background:#f59e0b;width:0%"></div>
            </div>
            <div class="stats-hbar-count">${count}</div>
          </div>`;
      }).join('') : `<p class="stats-empty-note">Rate some items to see distribution</p>`}
    </div>

    <p class="stats-label">Top Genres</p>
    <div class="stats-genres-wrap">
      ${topGenres.length
        ? topGenres.map(([genre, count], i) => `<span class="stats-genre-pill rank-${i + 1}">#${i + 1} ${genre} <strong>${count}</strong></span>`).join('')
        : `<p class="stats-empty-note">Open items to load genres</p>`}
    </div>`;

  drawTypeDoughnut(document.getElementById('typeDoughnut'), typeCounts);
  animateHorizontalBars('.stats-hbar-fill[data-animate="status"]', 600);
  animateHorizontalBars('.stats-hbar-fill[data-animate="rating"]', 600);
}

/* ── EXCEL ──────────────────────────────────── */
function exportExcel() {
  if (!window.XLSX) { showToast('SheetJS not loaded ❌'); return; }
  const rows = library.map(i => ({
    Title:      i.title,
    Type:       i.type,
    Year:       i.year,
    Rating:     i.rating,
    StarRating: i.starRating || 0,
    Status:     i.status || 'Planned',
    Platform:   i.platform || '',
    Poster:     i.poster || '',
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Library');
  XLSX.writeFile(wb, 'MovieUltra_Library.xlsx');
  showToast('Exported ✅');
}

function exportCSV() {
  if (!library.length) { showToast('Library is empty'); return; }
  const headers = ['Title', 'Type', 'Year', 'Rating', 'StarRating', 'Status', 'Platform', 'Poster'];
  const rows = library.map(i => [
    i.title || '', i.type || '', i.year || '', i.rating || '',
    i.starRating || 0, i.status || 'Planned', i.platform || '', i.poster || '',
  ]);
  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'MovieUltra_Library.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV Exported ✅');
}

function importExcel() { document.getElementById('importFile')?.click(); }

const importInput = document.getElementById('importFile');
if (importInput) {
  importInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    if (!window.XLSX) { showToast('SheetJS not loaded ❌'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const wb   = XLSX.read(ev.target.result, { type: 'array' });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        let added  = 0;
        rows.forEach(row => {
          const rawType = String(row.Type||'movie').toLowerCase();
          const type    = rawType === 'series' ? 'tv' : rawType;
          const item = {
            title:      String(row.Title||'').trim(),
            type:       ['movie','tv','anime'].includes(type) ? type : 'movie',
            year:       String(row.Year||'N/A'),
            rating:     String(row.Rating||'N/A'),
            starRating: parseInt(row.StarRating||0, 10) || 0,
            poster:     String(row.Poster||''),
            status:     String(row.Status||'Planned'),
            platform:   String(row.Platform||''),
            overview:   '',
          };
          if (!item.title) return;
          if (!library.some(l => l.title===item.title && l.type===item.type)) {
            library.unshift(item); added++;
          }
        });
        saveLib();
        render();
        showToast(`Imported ${added} item${added!==1?'s':''} ✅`);
      } catch { showToast('Import failed ❌'); }
      e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  });
}

/* ── SETTINGS ───────────────────────────────── */
function clearLibrary() {
  if (!confirm('Clear entire library? This cannot be undone.')) return;
  library = [];
  saveLib();
  render();
  ['moviesGrid','seriesGrid','animeGrid'].forEach(id => {
    const g = document.getElementById(id);
    if (g) g.innerHTML = "<p class='placeholder-msg'>Nothing here yet — add some!</p>";
  });
  showToast('Library cleared');
}

function clearWatchlist() {
  if (!confirm('Clear entire watchlist? This cannot be undone.')) return;
  watchlist = [];
  saveWl();
  renderWatchlist();
  showToast('Watchlist cleared');
}

/* ── RENDER PROFILE ─────────────────────────── */
function renderProfile() {
  const el = document.getElementById('profileContent');
  if (!el) return;

  const total     = library.length;
  const completed = library.filter(i => (i.status || '') === 'Completed').length;
  const watching  = library.filter(i => (i.status || '') === 'Watching').length;
  const planned   = library.filter(i => (i.status || '') === 'Planned').length;
  const rated     = library.filter(i => (i.starRating || 0) > 0).length;
  const avgStar   = rated
    ? (library.filter(i => i.starRating > 0)
        .reduce((s, i) => s + i.starRating, 0) / rated).toFixed(1)
    : '—';
  const movies = library.filter(i => i.type === 'movie').length;
  const series = library.filter(i => i.type === 'tv').length;
  const anime  = library.filter(i => i.type === 'anime').length;
  const wlSize = watchlist.length;

  el.innerHTML = `
    <div class="prof-hero">
      <div class="prof-avatar">M</div>
      <h2 class="prof-name">Manoj Kumar</h2>
      <p class="prof-username">@mavillamanoj</p>
      <p class="prof-bio">Building my cinematic universe 🎬</p>
      <p class="prof-version">Movie Ultra v${VERSION}</p>
    </div>

    <div class="prof-stats-grid">
      <div class="prof-stat accent-blue">
        <div class="prof-stat-num">${total}</div>
        <div class="prof-stat-lbl">📚 Library</div>
      </div>
      <div class="prof-stat accent-green">
        <div class="prof-stat-num">${completed}</div>
        <div class="prof-stat-lbl">✅ Completed</div>
      </div>
      <div class="prof-stat accent-orange">
        <div class="prof-stat-num">${watching}</div>
        <div class="prof-stat-lbl">👁 Watching</div>
      </div>
      <div class="prof-stat accent-gray">
        <div class="prof-stat-num">${planned}</div>
        <div class="prof-stat-lbl">📋 Planned</div>
      </div>
      <div class="prof-stat accent-gold">
        <div class="prof-stat-num">${avgStar}</div>
        <div class="prof-stat-lbl">⭐ Avg Rating</div>
      </div>
      <div class="prof-stat accent-purple">
        <div class="prof-stat-num">${wlSize}</div>
        <div class="prof-stat-lbl">⭐ Watchlist</div>
      </div>
    </div>

    <div class="prof-type-grid">
      <div class="prof-type-card">
        <div class="prof-type-num">${movies}</div>
        <div class="prof-type-lbl">🎬 Movies</div>
      </div>
      <div class="prof-type-card">
        <div class="prof-type-num">${series}</div>
        <div class="prof-type-lbl">📺 Series</div>
      </div>
      <div class="prof-type-card">
        <div class="prof-type-num">${anime}</div>
        <div class="prof-type-lbl">🌸 Anime</div>
      </div>
    </div>`;
}

/* ── RENDER SETTINGS ────────────────────────── */
function renderSettings() {
  const el = document.getElementById('settingsContent');
  if (!el) return;
  const uniqueThemes = [...new Map(THEME_PRESETS.map(t => [t.id, t])).values()];
  const currentTheme = document.body.dataset.theme || localStorage.getItem(SK.themeTone) || 'dark';

  el.innerHTML = `
    <div class="setting-block">
      <div class="setting-head">
        <div class="setting-lbl">🎨 Themes</div>
        <div class="setting-desc">Choose your style across the app</div>
      </div>
      <div class="theme-grid">
        ${uniqueThemes.map(t => `
          <button class="theme-card ${currentTheme === t.id ? 'active' : ''}" data-theme="${t.id}">
            <div class="theme-dots">
              ${t.colors.map(color => `<span class="theme-dot" style="background:${color}"></span>`).join('')}
            </div>
            <div class="theme-name">${t.icon} ${t.name}</div>
          </button>`).join('')}
      </div>
    </div>

    <div class="setting-row">
      <div>
        <div class="setting-lbl">🌓 Dark Mode</div>
        <div class="setting-desc">${document.body.classList.contains('dark-mode') ? 'Dark theme is ON' : 'Light theme is ON'}</div>
      </div>
      <button class="btn-setting" onclick="toggleTheme(); renderSettings()">Toggle</button>
    </div>

    <div class="setting-row">
      <div>
        <div class="setting-lbl">📤 Export Library</div>
        <div class="setting-desc">${library.length} items</div>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn-setting" onclick="exportCSV()">CSV</button>
        <button class="btn-setting" onclick="exportExcel()">Excel</button>
      </div>
    </div>

    <div class="setting-row">
      <div>
        <div class="setting-lbl">📥 Import Library</div>
        <div class="setting-desc">CSV or Excel</div>
      </div>
      <button class="btn-setting" onclick="importExcel()">Import</button>
    </div>

    <div class="setting-row">
      <div>
        <div class="setting-lbl">🗑 Clear Library</div>
        <div class="setting-desc">${library.length} items will be removed</div>
      </div>
      <button class="btn-setting btn-danger" onclick="clearLibrary(); renderSettings()">Clear</button>
    </div>

    <div class="setting-row">
      <div>
        <div class="setting-lbl">🗑 Clear Watchlist</div>
        <div class="setting-desc">${watchlist.length} saved items</div>
      </div>
      <button class="btn-setting btn-danger" onclick="clearWatchlist(); renderSettings()">Clear</button>
    </div>

    <div class="setting-row">
      <div>
        <div class="setting-lbl">ℹ️ App Version</div>
        <div class="setting-desc">Movie Ultra v${VERSION}</div>
      </div>
      <span style="color:var(--text-sub);font-size:12px">v${VERSION}</span>
    </div>`;

  el.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', () => {
      applyTheme(card.dataset.theme);
      renderSettings();
    });
  });
}

/* ── RENDER FEEDBACK ────────────────────────── */
function renderFeedback() {
  const el = document.getElementById('feedbackContent');
  if (!el) return;

  el.innerHTML = `
    <div class="feedback-hero">
      <h3>💬 Share Your Feedback</h3>
      <p>Found a bug? Feature request? We'd love to hear from you!</p>
    </div>

    <div class="fb-field">
      <label for="fbMsg">Your Message</label>
      <textarea id="fbMsg" placeholder="Describe your feedback…" rows="5"></textarea>
    </div>
    <button class="btn-submit" id="fbSubmit">📤 Send Feedback</button>

    <div class="feedback-contact">
      <h4>📬 Reach Out Directly</h4>
      <div class="contact-row">
        <div class="contact-icon">✈️</div>
        <div>
          <div class="contact-lbl">TELEGRAM</div>
          <div class="contact-val">
            <a href="https://t.me/Mavillamanoj" target="_blank" rel="noopener">@Mavillamanoj</a>
          </div>
        </div>
      </div>
      <div class="contact-row">
        <div class="contact-icon">📧</div>
        <div>
          <div class="contact-lbl">EMAIL</div>
          <div class="contact-val">
            <a href="mailto:contact.manoj.official@gmail.com">contact.manoj.official@gmail.com</a>
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById('fbSubmit')?.addEventListener('click', () => {
    const msg = document.getElementById('fbMsg').value.trim();
    if (!msg) { showToast('Please enter a message ❌'); return; }
    showToast('✅ Thank you for your feedback!');
    document.getElementById('fbMsg').value = '';
  });
}

/* ── INIT ───────────────────────────────────── */
ensureLibraryTools();
updateOfflineBanner();
window.addEventListener('online', updateOfflineBanner);
window.addEventListener('offline', updateOfflineBanner);
render();
