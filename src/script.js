const VERSION = "1.0.0";
let library = JSON.parse(localStorage.getItem("v4_pro_db")) || [];
let watchlist = JSON.parse(localStorage.getItem("mu_watchlist")) || [];
let activeType = 'movie';

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

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("active");
  document.getElementById("overlay").classList.toggle("active");
}

function toggleTheme() {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem("mu_theme", document.body.classList.contains("dark-mode") ? "dark" : "light");
}

function setType(type) {
  activeType = type;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  document.getElementById(`chip-${type}`).classList.add('active');
}

function showView(viewName) {
  document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`view-${viewName}`) || document.getElementById('view-home');
  target.classList.add('active');
  document.getElementById('pageTitle').innerText = viewName.toUpperCase();
  document.getElementById('searchContainer').style.display = (viewName === 'home') ? 'block' : 'none';

  // Update sidebar active state
  document.querySelectorAll('.sb-item[data-view]').forEach(el => {
    el.classList.toggle('active', el.dataset.view === viewName);
  });

  // Update bottom nav active state
  document.querySelectorAll('.b-item[data-view]').forEach(el => {
    el.classList.toggle('active', el.dataset.view === viewName);
  });

  if (viewName === 'trending') loadTrending();
  if (viewName === 'analytics') loadStats();
  if (viewName === 'movies') renderFiltered('movie', 'moviesGrid');
  if (viewName === 'series') renderFiltered('tv', 'seriesGrid');
  if (viewName === 'anime') renderFiltered('anime', 'animeGrid');
  if (viewName === 'watchlist') renderWatchlist();
  if (viewName === 'profile') document.getElementById('appVersion').innerText = `v${VERSION}`;
  document.getElementById("sidebar").classList.remove("active");
  document.getElementById("overlay").classList.remove("active");
}

async function loadTrending() {
  const grid = document.getElementById('trendingGrid');
  grid.innerHTML = "<p class='placeholder-msg'>Loading...</p>";
  try {
    // ✅ Goes through your serverless function — key is hidden
    const res = await fetch(`/api/tmdb?path=trending/all/day`);
    const data = await res.json();
    grid.innerHTML = (data.results || []).map(item => {
      const type = item.media_type === 'movie' ? 'movie' : 'tv';
      const title = (item.title || item.name || '').replace(/'/g, "\\'");
      return `
        <div class="movie-card">
          <div class="poster-container">
            <img src="https://image.tmdb.org/t/p/w500${item.poster_path}" loading="lazy">
            <div class="badge">★ ${item.vote_average?.toFixed(1) || 'N/A'}</div>
          </div>
          <div class="card-details">
            <h3>${item.title || item.name}</h3>
            <button class="btn-add" onclick="quickAdd('${title}','${type}')">+ Library</button>
          </div>
        </div>`;
    }).join('') || "<p class='placeholder-msg'>No results.</p>";
  } catch(e) {
    grid.innerHTML = "<p class='placeholder-msg'>Failed to load.</p>";
  }
}

async function fetchMedia(query, type) {
  try {
    if (type === 'anime') {
      const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`);
      const data = await res.json();
      if (data.data?.length > 0) {
        const a = data.data[0];
        return { title: a.title, year: a.aired?.prop?.from?.year || 'N/A', rating: a.score || 'N/A', poster: a.images?.jpg?.large_image_url || '', type: 'anime' };
      }
    } else {
      // ✅ Goes through your serverless function — key is hidden
      const res = await fetch(`/api/tmdb?path=search/${type}&query=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.results?.length > 0) {
        const r = data.results[0];
        return { title: r.title || r.name, year: (r.release_date || r.first_air_date || 'N/A').split('-')[0], rating: r.vote_average?.toFixed(1) || 'N/A', poster: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : '', type };
      }
    }
  } catch(e) { console.error(e); }
  return null;
}

async function quickAdd(title, type) {
  const result = await fetchMedia(title, type);
  if (result) {
    library.unshift(result);
    localStorage.setItem("v4_pro_db", JSON.stringify(library));
    showToast("Added to library ✅");
    render();
  }
}

async function handleSearch() {
  const query = document.getElementById("smartInput").value.trim();
  if (!query) return;
  const result = await fetchMedia(query, activeType);
  if (result) {
    library.unshift(result);
    localStorage.setItem("v4_pro_db", JSON.stringify(library));
    render();
    document.getElementById("smartInput").value = "";
  } else { showToast("Not found — try a different title ❌"); }
}

document.getElementById("searchTrigger").addEventListener("click", handleSearch);
document.getElementById("smartInput").addEventListener("keydown", e => { if(e.key === 'Enter') handleSearch(); });

function remove(index) {
  library.splice(index, 1);
  localStorage.setItem("v4_pro_db", JSON.stringify(library));
  render();
}

function addToWatchlist(idx) {
  const item = library[idx];
  const exists = watchlist.some(w => w.title === item.title && w.type === item.type);
  if (exists) {
    showToast("Already in watchlist");
    return;
  }
  watchlist.unshift(item);
  localStorage.setItem("mu_watchlist", JSON.stringify(watchlist));
  showToast("Added to Watchlist ⭐");
}

function removeFromWatchlist(idx) {
  watchlist.splice(idx, 1);
  localStorage.setItem("mu_watchlist", JSON.stringify(watchlist));
  renderWatchlist();
}

