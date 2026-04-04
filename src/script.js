const VERSION = "1.0.0";
const TMDB_KEY = config.TMDB_KEY;

// ==========================================
// 1. STATE MANAGEMENT (Data & Storage)
// ==========================================
const State = {
  library: JSON.parse(localStorage.getItem("v4_pro_db")) || [],
  activeType: 'movie',

  saveLibrary() {
    localStorage.setItem("v4_pro_db", JSON.stringify(this.library));
  },
  
  addItem(item) {
    this.library.unshift(item);
    this.saveLibrary();
  },
  
  removeItem(index) {
    this.library.splice(index, 1);
    this.saveLibrary();
  }
};

// ==========================================
// 2. API SERVICE (Data Fetching)
// ==========================================
const ApiService = {
  async getTrending() {
    try {
      const res = await fetch(`https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_KEY}`);
      const data = await res.json();
      return data.results || [];
    } catch (error) {
      console.error("Error fetching trending:", error);
      return [];
    }
  },

  async searchMedia(query, type) {
    try {
      if (type === "anime") {
        const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`);
        const data = await res.json();
        if (data.data?.length > 0) {
          const a = data.data[0];
          return { title: a.title, year: a.aired?.prop?.from?.year || "N/A", rating: a.score || "N/A", poster: a.images?.jpg?.large_image_url || "", type: "anime" };
        }
      } else {
        const res = await fetch(`https://api.themoviedb.org/3/search/${type}?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.results?.length > 0) {
          const r = data.results[0];
          return { title: r.title || r.name, year: (r.release_date || r.first_air_date || "N/A").split("-")[0], rating: r.vote_average?.toFixed(1) || "N/A", poster: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : "", type: type };
        }
      }
    } catch (error) {
      console.error("Search failed:", error);
    }
    return null;
  }
};

// ==========================================
// 3. UI & DOM MANAGEMENT (Rendering)
// ==========================================
const UI = {
  renderLibrary() {
    const grid = document.getElementById("libraryGrid");
    if (!grid) return;
    
    if (!State.library.length) {
      grid.innerHTML = "<p class='placeholder-msg'>Library is empty.</p>";
      return;
    }
    
    grid.innerHTML = State.library.map((item, idx) => `
        <div class="movie-card">
          <div class="poster-container">
            <img src="${item.poster || 'src/assets/no-poster.png'}" alt="poster" loading="lazy">
            <div class="badge">★ ${item.rating}</div>
          </div>
          <div class="card-details">
            <h3>${item.title}</h3>
            <p style="font-size:11px; color:var(--text-sub); margin:4px 0;">${item.year} • ${item.type.toUpperCase()}</p>
            <button class="btn-remove" onclick="removeMedia(${idx})">Remove</button>
          </div>
        </div>`).join('');
  },

  async renderTrending() {
    const grid = document.getElementById('trendingGrid');
    grid.innerHTML = "<p class='placeholder-msg'>Loading trends...</p>";
    
    const results = await ApiService.getTrending();
    if (!results.length) {
      grid.innerHTML = "<p class='placeholder-msg'>Failed to load trends.</p>";
      return;
    }

    grid.innerHTML = results.map(item => {
      const type = item.media_type === 'movie' ? 'movie' : 'tv';
      const safeTitle = (item.title || item.name).replace(/'/g, "\\'");
      return `
        <div class="movie-card">
          <div class="poster-container">
            <img src="https://image.tmdb.org/t/p/w500${item.poster_path}" loading="lazy">
            <div class="badge">★ ${item.vote_average.toFixed(1)}</div>
          </div>
          <div class="card-details">
            <h3>${item.title || item.name}</h3>
            <button class="btn-add" onclick="quickAdd('${safeTitle}', '${type}')">+ Library</button>
          </div>
        </div>`;
    }).join('');
  },

  renderStats() {
    const container = document.getElementById('statsContent');
    if (State.library.length === 0) {
      container.innerHTML = "Add items to see analytics.";
      return;
    }
    
    const counts = State.library.reduce((acc, curr) => {
      acc[curr.type] = (acc[curr.type] || 0) + 1;
      return acc;
    }, { movie: 0, tv: 0, anime: 0 });

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
          <span>Total Items:</span> <strong>${State.library.length}</strong>
      </div>
      <div style="height:10px; background:#eee; border-radius:10px; overflow:hidden; display:flex;">
          <div style="width:${(counts.movie / State.library.length) * 100}%; background:var(--accent)"></div>
          <div style="width:${(counts.tv / State.library.length) * 100}%; background:#10b981"></div>
          <div style="width:${(counts.anime / State.library.length) * 100}%; background:#f59e0b"></div>
      </div>
      <p style="font-size:12px; margin-top:10px; color:var(--text-sub)">Blue: Movies | Green: Series | Gold: Anime</p>
    `;
  }
};

// ==========================================
// 4. GLOBAL HANDLERS (Used by HTML onclick)
// ==========================================
window.toggleSidebar = () => {
  document.getElementById("sidebar").classList.toggle("active");
  document.getElementById("overlay").classList.toggle("active");
};

window.toggleTheme = () => document.body.classList.toggle("dark-mode");

window.setType = (type) => {
  State.activeType = type;
  document.querySelectorAll('.filter-scroll .chip').forEach(c => c.classList.remove('active'));
  document.getElementById(`chip-${type}`).classList.add('active');
};

window.showView = (viewName) => {
  document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`view-${viewName}`) || document.getElementById('view-home');
  target.classList.add('active');
  document.getElementById('pageTitle').innerText = viewName.toUpperCase();

  const searchBar = document.getElementById('searchContainer');
  searchBar.style.display = (viewName === 'home') ? 'block' : 'none';

  if (viewName === 'trending') UI.renderTrending();
  if (viewName === 'analytics') UI.renderStats();
  if (viewName === 'profile') document.getElementById('appVersion').innerText = `App Version: ${VERSION}`;

  document.getElementById("sidebar").classList.remove("active");
  document.getElementById("overlay").classList.remove("active");
};

window.quickAdd = async (title, type) => {
  const result = await ApiService.searchMedia(title, type);
  if (result) {
    State.addItem(result);
    alert("Added to Library!");
    UI.renderLibrary();
  }
};

window.removeMedia = (index) => {
  State.removeItem(index);
  UI.renderLibrary();
};

// ==========================================
// 5. INITIALIZATION
// ==========================================
document.getElementById("searchTrigger").addEventListener("click", async () => {
  const input = document.getElementById("smartInput");
  const query = input.value.trim();
  if (!query) return;
  
  const result = await ApiService.searchMedia(query, State.activeType);
  if (result) {
    State.addItem(result);
    UI.renderLibrary();
    input.value = "";
  } else {
    alert("Media not found!");
  }
});

// Boot up the app
UI.renderLibrary();