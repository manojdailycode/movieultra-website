'use strict';

import { h } from '../utils/escape.js';
import { miniCard, wlPreviewCard } from '../components/card.js';
import { estimateHours, getYear } from '../utils/date.js';
import { state as userState, saveUser } from '../store/user.js';
import { state as libState } from '../store/library.js';
import { state as histState } from '../store/history.js';
import { updateSbUser } from '../components/sidebar.js';
import { toast } from '../components/toast.js';

export function renderProfile() {
  const el = document.getElementById('profileContent'); 
  if (!el) return;
  
  const user = userState.currentUser || { name: 'Movie Enthusiast', username: 'guest', avatar: null, banner: null, bio: '', favoriteGenre: '' };
  const library = libState.library;
  const watchHist = histState.watchHist;

  const libM = library.filter(i => i.type === 'movie').length;
  const libTV = library.filter(i => i.type === 'tv').length;
  const libA = library.filter(i => i.type === 'anime').length;
  const total = library.length;
  const wIds = new Set(watchHist.map(i => String(i.id)));
  const toWatch = library.filter(i => !wIds.has(String(i.id))).length;
  const rated = library.filter(i => parseFloat(i.rating) > 0).length;
  
  const watchedM = watchHist.filter(i => i.type === 'movie').length;
  const watchedS = watchHist.filter(i => i.type === 'tv').length;
  const watchedA = watchHist.filter(i => i.type === 'anime').length;
  
  const estHours = estimateHours(watchedM, watchedS, watchedA);
  const maxW = Math.max(watchedM, watchedS, watchedA, 1);
  
  const autoFav = libM >= libTV && libM >= libA ? 'Movies' : libTV >= libA ? 'Series' : 'Anime';
  const favGenre = user.favoriteGenre || autoFav;
  const favEmoji = user.favoriteGenre ? '❤️' : (autoFav === 'Movies' ? '🎬' : autoFav === 'Series' ? '📺' : '🌸');
  
  const initials = user.name ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'U';
  const joinYear = user.joinedAt ? getYear(user.joinedAt) : new Date().getFullYear();
  
  const recentWatched = watchHist.slice(0, 3);
  const wlPreview = library.slice(0, 3);

  el.innerHTML = `
    <div class="prof-header">
      <div class="prof-cover" ${user.banner ? `style="background-image: url('${h(user.banner)}'); background-size: cover; background-position: center;"` : ''}><div class="prof-cover-pattern"></div></div>
      <div class="prof-header-inner">
        <div class="prof-av-wrap">
          <div class="prof-av" id="profAvClick" role="button" tabindex="0" aria-label="Edit profile" title="Edit Profile">
            ${user.avatar ? `<img src="${h(user.avatar)}" alt="avatar" loading="lazy">` : `${initials}`}
          </div>
          <button class="prof-edit-btn" id="openEditProfile" aria-label="Edit profile">✏️ Edit Profile</button>
        </div>
        <div class="prof-name">${h(user.name)}</div>
        <div class="prof-username">@${h(user.username)}</div>
        <div class="prof-bio">${user.bio ? h(user.bio) : 'Movie Enthusiast – Tracking your cinematic universe'}</div>
        <div class="prof-meta">
          <span>📅 Member since ${joinYear}</span>
          ${estHours > 0 ? `<span>⏱ ~${estHours}h watched</span>` : ''}
          ${favGenre ? `<span>${favEmoji} ${favGenre}</span>` : ''}
        </div>
      </div>
    </div>

    <div class="prof-section">
      <div class="prof-section-title">Stats</div>
      <div class="prof-stats-main">
        <div class="pstat accent-red pstat-clickable" id="profStatLib" role="button" tabindex="0" title="Click to view All Saved in Watchlist"><div class="pstat-icon">📚</div><div class="pstat-num">${total}</div><div class="pstat-lbl">Library</div></div>
        <div class="pstat accent-green pstat-clickable" id="profStatWatched" role="button" tabindex="0" title="Click to view Completed titles"><div class="pstat-icon">✅</div><div class="pstat-num">${watchHist.length}</div><div class="pstat-lbl">Watched</div></div>
        <div class="pstat accent-gold pstat-clickable" id="profStatPlanned" role="button" tabindex="0" title="Click to view Plan to Watch titles"><div class="pstat-icon">⏳</div><div class="pstat-num">${toWatch}</div><div class="pstat-lbl">To Watch</div></div>
        <div class="pstat accent-blue pstat-clickable" id="profStatRated" role="button" tabindex="0" title="Click to view Insights"><div class="pstat-icon">⭐</div><div class="pstat-num">${rated}</div><div class="pstat-lbl">Rated</div></div>
      </div>
      <div class="prof-stats-type">
        <div class="pstat"><div class="pstat-icon">🎬</div><div class="pstat-num">${watchedM}</div><div class="pstat-lbl">Movies</div></div>
        <div class="pstat"><div class="pstat-icon">📺</div><div class="pstat-num">${watchedS}</div><div class="pstat-lbl">Series</div></div>
        <div class="pstat accent-purple"><div class="pstat-icon">🌸</div><div class="pstat-num">${watchedA}</div><div class="pstat-lbl">Anime</div></div>
      </div>
    </div>

    <div class="prof-section">
      <div class="chart-box" style="margin-bottom:0">
        <h3>Watch Breakdown</h3>
        <div class="wt-row"><div class="wt-lbl">🎬 Movies</div><div class="wt-track"><div class="wt-fill" style="width:${((watchedM / maxW) * 100).toFixed(0)}%;background:var(--red)"></div></div><div class="wt-count">${watchedM}</div></div>
        <div class="wt-row"><div class="wt-lbl">📺 Series</div><div class="wt-track"><div class="wt-fill" style="width:${((watchedS / maxW) * 100).toFixed(0)}%;background:var(--blue)"></div></div><div class="wt-count">${watchedS}</div></div>
        <div class="wt-row"><div class="wt-lbl">🌸 Anime</div><div class="wt-track"><div class="wt-fill" style="width:${((watchedA / maxW) * 100).toFixed(0)}%;background:var(--purple)"></div></div><div class="wt-count">${watchedA}</div></div>
      </div>
    </div>

    ${recentWatched.length ? `
    <div class="prof-section" style="padding-top:18px">
      <div class="prof-row-header">
        <div class="prof-section-title">Recently Watched</div>
        <button class="view-all-link" id="profGoHistory">View All →</button>
      </div>
      <div class="prof-scroll-wrap">${recentWatched.map(i => miniCard(i)).join('')}</div>
    </div>` : ''}

    ${wlPreview.length ? `
    <div class="prof-section" style="padding-top:18px;padding-bottom:24px">
      <div class="prof-row-header">
        <div class="prof-section-title">Watchlist Preview</div>
        <button class="view-all-link" id="profGoWatchlist">View All →</button>
      </div>
      <div class="prof-scroll-wrap">
        ${wlPreview.map(item => wlPreviewCard(item)).join('')}
      </div>
    </div>` : ''}`;

  document.getElementById('openEditProfile')?.addEventListener('click', openEditProfile);
  document.getElementById('profAvClick')?.addEventListener('click', openEditProfile);

  document.getElementById('profStatLib')?.addEventListener('click', () => {
    if (window.filterWatchlistStatus) window.filterWatchlistStatus('all');
    else if (window.showView) window.showView('watchlist');
  });
  document.getElementById('profStatWatched')?.addEventListener('click', () => {
    if (window.filterWatchlistStatus) window.filterWatchlistStatus('Completed');
    else if (window.showView) window.showView('history');
  });
  document.getElementById('profStatPlanned')?.addEventListener('click', () => {
    if (window.filterWatchlistStatus) window.filterWatchlistStatus('Planned');
    else if (window.showView) window.showView('watchlist');
  });
  document.getElementById('profStatRated')?.addEventListener('click', () => {
    if (window.showView) window.showView('analytics');
  });

  document.getElementById('profGoHistory')?.addEventListener('click', () => {
    if (window.showView) window.showView('history');
  });
  document.getElementById('profGoWatchlist')?.addEventListener('click', () => {
    if (window.showView) window.showView('watchlist');
  });
}