function renderWatchlist() {
  const grid = document.getElementById("watchlistGrid");
  if (!grid) return;
  if (!watchlist.length) {
    grid.innerHTML = "<p class='placeholder-msg'>Watchlist is empty.</p>";
    return;
  }
  grid.innerHTML = watchlist.map((item, idx) => `
    <div class="movie-card">
      <div class="poster-container">
        <img src="${item.poster || ''}" alt="poster" onerror="this.src=''">
        <div class="badge">★ ${item.rating}</div>
      </div>
      <div class="card-details">
        <h3>${item.title}</h3>
        <p style="font-size:11px;color:var(--text-sub);margin:4px 0">${item.year} · ${item.type.toUpperCase()}</p>
        <button class="btn-remove" onclick="removeFromWatchlist(${idx})">Remove</button>
      </div>
    </div>`).join('');
}

function renderFiltered(type, gridId) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  const items = library.filter(i => i.type === type);
  if (!items.length) {
    grid.innerHTML = "<p class='placeholder-msg'>Nothing here yet.</p>";
    return;
  }
  grid.innerHTML = items.map(item => `
    <div class="movie-card">
      <div class="poster-container">
        <img src="${item.poster || ''}" alt="poster" onerror="this.src=''">
        <div class="badge">★ ${item.rating}</div>
      </div>
      <div class="card-details">
        <h3>${item.title}</h3>
        <p style="font-size:11px;color:var(--text-sub);margin:4px 0">${item.year}</p>
        <button class="btn-remove" onclick="removeFiltered('${type}', '${item.title.replace(/'/g, "\\'")}', '${gridId}')">Remove</button>
      </div>
    </div>`).join('');
}

function removeFiltered(type, title, gridId) {
  library = library.filter(i => !(i.type === type && i.title === title));
  localStorage.setItem("v4_pro_db", JSON.stringify(library));
  render();
  renderFiltered(type, gridId);
}

function loadStats() {
  const container = document.getElementById('statsContent');
  if (!library.length) { container.innerHTML = "Add items to see analytics."; return; }
  const counts = library.reduce((acc, i) => { acc[i.type] = (acc[i.type]||0)+1; return acc; }, {movie:0,tv:0,anime:0});
  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;margin-bottom:15px"><span>Total:</span><strong>${library.length}</strong></div>
    <div style="height:10px;background:#eee;border-radius:10px;overflow:hidden;display:flex">
      <div style="width:${(counts.movie/library.length)*100}%;background:var(--accent)"></div>
      <div style="width:${(counts.tv/library.length)*100}%;background:#10b981"></div>
      <div style="width:${(counts.anime/library.length)*100}%;background:#f59e0b"></div>
    </div>
    <p style="font-size:12px;margin-top:10px;color:var(--text-sub)">Blue: Movies | Green: Series | Gold: Anime</p>`;
}

function render() {
  const grid = document.getElementById("libraryGrid");
  if (!grid) return;
  if (!library.length) { grid.innerHTML = "<p class='placeholder-msg'>Library is empty.</p>"; return; }
  grid.innerHTML = library.map((item, idx) => `
    <div class="movie-card">
      <div class="poster-container">
        <img src="${item.poster || ''}" alt="poster" onerror="this.src=''">
        <div class="badge">★ ${item.rating}</div>
      </div>
      <div class="card-details">
        <h3>${item.title}</h3>
        <p style="font-size:11px;color:var(--text-sub);margin:4px 0">${item.year} · ${item.type.toUpperCase()}</p>
        <button class="btn-add" onclick="addToWatchlist(${idx})" style="margin-top:6px">⭐ Watchlist</button>
        <button class="btn-remove" onclick="remove(${idx})">Remove</button>
      </div>
    </div>`).join('');
}

function exportExcel() {
  if (!window.XLSX) {
    showToast("SheetJS not loaded ❌");
    return;
  }
  const rows = library.map(i => ({
    Title: i.title,
    Type: i.type,
    Year: i.year,
    Rating: i.rating,
    Poster: i.poster || ''
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Library");
  XLSX.writeFile(wb, "MovieUltra_Library.xlsx");
}

function importExcel() {
  const input = document.getElementById("importFile");
  if (input) input.click();
}

function clearLibrary() {
  if (!confirm("Clear entire library?")) return;
  library = [];
  localStorage.setItem("v4_pro_db", JSON.stringify(library));
  render();
  renderFiltered('movie', 'moviesGrid');
  renderFiltered('tv', 'seriesGrid');
  renderFiltered('anime', 'animeGrid');
}

function openFeedback() {
  showToast("📧 contact.manoj.official@gmail.com");
}

if (localStorage.getItem("mu_theme") === "dark") {
  document.body.classList.add("dark-mode");
}

const importInput = document.getElementById("importFile");
if (importInput) {
  importInput.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    if (!window.XLSX) {
      alert("SheetJS not loaded");
      return;
    }

    const reader = new FileReader();
    reader.onload = ev => {
      const wb = XLSX.read(ev.target.result, { type: "array" });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      let added = 0;

      rows.forEach(row => {
        const item = {
          title: row.Title,
          type: (row.Type || 'movie').toLowerCase(),
          year: String(row.Year || ''),
          rating: String(row.Rating || ''),
          poster: row.Poster || ''
        };

        if (item.title && !library.some(l => l.title === item.title && l.type === item.type)) {
          library.unshift(item);
          added++;
        }
      });

      localStorage.setItem("v4_pro_db", JSON.stringify(library));
      render();
      renderFiltered('movie', 'moviesGrid');
      renderFiltered('tv', 'seriesGrid');
      renderFiltered('anime', 'animeGrid');
      showToast(`Imported ${added} items ✅`);
      e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  });
}

render();