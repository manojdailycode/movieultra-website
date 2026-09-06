'use strict';

import { h } from '../utils/escape.js';
import { toast } from '../components/toast.js';
import { card } from '../components/card.js';
import { SourceManager } from '../services/sourceManager.js';
import { saveProgress, getProgress, removeProgress } from '../store/progress.js';
import { getDetailsTMDB, getSeasonTMDB, fromTMDB } from '../api/tmdb.js';
import { getAnimeDetails, fromJikan } from '../api/jikan.js';
import { histAdd } from '../store/history.js';
import { libSetOrUpdate } from '../store/library.js';

const W500 = 'https://image.tmdb.org/t/p/w500';
const W1280 = 'https://image.tmdb.org/t/p/w1280';
const W342 = 'https://image.tmdb.org/t/p/w342';
const NOPOSTER = 'https://placehold.co/300x450/1c1c1c/555?text=No+Image';

let _watchState = {
  type: null,
  id: null,
  details: null,
  season: null,
  episode: null,
  trailerKey: null,
  sources: [],
  currentSource: null,
  progressTimer: null,
  startTime: null,
  animeLang: 'sub', // 'sub' | 'dub'
};

/**
 * Main entry point: open the watch view for a given type/id.
 * Optionally pass season/episode for TV series.
 */
export async function openWatchView(type, id, opts = {}) {
  const { season = null, episode = null } = opts;
  const currentEp = type === 'anime' ? (opts.episode !== undefined && opts.episode !== null ? Number(opts.episode) : 1) : episode;
  const prevLang = _watchState.animeLang || 'sub';

  _watchState = {
    type, id: String(id), details: null,
    season, episode: currentEp, trailerKey: null,
    sources: [], currentSource: null,
    progressTimer: null, startTime: null,
    animeLang: type === 'anime' ? (opts.animeLang || prevLang) : 'sub',
  };

  const section = document.getElementById('view-watch');
  const container = document.getElementById('watchContent');
  if (!section || !container) return;

  // Show the watch view
  document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active', 'anim'));
  void section.offsetWidth;
  section.classList.add('active', 'anim');
  window.activeView = 'watch';

  document.querySelectorAll('[data-view]').forEach(el =>
    el.classList.toggle('active', el.dataset.view === 'watch'));

  container.innerHTML = renderWatchSkeleton();

  try {
    let details, trailerKey, similar = [];

    if (type === 'anime') {
      const raw = await getAnimeDetails(id);
      details = raw.data;
      trailerKey = details?.trailer?.youtube_id || extractYouTubeKey(details?.trailer?.embed_url || '');
    } else {
      details = await getDetailsTMDB(type, id);
      trailerKey = (details.videos?.results || []).find(v => v.type === 'Trailer' && v.site === 'YouTube')?.key
        || (details.videos?.results || []).find(v => v.site === 'YouTube')?.key;
      similar = (details.similar?.results || details.recommendations?.results || [])
        .filter(r => r.poster_path).slice(0, 12);
    }

    _watchState.details = details;
    _watchState.trailerKey = trailerKey;
    _watchState.sources = SourceManager.getPlaybackSources(type);

    // For TV: load specific season/episode if provided
    let episodeData = null;
    if (type === 'tv' && season !== null && currentEp !== null) {
      try {
        const seasonData = await getSeasonTMDB(id, season);
        episodeData = (seasonData.episodes || []).find(ep => ep.episode_number === Number(currentEp));
      } catch { /* ignore */ }
    }

    // Auto-select source for playback (using preference or first available)
    _watchState.currentSource = SourceManager.getSourceForPlayback(type, id);

    const savedProgress = getProgress(id, type);
    container.innerHTML = renderWatchPage(type, id, details, trailerKey, similar, episodeData, savedProgress);
    initWatchInteractions(type, id, details, trailerKey, similar, episodeData, savedProgress);

  } catch (err) {
    console.error('[MovieUltra] Watch view failed:', err);
    container.innerHTML = `
      <div class="watch-error">
        <div class="watch-error-icon">⚠️</div>
        <h2>Unable to load this title</h2>
        <p>${h(err.message)}</p>
        <button class="btn-primary" onclick="history.back()">← Go Back</button>
      </div>`;
  }
}

function extractYouTubeKey(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube(?:-nocookie)?\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
  return m ? m[1] : null;
}

function getTitle(type, details) {
  if (type === 'anime') return details?.title || 'Untitled';
  return details?.title || details?.name || 'Untitled';
}

