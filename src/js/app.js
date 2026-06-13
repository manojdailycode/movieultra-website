'use strict';

import { debounce } from './utils/debounce.js';
import { h } from './utils/escape.js';
import { migrateStorage } from './utils/storage.js';
import { storeEvents } from './store/events.js';

import {
  state as userState,
  bootApp as bootUserApp,
  logout,
  readTheme
} from './store/user.js';

import {
  state as libState,
  libAdd,
  libRemove,
  libHas,
  clearLibraryDirect,
  saveLib
} from './store/library.js';

import {
  state as histState,
  histAdd,
  histRemove,
  histClearDirect as clearHistDirect,
  saveHist
} from './store/history.js';

import {
  searchTMDB,
  fromTMDB
} from './api/tmdb.js';

import {
  searchAnime,
  fromJikan
} from './api/jikan.js';

import {
  itemFrom
} from './components/card.js';

import {
  toast
} from './components/toast.js';

import {
  signUpUser,
  signInUser,
  signOutUser,
  resetPassword,
  onAuthChange
} from './firebase/auth.js';

import {
  openModal,
  initModalListeners
} from './components/modal.js';

import {
  initTrailerListeners
} from './components/trailer.js';

import {
  updateSbUser,
  initSidebarListeners,
  closeSidebar
} from './components/sidebar.js';

import {
  renderLibraryRow,
  renderHistoryRow,
  renderTrendRow,
  renderAnimeHomeRow,
  loadHero,
  initHeroListeners
} from './views/home.js';

import {
  renderTrendingGrid,
  initTrendingListeners,
  state as trendingState
} from './views/trending.js';

import {
  renderMoviesGrid,
  initMoviesListeners
} from './views/movies.js';

import {
  renderSeriesGrid,
  initSeriesListeners
} from './views/series.js';

import {
  renderAnimeGrid,
  initAnimeListeners
} from './views/anime.js';

import {
  renderWatchlist,
  initWatchlistListeners
} from './views/watchlist.js';

import {
  renderHistoryGrid,
  initHistoryListeners
} from './views/history.js';

import {
  renderAnalytics
} from './views/analytics.js';

import {
  renderProfile,
  initProfileListeners
} from './views/profile.js';

import {
  renderSettings,
  applyTheme,
  toggleTheme
} from './views/settings.js';

import {
  renderFeedback
} from './views/feedback.js';

import { configState } from './store/config.js';

/* ─── DEMO DATA ──────────────────────────────────────── */
const DEMO_USER = {
  name: 'Manoj V',
  username: 'manoj_ultra',
  avatar: null,
  bio: 'Movie enthusiast tracking the cinematic universe 🎬',
  favoriteGenre: 'Sci-Fi',
  joinedAt: new Date(Date.now() - 8.64e7 * 180).toISOString()
};