export function openEditProfile() {
  const user = userState.currentUser || { name: '', username: '', avatar: null, banner: null, bio: '', favoriteGenre: '' };
  const initials = user.name ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'U';

  const nameInput = document.getElementById('epName');
  const userInput = document.getElementById('epUsername');
  const bioInput = document.getElementById('epBio');
  const genreSelect = document.getElementById('epGenre');

  if (nameInput) nameInput.value = user.name || '';
  if (userInput) userInput.value = user.username || '';
  if (bioInput) bioInput.value = user.bio || '';
  if (genreSelect) genreSelect.value = user.favoriteGenre || '';

  const epAv = document.getElementById('epAvatar');
  if (epAv) {
    epAv.innerHTML = user.avatar
      ? `<img src="${h(user.avatar)}" alt="avatar" loading="lazy"><div class="ep-av-overlay">📷</div>`
      : `${initials}<div class="ep-av-overlay">📷</div>`;
    epAv.style.background = user.avatar ? 'transparent' : 'var(--red)';
    epAv._pendingAvatar = null;
  }

  const epBanner = document.getElementById('epBanner');
  if (epBanner) {
    epBanner.style.backgroundImage = user.banner ? `url(${user.banner})` : '';
    epBanner._pendingBanner = null;
  }

  const editProfileModal = document.getElementById('editProfileModal');
  if (editProfileModal) {
    editProfileModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    nameInput?.focus();
  }
}