function getYear(type, details) {
  if (type === 'anime') return details?.aired?.prop?.from?.year || details?.year || '';
  return (details?.release_date || details?.first_air_date || '').split('-')[0] || '';
}

function getPoster(type, details) {
  if (type === 'anime') return details?.images?.jpg?.large_image_url || NOPOSTER;
  return details?.poster_path ? `${W500}${details.poster_path}` : NOPOSTER;
}

function getBackdrop(type, details) {
  if (type === 'anime') return details?.trailer?.images?.maximum_image_url || '';
  return details?.backdrop_path ? `${W1280}${details.backdrop_path}` : '';
}

function renderWatchSkeleton() {
  return `
    <div class="watch-skeleton">
      <div class="watch-player-shell skel-animate"></div>
      <div class="watch-meta-skel">
        <div class="skel-line w60" style="height:20px;margin-bottom:8px"></div>
        <div class="skel-line w40" style="height:14px"></div>
      </div>
    </div>`;
}

function renderWatchPage(type, id, details, trailerKey, similar, episodeData, savedProgress) {
  const title = getTitle(type, details);
  const year = getYear(type, details);
  const poster = getPoster(type, details);
  const backdrop = getBackdrop(type, details);
  const sources = SourceManager.getPlaybackSources(type);
  const hasSource = sources.length > 0;

  // Build episode info for TV & Anime
  let episodeInfo = '';
  if (type === 'tv' && episodeData) {
    episodeInfo = `
      <div class="watch-episode-info">
        <span class="watch-ep-badge">S${episodeData.season_number}:E${episodeData.episode_number}</span>
        <span class="watch-ep-title">${h(episodeData.name || '')}</span>
      </div>`;
  } else if (type === 'anime') {
    const curEp = _watchState.episode || 1;
    episodeInfo = `
      <div class="watch-episode-info">
        <span class="watch-ep-badge">EPISODE ${curEp}</span>
        <span class="watch-ep-title">${details?.episodes ? `of ${details.episodes} episodes` : ''}</span>
      </div>`;
  }

  // Progress resume banner
  let resumeBanner = '';
  if (savedProgress && savedProgress.percent > 2 && savedProgress.percent < 95) {
    const pct = Math.round(savedProgress.percent);
    resumeBanner = `
      <div class="watch-resume-banner">
        <span>▶ Resume from ${pct}%</span>
        <button class="btn-sm btn-primary" id="watchResumeBtn" data-time="${savedProgress.currentTime || 0}">Resume</button>
        <button class="btn-sm btn-ghost" id="watchRestartBtn">Restart</button>
      </div>`;
  }

  // Player section - AUTO-LOAD SOURCE
  let playerHtml = '';
  if (_watchState.currentSource) {
    playerHtml = `
      <div class="watch-player-frame" id="watchPlayerFrame">
        <div class="watch-source-loading" id="playerLoadingIndicator">
          <div class="mini-spinner"></div>
          <p>Connecting securely to ${h(_watchState.currentSource.name)}...</p>
        </div>
        <iframe
          id="watchMainIframe"
          src=""
          frameborder="0"
          title="${h(title)}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowfullscreen
          loading="lazy"
          data-source-id="${h(_watchState.currentSource.id)}"
          style="opacity:0; transition: opacity 0.3s;"
        ></iframe>
        <div class="watch-source-badge">
          <span class="badge-pill source-badge">▶ ${h(_watchState.currentSource.name)}</span>
        </div>
      </div>
      <p class="watch-source-note">
        Playing from <strong>${h(_watchState.currentSource.name)}</strong>. ${sources.length > 1 ? 'Switch server with source selector.' : ''} ${trailerKey ? 'View trailer with source selector.' : ''}
      </p>`;
  } else if (trailerKey) {
    const isAnime = type === 'anime';
    playerHtml = `
      <div class="watch-player-frame" id="watchPlayerFrame">
        <iframe
          id="watchTrailerIframe"
          src="${h(SourceManager.getTrailerEmbedUrl(trailerKey))}"
          frameborder="0"
          title="Trailer: ${h(title)}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowfullscreen
          loading="lazy"
        ></iframe>
        <div class="watch-trailer-badge">
          <span class="badge-pill trailer-badge">${isAnime ? '🎌 ANIME PREVIEW' : '🎬 TRAILER'}</span>
        </div>
      </div>
      <p class="watch-trailer-note">
        ${isAnime 
          ? 'Showing official HD anime preview trailer.' 
          : 'Showing official trailer. Full playback not available for this title.'}
      </p>`;
  } else {
    const isAnime = type === 'anime';
    playerHtml = `
      <div class="watch-no-source">
        <div class="watch-no-source-icon">${isAnime ? '🎌' : '🎬'}</div>
        <h3>${isAnime ? 'Anime Streaming Unavailable' : 'No playback source available'}</h3>
        <p>${isAnime 
          ? 'Streaming servers are currently unavailable for this anime title.' 
          : 'MovieUltra only plays from authorized streaming providers.'}</p>
        ${backdrop ? `<img src="${h(backdrop)}" alt="${h(title)}" class="watch-backdrop-preview" loading="lazy">` : ''}
        <div class="watch-provider-hint">
          <p>Check back later for availability updates.</p>
        </div>
      </div>`;
  }

  // Source selector + Sub/Dub toggle (anime only)
  let sourceSelectorHtml = '';
  if (sources.length > 0) {
    let optionsHtml = sources.map((s, i) => `<option value="${i}" ${_watchState.currentSource?.id === s.id ? 'selected' : ''}>${h(s.name)}</option>`).join('');
    if (trailerKey || type === 'anime') {
      optionsHtml += `<option value="trailer" ${_watchState.currentSource === 'trailer' ? 'selected' : ''}>🎬 YouTube Trailer</option>`;
    }
    const langToggle = type === 'anime' ? `
      <div class="watch-lang-toggle">
        <button class="watch-lang-btn ${_watchState.animeLang === 'sub' ? 'active' : ''}" id="watchLangSub" aria-label="Subtitled">SUB</button>
        <button class="watch-lang-btn ${_watchState.animeLang === 'dub' ? 'active' : ''}" id="watchLangDub" aria-label="Dubbed">DUB</button>
      </div>` : '';
    sourceSelectorHtml = `
      <div class="watch-source-selector">
        ${langToggle}
        <label class="watch-selector-label">Server</label>
        <select class="watch-select" id="watchSourceSelect" aria-label="Select playback source">
          ${optionsHtml}
        </select>
      </div>`;
  }

  // Seasons dropdown for TV
  let tvControls = '';
  if (type === 'tv' && details?.seasons?.length) {
    const validSeasons = details.seasons.filter(s => s.episode_count > 0);
    tvControls = `
      <div class="watch-tv-controls">
        <div class="watch-source-selector">
          <label class="watch-selector-label">Season</label>
          <select class="watch-select" id="watchSeasonSelect" aria-label="Select season">
            ${validSeasons.map(s => `<option value="${s.season_number}" ${s.season_number == _watchState.season ? 'selected' : ''}>${h(s.name || `Season ${s.season_number}`)} (${s.episode_count} eps)</option>`).join('')}
          </select>
        </div>
        <div id="watchEpisodesContainer" class="watch-episodes-container">
          <div class="mini-loading">Loading episodes…</div>
        </div>
      </div>`;
  }

  // Anime Episode selector
  let animeControls = '';
  if (type === 'anime') {
    const totalEps = Number(details?.episodes) || 24;
    const currentEp = _watchState.episode || 1;
    let epOptions = '';
    const maxEps = Math.min(totalEps, 150);
    for (let ep = 1; ep <= maxEps; ep++) {
      epOptions += `<option value="${ep}" ${ep == currentEp ? 'selected' : ''}>Episode ${ep}</option>`;
    }
    animeControls = `
      <div class="watch-anime-controls">
        <div class="watch-anime-head">
          <div class="watch-source-selector">
            <label class="watch-selector-label">Episode</label>
            <select class="watch-select" id="watchAnimeEpSelect" aria-label="Select anime episode">
              ${epOptions}
            </select>
          </div>
          <span class="watch-anime-total">${details?.episodes ? `${details.episodes} Total Episodes` : 'Airing Series'}</span>
        </div>
        <div class="watch-anime-ep-pills">
          ${Array.from({ length: Math.min(totalEps, 24) }, (_, i) => i + 1).map(ep => `
            <button class="anime-ep-pill ${ep == currentEp ? 'active' : ''}" data-anime-ep="${ep}">Ep ${ep}</button>
          `).join('')}
        </div>
      </div>`;
  }

  // Similar titles
  const similarHtml = similar.length ? `
    <div class="watch-similar">
      <h3 class="watch-section-title">More Like This</h3>
      <div class="row-track">
        ${similar.map(r => card(fromTMDB(r, type), { showAdd: true })).join('')}
      </div>
    </div>` : '';

  return `
    <div class="watch-container">
      <!-- Player -->
      <div class="watch-player-wrap">
        ${playerHtml}
        ${resumeBanner}
      </div>

      <!-- Player Action Bar (Theater, Fullscreen, Hints) -->
      <div class="watch-action-bar" id="watchActionBar">
        <div class="watch-action-left">
          <button class="wpc-btn" id="watchTheaterBtn" title="Toggle Theater Mode (T)" aria-label="Toggle theater mode">⊡ Theater</button>
          <button class="wpc-btn" id="watchFullscreenBtn" title="Toggle Fullscreen (F)" aria-label="Toggle fullscreen">⛶ Fullscreen</button>
          ${type === 'anime' ? `
            <button class="wpc-btn" id="watchPrevEpBtn" title="Previous Episode" ${_watchState.episode <= 1 ? 'disabled style="opacity:0.4;cursor:not-allowed"' : ''}>◀ Prev Ep</button>
            <button class="wpc-btn" id="watchNextEpBtn" title="Next Episode">Next Ep ▶</button>
          ` : ''}
        </div>
        <div class="watch-action-hint">
          <span>💡 Controls for audio, speed, quality & subtitles are inside the video player</span>
        </div>
      </div>

      <!-- Title & Controls -->
      <div class="watch-info-bar">
        <div class="watch-title-area">
          <div class="watch-meta-pills">
            <span class="modal-pill">${h(type === 'tv' ? 'Series' : type === 'anime' ? 'Anime' : 'Movie')}</span>
            ${year ? `<span class="modal-pill">${h(String(year))}</span>` : ''}
          </div>
          <h1 class="watch-title">${h(title)}</h1>
          ${episodeInfo}
        </div>

        <div class="watch-controls-row">
          ${sourceSelectorHtml}
          <div class="watch-control-btns">
            <button class="btn-ghost btn-sm" id="watchMarkWatched" title="Mark as watched">✓ Mark Watched</button>
            <button class="btn-ghost btn-sm" id="watchBackToDetails" title="Back to details">ℹ Details</button>
            <button class="btn-ghost btn-sm" id="watchClearProgress" title="Clear progress" style="display:none">🗑 Clear Progress</button>
          </div>
        </div>
      </div>

      <!-- TV Episodes -->
      ${tvControls}

      <!-- Anime Episodes -->
      ${animeControls}

      <!-- Similar -->
      ${similarHtml}

      <!-- Next-episode countdown overlay -->
      <div class="watch-next-ep-overlay" id="watchNextEpOverlay" style="display:none">
        <div class="nxep-content">
          <div class="nxep-label">Next Episode in</div>
          <div class="nxep-countdown" id="watchNextEpCountdown">10</div>
          <div class="nxep-actions">
            <button class="nxep-play-btn" id="watchNextEpPlay">▶ Play Now</button>
            <button class="nxep-cancel-btn" id="watchNextEpCancel">Cancel</button>
          </div>
        </div>
      </div>
    </div>`;
}

