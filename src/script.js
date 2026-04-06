'use strict';

const VERSION = "1.4.0";

/* ── STORAGE KEYS ───────────────────────────── */
const SK = {
  lib:       'mu_lib_v1',
  watchlist: 'mu_watchlist_v1',
  theme:     'mu_theme',
};

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

/* ── SIDEBAR ────────────────────────────────── */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('active');
  document.getElementById('overlay').classList.toggle('active');
}

/* ── THEME ──────────────────────────────────── */
function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem(SK.theme, document.body.classList.contains('dark-mode') ? 'dark' : 'light');
}
if (localStorage.getItem(SK.theme) === 'dark') document.body.classList.add('dark-mode');

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
  if (viewName === 'movies')    renderFiltered('movie',  'moviesGrid');
  if (viewName === 'series')    renderFiltered('tv',     'seriesGrid');
  if (viewName === 'anime')     renderFiltered('anime',  'animeGrid');
  if (viewName === 'watchlist') renderWatchlist();
  if (viewName === 'profile')   document.getElementById('appVersion').innerText = `v${VERSION}`;

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
      const res  = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`);
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
    grid.innerHTML = "<p class='placeholder-msg'>Failed to load — check connection.</p>";
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
function loadStats() {
  const container = document.getElementById('statsContent');
  if (!library.length) {
    container.innerHTML = "<p class='placeholder-msg'>Add items to see analytics.</p>";
    return;
  }
  const total = library.length;
  const tc = library.reduce((a, i) => { a[i.type]=(a[i.type]||0)+1; return a; }, {movie:0,tv:0,anime:0});
  const sc = library.reduce((a, i) => {
    const s = i.status||'Planned'; a[s]=(a[s]||0)+1; return a;
  }, {Planned:0,Watching:0,Completed:0,Dropped:0});
  const rated = library.filter(i => i.starRating > 0);
  const avgStar = rated.length
    ? (rated.reduce((s,i) => s + i.starRating, 0) / rated.length).toFixed(1) : '—';

  const bar = (count, color) =>
    `<div style="width:${total?(count/total)*100:0}%;background:${color};height:100%;border-radius:50px;transition:width .5s"></div>`;

  container.innerHTML = `
    <div class="stats-row"><span>Total Items</span><strong>${total}</strong></div>
    <div class="stats-row"><span>Avg Star Rating</span><strong>${avgStar} ★</strong></div>

    <p class="stats-label">By Type</p>
    <div class="stats-bar-wrap">
      <div class="stats-bar-row"><span>🎬 Movies</span>
        <div class="stats-bar">${bar(tc.movie,'var(--accent)')}</div>
        <strong>${tc.movie}</strong></div>
      <div class="stats-bar-row"><span>📺 Series</span>
        <div class="stats-bar">${bar(tc.tv,'#10b981')}</div>
        <strong>${tc.tv}</strong></div>
      <div class="stats-bar-row"><span>🌸 Anime</span>
        <div class="stats-bar">${bar(tc.anime,'#f59e0b')}</div>
        <strong>${tc.anime}</strong></div>
    </div>

    <p class="stats-label">By Status</p>
    <div class="stats-status-grid">
      <div class="stats-status-card" style="border-color:#6b7280">
        <div class="stats-status-num">${sc.Planned}</div><div>📋 Planned</div></div>
      <div class="stats-status-card" style="border-color:#3b82f6">
        <div class="stats-status-num">${sc.Watching}</div><div>👁 Watching</div></div>
      <div class="stats-status-card" style="border-color:#10b981">
        <div class="stats-status-num">${sc.Completed}</div><div>✅ Completed</div></div>
      <div class="stats-status-card" style="border-color:#ef4444">
        <div class="stats-status-num">${sc.Dropped}</div><div>❌ Dropped</div></div>
    </div>`;
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

function openFeedback() { showToast('📧 contact.manoj.official@gmail.com'); }

/* ── INIT ───────────────────────────────────── */
ensureLibraryTools();
render();