export function closeEditProfile() {
  const editProfileModal = document.getElementById('editProfileModal');
  if (editProfileModal) editProfileModal.classList.add('hidden');
  document.body.style.overflow = '';
}

export function initProfileListeners() {
  document.getElementById('epClose')?.addEventListener('click', closeEditProfile);
  document.getElementById('epCancel')?.addEventListener('click', closeEditProfile);
  document.getElementById('editProfileModal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('editProfileModal')) {
      closeEditProfile();
    }
  });

  document.getElementById('epAvatar')?.addEventListener('click', () => {
    document.getElementById('epAvatarInput')?.click();
  });

  document.getElementById('epAvatar')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      document.getElementById('epAvatarInput')?.click();
    }
  });

  document.getElementById('epAvatarInput')?.addEventListener('change', function() {
    const file = this.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Please select an image file', 'err');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('Image must be under 5MB', 'err');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const src = e.target.result;
      const epAv = document.getElementById('epAvatar');
      if (epAv) {
        epAv.innerHTML = `<img src="${src}" alt="avatar" loading="lazy"><div class="ep-av-overlay">📷</div>`;
        epAv.style.background = 'transparent';
        epAv._pendingAvatar = src;
      }
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('epBanner')?.addEventListener('click', () => {
    document.getElementById('epBannerInput')?.click();
  });

  document.getElementById('epBanner')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      document.getElementById('epBannerInput')?.click();
    }
  });

  document.getElementById('epBannerInput')?.addEventListener('change', function() {
    const file = this.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Please select an image file', 'err');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('Image must be under 5MB', 'err');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const src = e.target.result;
      const epBanner = document.getElementById('epBanner');
      if (epBanner) {
        epBanner.style.backgroundImage = `url(${src})`;
        epBanner._pendingBanner = src;
      }
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('epSave')?.addEventListener('click', () => {
    const nameInput = document.getElementById('epName');
    const userInput = document.getElementById('epUsername');
    const bioInput = document.getElementById('epBio');
    const genreSelect = document.getElementById('epGenre');

    const name = nameInput ? nameInput.value.trim() : '';
    const username = userInput ? userInput.value.trim().replace(/^@/, '') : '';
    const bio = bioInput ? bioInput.value.trim() : '';
    const genre = genreSelect ? genreSelect.value : '';

    if (!name) {
      toast('Display name cannot be empty', 'err');
      return;
    }
    if (!username) {
      toast('Username cannot be empty', 'err');
      return;
    }

    const epAv = document.getElementById('epAvatar');
    const newAvatar = epAv?._pendingAvatar || (userState.currentUser?.avatar || null);

    const epBanner = document.getElementById('epBanner');
    const newBanner = epBanner?._pendingBanner || (userState.currentUser?.banner || null);

    userState.currentUser = {
      ...userState.currentUser,
      name,
      username,
      bio,
      favoriteGenre: genre,
      avatar: newAvatar,
      banner: newBanner,
      joinedAt: userState.currentUser?.joinedAt || new Date().toISOString()
    };

    saveUser();
    updateSbUser();
    closeEditProfile();
    toast('✅ Profile updated!');
    
    const activeView = window.activeView || 'profile';
    if (activeView === 'profile') {
      renderProfile();
    }
  });
}

window.openEditProfile = openEditProfile;