function initWatchInteractions(type, id, details, trailerKey, similar, episodeData, savedProgress) {
  const container = document.getElementById('watchContent');
  if (!container) return;

  // Resume button
  const resumeBtn = container.querySelector('#watchResumeBtn');
  resumeBtn?.addEventListener('click', () => {
    const time = parseFloat(resumeBtn.dataset.time || 0);
    const video = container.querySelector('video');
    if (video && time) {
      video.currentTime = time;
      video.play();
    }
    container.querySelector('.watch-resume-banner')?.remove();
  });

  // Restart button
  const restartBtn = container.querySelector('#watchRestartBtn');
  restartBtn?.addEventListener('click', () => {
    const video = container.querySelector('video');
    if (video) {
      video.currentTime = 0;
      video.play();
    }
    removeProgress(id, type);
    container.querySelector('.watch-resume-banner')?.remove();
  });

  // Mark watching in library when player loads
  const currentItem = {
    id,
    type,
    title: getTitle(type, details),
    poster: getPoster(type, details),
    backdrop: getBackdrop(type, details),
    overview: type === 'anime' ? details?.synopsis || '' : details?.overview || '',
    rating: type === 'anime' ? String(details?.score || '') : String(details?.vote_average ? Number(details.vote_average).toFixed(1) : ''),
    year: getYear(type, details)
  };
  libSetOrUpdate(currentItem, 'Watching');

  // Track progress on video timeupdate
  const videoPlayer = container.querySelector('video');
  if (videoPlayer) {
    let lastSave = 0;
    videoPlayer.addEventListener('timeupdate', () => {
      const now = Date.now();
      if (now - lastSave > 3500 && videoPlayer.duration > 0) {
        lastSave = now;
        const percent = Math.min(100, Math.max(0, (videoPlayer.currentTime / videoPlayer.duration) * 100));
        if (percent > 2 && percent < 95) {
          saveProgress(id, type, {
            percent,
            currentTime: Math.floor(videoPlayer.currentTime),
            duration: Math.floor(videoPlayer.duration),
            season: _watchState.season || null,
            episode: _watchState.episode || null,
            title: getTitle(type, details),
            poster: getPoster(type, details),
            backdrop: getBackdrop(type, details)
          });
        }
      }
    });
  }

  // Back to details
  container.querySelector('#watchBackToDetails')?.addEventListener('click', () => {
    window.openModal?.({ id, type, title: getTitle(type, details), poster: getPoster(type, details), backdrop: getBackdrop(type, details), overview: type === 'anime' ? details?.synopsis || '' : details?.overview || '' });
  });

  // Mark watched
  container.querySelector('#watchMarkWatched')?.addEventListener('click', () => {
    const itemData = {
      id, type,
      title: getTitle(type, details),
      poster: getPoster(type, details),
      backdrop: getBackdrop(type, details),
      overview: type === 'anime' ? details?.synopsis || '' : details?.overview || '',
      rating: type === 'anime' ? String(details?.score || '') : String(details?.vote_average ? Number(details.vote_average).toFixed(1) : ''),
      year: getYear(type, details),
    };
    libSetOrUpdate(itemData, 'Completed');
    histAdd(itemData);
    removeProgress(id, type);
    toast(`✅ Marked "${itemData.title}" as Completed`, 'ok', {
      label: 'View Completed →',
      onClick: () => {
        if (window.filterWatchlistStatus) window.filterWatchlistStatus('Completed');
      }
    });
    const markBtn = container.querySelector('#watchMarkWatched');
    if (markBtn) {
      markBtn.textContent = '✓ Watched';
      markBtn.classList.add('active');
    }
    const clearBtn = container.querySelector('#watchClearProgress');
    if (clearBtn) clearBtn.style.display = 'none';
  });

  // Clear progress
  const clearBtn = container.querySelector('#watchClearProgress');
  if (savedProgress) {
    if (clearBtn) clearBtn.style.display = '';
    clearBtn?.addEventListener('click', () => {
      removeProgress(id, type);
      toast('Progress cleared', 'info');
      clearBtn.style.display = 'none';
      const banner = container.querySelector('.watch-resume-banner');
      if (banner) banner.remove();
    });
  }

  // TV Season selector
  const seasonSelect = container.querySelector('#watchSeasonSelect');
  if (seasonSelect) {
    loadWatchEpisodes(id, seasonSelect.value || 1, details);
    seasonSelect.addEventListener('change', () => {
      loadWatchEpisodes(id, seasonSelect.value, details);
    });
  }

  // Anime Episode selector
  const animeEpSelect = container.querySelector('#watchAnimeEpSelect');
  animeEpSelect?.addEventListener('change', () => {
    const epNum = Number(animeEpSelect.value);
    openWatchView('anime', id, { episode: epNum });
  });

  // Anime Episode quick pills
  container.querySelectorAll('.anime-ep-pill[data-anime-ep]').forEach(btn => {
    btn.addEventListener('click', () => {
      const epNum = Number(btn.dataset.animeEp);
      openWatchView('anime', id, { episode: epNum });
    });
  });

  // Sub/Dub Language Toggle (anime only)
  if (type === 'anime') {
    const langSub = container.querySelector('#watchLangSub');
    const langDub = container.querySelector('#watchLangDub');
    const switchLang = (lang) => {
      _watchState.animeLang = lang;
      langSub?.classList.toggle('active', lang === 'sub');
      langDub?.classList.toggle('active', lang === 'dub');
      const sel = container.querySelector('#watchSourceSelect');
      if (sel?.value === 'trailer') return;
      if (_watchState.currentSource && _watchState.currentSource !== 'trailer') {
        loadSourceInPlayer(_watchState.currentSource, type, id, details);
        toast(`🎌 ${lang.toUpperCase()} audio`, 'info');
      }
    };
    langSub?.addEventListener('click', () => switchLang('sub'));
    langDub?.addEventListener('click', () => switchLang('dub'));

    // Prev / Next Ep navigation buttons (like airin-app.html)
    const prevEpBtn = container.querySelector('#watchPrevEpBtn');
    const nextEpBtn = container.querySelector('#watchNextEpBtn');
    const currentEpNum = _watchState.episode || 1;
    const totalEps = Number(details?.episodes) || 999;
    prevEpBtn?.addEventListener('click', () => {
      if (currentEpNum > 1) {
        openWatchView('anime', id, { episode: currentEpNum - 1, animeLang: _watchState.animeLang });
      }
    });
    nextEpBtn?.addEventListener('click', () => {
      if (currentEpNum < totalEps) {
        openWatchView('anime', id, { episode: currentEpNum + 1, animeLang: _watchState.animeLang });
      }
    });
  }

  // Source selector - SWITCH SOURCES WITH FALLBACK
  const sourceSelect = container.querySelector('#watchSourceSelect');
  sourceSelect?.addEventListener('change', () => {
    const selectedIndex = sourceSelect.value;
    const sources = SourceManager.getPlaybackSources(type);
    
    if (selectedIndex === 'trailer') {
      _watchState.currentSource = 'trailer';
      loadTrailerInPlayer(_watchState.trailerKey, type, id, details);
    } else {
      const selectedSource = sources[Number(selectedIndex)];
      if (selectedSource) {
        _watchState.currentSource = selectedSource;
        SourceManager.rememberSource(type, id, selectedSource.id);
        loadSourceInPlayer(selectedSource, type, id, details);
      }
    }
  });

  // ── PLAYER CONTROL BAR ──────────────────────────────

  // Theater mode toggle
  let theaterMode = false;
  const theaterBtn = container.querySelector('#watchTheaterBtn');
  theaterBtn?.addEventListener('click', () => {
    theaterMode = !theaterMode;
    const watchSection = document.getElementById('view-watch');
    watchSection?.classList.toggle('theater-mode', theaterMode);
    theaterBtn.textContent = theaterMode ? '⊟ Exit Theater' : '⊡ Theater';
    toast(theaterMode ? 'Theater mode on' : 'Theater mode off', 'info');
  });

  // Fullscreen button
  const fullscreenBtn = container.querySelector('#watchFullscreenBtn');
  fullscreenBtn?.addEventListener('click', () => {
    const frame = document.getElementById('watchPlayerFrame');
    if (!frame) return;
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
    if (isFs) {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
      else if (document.msExitFullscreen) document.msExitFullscreen();
    } else {
      if (frame.requestFullscreen) frame.requestFullscreen();
      else if (frame.webkitRequestFullscreen) frame.webkitRequestFullscreen();
      else if (frame.mozRequestFullScreen) frame.mozRequestFullScreen();
      else if (frame.msRequestFullscreen) frame.msRequestFullscreen();
    }
  });

  const onFullscreenChange = () => {
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
    if (fullscreenBtn) {
      fullscreenBtn.textContent = isFs ? '⛶ Exit Fullscreen' : '⛶ Fullscreen';
    }
  };
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);

  // ── KEYBOARD SHORTCUTS ───────────────────────────────
  const watchSection = document.getElementById('view-watch');
  const onKey = (e) => {
    if (!watchSection?.classList.contains('active')) return;
    // Don't override input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
      case 'f':
      case 'F':
        fullscreenBtn?.click();
        break;
      case 't':
      case 'T':
        theaterBtn?.click();
        break;
    }
  };
  document.addEventListener('keydown', onKey);
  // Clean up listener when leaving watch view
  const cleanup = () => {
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('fullscreenchange', onFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
  };
  watchSection?.addEventListener('transitionend', cleanup, { once: true });

  // ── NEXT EPISODE COUNTDOWN (TV only) ────────────────
  let nextEpTimer = null;
  if (type === 'tv' && episodeData) {
    const overlay = container.querySelector('#watchNextEpOverlay');
    const countdownEl = container.querySelector('#watchNextEpCountdown');
    const playNowBtn = container.querySelector('#watchNextEpPlay');
    const cancelBtn = container.querySelector('#watchNextEpCancel');
    const currentEp = episodeData.episode_number;
    const currentSeason = episodeData.season_number || _watchState.season;

    // Listen for video 'ended' event
    const videoEl = container.querySelector('video');
    if (videoEl && overlay) {
      videoEl.addEventListener('ended', () => {
        overlay.style.display = 'flex';
        let count = 10;
        if (countdownEl) countdownEl.textContent = count;
        nextEpTimer = setInterval(() => {
          count--;
          if (countdownEl) countdownEl.textContent = count;
          if (count <= 0) {
            clearInterval(nextEpTimer);
            // Auto-play next episode
            openWatchView('tv', id, { season: currentSeason, episode: currentEp + 1 });
          }
        }, 1000);
      });

      playNowBtn?.addEventListener('click', () => {
        clearInterval(nextEpTimer);
        openWatchView('tv', id, { season: currentSeason, episode: currentEp + 1 });
      });

      cancelBtn?.addEventListener('click', () => {
        clearInterval(nextEpTimer);
        overlay.style.display = 'none';
      });
    }
  }

  // Similar cards
  container.querySelectorAll('.row-track .movie-card').forEach(c => {
    c.addEventListener('click', e => {
      if (e.target.closest('[data-ca]')) return;
      const { id: cId, type: cType } = c.dataset;
      if (cId) openWatchView(cType || 'movie', cId);
    });
  });

  // Initial playback loading for selected source
  if (_watchState.currentSource && _watchState.currentSource !== 'trailer') {
    loadSourceInPlayer(_watchState.currentSource, type, id, details);
  }
}