const DEMO_LIBRARY = [
  { id: 238, title: 'The Godfather', year: '1972', type: 'movie', rating: '9.2', genre: 'Crime', platform: 'Netflix', status: 'Completed', note: 'All-time masterpiece', poster: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsLMd5jE4dKEQ.jpg', backdrop: 'https://image.tmdb.org/t/p/w1280/rSPw7tgCH9c6NqICZef4kZjFOQ5.jpg', overview: 'The aging patriarch of an organized crime dynasty.', addedAt: new Date(Date.now() - 8.64e7 * 5).toISOString() },
  { id: 550, title: 'Fight Club', year: '1999', type: 'movie', rating: '8.8', genre: 'Thriller', platform: 'Amazon', status: 'Completed', note: 'Mind-bending', poster: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', backdrop: 'https://image.tmdb.org/t/p/w1280/87hTDiay2N2qWyX4Ds7ybXi9h8I.jpg', overview: 'An insomniac office worker forms an underground fight club.', addedAt: new Date(Date.now() - 8.64e7 * 4).toISOString() },
  { id: 1396, title: 'Breaking Bad', year: '2008', type: 'tv', rating: '9.5', genre: 'Drama', platform: 'Netflix', status: 'Completed', note: 'Greatest TV show ever', poster: 'https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg', backdrop: 'https://image.tmdb.org/t/p/w1280/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg', overview: 'A chemistry teacher turns to manufacturing meth.', addedAt: new Date(Date.now() - 8.64e7 * 3).toISOString() },
  { id: 5114, title: 'Attack on Titan', year: '2013', type: 'anime', rating: '9.0', genre: 'Action', platform: 'Crunchyroll', status: 'Completed', note: 'Epic story', poster: 'https://image.tmdb.org/t/p/w500/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg', backdrop: 'https://image.tmdb.org/t/p/w1280/sHItyNuUQ6DlfhkXi4sNs3rBR3y.jpg', overview: 'A young boy vows to cleanse the earth of titans.', addedAt: new Date(Date.now() - 8.64e7 * 2).toISOString() },
  { id: 1399, title: 'Game of Thrones', year: '2011', type: 'tv', rating: '9.3', genre: 'Fantasy', platform: 'Disney+', status: 'Completed', note: 'S8 disappoints', poster: 'https://image.tmdb.org/t/p/w500/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg', backdrop: 'https://image.tmdb.org/t/p/w1280/suopoADq0k8YZr4dQXcU6pToj6s.jpg', overview: 'Nine noble families fight for Westeros.', addedAt: new Date(Date.now() - 8.64e7).toISOString() },
  { id: 157336, title: 'Interstellar', year: '2014', type: 'movie', rating: '8.7', genre: 'Sci-Fi', platform: 'Amazon', status: 'Completed', note: 'Best Nolan film', poster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', backdrop: 'https://image.tmdb.org/t/p/w1280/pbrkL804c8yAv3zBZR4QPEafpAR.jpg', overview: 'Explorers travel through a wormhole.', addedAt: new Date().toISOString() },
];

const DEMO_HISTORY = [
  { ...DEMO_LIBRARY[0], watchedAt: new Date(Date.now() - 8.64e7 * 4).toISOString() },
  { ...DEMO_LIBRARY[2], watchedAt: new Date(Date.now() - 8.64e7 * 2).toISOString() },
  { ...DEMO_LIBRARY[3], watchedAt: new Date(Date.now() - 8.64e7).toISOString() },
];

/* ─── ROUTING & VIEWS ────────────────────────────────── */
export function showView(name) {
  document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active', 'anim'));
  const target = document.getElementById(`view-${name}`) || document.getElementById('view-home');
  if (target) {
    void target.offsetWidth;
    target.classList.add('active', 'anim');
  }
  
  window.activeView = name;
  document.querySelectorAll('[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === name));
  closeSidebar();
  
  switch (name) {
    case 'home':
      renderLibraryRow();
      renderHistoryRow();
      break;
    case 'trending':  renderTrendingGrid(trendingState.trendPage); break;
    case 'movies':    renderMoviesGrid();  break;
    case 'series':    renderSeriesGrid();  break;
    case 'anime':     renderAnimeGrid();   break;
    case 'watchlist': renderWatchlist();   break;
    case 'history':   renderHistoryGrid(); break;
    case 'analytics': renderAnalytics();   break;
    case 'profile':   renderProfile();     break;
    case 'settings':  renderSettings();    break;
    case 'feedback':  renderFeedback();    break;
  }
}

window.showView = showView; // Make globally accessible for inline links

function refreshView() {
  const name = window.activeView || 'home';
  switch (name) {
    case 'watchlist': renderWatchlist();   break;
    case 'history':   renderHistoryGrid(); break;
    case 'analytics': renderAnalytics();   break;
    case 'profile':   renderProfile();     break;
  }
  renderLibraryRow();
  renderHistoryRow();
}

/* ─── GLOBAL DELEGATED CLICK HANDLERS ───────────────── */
document.getElementById('mainContent')?.addEventListener('click', e => {
  const more = e.target.closest('.row-more[data-view]');
  if (more) {
    showView(more.dataset.view);
    return;
  }
  const btn = e.target.closest('[data-ca]');
  const crd = e.target.closest('.movie-card');
  if (crd) {
    const item = itemFrom(crd);
    if (btn) {
      e.stopPropagation();
      const action = btn.dataset.ca;
      if (action === 'add') {
        const added = libAdd(item);
        if (added.msg) toast(added.msg, added.type || 'ok');
      }
      if (action === 'remove') {
        libRemove(item.id, item.title, item.type);
        toast('Removed from library', 'info');
      }
      if (action === 'watch') {
        histAdd(item);
        toast(`👁 Marked "${item.title}" as watched`);
      }
      if (action === 'unwatch') {
        histRemove(item.id);
        toast('Removed from history', 'info');
      }
      return;
    }
    openModal(item);
    return;
  }
  
  const mc = e.target.closest('.mini-card, .wl-preview-card');
  if (mc) {
    openModal(itemFrom(mc));
  }
});

document.getElementById('mainContent')?.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') {
    const crd = e.target.closest('.movie-card, .mini-card, .wl-preview-card');
    if (crd) {
      e.preventDefault();
      openModal(itemFrom(crd));
    }
  }
});

/* ─── THEME HANDLING ─────────────────────────────────── */
window.applyTheme = applyTheme;
window.toggleTheme = toggleTheme;
document.getElementById('themeBtn')?.addEventListener('click', toggleTheme);

/* ─── SEARCH & ADD SUGGESTIONS ───────────────────────── */
let activeType = 'movie';

const smartInput = document.getElementById('smartInput');
const addSuggEl = document.getElementById('addSuggestions');

const debouncedAddSearch = debounce((q) => fetchSuggestions(q, addSuggEl, activeType, false), 320);

smartInput?.addEventListener('input', () => {
  const q = smartInput.value.trim();
  if (q.length < 2) {
    if (addSuggEl) addSuggEl.innerHTML = '';
    return;
  }
  debouncedAddSearch(q);
});

smartInput?.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleAdd();
  }
  if (e.key === 'Escape') {
    if (addSuggEl) addSuggEl.innerHTML = '';
  }
});

