const VERSION = "1.1.0";

/* ── STORAGE KEYS ───────────────────────────── */
const SK = {
  lib:       'mu_lib_v1',
  watchlist: 'mu_watchlist_v1',
  theme:     'mu_theme',
};

/* ── MIGRATE old v4_pro_db → mu_lib_v1 ─────── */
(function migrate() {
  if (localStorage.getItem('mu_migrated_v1')) return;
  const old = localStorage.getItem('v4_pro_db');
  if (old && !localStorage.getItem(SK.lib)) {
    localStorage.setItem(SK.lib, old);
  }
  const oldWl = localStorage.getItem('mu_watchlist');
  if (oldWl && !localStorage.getItem(SK.watchlist)) {
    localStorage.setItem(SK.watchlist, oldWl);
  }
  localStorage.setItem('mu_migrated_v1', '1');
})();

/* ── STATUS CONFIG ──────────────────────────── */
const STATUS_LABELS = {
  Planned:   { icon: '📋', color: '#6b7280' },
  Watching:  { icon: '👁',  color: '#3b82f6' },
  Completed: { icon: '✅', color: '#10b981' },
  Dropped:   { icon: '❌', color: '#ef4444' },
};

/* ── STATE ──────────────────────────────────── */
let library   = JSON.parse(localStorage.getItem(SK.lib))      || [];
let watchlist = JSON.parse(localStorage.getItem(SK.watchlist)) || [];
let activeType = 'movie';

/* Ensure all items have status field */
library = library.map(i => ({ status: 'Planned', ...i }));

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
  localStorage.setItem(SK.theme,
    document.body.classList.contains('dark-mode') ? 'dark' : 'light');
}
if (localStorage.getItem(SK.theme) === 'dark') {
  document.body.classList.add('dark-mode');
}

/* ── TYPE CHIPS ─────────────────────────────── */
function setType(type) {
  activeType = type;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  document.getElementById(`chip-${type}`).classList.add('active');
}

/* ── NAVIGATION ─────────────────────────────── */
function showView(viewName) {
  document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`view-${viewName}`) || document.getElementById('view-home');
  target.classList.add('active');
  document.getElementById('pageTitle').innerText = viewName.toUpperCase();
  document.getElementById('searchContainer').style.display = (viewName === 'home') ? 'block' : 'none';

  document.querySelectorAll('.sb-item[data-view]').forEach(el => {
    el.classList.toggle('active', el.dataset.view === viewName);
  });
  document.querySelectorAll('.b-item[data-view]').forEach(el => {
    el.classList.toggle('active', el.dataset.view === viewName);
  });

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

/* ── CARD BUILDER (shared) ──────────────────── */
function buildCard({ item, idx, actions = [], showStatus = true }) {
  const status = item.status || 'Planned';
  const s = STATUS_LABELS[status] || STATUS_LABELS.Planned;

  const statusBadge = showStatus
    ? `<div class="status-badge" style="background:${s.color}">${s.icon} ${status}</div>` : '';

  const statusSelect = showStatus ? `
    <select class="status-select" data-idx="${idx}" onchange="setStatus(${idx}, this.value, '${actions[0]?.grid || ''}')">
      <option value="Planned"   ${status==='Planned'   ?'selected':''}>📋 Planned</option>
      <option value="Watching"  ${status==='Watching'  ?'selected':''}>👁 Watching</option>
      <option value="Completed" ${status==='Completed' ?'selected':''}>✅ Completed</option>
      <option value="Dropped"   ${status==='Dropped'   ?'selected':''}>❌ Dropped</option>
    </select>` : '';

  const btns = actions.map(a => `<button class="${a.cls}" onclick="${a.fn}">${a.label}</button>`).join('');

  return `
    <div class="movie-card">
      <div class="poster-container">
        <img src="${item.poster || ''}" alt="${item.title.replace(/"/g,'&quot;')}" loading="lazy" onerror="this.src=''">
        <div class="badge">★ ${item.rating || 'N/A'}</div>
        ${statusBadge}
      </div>
      <div class="card-details">
        <h3 title="${item.title.replace(/"/g,'&quot;')}">${item.title}</h3>
        <p class="card-meta">${item.year || 'N/A'} · ${(item.type||'').toUpperCase()}</p>
        ${statusSelect}
        <div class="card-actions">${btns}</div>
      </div>
    </div>`;
}