async function loadWatchEpisodes(tvId, seasonNum, details) {
  const container = document.getElementById('watchEpisodesContainer');
  if (!container) return;
  container.innerHTML = '<div class="mini-loading">Loading episodes…</div>';
  try {
    const season = await getSeasonTMDB(tvId, seasonNum);
    const episodes = season.episodes || [];
    if (!episodes.length) {
      container.innerHTML = '<p class="empty-note">No episodes available.</p>';
      return;
    }
    const title = details?.title || details?.name || '';
    const poster = details?.poster_path ? `${W500}${details.poster_path}` : NOPOSTER;

    container.innerHTML = `
      <div class="watch-episodes-list">
        ${episodes.map(ep => `
          <div class="watch-episode-row" data-ep="${ep.episode_number}" data-season="${seasonNum}">
            <img class="watch-ep-still" src="${ep.still_path ? W342 + ep.still_path : NOPOSTER}" alt="${h(ep.name)}" loading="lazy" onerror="this.onerror=null;this.src='${NOPOSTER}'">
            <div class="watch-ep-info">
              <div class="watch-ep-number">E${ep.episode_number}</div>
              <div class="watch-ep-name">${h(ep.name || `Episode ${ep.episode_number}`)}</div>
              ${ep.runtime ? `<div class="watch-ep-runtime">${ep.runtime} min</div>` : ''}
              <p class="watch-ep-overview">${h((ep.overview || '').slice(0, 140))}${ep.overview?.length > 140 ? '…' : ''}</p>
            </div>
            <button class="watch-ep-play-btn btn-ghost btn-sm" data-ep="${ep.episode_number}" aria-label="Watch episode ${ep.episode_number}">▶ Play</button>
          </div>`).join('')}
      </div>`;

    container.querySelectorAll('.watch-ep-play-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const epNum = Number(btn.dataset.ep);
        const ep = episodes.find(e => e.episode_number === epNum);
        if (ep) {
          openWatchView('tv', tvId, { season: Number(seasonNum), episode: epNum });
        }
      });
    });
  } catch (err) {
    container.innerHTML = `<p class="empty-note">⚠️ Failed to load episodes.</p>`;
  }
}