document.getElementById('searchTrigger')?.addEventListener('click', handleAdd);

document.addEventListener('click', e => {
  if (!e.target.closest('#addBar')) {
    if (addSuggEl) addSuggEl.innerHTML = '';
  }
});

document.querySelectorAll('.type-chips .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.type-chips .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeType = chip.dataset.type;
    if (addSuggEl) addSuggEl.innerHTML = '';
  });
});

async function handleAdd() {
  if (!smartInput) return;
  const q = smartInput.value.trim();
  if (!q) return;
  if (addSuggEl) addSuggEl.innerHTML = '';
  
  if (libHas(null, q)) {
    toast(`"${q}" already in library`, 'info');
    return;
  }

  const btn = document.getElementById('searchTrigger');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '…';
  }

  try {
    let item = null;
    if (activeType === 'anime') {
      const d = await searchAnime(q, 1);
      if (d.data?.length) item = fromJikan(d.data[0]);
    } else {
      const d = await searchTMDB(q, activeType);
      if (d.results?.length) item = fromTMDB(d.results[0], activeType);
    }
    
    if (item) {
      libAdd(item);
      smartInput.value = '';
    } else {
      toast(`No results for "${q}"`, 'err');
    }
  } catch (err) {
    toast(`Search failed: ${err.message}`, 'err');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '＋ Add';
    }
  }
}

/* ─── SEARCH OVERLAY ─────────────────────────────────── */
const searchOverlay = document.getElementById('searchOverlay');
const overlayInput = document.getElementById('searchOverlayInput');
const overlaySugg = document.getElementById('overlaySuggestions');

document.getElementById('searchToggle')?.addEventListener('click', () => {
  searchOverlay?.classList.remove('hidden');
  overlayInput?.focus();
});

document.getElementById('searchCloseBtn')?.addEventListener('click', closeSearchOverlay);

searchOverlay?.addEventListener('click', e => {
  if (e.target === searchOverlay) closeSearchOverlay();
});

function closeSearchOverlay() {
  searchOverlay?.classList.add('hidden');
  if (overlayInput) overlayInput.value = '';
  if (overlaySugg) overlaySugg.innerHTML = '';
}

const debouncedOverlaySearch = debounce((q) => fetchSuggestions(q, overlaySugg, 'all', true), 320);

overlayInput?.addEventListener('input', () => {
  const q = overlayInput.value.trim();
  if (q.length < 2) {
    if (overlaySugg) overlaySugg.innerHTML = '';
    return;
  }
  debouncedOverlaySearch(q);
});