/* ── STATUS UPDATE ──────────────────────────── */
function setStatus(idx, status, gridId) {
  if (!library[idx]) return;
  library[idx] = { ...library[idx], status };
  localStorage.setItem(SK.lib, JSON.stringify(library));
  showToast(`Status → ${status}`);
  render();
  if (gridId) {
    const type = library[idx]?.type;
    if (type) renderFiltered(type, gridId);
  }
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
          title:  a.title,
          year:   a.aired?.prop?.from?.year || 'N/A',
          rating: a.score ? String(a.score) : 'N/A',
          poster: a.images?.jpg?.large_image_url || '',
          type:   'anime',
          status: 'Planned',
        };
      }
    } else {
      const res  = await fetch(`/api/tmdb?path=search/${type}&query=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.results?.length > 0) {
        const r = data.results[0];
        return {
          title:  r.title || r.name,
          year:   (r.release_date || r.first_air_date || 'N/A').split('-')[0],
          rating: r.vote_average != null ? r.vote_average.toFixed(1) : 'N/A',
          poster: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : '',
          type,
          status: 'Planned',
        };
      }
    }
  } catch(e) { console.error(e); }
  return null;
}

/* ── SEARCH ─────────────────────────────────── */
async function handleSearch() {
  const input  = document.getElementById('smartInput');
  const btn    = document.getElementById('searchTrigger');
  const query  = input.value.trim();
  if (!query) return;
  btn.disabled    = true;
  btn.textContent = '…';
  try {
    const result = await fetchMedia(query, activeType);
    if (result) {
      const exists = library.some(l => l.title === result.title && l.type === result.type);
      if (exists) { showToast('Already in library'); return; }
      library.unshift(result);
      localStorage.setItem(SK.lib, JSON.stringify(library));
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
    const res  = await fetch('/api/tmdb?path=trending/all/day');
    const data = await res.json();
    const items = data.results || [];
    if (!items.length) { grid.innerHTML = "<p class='placeholder-msg'>No results.</p>"; return; }
    grid.innerHTML = items.map(item => {
      const type  = item.media_type === 'movie' ? 'movie' : 'tv';
      const title = item.title || item.name || '';
      const safe  = title.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
      return `
        <div class="movie-card">
          <div class="poster-container">
            <img src="https://image.tmdb.org/t/p/w500${item.poster_path || ''}" loading="lazy" onerror="this.src=''">
            <div class="badge">★ ${item.vote_average?.toFixed(1) || 'N/A'}</div>
          </div>
          <div class="card-details">
            <h3 title="${title.replace(/"/g,'&quot;')}">${title}</h3>
            <p class="card-meta">${type.toUpperCase()}</p>
            <div class="card-actions">
              <button class="btn-add" onclick="quickAdd('${safe}','${type}')">+ Library</button>
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
  const exists = library.some(l => l.title === result.title && l.type === result.type);
  if (exists) { showToast('Already in library'); return; }
  library.unshift(result);
  localStorage.setItem(SK.lib, JSON.stringify(library));
  showToast(`"${result.title}" added ✅`);
  render();
}

/* ── LIBRARY RENDER ─────────────────────────── */
function render() {
  const grid = document.getElementById('libraryGrid');
  if (!grid) return;
  if (!library.length) {
    grid.innerHTML = "<p class='placeholder-msg'>Library is empty — search above to add!</p>";
    return;
  }
  grid.innerHTML = library.map((item, idx) =>
    buildCard({
      item, idx,
      showStatus: true,
      actions: [
        { label: '⭐ Watchlist', cls: 'btn-add',    fn: `addToWatchlist(${idx})` },
        { label: '🗑 Remove',    cls: 'btn-remove',  fn: `remove(${idx})` },
      ],
    })
  ).join('');
}

/* ── REMOVE ─────────────────────────────────── */
function remove(idx) {
  library.splice(idx, 1);
  localStorage.setItem(SK.lib, JSON.stringify(library));
  render();
  showToast('Removed from library');
}

/* ── WATCHLIST ──────────────────────────────── */
function addToWatchlist(idx) {
  const item = library[idx];
  if (!item) return;
  const exists = watchlist.some(w => w.title === item.title && w.type === item.type);
  if (exists) { showToast('Already in watchlist'); return; }
  watchlist.unshift({ ...item });
  localStorage.setItem(SK.watchlist, JSON.stringify(watchlist));
  showToast('Saved to watchlist ⭐');
}

