'use strict';

import { h } from '../utils/escape.js';
import { toast } from './toast.js';
import { fetchJikan } from '../utils/request.js';
import { libHas, libAdd, libRemove, libUpdateStatus, saveLib, state as libState } from '../store/library.js';
import { openTrailer } from './trailer.js';
import {
  getAnimeProgress,
  getAnimeDiary,
  getEpisodeData,
  toggleEpisodeWatched,
  updateAnimeDiary,
  deleteAnimeDiary,
  setManualAnimeStatusOverride,
  recalculateAnimeProgress,
  getWatchHistory,
  exportAnimeData
} from '../store/animeTracker.js';

let _activeAnimeDetails = null;

const NOBACK = 'https://placehold.co/1280x720/1c1c1c/555?text=No+Image';
const NOPOSTER = 'https://placehold.co/300x450/1c1c1c/555?text=No+Image';
const NOPHOTO = 'https://placehold.co/150x225/1c1c1c/555?text=No+Photo';

export function renderPremiumAnimeModal(item) {
  _activeAnimeDetails = null;

  const movieModal = document.getElementById('movieModal');
  if (!movieModal) return;

  const backdropUrl = item.backdrop || item.poster || NOBACK;

  // 1. HERO SECTION & MAIN LAYOUT SKELETON
  movieModal.innerHTML = `
    <div class="premium-movie-backdrop-overlay" id="animeBackdropOverlay" style="background-image: url('${backdropUrl}')"></div>
    <div class="premium-movie-card" role="dialog" aria-modal="true" aria-labelledby="animeTitle" id="animeModalCard" tabindex="-1">
      
      <!-- HERO AREA -->
      <div class="premium-hero">
        <img class="premium-hero-img" src="${backdropUrl}" alt="${h(item.title)} backdrop" id="animeHeroBackdrop">
        <div class="premium-hero-overlay"></div>
        
        <div class="premium-hero-ctrls-top">
          <div class="premium-hero-badges-left">
            <span class="premium-hero-badge gold" id="animeRatingBadge">★ ${h(item.rating || 'N/A')}</span>
            <span class="premium-hero-badge" id="animeYearBadge">${h(item.year || 'N/A')}</span>
            <span class="premium-hero-badge" id="animeStatusBadge">Loading...</span>
          </div>
          <div class="premium-hero-actions-right">
            <button class="premium-hero-btn" id="animeFavBtn" aria-label="Favorite" title="Mark Favorite">❤</button>
            <button class="premium-hero-btn" id="animeShareBtn" aria-label="Share" title="Copy Share Link">🔗</button>
            <button class="premium-hero-btn premium-hero-close-btn" id="animeCloseBtn" aria-label="Close modal">✕</button>
          </div>
        </div>
        
        <!-- Anime poster -->
        <img class="premium-hero-poster" src="${item.poster || NOPOSTER}" alt="${h(item.title)} poster" id="animeHeroPoster" style="position: absolute; bottom: 16px; left: 24px; width: 90px; height: 135px; border-radius: var(--radius-sm); border: 2px solid rgba(255, 255, 255, 0.4); box-shadow: 0 8px 20px rgba(0,0,0,0.6); z-index: 5; object-fit: cover;">
        
        <!-- Trailer play button centered on hero -->
        <button class="premium-hero-play hidden" id="animePlayBtn" aria-label="Play Trailer">▶</button>
      </div>

      <!-- BODY AREA -->
      <div class="premium-body">
        
        <!-- MAIN INFORMATION -->
        <div class="premium-title-row">
          <h2 class="premium-title" id="animeTitle">${h(item.title)}</h2>
          <div class="premium-original-title" id="animeJapaneseTitle"></div>
        </div>
        
        <p class="premium-tagline" id="animeTagline"></p>
        <p class="premium-overview" id="animeOverview">${h(item.overview || 'Loading synopsis…')}</p>
        <div class="premium-genres" id="animeGenres"></div>

        <!-- WATCH TRACKING (HIGH PRIORITY) -->
        <div class="series-progress-container hidden" id="animeProgressContainer">
          <div class="series-progress-header">
            <div class="series-progress-title">Overall Watch Progress</div>
            <div class="series-progress-stats" id="animeProgressStats">0% • 0 / 0 Episodes</div>
          </div>
          
          <div class="anime-tracking-metrics">
            <div class="metric-circle-wrap">
              <div class="progress-ring-svg-container">
                <svg class="progress-ring" width="60" height="60">
                  <circle class="progress-ring-circle-bg" stroke="rgba(255,255,255,0.08)" stroke-width="4" fill="transparent" r="24" cx="30" cy="30" />
                  <circle class="progress-ring-circle-fill" id="animeProgressRing" stroke="var(--purple)" stroke-width="4" fill="transparent" r="24" cx="30" cy="30" stroke-dasharray="150.79" stroke-dashoffset="150.79" />
                </svg>
                <div class="progress-ring-text" id="animeProgressRingText">0%</div>
              </div>
              <div class="metric-label">Current Season</div>
            </div>
            
            <div class="tracking-details-text">
              <div class="tracking-item"><strong>Current:</strong> <span id="trackCurrentEp">S1 Ep 1</span></div>
              <div class="tracking-item"><strong>Next Episode:</strong> <span id="trackNextEp">S1 Ep 2</span></div>
              <div class="tracking-item"><strong>Completed Seasons:</strong> <span id="trackCompletedSeasons">0</span></div>
              <div class="tracking-item"><strong>Last Updated:</strong> <span id="trackLastUpdated">Never</span></div>
            </div>
          </div>

          <div class="series-progress-bar-bg">
            <div class="series-progress-bar-fill" id="animeProgressBar" style="width: 0%; background: var(--purple);"></div>
          </div>
        </div>

        <!-- QUICK ACTIONS -->
        <div class="premium-actions-section">
          <div class="actions-section-title">Logbook Status & Quick Actions</div>
          <div class="premium-actions-row" style="flex-wrap: wrap; gap: 8px;">
            <div class="status-pill-group" id="animeStatusGroup">
              <button class="status-pill-btn" data-s="Watching">Watching</button>
              <button class="status-pill-btn" data-s="Completed">Completed</button>
              <button class="status-pill-btn" data-s="Planned">Planned</button>
              <button class="status-pill-btn" data-s="On Hold">On Hold</button>
              <button class="status-pill-btn" data-s="Dropped">Dropped</button>
            </div>
            <button class="compact-action-btn btn-accent hidden" id="animeContinueWatchingBtn" style="background: var(--purple); color: white;">Pin: Continue</button>
            <button class="compact-action-btn" id="animeQuickDiary">📝 Add Diary</button>
            <button class="compact-action-btn btn-delete hidden" id="animeQuickDelete">✕ Remove</button>
          </div>
        </div>

        <!-- SEASON & EPISODE TRACKER -->
        <div class="premium-section-title">📺 Episode Logbook & Season Tracker</div>
        <div class="episode-tracker-filter-row" style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
          <select class="diary-select" id="animeSeasonSelector" style="flex: 1; min-width: 150px; background: var(--surface2); color: var(--text); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px;">
            <option value="1">Virtual Season 1 (UI Grouping)</option>
          </select>
          <input type="text" id="animeEpisodeSearch" placeholder="Search episode..." style="flex: 2; min-width: 150px; background: var(--surface2); color: var(--text); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px; font-size: 14px;">
          <div class="status-pill-group" id="animeEpisodeFilterGroup" style="display: flex;">
            <button class="status-pill-btn active" data-filter="all" style="padding: 4px 12px; font-size: 12px;">All</button>
            <button class="status-pill-btn" data-filter="unwatched" style="padding: 4px 12px; font-size: 12px;">Unwatched</button>
            <button class="status-pill-btn" data-filter="watched" style="padding: 4px 12px; font-size: 12px;">Watched</button>
          </div>
        </div>
        <div id="animeSeasonsContainer" class="seasons-container" style="max-height: 400px; overflow-y: auto; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 12px; background: rgba(0,0,0,0.15)">
          <div style="text-align: center; color: var(--text-dim); padding: 20px;">Loading episodes...</div>
        </div>

        <!-- PERSONAL DIARY (PRIVATE) -->
        <div class="diary-journal-panel" id="animeDiaryPanel" style="margin-top: 32px;">
          <div class="diary-header-wrap">
            <h3 style="font-size:16px;font-weight:900;color:var(--text)">📓 Personal Diary</h3>
            <div style="display: flex; gap: 8px; align-items: center;">
              <span class="diary-tag">Private Log</span>
              <button id="animeExportLogsBtn" class="diary-save-btn" style="padding: 2px 8px; font-size: 11px; background: var(--surface3);">Export Data</button>
            </div>
          </div>
          <div class="diary-layout-split" style="display: flex; flex-direction: column; gap: 16px;">
            <div class="diary-fields">
              <div class="diary-row">
                <label class="diary-row-label">Personal Rating</label>
                <div class="star-rating-10" id="animeDiaryStars">
                  <span data-v="1">★</span><span data-v="2">★</span><span data-v="3">★</span><span data-v="4">★</span><span data-v="5">★</span>
                  <span data-v="6">★</span><span data-v="7">★</span><span data-v="8">★</span><span data-v="9">★</span><span data-v="10">★</span>
                </div>
              </div>
              <div class="diary-row">
                <label class="diary-row-label">Watch Date</label>
                <input type="date" id="animeDiaryDate" class="diary-date-input" style="background: var(--surface2); color: var(--text); border: 1px solid var(--border); padding: 6px; border-radius: var(--radius-sm);">
              </div>
              <div class="diary-row">
                <label class="diary-row-label">Mood Tags</label>
                <div class="mood-chips-row" id="animeMoodTags" style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px;">
                  <button class="mood-chip" data-tag="Excited">Excited ⚡</button>
                  <button class="mood-chip" data-tag="Hyped">Hyped 🔥</button>
                  <button class="mood-chip" data-tag="Emotional">Emotional 😢</button>
                  <button class="mood-chip" data-tag="Mindblown">Mindblown 🤯</button>
                  <button class="mood-chip" data-tag="Comforted">Comforted 🌸</button>
                  <button class="mood-chip" data-tag="Suspenseful">Suspenseful 😰</button>
                </div>
              </div>
              <div class="diary-row" style="display: flex; gap: 12px; margin-top: 8px;">
                <div style="flex: 1;">
                  <label class="diary-row-label" style="font-size: 12px;">Favorite Character</label>
                  <input type="text" id="animeDiaryFavChar" placeholder="e.g. Levi Ackerman" style="width: 100%; background: var(--surface2); color: var(--text); border: 1px solid var(--border); padding: 8px; border-radius: var(--radius-sm); font-size: 13px;">
                </div>
                <div style="flex: 1;">
                  <label class="diary-row-label" style="font-size: 12px;">Favorite Episode</label>
                  <input type="text" id="animeDiaryFavEp" placeholder="e.g. Episode 5" style="width: 100%; background: var(--surface2); color: var(--text); border: 1px solid var(--border); padding: 8px; border-radius: var(--radius-sm); font-size: 13px;">
                </div>
              </div>
              <div class="diary-row" style="margin-top: 12px;">
                <label class="diary-row-label">Diary Log & Notes</label>
                <textarea class="diary-notes-area" id="animeDiaryNotes" placeholder="Describe your feelings, character development reviews, or plot twists..." rows="4"></textarea>
              </div>
              <div style="display: flex; gap: 10px; margin-top: 12px;">
                <button class="diary-save-btn" id="animeDiarySaveBtn" style="flex: 2;">Save Diary Entry</button>
                <button class="diary-save-btn btn-delete hidden" id="animeDiaryDeleteBtn" style="flex: 1; background: var(--red);">Delete</button>
              </div>
            </div>
            
            <div class="diary-timeline-section">
              <h4 style="margin: 0 0 12px; font-size: 14px; font-weight: 700; color: var(--text-muted);">Watch Log History</h4>
              <div class="timeline" id="animeWatchTimeline">
                <!-- Log history will be injected here -->
              </div>
            </div>
          </div>
        </div>

        <!-- ANIME FACTS -->
        <div class="premium-section-title">📊 Anime Facts</div>
        <div class="movie-facts-grid" id="animeFactsGrid">
          <div class="fact-card"><div class="fact-label">Studio</div><div class="fact-value" id="factStudio">Loading…</div></div>
          <div class="fact-card"><div class="fact-label">Source Material</div><div class="fact-value" id="factSource">Loading…</div></div>
          <div class="fact-card"><div class="fact-label">Director / Staff</div><div class="fact-value" id="factDirector">Loading…</div></div>
          <div class="fact-card"><div class="fact-label">Broadcast</div><div class="fact-value" id="factBroadcast">Loading…</div></div>
          <div class="fact-card"><div class="fact-label">First Air Date</div><div class="fact-value" id="factFirstAir">Loading…</div></div>
          <div class="fact-card"><div class="fact-label">Final Air Date</div><div class="fact-value" id="factLastAir">Loading…</div></div>
        </div>

        <!-- TOP CHARACTERS & VOICE CAST -->
        <div class="premium-section-title">🎭 Top Characters & Voice Cast</div>
        <div class="cast-row" id="animeCastRow">
          <div style="text-align: center; color: var(--text-dim); width: 100%; padding: 20px;">Loading cast...</div>
        </div>

        <!-- STORY DETAILS ACCORDION -->
        <div class="story-accordion" style="margin-top: 24px;">
          <button class="accordion-trigger" id="animeStoryAccordionTrigger" aria-expanded="false" aria-controls="animeStoryAccordionContent">
            <span>🔍 Story Details (Themes, Trivia & Production Notes)</span>
            <span class="arrow">▼</span>
          </button>
          <div class="accordion-content hidden" id="animeStoryAccordionContent">
            <div class="story-fact-item">
              <div class="story-fact-label">Themes & Genres</div>
              <div class="story-fact-text" id="animeStoryThemes">Loading…</div>
            </div>
            <div class="story-fact-item">
              <div class="story-fact-label">Trivia & Fun Facts</div>
              <div class="story-fact-text" id="animeStoryTrivia">Loading…</div>
            </div>
            <div class="story-fact-item">
              <div class="story-fact-label">Production Info</div>
              <div class="story-fact-text" id="animeStoryProduction">Loading…</div>
            </div>
            <div class="story-fact-item">
              <div class="story-fact-label">Manga / Novel Source Notes</div>
              <div class="story-fact-text" id="animeStorySourceNotes">Loading…</div>
            </div>
          </div>
        </div>

        <!-- SOUNDTRACK & MUSIC -->
        <div class="premium-section-title">🎵 Themes & Soundtrack</div>
        <div class="soundtrack-playlist" id="animeSoundtrackList">
          <div style="text-align: center; color: var(--text-dim); padding: 20px;">Loading soundtrack...</div>
        </div>

        <!-- VIDEOS & PROMOS -->
        <div class="premium-section-title">📹 Video & Promo Gallery</div>
        <div class="video-gallery" id="animeVideoGallery">
          <div style="text-align: center; color: var(--text-dim); padding: 20px;">Loading promo videos...</div>
        </div>

        <!-- REVIEWS & SCORES -->
        <div class="premium-section-title">💯 Reviews & Scores</div>
        <div class="score-dials-row">
          <div class="score-dial-card">
            <div class="score-dial-circle" id="dialCritics" style="--percentage:0%; --fill-color:var(--purple)">
              <span class="score-dial-value" id="valCritics">0%</span>
            </div>
            <span class="score-dial-label">MyAnimeList Score</span>
          </div>
          <div class="score-dial-card">
            <div class="score-dial-circle" id="dialAudience" style="--percentage:0%; --fill-color:#f5c518">
              <span class="score-dial-value" id="valAudience">0%</span>
            </div>
            <span class="score-dial-label">Audience Score</span>
          </div>
          <div class="score-dial-card">
            <div class="score-dial-circle" id="dialUltra" style="--percentage:0%; --fill-color:#46d369">
              <span class="score-dial-value" id="valUltra">0%</span>
            </div>
            <span class="score-dial-label">MovieUltra Rating</span>
          </div>
        </div>

        <!-- REVIEW PREVIEW -->
        <div class="review-preview-card" id="animeReviewPreviewCard">
          <div style="text-align: center; color: var(--text-dim); padding: 20px;">Loading user reviews...</div>
        </div>

        <!-- EXTERNAL LINKS -->
        <div class="premium-section-title">🔗 External Resources</div>
        <div class="providers-chips-row" id="animeLinksRow" style="display: flex; gap: 8px; flex-wrap: wrap;">
          <div style="text-align: center; color: var(--text-dim); width: 100%; padding: 10px;">Loading links...</div>
        </div>

        <!-- COLLECTIONS / FRANCHISES -->
        <div class="franchise-banner hidden" id="animeFranchiseBanner" style="margin-top: 32px; border-radius: var(--radius-md); padding: 16px; border: 1px dashed rgba(168,85,247,0.3); background: rgba(168,85,247,0.04);">
          <h4 style="margin: 0 0 12px; color: var(--purple); font-weight: 700;">🌸 Connected Franchise & Adaptation Timeline</h4>
          <div class="timeline" id="animeFranchiseTimeline" style="margin-left: 10px;"></div>
        </div>

        <div style="height: 40px"></div>
      </div>
    </div>
  `;

  // Focus trap & keyboard listener
  setupModalAccessibility();

  // Bind close buttons
  document.getElementById('animeCloseBtn')?.addEventListener('click', closeAnimeModal);
  document.getElementById('animeModalCard')?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAnimeModal();
    }
  });

  // Bind export
  document.getElementById('animeExportLogsBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    exportAnimeData();
    toast('Data exported successfully!', 'success');
  });

  // Share action
  document.getElementById('animeShareBtn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      toast('Link copied to clipboard!', 'success');
    });
  });

  // Scroll to Diary
  document.getElementById('animeQuickDiary')?.addEventListener('click', () => {
    document.getElementById('animeDiaryNotes')?.focus();
    document.getElementById('animeDiaryNotes')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // Favorite quick toggle
  document.getElementById('animeFavBtn')?.addEventListener('click', () => {
    const isFav = toggleAnimeFavorite(item);
    syncFavBtn(isFav);
  });

  // Load backend details
  loadAnimeDetails(item.id);
}

function syncFavBtn(isFav) {
  const btn = document.getElementById('animeFavBtn');
  if (btn) {
    btn.classList.toggle('active', isFav);
    btn.style.color = isFav ? 'var(--red)' : '';
  }
}

function toggleAnimeFavorite(item) {
  const curDiary = getAnimeDiary(item.id);
  const nextFav = !curDiary.isFavorite;
  updateAnimeDiary(item.id, { isFavorite: nextFav });
  toast(nextFav ? 'Added to favorites!' : 'Removed from favorites', 'info');
  return nextFav;
}

function closeAnimeModal() {
  const movieModal = document.getElementById('movieModal');
  if (movieModal) {
    movieModal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

// Accessibility Focus Trap
function setupModalAccessibility() {
  const card = document.getElementById('animeModalCard');
  if (!card) return;
  card.focus();

  card.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;

    const focusables = card.querySelectorAll('button, [href], input, select, textarea, [tabindex="0"]');
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        last.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  });
}

// Fetch details from Jikan
async function loadAnimeDetails(id) {
  try {
    const res = await fetchJikan(`/anime/${id}/full`);
    if (!res || !res.data) {
      throw new Error('No data returned from Jikan API');
    }
    
    _activeAnimeDetails = res.data;
    applyAnimeDetails(res.data);
    
    // Load other async sections with error protection
    loadCastAsync(id);
    loadRecommendationsAsync(id);
    loadReviewsAsync(id);
    loadVideosAsync(id);
    
  } catch (err) {
    console.error('[MovieUltra] Error fetching anime details:', err);
    toast('Failed to load anime details from MyAnimeList.', 'error');
    renderErrorState();
  }
}

function renderErrorState() {
  const container = document.getElementById('animeSeasonsContainer');
  if (container) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--red); padding: 30px;">
        <p>⚠️ Failed to load anime metadata. Please check your internet connection and try again.</p>
        <button class="diary-save-btn" onclick="document.location.reload()" style="margin-top: 10px; padding: 6px 12px; font-size: 13px;">Retry</button>
      </div>
    `;
  }
}

function applyAnimeDetails(d) {
  if (!d) return;

  const poster = d.images?.jpg?.large_image_url || NOPOSTER;
  const backdrop = d.trailer?.images?.maximum_image_url || d.images?.jpg?.large_image_url || NOBACK;

  // Update hero
  const backdropImg = document.getElementById('animeHeroBackdrop');
  if (backdropImg) backdropImg.src = backdrop;
  const posterImg = document.getElementById('animeHeroPoster');
  if (posterImg) posterImg.src = poster;
  const overlay = document.getElementById('animeBackdropOverlay');
  if (overlay) overlay.style.backgroundImage = `url('${backdrop}')`;

  // Title & subtitles
  document.getElementById('animeTitle').textContent = d.title_english || d.title;
  document.getElementById('animeJapaneseTitle').textContent = d.title_japanese || '';
  
  // Tagline/Type
  const typeLabel = d.type ? `${d.type} • ${d.rating || 'Unrated'}` : '';
  document.getElementById('animeTagline').textContent = typeLabel;

  // Synopsis
  document.getElementById('animeOverview').textContent = d.synopsis || 'No synopsis available.';

  // Genres
  const genresEl = document.getElementById('animeGenres');
  if (genresEl && d.genres) {
    genresEl.innerHTML = d.genres.map(g => `<span class="genre-tag anime-genre">${h(g.name)}</span>`).join('');
  }

  // Hero badges
  document.getElementById('animeRatingBadge').textContent = d.score ? `★ ${d.score.toFixed(1)}` : '★ N/A';
  document.getElementById('animeYearBadge').textContent = d.aired?.prop?.from?.year || 'N/A';
  document.getElementById('animeStatusBadge').textContent = d.status || 'Status Unknown';

  // Trailer button check
  const playBtn = document.getElementById('animePlayBtn');
  if (playBtn) {
    if (d.trailer?.youtube_id) {
      playBtn.classList.remove('hidden');
      playBtn.onclick = () => openTrailer(d.trailer.youtube_id);
    } else {
      playBtn.classList.add('hidden');
    }
  }

  // Facts Grid
  const studios = d.studios?.map(s => s.name).join(', ') || 'Unknown';
  document.getElementById('factStudio').textContent = studios;
  document.getElementById('factSource').textContent = d.source || 'Unknown';
  
  const broadcast = d.broadcast?.string || 'N/A';
  document.getElementById('factBroadcast').textContent = broadcast;
  
  document.getElementById('factFirstAir').textContent = d.aired?.from ? d.aired.from.split('T')[0] : 'N/A';
  document.getElementById('factLastAir').textContent = d.aired?.to ? d.aired.to.split('T')[0] : 'N/A';

  // Story Details Accordion
  setupStoryAccordion(d);

  // Soundtracks
  setupSoundtrack(d);

  // External Links
  setupExternalLinks(d);

  // Collections/Franchise Timeline
  setupFranchise(d);

  // Sync Library status and logs
  syncLibraryTrackerUI(d);
}

// Sync logs and setup Tracker Progress
function syncLibraryTrackerUI(d) {
  const inLib = libHas(d.mal_id, d.title, 'anime');
  const libItem = inLib ? libState.library.find(i => String(i.id) === String(d.mal_id) && i.type === 'anime') : null;
  if (libItem) {
    let changed = false;
    let runtime = null;
    if (d.duration) {
      const match = d.duration.match(/(\d+)\s*min/);
      if (match) runtime = parseInt(match[1]);
    }
    if (runtime && !libItem.runtime) {
      libItem.runtime = runtime;
      changed = true;
    }
    const genresStr = d.genres ? d.genres.map(g => g.name).join(', ') : '';
    if (genresStr && !libItem.genre) {
      libItem.genre = genresStr;
      changed = true;
    }
    if (changed) {
      saveLib();
    }
  }
  const libStatus = libItem?.status || 'Planned';

  // Logbook status buttons
  const statusBtns = document.querySelectorAll('#animeStatusGroup .status-pill-btn');
  statusBtns.forEach(btn => {
    btn.classList.toggle('active', inLib && btn.dataset.s === libStatus);
    btn.onclick = () => {
      if (!inLib) {
        libAdd({
          id: d.mal_id,
          title: d.title_english || d.title,
          type: 'anime',
          poster: d.images?.jpg?.large_image_url || '',
          backdrop: d.trailer?.images?.maximum_image_url || ''
        });
      }
      libUpdateStatus(d.mal_id, btn.dataset.s, 'anime');
      if (btn.dataset.s === 'Watching') {
        setManualAnimeStatusOverride(d.mal_id, false);
      } else {
        setManualAnimeStatusOverride(d.mal_id, true);
      }
      syncLibraryTrackerUI(d);
    };
  });

  const delBtn = document.getElementById('animeQuickDelete');
  if (inLib && delBtn) {
    delBtn.classList.remove('hidden');
    delBtn.onclick = () => {
      libRemove(d.mal_id, d.title, 'anime');
      syncLibraryTrackerUI(d);
    };
  } else if (delBtn) {
    delBtn.classList.add('hidden');
  }

  // Progress UI
  const progContainer = document.getElementById('animeProgressContainer');
  if (inLib && d.episodes > 0) {
    progContainer.classList.remove('hidden');
    const prog = getAnimeProgress(d.mal_id);
    
    // Auto-calculate episodes watched
    recalculateAnimeProgress(d.mal_id, d.episodes);
    
    // Overall Progress
    document.getElementById('animeProgressBar').style.width = `${prog.completionPercentage}%`;
    document.getElementById('animeProgressStats').textContent = `${prog.completionPercentage}% • ${prog.episodesWatched} / ${d.episodes} Episodes`;
    
    // Rings
    const offset = 150.79 - (150.79 * prog.completionPercentage) / 100;
    document.getElementById('animeProgressRing').style.strokeDashoffset = offset;
    document.getElementById('animeProgressRingText').textContent = `${prog.completionPercentage}%`;

    // Metrics text
    document.getElementById('trackCurrentEp').textContent = `S${prog.currentSeason} Ep ${prog.currentEpisode}`;
    
    const nextEpNum = prog.currentEpisode + 1 <= d.episodes ? prog.currentEpisode + 1 : 1;
    document.getElementById('trackNextEp').textContent = `S${prog.currentSeason} Ep ${nextEpNum}`;
    
    document.getElementById('trackCompletedSeasons').textContent = prog.completionPercentage === 100 ? '1' : '0';
    
    const updatedDate = prog.lastUpdatedTime ? new Date(prog.lastUpdatedTime).toLocaleString() : 'Never';
    document.getElementById('trackLastUpdated').textContent = updatedDate;

    // Pinned Continue Watching Button
    const contBtn = document.getElementById('animeContinueWatchingBtn');
    if (contBtn) {
      contBtn.classList.remove('hidden');
      contBtn.onclick = () => {
        const selectEpCard = document.querySelector(`.episode-tracker-item[data-ep="${prog.currentEpisode}"]`);
        if (selectEpCard) {
          selectEpCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          selectEpCard.style.background = 'rgba(168,85,247,0.2)';
          setTimeout(() => { selectEpCard.style.background = ''; }, 1500);
        } else {
          toast(`Continue from Season ${prog.currentSeason} Ep ${prog.currentEpisode}!`, 'info');
        }
      };
    }
  } else {
    progContainer.classList.add('hidden');
    const contBtn = document.getElementById('animeContinueWatchingBtn');
    if (contBtn) contBtn.classList.add('hidden');
  }

  // Populate Seasons & Episode Tracker list
  renderEpisodesTracker(d);

  // Sync Diary
  syncDiaryUI(d);
}

// Episodes Tracker List renderer
function renderEpisodesTracker(d) {
  const selector = document.getElementById('animeSeasonSelector');
  const searchInput = document.getElementById('animeEpisodeSearch');
  const filterBtns = document.querySelectorAll('#animeEpisodeFilterGroup button');
  const container = document.getElementById('animeSeasonsContainer');

  const totalEpisodes = d.episodes || 1;
  const maxEpPerSeason = 24;
  const numSeasons = Math.ceil(totalEpisodes / maxEpPerSeason);

  // Populate season selector
  selector.innerHTML = '';
  for (let s = 1; s <= numSeasons; s++) {
    const startEp = (s - 1) * maxEpPerSeason + 1;
    const endEp = Math.min(s * maxEpPerSeason, totalEpisodes);
    const optionText = numSeasons > 1
      ? `Virtual Season ${s} (UI Grouping: Ep ${startEp}-${endEp})`
      : `Season 1 (Ep ${startEp}-${endEp})`;
    selector.innerHTML += `<option value="${s}">${optionText}</option>`;
  }

  let activeSeason = parseInt(selector.value) || 1;
  let activeFilter = 'all'; // all, watched, unwatched
  let searchQuery = '';

  const updateList = () => {
    container.innerHTML = '';
    const startEp = (activeSeason - 1) * maxEpPerSeason + 1;
    const endEp = Math.min(activeSeason * maxEpPerSeason, totalEpisodes);

    let listHtml = '';
    const prog = getAnimeProgress(d.mal_id);

    for (let epNum = startEp; epNum <= endEp; epNum++) {
      const epData = getEpisodeData(d.mal_id, activeSeason, epNum);
      const isWatched = epData.watchCount > 0;

      // Filter check
      if (activeFilter === 'watched' && !isWatched) continue;
      if (activeFilter === 'unwatched' && isWatched) continue;

      // Search check
      const epTitle = `Episode ${epNum}`;
      if (searchQuery && !epTitle.toLowerCase().includes(searchQuery.toLowerCase())) continue;

      // State check
      const isCurrent = (epNum === prog.currentEpisode);
      const isNext = (epNum === prog.currentEpisode + 1);
      
      let badgeHtml = '';
      if (isCurrent && isWatched) badgeHtml = `<span class="premium-hero-badge" style="background:var(--green); border-color:transparent;">Completed</span>`;
      else if (isCurrent) badgeHtml = `<span class="premium-hero-badge" style="background:var(--purple); border-color:transparent;">Current</span>`;
      else if (isNext) badgeHtml = `<span class="premium-hero-badge" style="background:var(--gold); border-color:transparent; color:#000;">Next</span>`;

      listHtml += `
        <div class="episode-tracker-item" data-ep="${epNum}" style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid var(--border)">
          <div class="ep-info">
            <div class="ep-title" style="font-weight:600; display:flex; align-items:center; gap:8px;">
              Episode ${epNum} ${badgeHtml}
            </div>
            <div class="ep-meta" style="font-size:12px; color:var(--text-muted)">
              Duration: ${d.duration || '24 min'} • Airing Date: ${d.aired?.string ? d.aired.string.split(' to ')[0] : 'N/A'}
            </div>
          </div>
          <div class="ep-actions" style="display:flex; align-items:center; gap:12px">
            ${isWatched ? `<span class="ep-watch-count">Watched</span>` : ''}
            <button class="ep-toggle-btn ${isWatched ? 'watched' : ''}" style="padding:6px 12px; font-size:13px; border-radius:var(--radius-sm); border:none; cursor:pointer;" data-epnum="${epNum}">
              ${isWatched ? '✓ Watched' : 'Mark Watched'}
            </button>
          </div>
        </div>
      `;
    }

    container.innerHTML = listHtml || `<div style="text-align: center; color: var(--text-dim); padding: 20px;">No episodes match filters.</div>`;

    // Bind mark watched buttons
    container.querySelectorAll('.ep-toggle-btn').forEach(btn => {
      btn.onclick = () => {
        const epNum = parseInt(btn.dataset.epnum);
        toggleEpisodeWatched(d.mal_id, activeSeason, epNum, totalEpisodes);
        syncLibraryTrackerUI(d);
      };
    });
  };

  // Bind selector events
  selector.onchange = (e) => {
    activeSeason = parseInt(e.target.value);
    updateList();
  };

  // Bind search events
  searchInput.oninput = (e) => {
    searchQuery = e.target.value;
    updateList();
  };

  // Bind filter events
  filterBtns.forEach(btn => {
    btn.onclick = () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      updateList();
    };
  });

  updateList();
}

// Diary Section UI Sync
function syncDiaryUI(d) {
  const diary = getAnimeDiary(d.mal_id);
  const ratingStars = document.querySelectorAll('#animeDiaryStars span');
  const moodChips = document.querySelectorAll('#animeMoodTags .mood-chip');
  const favCharInput = document.getElementById('animeDiaryFavChar');
  const favEpInput = document.getElementById('animeDiaryFavEp');
  const notesTextarea = document.getElementById('animeDiaryNotes');
  const diaryDate = document.getElementById('animeDiaryDate');
  const deleteBtn = document.getElementById('animeDiaryDeleteBtn');

  // Rating Stars Interactive Click & Hover
  let selectedRating = diary.rating || 0;
  
  const updateStars = (val) => {
    ratingStars.forEach(s => {
      s.classList.toggle('selected', parseInt(s.dataset.v) <= val);
    });
  };
  
  updateStars(selectedRating);

  ratingStars.forEach(s => {
    s.onclick = () => {
      selectedRating = parseInt(s.dataset.v);
      updateStars(selectedRating);
    };
    s.onmouseover = () => updateStars(parseInt(s.dataset.v));
    s.onmouseout = () => updateStars(selectedRating);
  });

  // Mood chips multiple tags logic
  let activeMoods = [...(diary.moodTags || [])];
  
  const updateMoodChips = () => {
    moodChips.forEach(chip => {
      chip.classList.toggle('active', activeMoods.includes(chip.dataset.tag));
    });
  };
  
  updateMoodChips();

  moodChips.forEach(chip => {
    chip.onclick = () => {
      const tag = chip.dataset.tag;
      if (activeMoods.includes(tag)) {
        activeMoods = activeMoods.filter(m => m !== tag);
      } else {
        activeMoods.push(tag);
      }
      updateMoodChips();
    };
  });

  // Load remaining diary values
  favCharInput.value = diary.favoriteCharacter || '';
  favEpInput.value = diary.favoriteEpisode || '';
  notesTextarea.value = diary.notes || '';
  diaryDate.value = diary.watchDate || new Date().toISOString().split('T')[0];

  // Favorite hearts state sync
  syncFavBtn(diary.isFavorite || false);

  if (diary.createdAt) {
    deleteBtn.classList.remove('hidden');
  } else {
    deleteBtn.classList.add('hidden');
  }

  // Save Diary Action
  document.getElementById('animeDiarySaveBtn').onclick = () => {
    updateAnimeDiary(d.mal_id, {
      rating: selectedRating,
      watchDate: diaryDate.value,
      moodTags: activeMoods,
      favoriteCharacter: favCharInput.value,
      favoriteEpisode: favEpInput.value,
      notes: notesTextarea.value
    });
    toast('Diary entry saved successfully!', 'success');
    syncLibraryTrackerUI(d);
  };

  // Delete Diary Action
  deleteBtn.onclick = () => {
    if (confirm('Are you sure you want to delete this diary entry?')) {
      deleteAnimeDiary(d.mal_id);
      toast('Diary entry deleted.', 'info');
      syncLibraryTrackerUI(d);
    }
  };

  // Render Timeline
  renderWatchTimeline(d);
}

// Render watch history diary timeline
function renderWatchTimeline(d) {
  const container = document.getElementById('animeWatchTimeline');
  const history = getWatchHistory(d.mal_id);
  const diary = getAnimeDiary(d.mal_id);

  if (history.length === 0 && !diary.notes) {
    container.innerHTML = `<p style="font-size:12px; color:var(--text-dim)">No logbook entries available. Start watching episodes or leave notes above!</p>`;
    return;
  }

  let timelineHtml = '';

  // Add notes block if exists
  if (diary.notes) {
    timelineHtml += `
      <div class="timeline-item" style="position:relative; margin-bottom:16px; padding-left:14px;">
        <div class="timeline-dot" style="position:absolute; left:-6px; top:4px; width:10px; height:10px; border-radius:50%; background:var(--purple)"></div>
        <div class="timeline-date" style="font-size:11px; color:var(--text-muted)">Saved Diary Note — ${diary.watchDate || 'N/A'}</div>
        <div class="timeline-content" style="background:var(--surface2); padding:10px; border-radius:var(--radius-sm); margin-top:4px;">
          <div style="font-weight:700; color:var(--purple); display:flex; justify-content:space-between; align-items:center;">
            <span>Moods: ${diary.moodTags?.join(', ') || 'Normal'}</span>
            <span>★ ${diary.rating}/10</span>
          </div>
          <p style="margin:6px 0 0 0; font-size:13px; color:var(--text-dim); line-height:1.4;">${h(diary.notes)}</p>
          ${diary.favoriteCharacter ? `<div style="font-size:11px; margin-top:6px;">⭐ Character: <strong>${h(diary.favoriteCharacter)}</strong></div>` : ''}
          ${diary.favoriteEpisode ? `<div style="font-size:11px;">🎬 Favorite Episode: <strong>${h(diary.favoriteEpisode)}</strong></div>` : ''}
        </div>
      </div>
    `;
  }

  history.slice(0, 10).forEach(h => {
    timelineHtml += `
      <div class="timeline-item" style="position:relative; margin-bottom:12px; padding-left:14px;">
        <div class="timeline-dot" style="position:absolute; left:-6px; top:4px; width:8px; height:8px; border-radius:50%; background:var(--green)"></div>
        <div class="timeline-date" style="font-size:11px; color:var(--text-muted)">${new Date(h.date).toLocaleString()}</div>
        <div class="timeline-content" style="font-size:13px; color:var(--text); margin-top:2px;">
          Watched <strong>Season ${h.season} Episode ${h.episode}</strong>
        </div>
      </div>
    `;
  });

  container.innerHTML = timelineHtml;
}

// Fetch Cast
async function loadCastAsync(id) {
  const container = document.getElementById('animeCastRow');
  try {
    const res = await fetchJikan(`/anime/${id}/characters`);
    if (res && res.data) {
      if (res.data.length === 0) {
        container.innerHTML = '<p class="placeholder-msg">No cast information available.</p>';
        return;
      }

      container.innerHTML = res.data.slice(0, 15).map(item => {
        const character = item.character;
        const voiceActor = item.voice_actors?.find(va => va.language === 'Japanese');

        const charImg = character.images?.jpg?.image_url || NOPHOTO;
        const vaImg = voiceActor?.person?.images?.jpg?.image_url || NOPHOTO;
        const vaName = voiceActor ? voiceActor.person.name : 'Unknown VA';
        
        return `
          <div class="character-card" style="flex-shrink: 0; width: 140px; margin-right: 12px; background: var(--surface2); border-radius: var(--radius-md); overflow: hidden; border:1px solid var(--border)">
            <div style="position: relative; height: 160px;">
              <img class="character-img" src="${charImg}" alt="${h(character.name)}" style="width:100%; height:100%; object-fit:cover; cursor:pointer;" onclick="document.dispatchEvent(new CustomEvent('mu:openAnimeCharModal', {detail: {id: ${character.mal_id}, type: 'character'}}))" loading="lazy">
              <img class="va-img" src="${vaImg}" alt="${h(vaName)}" style="position: absolute; bottom: 8px; right: 8px; width: 36px; height: 36px; border-radius: 50%; border: 2px solid var(--surface2); object-fit: cover; cursor: pointer; z-index: 5;" onclick="event.stopPropagation(); document.dispatchEvent(new CustomEvent('mu:openAnimeCharModal', {detail: {id: ${voiceActor?.person?.mal_id || 0}, type: 'person'}}))" title="Voice Actor: ${h(vaName)}" loading="lazy">
            </div>
            <div class="character-info" style="padding:8px;">
              <div class="character-name" style="font-weight:600; font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; cursor:pointer;" onclick="document.dispatchEvent(new CustomEvent('mu:openAnimeCharModal', {detail: {id: ${character.mal_id}, type: 'character'}}))" title="${h(character.name)}">${h(character.name)}</div>
              <div class="character-actor" style="font-size:11px; color:var(--text-dim); margin-top:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; cursor:pointer;" onclick="document.dispatchEvent(new CustomEvent('mu:openAnimeCharModal', {detail: {id: ${voiceActor?.person?.mal_id || 0}, type: 'person'}}))" title="${h(vaName)}">🇯🇵 ${h(vaName)}</div>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p class="placeholder-msg" style="color:var(--red)">Failed to load voice actors.</p>';
  }
}