async function fetchSuggestions(q, container, mode, isOverlay) {
  if (!container) return;
  container.innerHTML = `<div class="sugg-item" style="justify-content:center;padding:14px"><div class="spinner sm"></div></div>`;
  
  try {
    let items = [];
    if (mode === 'anime') {
      const d = await searchAnime(q, 6);
      items = (d.data || []).map(fromJikan);
    } else if (mode === 'all') {
      const d = await searchTMDB(q, 'all');
      items = (d.results || []).filter(r => r.media_type !== 'person').slice(0, 7).map(r => fromTMDB(r));
    } else {
      const d = await searchTMDB(q, mode);
      items = (d.results || []).slice(0, 7).map(r => fromTMDB(r, mode));
    }

    if (!items.length) {
      container.innerHTML = `<div class="sugg-empty">No results for "${h(q)}"</div>`;
      return;
    }

    const typeLabels = { movie: 'Movie', tv: 'Series', anime: 'Anime' };
    const NOPOSTER = 'https://placehold.co/300x450/1c1c1c/555?text=No+Image';

    container.innerHTML = items.map(item => `
      <div class="sugg-item"
        data-id="${h(String(item.id || ''))}" data-type="${h(item.type)}" data-title="${h(item.title)}"
        data-year="${h(String(item.year || ''))}" data-rating="${h(String(item.rating || ''))}"
        data-poster="${h(encodeURIComponent(item.poster))}"
        data-backdrop="${h(encodeURIComponent(item.backdrop || ''))}"
        data-ov="${h(encodeURIComponent(item.overview || ''))}">
        <img src="${h(item.poster)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${NOPOSTER}'">
        <div class="sugg-text"><div class="sugg-title">${h(item.title)}</div><div class="sugg-meta">${h(String(item.year))} · ★ ${h(String(item.rating))}</div></div>
        <span class="type-pill ${h(item.type)}">${h(typeLabels[item.type] || item.type)}</span>
      </div>`).join('');

    container.onclick = e => {
      const row = e.target.closest('.sugg-item');
      if (!row) return;
      
      const it = {
        id: row.dataset.id || null,
        type: row.dataset.type || 'movie',
        title: row.dataset.title || '',
        year: row.dataset.year || '',
        rating: row.dataset.rating || '',
        poster: decodeURIComponent(row.dataset.poster || encodeURIComponent(NOPOSTER)),
        backdrop: decodeURIComponent(row.dataset.backdrop || ''),
        overview: decodeURIComponent(row.dataset.ov || '')
      };
      
      if (isOverlay) {
        openModal(it);
        closeSearchOverlay();
      } else {
        libAdd(it);
        if (smartInput) smartInput.value = '';
        container.innerHTML = '';
      }
    };
  } catch (err) {
    container.innerHTML = `<div class="sugg-empty">⚠️ ${h(err.message)}</div>`;
  }
}

/* ─── PWA INSTALLATION ───────────────────────────────── */
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  window.deferredPWA = e;
  document.getElementById('pwaInstallBtn')?.classList.remove('hidden');
  if (window.activeView === 'settings') {
    renderSettings();
  }
});

export function installPWA() {
  const deferred = window.deferredPWA;
  if (!deferred) return;
  deferred.prompt();
  deferred.userChoice.then(r => {
    if (r.outcome === 'accepted') toast('App installed! 🎉');
    window.deferredPWA = null;
    document.getElementById('pwaInstallBtn')?.classList.add('hidden');
    if (window.activeView === 'settings') {
      renderSettings();
    }
  });
}
window.installPWA = installPWA;
document.getElementById('pwaInstallBtn')?.addEventListener('click', installPWA);

/* ─── APP BOOTSTRAP & LOGIN ──────────────────────────── */
let loginState = 'signin'; // 'signin', 'signup', 'forgot'

