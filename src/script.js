const VERSION = "1.0.0";
let library = JSON.parse(localStorage.getItem("v4_pro_db")) || [];
let activeType = 'movie';

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("active");
  document.getElementById("overlay").classList.toggle("active");
}

function toggleTheme() { document.body.classList.toggle("dark-mode"); }

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
  if (viewName === 'trending') loadTrending();
  if (viewName === 'analytics') loadStats();
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
    alert("Added to Library!");
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
  } else { alert("Not found!"); }
}

document.getElementById("searchTrigger").addEventListener("click", handleSearch);
document.getElementById("smartInput").addEventListener("keydown", e => { if(e.key === 'Enter') handleSearch(); });

function remove(index) {
  library.splice(index, 1);
  localStorage.setItem("v4_pro_db", JSON.stringify(library));
  render();
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
        <button class="btn-remove" onclick="remove(${idx})">Remove</button>
      </div>
    </div>`).join('');
}

render();