async function loadSourceInPlayer(source, type, id, details) {
  const frame = document.getElementById('watchPlayerFrame');
  if (!frame) return;
  frame.innerHTML = `
    <div class="watch-source-loading" id="playerLoadingIndicator">
      <div class="mini-spinner"></div>
      <p>Connecting securely to ${h(source.name)}...</p>
    </div>
    <iframe
      id="watchMainIframe"
      src=""
      frameborder="0"
      title="${h(getTitle(type, details))}"
      allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; web-share"
      referrerpolicy="no-referrer"
      allowfullscreen
      data-source-id="${h(source.id)}"
      style="opacity:0; transition: opacity 0.3s;"
    ></iframe>
    <div class="watch-source-badge">
      <span class="badge-pill source-badge">▶ ${h(source.name)}</span>
    </div>`;

  const iframe = frame.querySelector('#watchMainIframe');
  const loader = frame.querySelector('#playerLoadingIndicator');
  
  if (iframe) {
    iframe.addEventListener('load', () => {
      if (loader) loader.style.display = 'none';
      iframe.style.opacity = '1';
    });
    iframe.addEventListener('error', () => {
      handlePlaybackFailure(type, id, source.id, _watchState.season, _watchState.episode);
    });
  }

  try {
    const embedUrl = await SourceManager.resolveEmbedUrl(
      type,
      id,
      source.id,
      _watchState.season,
      _watchState.episode,
      _watchState.animeLang
    );
    if (iframe) {
      iframe.src = embedUrl;
    }
  } catch (err) {
    console.warn(`[MovieUltra] Stream token resolution failed for ${source.name}:`, err.message);
    handlePlaybackFailure(type, id, source.id, _watchState.season, _watchState.episode);
  }
}