function setLoginState(state) {
  loginState = state;
  const nameField = document.getElementById('loginDisplayNameField');
  const passField = document.getElementById('loginPassField');
  const loginBtn = document.getElementById('loginBtn');
  const toggleMsg = document.getElementById('loginToggleMsg');
  const tagline = document.getElementById('loginTagline');

  if (!tagline || !loginBtn || !toggleMsg) return;

  if (state === 'signin') {
    nameField?.classList.add('hidden');
    passField?.classList.remove('hidden');
    tagline.textContent = 'Your Premium Cinematic Universe Tracker';
    loginBtn.textContent = 'Sign In';
    toggleMsg.innerHTML = `Don't have an account? <button type="button" class="login-link-btn" id="toggleSignUpBtn">Sign Up</button>`;
    document.getElementById('toggleSignUpBtn')?.addEventListener('click', () => setLoginState('signup'));
  } else if (state === 'signup') {
    nameField?.classList.remove('hidden');
    passField?.classList.remove('hidden');
    tagline.textContent = 'Create your premium tracker account';
    loginBtn.textContent = 'Sign Up';
    toggleMsg.innerHTML = `Already have an account? <button type="button" class="login-link-btn" id="toggleSignInBtn">Sign In</button>`;
    document.getElementById('toggleSignInBtn')?.addEventListener('click', () => setLoginState('signin'));
  } else if (state === 'forgot') {
    nameField?.classList.add('hidden');
    passField?.classList.add('hidden');
    tagline.textContent = 'Reset your account password';
    loginBtn.textContent = 'Send Reset Email';
    toggleMsg.innerHTML = `Back to <button type="button" class="login-link-btn" id="toggleSignInBtn">Sign In</button>`;
    document.getElementById('toggleSignInBtn')?.addEventListener('click', () => setLoginState('signin'));
  }
}

function bootApp(user) {
  bootUserApp(user);
  updateSbUser();
  const ls = document.getElementById('loginScreen');
  if (ls) {
    ls.style.transition = 'opacity .4s';
    ls.style.opacity = '0';
    setTimeout(() => {
      ls.style.display = 'none';
      document.body.style.overflow = '';
    }, 400);
  }
}

document.getElementById('forgotPassLink')?.addEventListener('click', () => setLoginState('forgot'));

document.getElementById('loginBtn')?.addEventListener('click', async () => {
  const email = document.getElementById('loginUser')?.value.trim();
  if (!email) {
    toast('Please enter your email address', 'err');
    return;
  }

  if (loginState === 'forgot') {
    try {
      toast('Sending reset link...');
      await resetPassword(email);
      toast('✅ Password reset link sent!');
      setLoginState('signin');
    } catch (err) {
      toast(err.message, 'err');
    }
    return;
  }

  const password = document.getElementById('loginPass')?.value.trim();
  if (!password) {
    toast('Please enter your password', 'err');
    return;
  }

  if (loginState === 'signup') {
    const displayName = document.getElementById('loginDisplayName')?.value.trim();
    try {
      toast('Creating account...');
      await signUpUser(email, password, displayName);
      toast('✅ Account created! Logging in...');
    } catch (err) {
      toast(err.message, 'err');
    }
  } else if (loginState === 'signin') {
    try {
      toast('Signing in...');
      await signInUser(email, password);
      toast('Welcome back! 👋');
    } catch (err) {
      toast(err.message, 'err');
    }
  }
});

document.getElementById('loginPass')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    document.getElementById('loginBtn')?.click();
  }
});

document.getElementById('demoBtn')?.addEventListener('click', () => {
  // Reset library and history with demo sets
  libState.library.length = 0;
  DEMO_LIBRARY.forEach(item => {
    libState.library.push({ ...item });
  });
  saveLib();

  histState.watchHist.length = 0;
  DEMO_HISTORY.forEach(item => {
    histState.watchHist.push({ ...item });
  });
  saveHist();

  storeEvents.emit('library-changed');
  storeEvents.emit('history-changed');

  bootApp({ ...DEMO_USER });
  toast('🎬 Demo account loaded!');
  
  refreshView();
  showView('home');
});

// Global window mappings for navigation routing links
document.getElementById('navAvatar')?.addEventListener('click', () => showView('profile'));
document.getElementById('navAvatar')?.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') showView('profile');
});
document.getElementById('sbUserRow')?.addEventListener('click', () => showView('profile'));

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  if (!confirm('Sign out?')) return;
  
  logout();
  try {
    await signOutUser();
  } catch (err) {
    console.error('[MovieUltra] Signout error:', err);
  }

  const ls = document.getElementById('loginScreen');
  if (ls) {
    ls.style.opacity = '1';
    ls.style.display = 'flex';
  }
  document.body.style.overflow = 'hidden';
  toast('Signed out', 'info');
});