// Fetch Recommendations
async function loadRecommendationsAsync(id) {
  try {
    const res = await fetchJikan(`/anime/${id}/recommendations`);
    const recommendations = res?.data || [];
    
    // Fill recommendation grid if elements exist
    const recsRow = document.getElementById('animeFranchiseTimeline');
    if (recsRow && recommendations.length > 0) {
      document.getElementById('animeFranchiseBanner').classList.remove('hidden');
      recsRow.innerHTML = recommendations.slice(0, 5).map(r => {
        const item = r.entry;
        const poster = item.images?.jpg?.large_image_url || NOPOSTER;
        return `
          <div class="timeline-item" style="position:relative; margin-bottom:12px; padding-left:14px; display:flex; gap:12px; cursor:pointer;" onclick="document.dispatchEvent(new CustomEvent('mu:openAnime', {detail: {id: ${item.mal_id}, title: '${h(item.title)}'}}))">
            <img src="${poster}" alt="${h(item.title)}" style="width:40px; height:60px; object-fit:cover; border-radius:var(--radius-sm)">
            <div>
              <div style="font-weight:600; font-size:13px;">${h(item.title)}</div>
              <div style="font-size:11px; color:var(--purple)">Recommendation</div>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error(err);
  }
}

// Fetch Reviews
async function loadReviewsAsync(id) {
  const card = document.getElementById('animeReviewPreviewCard');
  try {
    const res = await fetchJikan(`/anime/${id}/reviews`);
    if (res && res.data && res.data.length > 0) {
      const review = res.data[0];

      // Score circles fill animations
      document.getElementById('dialCritics').style.setProperty('--percentage', `${(_activeAnimeDetails.score || 0) * 10}%`);
      document.getElementById('valCritics').textContent = `${((_activeAnimeDetails.score || 0) * 10).toFixed(0)}%`;

      const audScore = _activeAnimeDetails.score ? (_activeAnimeDetails.score * 10 - 2.5).toFixed(0) : 0;
      document.getElementById('dialAudience').style.setProperty('--percentage', `${audScore}%`);
      document.getElementById('valAudience').textContent = `${audScore}%`;

      const ultraRating = getAnimeDiary(id).rating || 0;
      const ultraScore = ultraRating ? (ultraRating * 10).toFixed(0) : 0;
      document.getElementById('dialUltra').style.setProperty('--percentage', `${ultraScore}%`);
      document.getElementById('valUltra').textContent = `${ultraScore}%`;

      // Review Card
      card.innerHTML = `
        <div class="review-meta" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span class="review-author" style="font-weight:700;">MAL Critic: ${h(review.user?.username || 'Anonymous')}</span>
          <span class="review-rating-star" style="color:var(--gold);">★ ${review.score}/10</span>
        </div>
        <div class="review-content-wrap" style="position:relative;">
          <p class="review-text blurred" id="animeReviewText" style="font-size:13px; color:var(--text-dim); line-height:1.5; margin:0; transition: filter 0.3s;">
            ${h(review.review.slice(0, 400))}...
          </p>
          <div class="spoiler-overlay" id="animeReviewSpoiler" style="position:absolute; inset:0; background:rgba(0,0,0,0.6); display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:var(--radius-sm)">
            <div class="spoiler-overlay-msg" style="font-size:12px; margin-bottom:8px;">Warning: Review may contain spoilers</div>
            <button class="spoiler-reveal-btn" id="revealAnimeReviewBtn" style="background:var(--purple); color:white; border:none; padding:4px 10px; border-radius:var(--radius-sm); cursor:pointer;">Reveal Review</button>
          </div>
        </div>
      `;

      document.getElementById('revealAnimeReviewBtn').onclick = () => {
        document.getElementById('animeReviewText').classList.remove('blurred');
        document.getElementById('animeReviewSpoiler').classList.add('hidden');
      };
    } else {
      card.innerHTML = `<div style="text-align: center; color: var(--text-dim); padding: 15px;">No reviews available for this anime.</div>`;
    }
  } catch (err) {
    console.error(err);
    card.innerHTML = `<div style="text-align: center; color: var(--text-dim); padding: 15px;">Failed to fetch reviews.</div>`;
  }
}

// Fetch promo videos
async function loadVideosAsync(id) {
  const container = document.getElementById('animeVideoGallery');
  try {
    const res = await fetchJikan(`/anime/${id}/videos`);
    if (res && res.data && res.data.promo && res.data.promo.length > 0) {
      container.innerHTML = res.data.promo.slice(0, 6).map(v => `
        <div class="character-card video-card-item" style="width: 180px; flex-shrink:0; cursor:pointer;" data-ytid="${v.trailer.youtube_id}">
          <div style="position:relative;">
            <img class="character-img" src="${v.trailer.images?.medium_image_url || NOBACK}" alt="${h(v.title)}" style="width:100%; height:100px; object-fit:cover; border-radius:var(--radius-sm);">
            <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:24px; color:white; background:rgba(0,0,0,0.3)">▶</div>
          </div>
          <div class="character-info" style="padding:6px;">
            <div class="character-name" style="font-size:12px; font-weight:500; height:32px; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${h(v.title)}</div>
          </div>
        </div>
      `).join('');

      container.querySelectorAll('.video-card-item').forEach(cardEl => {
        cardEl.onclick = () => {
          const ytId = cardEl.dataset.ytid;
          if (ytId) {
            openTrailer(ytId);
          }
        };
      });
    } else {
      container.innerHTML = '<div style="text-align: center; color: var(--text-dim); padding: 20px; width: 100%;">No official videos or promos found.</div>';
    }
  } catch (err) {
    console.error(err);
    container.innerHTML = '<div style="text-align: center; color: var(--text-dim); padding: 20px; width: 100%;">Failed to load video gallery.</div>';
  }
}

// Accordion setup
function setupStoryAccordion(d) {
  const trigger = document.getElementById('animeStoryAccordionTrigger');
  const content = document.getElementById('animeStoryAccordionContent');

  trigger.onclick = () => {
    const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
    trigger.setAttribute('aria-expanded', !isExpanded);
    content.classList.toggle('hidden');
    trigger.querySelector('.arrow').textContent = isExpanded ? '▼' : '▲';
  };

  // Populate accordion values
  document.getElementById('animeStoryThemes').innerHTML = d.themes?.map(t => `<span class="genre-tag anime-genre">${h(t.name)}</span>`).join(' ') || 'None';
  document.getElementById('animeStoryTrivia').textContent = d.background || 'No trivia available.';
  document.getElementById('animeStoryProduction').textContent = d.producers?.map(p => p.name).join(', ') || 'Unknown';
  document.getElementById('animeStorySourceNotes').textContent = d.synopsis ? `Synopsis: ${d.synopsis.slice(0, 200)}...` : 'None';
}

// Soundtracks setup
function setupSoundtrack(d) {
  const container = document.getElementById('animeSoundtrackList');
  const openings = d.theme?.openings || [];
  const endings = d.theme?.endings || [];

  if (openings.length === 0 && endings.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-dim); padding: 20px;">No theme songs listed.</div>`;
    return;
  }

  let html = '';
  const makePlayable = (themeStr, label) => {
    return `
      <div class="soundtrack-item" style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; border-bottom:1px solid var(--border)">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="font-size:20px; color:var(--purple)">💿</div>
          <div>
            <div style="font-weight:600; font-size:13px; color:var(--text)">${h(themeStr)}</div>
            <div style="font-size:11px; color:var(--text-muted)">${label}</div>
          </div>
        </div>
        <button class="play-theme-btn" style="background:var(--purple); color:white; border:none; border-radius:50%; width:30px; height:30px; display:flex; align-items:center; justify-content:center; cursor:pointer;">▶</button>
      </div>
    `;
  };

  openings.forEach(op => { html += makePlayable(op, 'Opening Theme'); });
  endings.forEach(ed => { html += makePlayable(ed, 'Ending Theme'); });

  container.innerHTML = html;

  container.querySelectorAll('.soundtrack-item').forEach(itemEl => {
    const playBtn = itemEl.querySelector('.play-theme-btn');
    if (playBtn) {
      playBtn.onclick = () => {
        const isPlaying = playBtn.textContent === '▶';
        playBtn.textContent = isPlaying ? '⏸' : '▶';
        toast('Simulating audio playback...', 'info');
      };
    }
  });
}

// External links setup
function setupExternalLinks(d) {
  const row = document.getElementById('animeLinksRow');
  const malLink = d.url || `https://myanimelist.net/anime/${d.mal_id}`;
  
  row.innerHTML = `
    <a href="${malLink}" target="_blank" rel="noopener" class="status-pill-btn" style="text-decoration:none; padding:8px 16px; border:1px solid rgba(168,85,247,0.3); border-radius:var(--radius-sm); font-size:13px; color:var(--purple)">MyAnimeList</a>
    <a href="https://anilist.co/search/anime?search=${encodeURIComponent(d.title)}" target="_blank" rel="noopener" class="status-pill-btn" style="text-decoration:none; padding:8px 16px; border:1px solid rgba(168,85,247,0.3); border-radius:var(--radius-sm); font-size:13px; color:var(--purple)">AniList</a>
    <a href="https://www.imdb.com/find?q=${encodeURIComponent(d.title)}" target="_blank" rel="noopener" class="status-pill-btn" style="text-decoration:none; padding:8px 16px; border:1px solid rgba(168,85,247,0.3); border-radius:var(--radius-sm); font-size:13px; color:var(--purple)">IMDb</a>
    <a href="https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(d.title)}" target="_blank" rel="noopener" class="status-pill-btn" style="text-decoration:none; padding:8px 16px; border:1px solid rgba(168,85,247,0.3); border-radius:var(--radius-sm); font-size:13px; color:var(--purple)">Wikipedia</a>
  `;
}

// Franchise setup
function setupFranchise(d) {
  // If Jikan relations exist, display them in the collections banner
  const banner = document.getElementById('animeFranchiseBanner');
  const timeline = document.getElementById('animeFranchiseTimeline');

  if (d.relations && d.relations.length > 0) {
    banner.classList.remove('hidden');
    timeline.innerHTML = d.relations.map(rel => {
      const label = rel.relation || 'Connected';
      const items = rel.entry?.map(e => `
        <span class="genre-tag anime-genre" style="cursor:pointer; margin:4px 4px 0 0;" onclick="document.dispatchEvent(new CustomEvent('mu:openAnime', {detail: {id: ${e.mal_id}, title: '${h(e.name)}'}}))">
          ${h(e.name)} (${e.type})
        </span>
      `).join('') || 'N/A';
      return `
        <div style="margin-bottom:12px;">
          <div style="font-size:12px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">${h(label)}</div>
          <div style="display:flex; flex-wrap:wrap; margin-top:4px;">${items}</div>
        </div>
      `;
    }).join('');
  } else {
    banner.classList.add('hidden');
  }
}

// Custom event listeners for cross-linking
document.addEventListener('mu:openAnime', (e) => {
  const item = e.detail;
  // If item is already formatted
  renderPremiumAnimeModal({
    id: item.id,
    title: item.title,
    type: 'anime',
    poster: item.poster || '',
    rating: item.rating || 'N/A'
  });
});

/* ── LAZY-LOADED CHARACTER / PERSON DETAIL MODAL ───────────────────────────────────── */
document.addEventListener('mu:openAnimeCharModal', async (e) => {
  const { id, type } = e.detail;
  if (!id) return;

  let charModal = document.getElementById('animeCharProfileModal');
  if (!charModal) {
    charModal = document.createElement('div');
    charModal.id = 'animeCharProfileModal';
    charModal.className = 'actor-modal-overlay';
    document.body.appendChild(charModal);
  }

  charModal.classList.remove('hidden');
  charModal.innerHTML = `
    <div class="actor-modal-card">
      <button class="modal-close actor-modal-close" style="top: 14px; right: 14px;" id="animeCharCloseBtn">✕</button>
      <div style="color: var(--text-dim); text-align: center; padding: 40px 0;">Loading profile...</div>
    </div>
  `;

  charModal.querySelector('#animeCharCloseBtn').onclick = () => {
    charModal.classList.add('hidden');
  };

  try {
    const res = await fetchJikan(`/${type === 'character' ? 'characters' : 'people'}/${id}/full`);
    if (!res || !res.data) throw new Error('Data load failed');

    const data = res.data;
    const name = data.name || 'Unknown Name';
    const profileImg = data.images?.jpg?.image_url || NOPHOTO;
    const biography = data.about || 'No details available.';
    
    // Known for (related works)
    let relatedHtml = '';
    if (type === 'character' && data.anime && data.anime.length > 0) {
      relatedHtml = `
        <div>
          <h4 class="actor-credits-title">Appearances</h4>
          <div class="actor-credits-row">
            ${data.anime.map(item => `
              <div class="actor-credits-item" onclick="document.dispatchEvent(new CustomEvent('mu:openAnime', {detail: {id: ${item.anime.mal_id}, title: '${h(item.anime.title)}'}}))">
                <img class="actor-credits-poster" src="${item.anime.images?.jpg?.image_url || NOPOSTER}" alt="${h(item.anime.title)}">
                <div class="actor-credits-name" title="${h(item.anime.title)}">${h(item.anime.title)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else if (type === 'person' && data.voices && data.voices.length > 0) {
      relatedHtml = `
        <div>
          <h4 class="actor-credits-title">Japanese Voice Acting Roles</h4>
          <div class="actor-credits-row">
            ${data.voices.slice(0, 10).map(role => `
              <div class="actor-credits-item" onclick="document.dispatchEvent(new CustomEvent('mu:openAnime', {detail: {id: ${role.anime.mal_id}, title: '${h(role.anime.title)}'}}))">
                <img class="actor-credits-poster" src="${role.anime.images?.jpg?.image_url || NOPOSTER}" alt="${h(role.anime.title)}">
                <div class="actor-credits-name" title="${h(role.anime.title)}">${h(role.character.name)} in ${h(role.anime.title)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    charModal.innerHTML = `
      <div class="actor-modal-card">
        <button class="modal-close actor-modal-close" style="top: 14px; right: 14px;" id="animeCharCloseBtn">✕</button>
        <div class="actor-profile-wrap">
          <img class="actor-profile-img" src="${profileImg}" alt="${name}">
          <div class="actor-meta-info">
            <h3 class="actor-profile-name">${name}</h3>
            ${data.name_kanji ? `<div class="actor-profile-detail"><strong>Kanji Name:</strong> ${data.name_kanji}</div>` : ''}
            ${data.birthday ? `<div class="actor-profile-detail"><strong>Birthday:</strong> ${data.birthday.split('T')[0]}</div>` : ''}
            ${data.favorites ? `<div class="actor-profile-detail"><strong>MAL Favorites:</strong> ${data.favorites}</div>` : ''}
          </div>
        </div>
        <div class="actor-biography" style="max-height: 250px; overflow-y: auto; font-size:13px; color:var(--text-dim); line-height:1.5; margin:16px 0; border-top:1px solid var(--border); padding-top:10px;">
          ${biography.replace(/\n/g, '<br>')}
        </div>
        ${relatedHtml}
      </div>
    `;

    // Re-bind close button
    charModal.querySelector('#animeCharCloseBtn').onclick = () => {
      charModal.classList.add('hidden');
    };

  } catch (err) {
    console.error(err);
    charModal.innerHTML = `
      <div class="actor-modal-card">
        <button class="modal-close actor-modal-close" style="top: 14px; right: 14px;" id="animeCharCloseBtn">✕</button>
        <div style="color: var(--red); text-align: center; padding: 40px 0;">Failed to load profile details.</div>
      </div>
    `;
    charModal.querySelector('#animeCharCloseBtn').onclick = () => {
      charModal.classList.add('hidden');
    };
  }
});