function loadTrailerInPlayer(youtubeKey, type, id, details) {
  const frame = document.getElementById('watchPlayerFrame');
  if (!frame) return;
  const title = getTitle(type, details);
  const trailerUrl = SourceManager.getTrailerEmbedUrl(youtubeKey, true, `${title} trailer`);
  if (!trailerUrl) return;
  frame.innerHTML = `
    <iframe
      id="watchTrailerIframe"
      src="${h(trailerUrl)}"
      frameborder="0"
      title="Trailer: ${h(title)}"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      referrerpolicy="no-referrer"
      allowfullscreen
    ></iframe>
    <div class="watch-trailer-badge">
      <span class="badge-pill trailer-badge">🎬 YOUTUBE</span>
    </div>`;
}

/**
 * Handle automatic source fallback when playback fails.
 */
export function handlePlaybackFailure(type, id, failedSourceId, season = null, episode = null) {
  console.warn(`[MovieUltra] Playback failed for source: ${failedSourceId}`);
  
  // Mark source as failed for this session
  SourceManager.markSourceFailed(type, id, failedSourceId, season, episode);
  
  // Get next available source
  const nextSource = SourceManager.getNextAvailableSource(type, id, failedSourceId, season, episode);
  
  if (nextSource) {
    console.log(`[MovieUltra] Attempting fallback to: ${nextSource.name}`);
    _watchState.currentSource = nextSource;
    
    const details = _watchState.details;
    loadSourceInPlayer(nextSource, type, id, details);
    
    // Update source selector
    const sourceSelect = document.querySelector('#watchSourceSelect');
    if (sourceSelect) {
      const sources = SourceManager.getPlaybackSources(type);
      const index = sources.findIndex(s => s.id === nextSource.id);
      if (index >= 0) sourceSelect.value = String(index);
    }
    
    toast(`Switched to ${nextSource.name}`, 'info');
  } else {
    console.error('[MovieUltra] No more sources available. Playback failed.');
    const frame = document.getElementById('watchPlayerFrame');
    if (frame) {
      const trailerKey = _watchState.trailerKey;
      frame.innerHTML = `
        <div class="watch-no-source">
          <div class="watch-no-source-icon">📡</div>
          <h3>Authorized stream temporarily unavailable</h3>
          <p>All configured providers are currently unresponsive. You can watch the official trailer or retry.</p>
          <div style="display:flex; gap:10px; z-index:2; margin-top:10px;">
            ${trailerKey ? `<button class="btn-primary btn-sm" id="watchFailTrailerBtn">🎬 Play Official Trailer</button>` : ''}
            <button class="btn-ghost btn-sm" id="watchFailRetryBtn">🔄 Retry</button>
          </div>
        </div>`;
      
      frame.querySelector('#watchFailTrailerBtn')?.addEventListener('click', () => {
        if (trailerKey) loadTrailerInPlayer(trailerKey, type, id, _watchState.details);
      });
      frame.querySelector('#watchFailRetryBtn')?.addEventListener('click', () => {
        SourceManager.clearSessionFailures(type, id, season, episode);
        const first = SourceManager.getPlaybackSources(type)[0];
        if (first) {
          _watchState.currentSource = first;
          loadSourceInPlayer(first, type, id, _watchState.details);
        }
      });
    }
    toast('Authorized sources unavailable', 'warn');
  }
}

export function initWatchViewListeners() {
  // Hash routing: #watch-movie-123 or #watch-tv-456
  window.addEventListener('hashchange', handleWatchHash);
  handleWatchHash();
}

function handleWatchHash() {
  const hash = window.location.hash.slice(1); // e.g. "watch-movie-123"
  if (!hash.startsWith('watch-')) return;
  const parts = hash.split('-');
  if (parts.length >= 3) {
    const type = parts[1];
    const id = parts[2];
    const season = parts[3] || null;
    const episode = parts[4] || null;
    if (id && type) {
      openWatchView(type, id, { season: season ? Number(season) : null, episode: episode ? Number(episode) : null });
    }
  }
}