function removeFromWatchlist(idx) {
  watchlist.splice(idx, 1);
  localStorage.setItem(SK.watchlist, JSON.stringify(watchlist));
  renderWatchlist();
  showToast('Removed from watchlist');
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
      item, idx,
      showStatus: true,
      actions: [
        { label: '+ Library',  cls: 'btn-add',   fn: `addFromWatchlist(${idx})` },
        { label: '🗑 Remove',  cls: 'btn-remove', fn: `removeFromWatchlist(${idx})` },
      ],
    })
  ).join('');
}

function addFromWatchlist(idx) {
  const item = watchlist[idx];
  if (!item) return;
  const exists = library.some(l => l.title === item.title && l.type === item.type);
  if (exists) { showToast('Already in library'); return; }
  library.unshift({ ...item });
  localStorage.setItem(SK.lib, JSON.stringify(library));
  render();
  showToast(`"${item.title}" added to library ✅`);
}

/* ── FILTERED VIEWS ─────────────────────────── */
function renderFiltered(type, gridId) {
  const grid  = document.getElementById(gridId);
  if (!grid) return;
  const items = library.map((item, idx) => ({ item, idx })).filter(({ item }) => item.type === type);
  if (!items.length) {
    grid.innerHTML = "<p class='placeholder-msg'>Nothing here yet — add some!</p>";
    return;
  }
  grid.innerHTML = items.map(({ item, idx }) =>
    buildCard({
      item, idx,
      showStatus: true,
      actions: [
        { label: '🗑 Remove', cls: 'btn-remove', fn: `removeFiltered(${idx},'${gridId}')` },
      ],
    })
  ).join('');
}

function removeFiltered(idx, gridId) {
  const type = library[idx]?.type;
  library.splice(idx, 1);
  localStorage.setItem(SK.lib, JSON.stringify(library));
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
  const tc = library.reduce((a, i) => { a[i.type] = (a[i.type]||0)+1; return a; }, {movie:0,tv:0,anime:0});
  const sc = library.reduce((a, i) => {
    const s = i.status || 'Planned';
    a[s] = (a[s]||0)+1; return a;
  }, {Planned:0, Watching:0, Completed:0, Dropped:0});

  const bar = (count, color) =>
    `<div style="width:${total ? (count/total)*100 : 0}%;background:${color};height:100%;border-radius:50px;transition:width 0.5s"></div>`;

  container.innerHTML = `
    <div class="stats-row"><span>Total Items</span><strong>${total}</strong></div>

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

/* ── EXCEL EXPORT ───────────────────────────── */
function exportExcel() {
  if (!window.XLSX) { showToast('SheetJS not loaded ❌'); return; }
  const rows = library.map(i => ({
    Title:  i.title,
    Type:   i.type,
    Year:   i.year,
    Rating: i.rating,
    Status: i.status || 'Planned',
    Poster: i.poster || '',
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Library');
  XLSX.writeFile(wb, 'MovieUltra_Library.xlsx');
  showToast('Exported ✅');
}

/* ── EXCEL IMPORT ───────────────────────────── */
function importExcel() {
  document.getElementById('importFile')?.click();
}

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
          const rawType = String(row.Type || 'movie').toLowerCase();
          const type    = rawType === 'series' ? 'tv' : rawType;
          const item    = {
            title:  String(row.Title  || '').trim(),
            type:   ['movie','tv','anime'].includes(type) ? type : 'movie',
            year:   String(row.Year   || 'N/A'),
            rating: String(row.Rating || 'N/A'),
            poster: String(row.Poster || ''),
            status: String(row.Status || 'Planned'),
          };
          if (!item.title) return;
          const dup = library.some(l => l.title === item.title && l.type === item.type);
          if (!dup) { library.unshift(item); added++; }
        });
        localStorage.setItem(SK.lib, JSON.stringify(library));
        render();
        showToast(`Imported ${added} item${added !== 1 ? 's' : ''} ✅`);
      } catch(err) {
        showToast('Import failed — check file format ❌');
      }
      e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  });
}

/* ── SETTINGS ───────────────────────────────── */
function clearLibrary() {
  if (!confirm('Clear entire library? This cannot be undone.')) return;
  library = [];
  localStorage.setItem(SK.lib, JSON.stringify(library));
  render();
  ['moviesGrid','seriesGrid','animeGrid'].forEach(id => {
    const g = document.getElementById(id);
    if (g) g.innerHTML = "<p class='placeholder-msg'>Nothing here yet.</p>";
  });
  showToast('Library cleared');
}

/* ── FEEDBACK ───────────────────────────────── */
function openFeedback() {
  showToast('📧 contact.manoj.official@gmail.com');
}

/* ── INIT ───────────────────────────────────── */
render();