// Sidebar & top nav links delegator
document.getElementById('sbNav')?.addEventListener('click', e => {
  const btn = e.target.closest('.sb-link[data-view]');
  if (btn) showView(btn.dataset.view);
});
document.getElementById('navLinks')?.addEventListener('click', e => {
  const btn = e.target.closest('.nav-link[data-view]');
  if (btn) showView(btn.dataset.view);
});
document.querySelector('.bottom-nav')?.addEventListener('click', e => {
  const btn = e.target.closest('.b-item[data-view]');
  if (btn) showView(btn.dataset.view);
});

// Header styling on scroll page
window.addEventListener('scroll', debounce(() => {
  document.getElementById('topNav')?.classList.toggle('solid', window.scrollY > 80);
}, 50), { passive: true });

/* ─── STORES EVENTS SYNC ────────────────────────────── */
storeEvents.on('library-changed', () => {
  refreshView();
  updateSbUser();
});

storeEvents.on('history-changed', () => {
  refreshView();
});

storeEvents.on('config-changed', () => {
  document.body.classList.toggle('layout-grid-only', configState.defaultLayout === 'grid');
});

/* ─── INITIALIZATION ────────────────────────────────── */
function init() {
  console.log('[MovieUltra] Starting MovieUltra v9...');
  migrateStorage();

  // Apply layout preference on startup
  document.body.classList.toggle('layout-grid-only', configState.defaultLayout === 'grid');

  const theme = readTheme();
  applyTheme(theme);

  // Bind individual components listeners
  initModalListeners();
  initTrailerListeners();
  initSidebarListeners();

  // Bind individual view layers listeners
  initHeroListeners();
  initTrendingListeners();
  initMoviesListeners();
  initSeriesListeners();
  initAnimeListeners();
  initWatchlistListeners();
  initHistoryListeners();
  initProfileListeners();

  // Set default signin state
  setLoginState('signin');

  // Verify and boot layout instantly if a user is in local storage (prevent flashes)
  if (userState.currentUser) {
    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen) {
      loginScreen.style.display = 'none';
    }
    document.body.style.overflow = '';
    updateSbUser();
    refreshView();

    // Trigger home views fetch
    Promise.all([
      loadHero(),
      renderTrendRow(),
      renderAnimeHomeRow()
    ]).catch(e => console.error('[MovieUltra] Home rows failed:', e));

    document.querySelectorAll('[data-view="home"]').forEach(el => el.classList.add('active'));
    showView('home');
  } else {
    document.body.style.overflow = 'hidden';
  }

  // Set up Firebase / Mock Auth Change listener
  onAuthChange(user => {
    if (user) {
      const email = user.email || 'user@example.com';
      const appUser = {
        name: user.displayName || email.split('@')[0],
        username: email.replace(/[^a-z0-9_]/gi, '_').toLowerCase(),
        avatar: userState.currentUser?.avatar || null,
        bio: userState.currentUser?.bio || '',
        favoriteGenre: userState.currentUser?.favoriteGenre || '',
        joinedAt: userState.currentUser?.joinedAt || new Date().toISOString()
      };
      
      bootApp(appUser);
      
      // Load home page rows
      Promise.all([
        loadHero(),
        renderTrendRow(),
        renderAnimeHomeRow()
      ]).catch(e => console.error('[MovieUltra] Home rows failed:', e));
      
      showView('home');
    } else {
      // If we are currently logged in as demo user, do NOT force logout
      if (userState.currentUser && userState.currentUser.username === 'manoj_ultra') {
        return;
      }
      
      // Otherwise, clear user state and show login screen
      logout();
      const loginScreen = document.getElementById('loginScreen');
      if (loginScreen) {
        loginScreen.style.opacity = '1';
        loginScreen.style.display = 'flex';
      }
      document.body.style.overflow = 'hidden';
    }
  });

  // Register PWA Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('[MovieUltra] ServiceWorker registered with scope:', reg.scope))
      .catch(err => console.warn('[MovieUltra] ServiceWorker registration failed:', err));
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
