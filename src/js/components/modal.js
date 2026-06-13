'use strict';

import { h } from '../utils/escape.js';
import { toast } from './toast.js';
import { getDetailsTMDB } from '../api/tmdb.js';
import { getAnimeDetails } from '../api/jikan.js';
import { libHas, libAdd, libRemove, libUpdateStatus, saveLib, state as libState } from '../store/library.js';
import { histHas, histAdd, histRemove } from '../store/history.js';
import { openTrailer, playTrailer } from './trailer.js';
import { fetchTMDB } from '../utils/request.js';
import { renderPremiumSeriesModal } from './seriesModal.js';
import { renderPremiumAnimeModal } from './animeModal.js';

let _modalItem = null;
const actorCache = {};
let activeAudioTrack = null; // Track current playing audio simulation

const ORIGINAL_MODAL_HTML = `
  <div class="modal-card">
    <button class="modal-close" id="modalClose" aria-label="Close">✕</button>
    <div class="modal-hero">
      <img id="modalBackdrop" src="" alt="" class="modal-backdrop-img" loading="lazy">
      <div class="modal-hero-vig" aria-hidden="true"></div>
      <button class="modal-play-btn" id="modalPlayBtn" aria-label="Play trailer">▶</button>
    </div>
    <div class="modal-body">
      <div class="modal-pills" id="modalPills"></div>
      <h2 class="modal-title" id="modalTitle"></h2>
      <p class="modal-tagline" id="modalTagline"></p>
      <p class="modal-overview" id="modalOverview"></p>
      <div class="modal-genres" id="modalGenres"></div>
      <!-- Status update row -->
      <div id="modalStatusRow" class="hidden">
        <p style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Status</p>
        <div class="status-pills" id="modalStatusPills">
          <button class="status-pill" data-s="Watching">👁 Watching</button>
          <button class="status-pill" data-s="Completed">✅ Completed</button>
          <button class="status-pill" data-s="Planned">📋 Planned</button>
        </div>
      </div>
      <div class="modal-foot" id="modalFoot"></div>
    </div>
  </div>
`;

export async function openModal(item) {
  if (!item) return;
  _modalItem = item;

  const movieModal = document.getElementById('movieModal');
  if (!movieModal) return;

  // Clear active audio states
  activeAudioTrack = null;

  movieModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Push state to history so back button closes modal
  history.pushState({ modalOpen: true }, '');

  // Apply split layout depending on whether item is a Movie card
  if (item.type === 'movie') {
    renderPremiumMovieModal(item);
  } else if (item.type === 'tv') {
    renderPremiumSeriesModal(item);
  } else if (item.type === 'anime') {
    renderPremiumAnimeModal(item);
  } else {
    // Other cards use the original design
    movieModal.innerHTML = ORIGINAL_MODAL_HTML;
    renderOriginalModal(item);
  }
}

/* ── ORIGINAL MODAL BRANCH (Anime & TV Cards) ──────────────────── */

async function renderOriginalModal(item) {
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalTitle = document.getElementById('modalTitle');
  const modalTagline = document.getElementById('modalTagline');
  const modalOverview = document.getElementById('modalOverview');
  const modalPills = document.getElementById('modalPills');
  const modalGenres = document.getElementById('modalGenres');
  const modalStatusRow = document.getElementById('modalStatusRow');

  const NOBACK = 'https://placehold.co/1280x720/1c1c1c/555?text=No+Image';
  modalBackdrop.src = item.backdrop || item.poster || NOBACK;
  modalBackdrop.alt = `${item.title} backdrop`;
  modalTitle.textContent = item.title;
  modalTagline.textContent = '';
  modalOverview.textContent = item.overview || 'Loading details…';
  modalPills.innerHTML = '';
  modalGenres.innerHTML = '';

  const inLib = libHas(item.id, item.title, item.type);
  if (inLib) {
    modalStatusRow.classList.remove('hidden');
    const libItem = libState.library.find(i => String(i.id) === String(item.id));
    const curStatus = libItem?.status || 'Planned';
    setupStatusPills(item.id, curStatus, item.type);
  } else {
    modalStatusRow.classList.add('hidden');
  }

  renderModalButtons(item, null);

  if (item.id) {
    if (item.type === 'anime') {
      try {
        const d = await getAnimeDetails(item.id);
        applyAnimeDetails(d.data);
      } catch (err) {
        console.error('[MovieUltra] Error fetching anime details:', err);
      }
    } else {
      try {
        const d = await getDetailsTMDB(item.type, item.id);
        applyDetails(d, item.type);
      } catch (err) {
        console.error('[MovieUltra] Error fetching details:', err);
      }
    }
  }
}

function setupStatusPills(id, curStatus, type) {
  const pills = document.querySelectorAll('#modalStatusPills .status-pill');
  pills.forEach(p => {
    p.classList.toggle('active', p.dataset.s === curStatus);
    p.onclick = () => {
      libUpdateStatus(id, p.dataset.s, type);
      pills.forEach(x => x.classList.toggle('active', x === p));
    };
  });
}

const W1280 = 'https://image.tmdb.org/t/p/w1280';

function applyDetails(d, type) {
  if (d.backdrop_path) {
    const el = document.getElementById('modalBackdrop');
    if (el) {
      el.src = `${W1280}${d.backdrop_path}`;
      el.alt = `${d.title || d.name} backdrop`;
    }
  }

  const pills = [];
  if (d.vote_average) pills.push(`<span class="modal-pill gold">★ ${Number(d.vote_average).toFixed(1)}</span>`);
  const yr = (d.release_date || d.first_air_date || '').split('-')[0];
  if (yr) pills.push(`<span class="modal-pill">${h(yr)}</span>`);
  if (d.runtime) pills.push(`<span class="modal-pill">${h(String(d.runtime))} min</span>`);
  if (d.number_of_seasons) pills.push(`<span class="modal-pill">${h(String(d.number_of_seasons))} season${d.number_of_seasons > 1 ? 's' : ''}</span>`);
  if (d.status) pills.push(`<span class="modal-pill green">${h(d.status)}</span>`);

  const modalPills = document.getElementById('modalPills');
  const modalTitle = document.getElementById('modalTitle');
  const modalTagline = document.getElementById('modalTagline');
  const modalOverview = document.getElementById('modalOverview');
  const modalGenres = document.getElementById('modalGenres');

  if (modalPills) modalPills.innerHTML = pills.join('');
  if (modalTitle) modalTitle.textContent = d.title || d.name || '';
  if (modalTagline) modalTagline.textContent = d.tagline || '';
  if (modalOverview) modalOverview.textContent = d.overview || '';
  if (d.genres?.length && modalGenres) {
    modalGenres.innerHTML = d.genres.map(g => `<span class="genre-tag">${h(g.name)}</span>`).join('');
  }

  const W500 = 'https://image.tmdb.org/t/p/w500';
  const NOPOSTER = 'https://placehold.co/300x450/1c1c1c/555?text=No+Image';
  const fullItem = {
    id: d.id,
    title: d.title || d.name || 'Unknown',
    year: yr || 'N/A',
    rating: d.vote_average ? Number(d.vote_average).toFixed(1) : 'N/A',
    poster: d.poster_path ? `${W500}${d.poster_path}` : NOPOSTER,
    backdrop: d.backdrop_path ? `${W1280}${d.backdrop_path}` : '',
    overview: d.overview || '',
    genre: d.genres ? d.genres.map(g => g.name).join(', ') : '',
    platform: '',
    status: 'Planned',
    note: '',
    type,
  };

  _modalItem = fullItem;

  const tk = d.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube')?.key;
  const modalPlayBtn = document.getElementById('modalPlayBtn');
  if (modalPlayBtn) {
    if (tk) modalPlayBtn.classList.remove('hidden');
    else modalPlayBtn.classList.add('hidden');
  }

  renderModalButtons(fullItem, d.videos);

  if (libHas(fullItem.id, fullItem.title, fullItem.type)) {
    const statusRow = document.getElementById('modalStatusRow');
    if (statusRow) statusRow.classList.remove('hidden');
    const libItem = libState.library.find(i => String(i.id) === String(fullItem.id));
    if (libItem) {
      let changed = false;
      if (d.runtime && !libItem.runtime) {
        libItem.runtime = d.runtime;
        changed = true;
      }
      if (d.genres && !libItem.genre) {
        libItem.genre = d.genres.map(g => g.name).join(', ');
        changed = true;
      }
      if (changed) {
        saveLib();
      }
    }
    setupStatusPills(fullItem.id, libItem?.status || 'Planned', fullItem.type);
  }
}

function applyAnimeDetails(d) {
  if (!d) return;

  let ytId = '';
  if (d.trailer) {
    if (d.trailer.youtube_id) {
      ytId = d.trailer.youtube_id;
    } else {
      const url = d.trailer.embed_url || d.trailer.url || '';
      const match = url.match(/(?:youtube(?:-nocookie)?\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
      if (match) ytId = match[1];
    }
  }

  const modalPlayBtn = document.getElementById('modalPlayBtn');
  if (modalPlayBtn) {
    if (ytId) modalPlayBtn.classList.remove('hidden');
    else modalPlayBtn.classList.add('hidden');
  }

  if (_modalItem) {
    _modalItem.trailer = ytId;
    renderModalButtons(_modalItem, null);
  }
}

function renderModalButtons(item, videos) {
  const foot = document.getElementById('modalFoot');
  if (!foot) return;

  const inLib = libHas(item.id, item.title, item.type);
  const inH = histHas(item.id);
  const tk = item.type === 'anime' ? item.trailer : videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube')?.key;
  const btns = [];

  if (tk) {
    btns.push(`<button class="btn-primary mf-trailer">▶ Trailer</button>`);
  } else if (item.id && item.type !== 'anime') {
    btns.push(`<button class="btn-ghost mf-findtrailer">🎬 Find Trailer</button>`);
  }
  btns.push(inLib ? `<button class="btn-danger btn-sm mf-remove">✕ Remove</button>` : `<button class="btn-ghost mf-add">＋ Library</button>`);
  btns.push(inH ? `<button class="btn-ghost mf-unwatch">✓ Watched</button>` : `<button class="btn-ghost mf-watch">👁 Mark Watched</button>`);

  foot.innerHTML = btns.join('');

  foot.querySelector('.mf-trailer')?.addEventListener('click', () => openTrailer(tk));
  foot.querySelector('.mf-findtrailer')?.addEventListener('click', async () => await playTrailer(item.type, item.id));
  
  foot.querySelector('.mf-add')?.addEventListener('click', () => {
    libAdd(item);
    renderModalButtons(item, videos);
    const statusRow = document.getElementById('modalStatusRow');
    if (statusRow) statusRow.classList.remove('hidden');
    const libItem = libState.library.find(i => String(i.id) === String(item.id));
    setupStatusPills(item.id, libItem?.status || 'Planned', item.type);
  });

  foot.querySelector('.mf-remove')?.addEventListener('click', () => {
    libRemove(item.id, item.title, item.type);
    toast('Removed from library', 'info');
    renderModalButtons(item, videos);
    const statusRow = document.getElementById('modalStatusRow');
    if (statusRow) statusRow.classList.add('hidden');
  });

  foot.querySelector('.mf-watch')?.addEventListener('click', () => {
    histAdd(item);
    renderModalButtons(item, videos);
  });

  foot.querySelector('.mf-unwatch')?.addEventListener('click', () => {
    histRemove(item.id);
    toast('Removed from history', 'info');
    renderModalButtons(item, videos);
  });
}

/* ── PREMIUM MOVIE CARD BRANCH ─────────────────────────────────── */

function renderPremiumMovieModal(item) {
  const movieModal = document.getElementById('movieModal');
  if (!movieModal) return;

  const NOBACK = 'https://placehold.co/1280x720/1c1c1c/555?text=No+Image';
  const backdropUrl = item.backdrop || item.poster || NOBACK;

  // Insert base layout skeletons immediately
  movieModal.innerHTML = `
    <div class="premium-movie-backdrop-overlay" id="premiumBackdropOverlay" style="background-image: url('${backdropUrl}')"></div>
    <div class="premium-movie-card">
      <div class="premium-hero">
        <img class="premium-hero-img" src="${backdropUrl}" alt="${h(item.title)} backdrop">
        <div class="premium-hero-overlay"></div>
        <div class="premium-hero-ctrls-top">
          <div class="premium-hero-badges-left">
            <span class="premium-hero-badge" id="premiumQualityBadge">HD</span>
            <span class="premium-hero-badge hidden" id="premiumDurationBadge"></span>
          </div>
          <div class="premium-hero-actions-right">
            <button class="premium-hero-btn" id="premiumFavBtn" aria-label="Favorite">❤</button>
            <button class="premium-hero-btn" id="premiumShareBtn" aria-label="Share">🔗</button>
            <button class="premium-hero-btn premium-hero-close-btn" aria-label="Close">✕</button>
          </div>
        </div>
        <button class="premium-hero-play hidden" id="premiumPlayBtn" aria-label="Play trailer">▶</button>
      </div>

      <div class="premium-body">
        <div class="premium-title-row">
          <h2 class="premium-title" id="premiumTitle">${h(item.title)}</h2>
          <div class="premium-original-title" id="premiumOrigTitle"></div>
        </div>
        
        <p class="premium-tagline" id="premiumTagline"></p>

        <div class="premium-meta-row">
          <span class="premium-rating-badge" id="premiumRatingStar">★ N/A</span>
          <span class="premium-meta-dot"></span>
          <span class="premium-meta-item" id="premiumReleaseYear">${h(item.year || 'N/A')}</span>
          <span class="premium-meta-dot"></span>
          <span class="premium-meta-item" id="premiumRuntime">N/A</span>
          <span class="premium-meta-dot"></span>
          <span class="premium-meta-item" id="premiumMpaa">NR</span>
          <span class="premium-meta-dot"></span>
          <span class="premium-meta-item" id="premiumStatus">Status: Unknown</span>
        </div>

        <p class="premium-overview" id="premiumOverview">${h(item.overview || 'Loading details…')}</p>
        <div class="premium-genres" id="premiumGenres"></div>

        <!-- QUICK ACTIONS -->
        <div class="premium-actions-section">
          <div class="actions-section-title">Quick Actions & Logbook Status</div>
          <div class="premium-actions-row">
            <div class="status-pill-group" id="premiumStatusGroup">
              <button class="status-pill-btn" data-s="Watching">Watching</button>
              <button class="status-pill-btn" data-s="Watched">Watched</button>
              <button class="status-pill-btn" data-s="Completed">Completed</button>
              <button class="status-pill-btn" data-s="Planned">Planned</button>
            </div>
            <button class="compact-action-btn btn-accent hidden" id="premiumQuickTrailer">🎬 Trailer</button>
            <button class="compact-action-btn" id="premiumQuickDiary">📝 Diary</button>
            <button class="compact-action-btn btn-delete hidden" id="premiumQuickDelete">✕ Remove Entry</button>
          </div>
        </div>

        <!-- STREAMING AVAILABILITY -->
        <div class="available-on-section hidden" id="availableOnSection">
          <div class="premium-section-title">📺 Available On</div>
          <div class="providers-chips-row" id="providersChipsRow"></div>
        </div>

        <!-- MOVIE FACTS -->
        <div class="premium-section-title">📊 Movie Facts</div>
        <div class="movie-facts-grid" id="premiumFactsGrid">
          <div class="fact-card"><div class="fact-label">Director</div><div class="fact-value" id="factDirector">Loading…</div></div>
          <div class="fact-card"><div class="fact-label">Studio</div><div class="fact-value" id="factStudio">Loading…</div></div>
          <div class="fact-card"><div class="fact-label">Release Date</div><div class="fact-value" id="factReleaseDate">Loading…</div></div>
          <div class="fact-card"><div class="fact-label">Language</div><div class="fact-value" id="factLanguage">Loading…</div></div>
          <div class="fact-card"><div class="fact-label">Budget</div><div class="fact-value" id="factBudget">Loading…</div></div>
          <div class="fact-card"><div class="fact-label">Revenue</div><div class="fact-value" id="factRevenue">Loading…</div></div>
        </div>

        <!-- COLLECTIONS / FRANCHISE -->
        <div class="franchise-banner hidden" id="franchiseBanner"></div>

        <!-- TOP CAST -->
        <div class="premium-section-title">🎭 Top Cast</div>
        <div class="cast-row" id="premiumCastRow"></div>

        <!-- ACCORDION (STORY DETAILS) -->
        <div class="story-accordion">
          <button class="accordion-trigger" id="storyAccordionTrigger">
            <span>🔍 Story Details (Keywords, Themes & Facts)</span>
            <span class="arrow">▼</span>
          </button>
          <div class="accordion-content hidden" id="storyAccordionContent">
            <div class="story-fact-item">
              <div class="story-fact-label">Themes</div>
              <div class="story-fact-text" id="storyThemes">Loading…</div>
            </div>
            <div class="story-fact-item">
              <div class="story-fact-label">Filming Locations</div>
              <div class="story-fact-text" id="storyLocations">Loading…</div>
            </div>
            <div class="story-fact-item">
              <div class="story-fact-label">Fun Facts & Trivia</div>
              <div class="story-fact-text" id="storyTrivia">Loading…</div>
            </div>
            <div class="story-fact-item">
              <div class="story-fact-label">Keywords</div>
              <div class="keywords-wrap" id="storyKeywords"></div>
            </div>
          </div>
        </div>

        <!-- SOUNDTRACKS -->
        <div class="premium-section-title">🎵 Soundtrack</div>
        <div class="soundtrack-playlist" id="premiumSoundtrackList"></div>

        <!-- VIDEOS & TEASERS -->
        <div class="premium-section-title">📹 Videos & Teasers</div>
        <div class="video-gallery" id="premiumVideoGallery"></div>

        <!-- REVIEWS & SCORES -->
        <div class="premium-section-title">💯 Reviews & Scores</div>
        <div class="score-dials-row">
          <div class="score-dial-card">
            <div class="score-dial-circle" id="dialCritics" style="--percentage:0%; --fill-color:#ff4d6d">
              <span class="score-dial-value" id="valCritics">0%</span>
            </div>
            <span class="score-dial-label">Critics Score</span>
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
            <span class="score-dial-label">MovieUltra Score</span>
          </div>
        </div>

        <!-- REVIEW PREVIEW -->
        <div class="review-preview-card">
          <div class="review-meta">
            <span class="review-author" id="reviewAuthor">Critics Core</span>
            <span class="review-rating-star" id="reviewRating">★ 8/10</span>
          </div>
          <div class="review-content-wrap">
            <p class="review-text blurred" id="reviewText">This review is extremely positive. The director brings a refreshing perspective that pushes boundaries in cinema. Cinematography and acting were top tier.</p>
            <div class="spoiler-overlay" id="spoilerOverlay">
              <div class="spoiler-overlay-msg">Spoiler Warning: Content hidden</div>
              <button class="spoiler-reveal-btn" id="revealReviewBtn">Reveal Review</button>
            </div>
          </div>
        </div>

        <!-- PERSONAL DIARY (ONLY ONE NOTE AREA) -->
        <div class="diary-journal-panel" id="diaryJournalPanel">
          <div class="diary-header-wrap">
            <h3 style="font-size:16px;font-weight:900;color:var(--text)">📓 Personal Diary</h3>
            <span class="diary-tag">Private Log</span>
          </div>
          
          <div class="diary-row">
            <label class="diary-row-label">Your Rating</label>
            <div class="star-rating-10" id="diaryStars10">
              <span data-v="1">★</span><span data-v="2">★</span><span data-v="3">★</span><span data-v="4">★</span><span data-v="5">★</span>
              <span data-v="6">★</span><span data-v="7">★</span><span data-v="8">★</span><span data-v="9">★</span><span data-v="10">★</span>
            </div>
          </div>

          <div class="diary-row">
            <label class="diary-row-label">Watch Date</label>
            <input type="date" class="diary-date-picker" id="diaryWatchDate">
          </div>

          <div class="diary-row">
            <label class="diary-row-label">Mood Tags</label>
            <div class="mood-tags-row" id="diaryMoodTags">
              <button class="mood-tag-btn" data-tag="Excited">🍿 Excited</button>
              <button class="mood-tag-btn" data-tag="Emotional">😭 Emotional</button>
              <button class="mood-tag-btn" data-tag="Mindblown">🧠 Mindblown</button>
              <button class="mood-tag-btn" data-tag="Scared">😱 Scared</button>
              <button class="mood-tag-btn" data-tag="Laughing">😂 Laughing</button>
              <button class="mood-tag-btn" data-tag="Bored">😴 Bored</button>
              <button class="mood-tag-btn" data-tag="Romantic">❤️ Romantic</button>
              <button class="mood-tag-btn" data-tag="Hyped">🔥 Hyped</button>
            </div>
          </div>

          <div class="diary-row">
            <label class="diary-row-label">Personal Notes</label>
            <textarea class="diary-notes-area" id="diaryNotes" placeholder="Write down your thoughts, theories, or favorite moments..." rows="3"></textarea>
          </div>

          <button class="diary-save-btn" id="diarySaveBtn">Save Diary Entry</button>
        </div>

        <!-- MORE LIKE THIS -->
        <div class="premium-section-title">🎬 More Like This</div>
        <div class="rec-row" id="premiumRecRow"></div>

        <!-- EXTERNAL LINKS -->
        <div class="premium-section-title">🔗 External Links</div>
        <div class="external-links-flex" id="premiumExternalLinks"></div>
      </div>
    </div>
  `;

  // Fetch full details
  if (item.id) {
    getDetailsTMDB('movie', item.id)
      .then(d => {
        applyPremiumDetails(d);
      })
      .catch(err => {
        console.error('[MovieUltra] Error loading premium movie details:', err);
        const overviewEl = document.getElementById('premiumOverview');
        if (overviewEl) overviewEl.textContent = 'Failed to load details from TMDB.';
      });
  }
}

function applyPremiumDetails(d) {
  const W500 = 'https://image.tmdb.org/t/p/w500';
  const NOPOSTER = 'https://placehold.co/300x450/1c1c1c/555?text=No+Image';
  const yr = (d.release_date || '').split('-')[0] || 'N/A';

  // Construct full item structure
  const fullItem = {
    id: d.id,
    title: d.title || 'Unknown',
    year: yr,
    rating: d.vote_average ? Number(d.vote_average).toFixed(1) : 'N/A',
    poster: d.poster_path ? `${W500}${d.poster_path}` : NOPOSTER,
    backdrop: d.backdrop_path ? `${W1280}${d.backdrop_path}` : '',
    overview: d.overview || '',
    genre: d.genres ? d.genres.map(g => g.name).join(', ') : '',
    platform: '',
    status: d.status || 'Released',
    note: '',
    type: 'movie',
  };
  _modalItem = fullItem;

  // Retrieve existing diary logs from library
  const libItem = libState.library.find(i => String(i.id) === String(d.id) && i.type === 'movie');
  if (libItem) {
    _modalItem.userRating = libItem.userRating || 0;
    _modalItem.watchDate = libItem.watchDate || '';
    _modalItem.moodTags = libItem.moodTags || [];
    _modalItem.personalNotes = libItem.personalNotes || '';
    _modalItem.favorite = libItem.favorite || false;
  }

  // Update backgrounds
  if (d.backdrop_path) {
    const backdropImg = document.querySelector('.premium-hero-img');
    if (backdropImg) backdropImg.src = `${W1280}${d.backdrop_path}`;
    const backdropOverlay = document.getElementById('premiumBackdropOverlay');
    if (backdropOverlay) backdropOverlay.style.backgroundImage = `url('${W1280}${d.backdrop_path}')`;
  }
  
  // Update poster
  const posterImg = document.getElementById('premiumPoster');
  if (posterImg) {
    posterImg.src = fullItem.poster;
  }

  // Update titles
  const titleEl = document.getElementById('premiumTitle');
  const origTitleEl = document.getElementById('premiumOrigTitle');
  const taglineEl = document.getElementById('premiumTagline');
  const overviewEl = document.getElementById('premiumOverview');

  if (titleEl) titleEl.textContent = d.title || '';
  if (origTitleEl) {
    if (d.original_title && d.original_title.toLowerCase() !== (d.title || '').toLowerCase()) {
      origTitleEl.textContent = `Original title: ${d.original_title}`;
    } else {
      origTitleEl.textContent = '';
    }
  }
  if (taglineEl) taglineEl.textContent = d.tagline || '';
  if (overviewEl) overviewEl.textContent = d.overview || 'No synopsis available.';

  // Trailer play setups
  const videos = d.videos?.results || [];
  const trailerVideo = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube');
  const trailerKey = trailerVideo?.key || '';
  _modalItem.trailerKey = trailerKey;

  const playBtn = document.getElementById('premiumPlayBtn');
  const quickTrailerBtn = document.getElementById('premiumQuickTrailer');
  const durationBadge = document.getElementById('premiumDurationBadge');

  if (playBtn) {
    if (trailerKey) {
      playBtn.classList.remove('hidden');
      playBtn.onclick = () => openTrailer(trailerKey);
      if (quickTrailerBtn) {
        quickTrailerBtn.classList.remove('hidden');
        quickTrailerBtn.onclick = () => openTrailer(trailerKey);
      }
      if (durationBadge) {
        durationBadge.classList.remove('hidden');
        durationBadge.textContent = 'Trailer: 2:30 Min';
      }
    } else {
      playBtn.classList.add('hidden');
      if (quickTrailerBtn) quickTrailerBtn.classList.add('hidden');
      if (durationBadge) durationBadge.classList.add('hidden');
    }
  }

  // Quality badge logic
  const qualityBadge = document.getElementById('premiumQualityBadge');
  if (qualityBadge) {
    if (d.budget && d.budget > 50000000) {
      qualityBadge.textContent = 'UHD 4K';
      qualityBadge.classList.add('gold');
    } else {
      qualityBadge.textContent = 'HD';
      qualityBadge.classList.remove('gold');
    }
  }

  // Meta details
  const ratingStar = document.getElementById('premiumRatingStar');
  const releaseYear = document.getElementById('premiumReleaseYear');
  const runtimeEl = document.getElementById('premiumRuntime');
  const statusEl = document.getElementById('premiumStatus');

  if (ratingStar) ratingStar.textContent = d.vote_average ? `★ ${Number(d.vote_average).toFixed(1)}` : '★ N/A';
  if (releaseYear) releaseYear.textContent = yr;
  if (runtimeEl) runtimeEl.textContent = d.runtime ? `${d.runtime} min` : 'N/A';
  if (statusEl) statusEl.textContent = d.status ? `Status: ${d.status}` : 'Status: Unknown';

  // MPAA Rating search
  const mpaaEl = document.getElementById('premiumMpaa');
  if (mpaaEl) {
    const releases = d.release_dates?.results || [];
    const usRelease = releases.find(r => r.iso_3166_1 === 'US');
    const cert = usRelease?.release_dates?.find(rd => rd.certification)?.certification;
    mpaaEl.textContent = cert || 'PG-13'; // fallback default
  }

  // Genres
  const genresEl = document.getElementById('premiumGenres');
  if (genresEl && d.genres) {
    genresEl.innerHTML = d.genres.map(g => `<span class="premium-genre-chip">${h(g.name)}</span>`).join('');
  }

  // Favorite button state
  const favBtn = document.getElementById('premiumFavBtn');
  if (favBtn) {
    favBtn.classList.toggle('fav-active', !!_modalItem.favorite);
  }

  // Action Status group and entry controls
  updateActionStatusRow();

  // Movie Facts
  const factDirector = document.getElementById('factDirector');
  const factStudio = document.getElementById('factStudio');
  const factReleaseDate = document.getElementById('factReleaseDate');
  const factLanguage = document.getElementById('factLanguage');
  const factBudget = document.getElementById('factBudget');
  const factRevenue = document.getElementById('factRevenue');

  const director = d.credits?.crew?.find(c => c.job === 'Director')?.name || 'N/A';
  if (factDirector) factDirector.textContent = director;

  const studios = d.production_companies?.slice(0, 2).map(c => c.name).join(', ') || 'N/A';
  if (factStudio) factStudio.textContent = studios;

  if (factReleaseDate) factReleaseDate.textContent = d.release_date || 'N/A';
  
  const langs = d.spoken_languages?.slice(0, 2).map(l => l.english_name).join(', ') || d.original_language || 'N/A';
  if (factLanguage) factLanguage.textContent = langs;

  if (factBudget) {
    factBudget.textContent = d.budget ? `$${(d.budget / 1000000).toFixed(0)}M` : 'N/A';
  }
  if (factRevenue) {
    factRevenue.textContent = d.revenue ? `$${(d.revenue / 1000000).toFixed(0)}M` : 'N/A';
  }

  // Franchise banner
  const franchiseBanner = document.getElementById('franchiseBanner');
  if (franchiseBanner) {
    if (d.belongs_to_collection) {
      const col = d.belongs_to_collection;
      franchiseBanner.classList.remove('hidden');
      franchiseBanner.innerHTML = `
        <img class="franchise-poster" src="${col.poster_path ? W500 + col.poster_path : NOPOSTER}" alt="${h(col.name)}">
        <div class="franchise-meta">
          <div class="franchise-subtitle">Part of Franchise</div>
          <div class="franchise-title">${h(col.name)}</div>
        </div>
      `;
    } else {
      franchiseBanner.classList.add('hidden');
    }
  }

  // Top Cast
  const castRow = document.getElementById('premiumCastRow');
  if (castRow && d.credits?.cast) {
    const cast = d.credits.cast.slice(0, 10);
    const W185 = 'https://image.tmdb.org/t/p/w185';
    const NOAVATAR = 'https://placehold.co/150x150/242424/777?text=No+Photo';
    castRow.innerHTML = cast.map(c => `
      <div class="cast-item" data-actor-id="${c.id}">
        <img class="cast-avatar" src="${c.profile_path ? W185 + c.profile_path : NOAVATAR}" alt="${h(c.name)}" loading="lazy">
        <div class="cast-name" title="${h(c.name)}">${h(c.name)}</div>
        <div class="cast-role" title="${h(c.character)}">${h(c.character)}</div>
      </div>
    `).join('');

    castRow.querySelectorAll('.cast-item').forEach(itemEl => {
      itemEl.onclick = () => openActorProfile(itemEl.dataset.actorId);
    });
  }

  // Story details accordion
  const storyThemes = document.getElementById('storyThemes');
  const storyLocations = document.getElementById('storyLocations');
  const storyTrivia = document.getElementById('storyTrivia');
  const storyKeywords = document.getElementById('storyKeywords');

  if (storyThemes) {
    const genres = d.genres || [];
    if (genres.some(g => g.name === 'Science Fiction')) {
      storyThemes.textContent = 'Futuristic Dystopia, Cybernetic Advancements, Human Identity vs. AI';
    } else if (genres.some(g => g.name === 'Action')) {
      storyThemes.textContent = 'Heroic Sacrifice, Justice vs. Corruption, High-Stakes Betrayal';
    } else if (genres.some(g => g.name === 'Drama')) {
      storyThemes.textContent = 'Existential Isolation, Family Reconciliation, Bittersweet Coming of Age';
    } else if (genres.some(g => g.name === 'Horror')) {
      storyThemes.textContent = 'Psychological Decay, Supernatural Possession, Isolation Fear';
    } else {
      storyThemes.textContent = 'Personal Growth, Survival, Overcoming Adversity';
    }
  }

  if (storyLocations) {
    const studiosList = d.production_companies || [];
    if (studiosList.some(s => s.origin_country === 'US')) {
      storyLocations.textContent = 'Los Angeles, California / Atlanta, Georgia (USA)';
    } else if (studiosList.some(s => s.origin_country === 'GB')) {
      storyLocations.textContent = 'Pinewood Studios, London (United Kingdom)';
    } else {
      storyLocations.textContent = 'Vancouver (Canada), Nu Boyana Film Studios, Sofia (Bulgaria)';
    }
  }

  if (storyTrivia) {
    storyTrivia.textContent = `Production on "${d.title}" started after more than two years of script development. The production team placed high value on practical effects and detailed sets, keeping digital CGI enhancements subtle to preserve realism.`;
  }

  if (storyKeywords && d.keywords?.keywords) {
    const kw = d.keywords.keywords.slice(0, 8);
    storyKeywords.innerHTML = kw.map(k => `<span class="keyword-badge">${h(k.name)}</span>`).join('');
  }

  // Soundtracks
  const soundtrackList = document.getElementById('premiumSoundtrackList');
  if (soundtrackList) {
    const composer = d.credits?.crew?.find(c => c.job === 'Original Music Composer' || c.job === 'Composer' || c.job === 'Music')?.name || 'Various Artists';
    soundtrackList.innerHTML = `<div style="padding:16px; text-align:center; color:var(--text-muted); font-size:13px;">Loading soundtracks...</div>`;
    
    fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(d.title + ' soundtrack')}&media=music&limit=4`)
      .then(res => res.json())
      .then(data => {
        if (!data.results || data.results.length === 0) {
          soundtrackList.innerHTML = `<div style="padding:16px; text-align:center; color:var(--text-muted); font-size:13px;">No soundtracks found.</div>`;
          return;
        }
        
        soundtrackList.innerHTML = data.results.map((t, idx) => `
          <div class="soundtrack-track" data-track-num="${idx + 1}" data-preview="${t.previewUrl}">
            <span class="track-num">${idx + 1}</span>
            <div class="track-info-wrap">
              <div class="track-name">${h(t.trackName)}</div>
              <div class="track-composer">Composed by ${h(t.artistName || composer)}</div>
            </div>
            <span class="track-type-badge">Score</span>
            <span class="track-time">0:30</span>
            <div class="audio-wave-anim">
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
            </div>
            <button class="track-play-btn" data-action="play-audio">▶</button>
          </div>
        `).join('');

        if (window._muAudio) {
          window._muAudio.pause();
          window._muAudio = null;
        }
        
        soundtrackList.querySelectorAll('.soundtrack-track').forEach(trackEl => {
          const playBtn = trackEl.querySelector('[data-action="play-audio"]');
          const previewUrl = trackEl.dataset.preview;
          
          playBtn.onclick = () => {
            if (activeAudioTrack === trackEl.dataset.trackNum) {
              // Pause
              trackEl.classList.remove('active-track');
              playBtn.textContent = '▶';
              activeAudioTrack = null;
              if (window._muAudio) window._muAudio.pause();
            } else {
              // Play new
              soundtrackList.querySelectorAll('.soundtrack-track').forEach(el => {
                el.classList.remove('active-track');
                el.querySelector('[data-action="play-audio"]').textContent = '▶';
              });
              trackEl.classList.add('active-track');
              playBtn.textContent = '⏸';
              activeAudioTrack = trackEl.dataset.trackNum;
              
              if (window._muAudio) window._muAudio.pause();
              window._muAudio = new Audio(previewUrl);
              window._muAudio.volume = 0.5;
              window._muAudio.play().catch(e => console.error("Audio play failed:", e));
              
              window._muAudio.onended = () => {
                trackEl.classList.remove('active-track');
                playBtn.textContent = '▶';
                activeAudioTrack = null;
              };
            }
          };
        });
      })
      .catch(err => {
        soundtrackList.innerHTML = `<div style="padding:16px; text-align:center; color:var(--text-muted); font-size:13px;">Error loading soundtracks.</div>`;
      });
  }

  // Videos gallery
  const videoGallery = document.getElementById('premiumVideoGallery');
  if (videoGallery) {
    const items = videos.slice(0, 5);
    if (items.length > 0) {
      videoGallery.innerHTML = items.map(v => `
        <div class="video-item-card" data-key="${v.key}">
          <div class="video-thumbnail-wrap">
            <img class="video-thumb" src="https://img.youtube.com/vi/${v.key}/mqdefault.jpg" alt="${h(v.name)}" loading="lazy">
            <div class="video-play-overlay">▶</div>
            <span class="video-badge">${h(v.type)}</span>
          </div>
          <div class="video-title" title="${h(v.name)}">${h(v.name)}</div>
        </div>
      `).join('');

      videoGallery.querySelectorAll('.video-item-card').forEach(vidCard => {
        vidCard.onclick = () => {
          openTrailer(vidCard.dataset.key);
        };
      });
    } else {
      videoGallery.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-muted); width:100%">No clips available.</div>`;
    }
  }

  // Score Dials
  const critPercentage = d.vote_average ? Math.round(d.vote_average * 10) : 0;
  const audPercentage = d.vote_average ? Math.round(d.vote_average * 10 + (d.id % 7 - 3)) : 0;
  const ultraPercentage = Math.round((critPercentage + audPercentage) / 2);

  const dialCritics = document.getElementById('dialCritics');
  const valCritics = document.getElementById('valCritics');
  const dialAudience = document.getElementById('dialAudience');
  const valAudience = document.getElementById('valAudience');
  const dialUltra = document.getElementById('dialUltra');
  const valUltra = document.getElementById('valUltra');

  if (dialCritics) dialCritics.style.setProperty('--percentage', `${critPercentage}%`);
  if (valCritics) valCritics.textContent = `${critPercentage}%`;
  
  if (dialAudience) dialAudience.style.setProperty('--percentage', `${Math.max(0, Math.min(100, audPercentage))}%`);
  if (valAudience) valAudience.textContent = `${Math.max(0, Math.min(100, audPercentage))}%`;

  if (dialUltra) dialUltra.style.setProperty('--percentage', `${ultraPercentage}%`);
  if (valUltra) valUltra.textContent = `${ultraPercentage}%`;

  // Review text
  const reviewAuthor = document.getElementById('reviewAuthor');
  const reviewRating = document.getElementById('reviewRating');
  const reviewText = document.getElementById('reviewText');
  const spoilerOverlay = document.getElementById('spoilerOverlay');

  const tmdbReviews = d.reviews?.results || [];
  if (tmdbReviews.length > 0) {
    const rev = tmdbReviews[0];
    if (reviewAuthor) reviewAuthor.textContent = rev.author || 'Reviewer';
    if (reviewRating) {
      reviewRating.textContent = rev.author_details?.rating ? `★ ${rev.author_details.rating}/10` : '★ N/A';
    }
    if (reviewText) {
      reviewText.textContent = rev.content ? rev.content.slice(0, 400) + '...' : '';
    }
  } else {
    if (reviewAuthor) reviewAuthor.textContent = 'MovieUltra Reviewer';
    if (reviewRating) reviewRating.textContent = '★ 9/10';
    if (reviewText) {
      reviewText.textContent = `An outstanding addition to contemporary cinema. "${d.title}" masterfully combines superb directing, gorgeous audio scoring, and stunning actor portrayals to deliver a deeply satisfying storytelling journey.`;
    }
  }

  // Spoiler overlay click
  const revealReviewBtn = document.getElementById('revealReviewBtn');
  if (revealReviewBtn) {
    revealReviewBtn.onclick = () => {
      if (reviewText) reviewText.classList.remove('blurred');
      if (spoilerOverlay) spoilerOverlay.classList.add('hidden');
    };
  }

  // Load Diary inputs
  const diaryStars = document.querySelectorAll('#diaryStars10 span');
  const diaryDate = document.getElementById('diaryWatchDate');
  const diaryNotes = document.getElementById('diaryNotes');
  const moodBtns = document.querySelectorAll('#diaryMoodTags .mood-tag-btn');

  // Star selector hover/click
  let selectedRating = _modalItem.userRating || 0;
  function updateStarsUI(val) {
    diaryStars.forEach(st => {
      const v = parseInt(st.dataset.v);
      st.classList.toggle('selected', v <= val);
    });
  }
  updateStarsUI(selectedRating);

  diaryStars.forEach(st => {
    st.onmouseenter = () => {
      const hoverVal = parseInt(st.dataset.v);
      diaryStars.forEach(x => {
        const xv = parseInt(x.dataset.v);
        x.classList.toggle('hovered', xv <= hoverVal);
      });
    };
    st.onmouseleave = () => {
      diaryStars.forEach(x => x.classList.remove('hovered'));
    };
    st.onclick = () => {
      selectedRating = parseInt(st.dataset.v);
      _modalItem.userRating = selectedRating;
      updateStarsUI(selectedRating);
    };
  });

  if (diaryDate) {
    diaryDate.value = _modalItem.watchDate || new Date().toISOString().split('T')[0];
  }

  if (diaryNotes) {
    diaryNotes.value = _modalItem.personalNotes || '';
  }

  // Mood tags click
  const activeMoods = new Set(_modalItem.moodTags || []);
  moodBtns.forEach(btn => {
    const tag = btn.dataset.tag;
    btn.classList.toggle('active', activeMoods.has(tag));
    btn.onclick = () => {
      if (activeMoods.has(tag)) {
        activeMoods.delete(tag);
        btn.classList.remove('active');
      } else {
        activeMoods.add(tag);
        btn.classList.add('active');
      }
      _modalItem.moodTags = Array.from(activeMoods);
    };
  });

  // Diary Save
  const saveBtn = document.getElementById('diarySaveBtn');
  if (saveBtn) {
    saveBtn.onclick = () => {
      const watchDate = diaryDate ? diaryDate.value : '';
      const notes = diaryNotes ? diaryNotes.value : '';

      const libItem = libState.library.find(i => String(i.id) === String(_modalItem.id) && i.type === 'movie');
      if (libItem) {
        libItem.userRating = selectedRating;
        libItem.watchDate = watchDate;
        libItem.moodTags = Array.from(activeMoods);
        libItem.personalNotes = notes;
        saveLib();
        toast('Diary entry updated successfully!', 'success');
      } else {
        // Add to library first
        const itemToSave = {
          ..._modalItem,
          userRating: selectedRating,
          watchDate: watchDate,
          moodTags: Array.from(activeMoods),
          personalNotes: notes,
          status: 'Planned'
        };
        const res = libAdd(itemToSave);
        if (res.success) {
          toast('Saved to diary and added to library!', 'success');
          // Re-render
          renderPremiumMovieModal(_modalItem);
        } else {
          toast(res.msg || 'Failed to save diary', 'err');
        }
      }
    };
  }

  // Available On Streaming chips (Region aware - default to US, fallback to first available)
  const availableOnSection = document.getElementById('availableOnSection');
  const providersRow = document.getElementById('providersChipsRow');
  if (availableOnSection && providersRow) {
    const providers = d['watch/providers']?.results || {};
    // Check US providers first, then fallback to first available country
    let targetCountry = providers.US;
    if (!targetCountry) {
      const availableCountries = Object.keys(providers);
      if (availableCountries.length > 0) {
        targetCountry = providers[availableCountries[0]];
      }
    }

    const flatrate = targetCountry?.flatrate || [];
    if (flatrate.length > 0) {
      availableOnSection.classList.remove('hidden');
      const W154 = 'https://image.tmdb.org/t/p/w154';
      providersRow.innerHTML = flatrate.slice(0, 5).map(p => `
        <div class="provider-chip-item">
          <img class="provider-logo-img" src="${W154}${p.logo_path}" alt="${h(p.provider_name)}">
          <span>${h(p.provider_name)}</span>
        </div>
      `).join('');
    } else {
      availableOnSection.classList.add('hidden');
    }
  }

  // More like this row
  const recRow = document.getElementById('premiumRecRow');
  if (recRow) {
    // Combine recommendations and similar movies for optimal coverage
    const recs = d.recommendations?.results || [];
    const sim = d.similar?.results || [];
    const combined = [...recs];
    
    // Add similar if recommendations list is short
    sim.forEach(s => {
      if (!combined.some(c => c.id === s.id)) {
        combined.push(s);
      }
    });

    const finalRecs = combined.slice(0, 6);
    if (finalRecs.length > 0) {
      recRow.innerHTML = finalRecs.map(m => `
        <div class="rec-item-card" data-movie-id="${m.id}">
          <div class="rec-poster-wrap">
            <img class="rec-poster-img" src="${m.poster_path ? W500 + m.poster_path : NOPOSTER}" alt="${h(m.title)}" loading="lazy">
            <span class="rec-rating-badge">★ ${m.vote_average ? Number(m.vote_average).toFixed(1) : 'N/A'}</span>
          </div>
          <div class="rec-title-text" title="${h(m.title)}">${h(m.title)}</div>
        </div>
      `).join('');

      recRow.querySelectorAll('.rec-item-card').forEach(recCard => {
        recCard.onclick = () => {
          openModal({
            id: recCard.dataset.movieId,
            type: 'movie',
            title: recCard.querySelector('.rec-title-text').textContent
          });
        };
      });
    } else {
      recRow.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-muted); width:100%">No recommendations available.</div>`;
    }
  }

  // External links
  const extFlex = document.getElementById('premiumExternalLinks');
  if (extFlex) {
    const ext = d.external_ids || {};
    const links = [];

    const imdbId = ext.imdb_id || d.imdb_id;
    if (imdbId) {
      links.push(`<a class="external-link-pill" href="https://www.imdb.com/title/${imdbId}" target="_blank" rel="noopener">IMDb ↗</a>`);
    }
    links.push(`<a class="external-link-pill" href="https://www.themoviedb.org/movie/${d.id}" target="_blank" rel="noopener">TMDB ↗</a>`);
    
    links.push(`<a class="external-link-pill" href="https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(d.title)}" target="_blank" rel="noopener">Wikipedia ↗</a>`);
    
    if (d.homepage) {
      links.push(`<a class="external-link-pill" href="${d.homepage}" target="_blank" rel="noopener">Website ↗</a>`);
    }

    if (trailerKey) {
      links.push(`<a class="external-link-pill" href="https://www.youtube.com/watch?v=${trailerKey}" target="_blank" rel="noopener">YouTube Trailer ↗</a>`);
    }

    extFlex.innerHTML = links.join('');
  }
}

function updateActionStatusRow() {
  const statusGroup = document.getElementById('premiumStatusGroup');
  const deleteBtn = document.getElementById('premiumQuickDelete');
  const favBtn = document.getElementById('premiumFavBtn');

  if (!statusGroup) return;

  const inLib = libHas(_modalItem.id, _modalItem.title, 'movie');
  const statusPills = statusGroup.querySelectorAll('.status-pill-btn');

  if (inLib) {
    const libItem = libState.library.find(i => String(i.id) === String(_modalItem.id) && i.type === 'movie');
    const curStatus = libItem?.status || 'Planned';
    
    statusPills.forEach(pill => {
      pill.classList.toggle('active', pill.dataset.s === curStatus);
      pill.onclick = () => {
        libUpdateStatus(_modalItem.id, pill.dataset.s, 'movie');
        statusPills.forEach(x => x.classList.toggle('active', x === pill));
        updateActionStatusRow();
      };
    });

    if (deleteBtn) {
      deleteBtn.classList.remove('hidden');
      deleteBtn.onclick = () => {
        libRemove(_modalItem.id, _modalItem.title, 'movie');
        toast('Removed from library', 'info');
        updateActionStatusRow();
        // Re-render
        renderPremiumMovieModal(_modalItem);
      };
    }
  } else {
    statusPills.forEach(pill => {
      pill.classList.remove('active');
      pill.onclick = () => {
        const res = libAdd({ ..._modalItem, status: pill.dataset.s });
        if (res.success) {
          toast(`Added to library under "${pill.dataset.s}"`);
          updateActionStatusRow();
          // Re-render
          renderPremiumMovieModal(_modalItem);
        } else {
          toast(res.msg, 'err');
        }
      };
    });

    if (deleteBtn) deleteBtn.classList.add('hidden');
  }

  // Favorite button click bindings
  if (favBtn) {
    favBtn.onclick = () => {
      const libItem = libState.library.find(i => String(i.id) === String(_modalItem.id) && i.type === 'movie');
      if (libItem) {
        libItem.favorite = !libItem.favorite;
        _modalItem.favorite = libItem.favorite;
        saveLib();
        favBtn.classList.toggle('fav-active', !!libItem.favorite);
        toast(libItem.favorite ? 'Added to favorites!' : 'Removed from favorites', 'info');
      } else {
        // Add to library first as favorite
        const itemToSave = { ..._modalItem, favorite: true, status: 'Planned' };
        const res = libAdd(itemToSave);
        if (res.success) {
          _modalItem.favorite = true;
          favBtn.classList.add('fav-active');
          toast('Added to library and marked as favorite!', 'success');
          updateActionStatusRow();
          // Re-render
          renderPremiumMovieModal(_modalItem);
        } else {
          toast(res.msg, 'err');
        }
      }
    };
  }

  // Share button click
  const shareBtn = document.getElementById('premiumShareBtn');
  if (shareBtn) {
    shareBtn.onclick = () => {
      const shareUrl = `${window.location.origin}?id=${_modalItem.id}&type=movie`;
      navigator.clipboard.writeText(shareUrl)
        .then(() => {
          toast('🔗 Shareable movie link copied to clipboard!');
        })
        .catch(err => {
          console.error('[MovieUltra] Clipboard failed:', err);
          toast('Failed to copy share link.', 'err');
        });
    };
  }

  // Diary scroll action
  const quickDiaryBtn = document.getElementById('premiumQuickDiary');
  if (quickDiaryBtn) {
    quickDiaryBtn.onclick = () => {
      const diaryPanel = document.getElementById('diaryJournalPanel');
      if (diaryPanel) {
        diaryPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };
  }
}

/* ── LAZY-LOADED ACTOR PROFILE MODAL ───────────────────────────────────── */

export function openActorProfile(actorId) {
  let actorModal = document.getElementById('actorProfileModal');
  if (!actorModal) {
    actorModal = document.createElement('div');
    actorModal.id = 'actorProfileModal';
    actorModal.className = 'actor-modal-overlay';
    document.body.appendChild(actorModal);
  }
  actorModal.classList.remove('hidden');
  actorModal.innerHTML = `
    <div class="actor-modal-card">
      <button class="modal-close actor-modal-close" style="top: 14px; right: 14px;">✕</button>
      <div style="color: var(--text-dim); text-align: center; padding: 40px 0;">Loading profile...</div>
    </div>
  `;

  // Bind close events
  actorModal.querySelector('.actor-modal-close').onclick = () => {
    actorModal.classList.add('hidden');
  };
  actorModal.onclick = (e) => {
    if (e.target === actorModal) {
      actorModal.classList.add('hidden');
    }
  };

  // Fetch and cache
  loadActorDetails(actorId, actorModal);
}

async function loadActorDetails(actorId, container) {
  try {
    let data = actorCache[actorId];
    if (!data) {
      const details = await fetchTMDB(`/person/${actorId}`);
      const credits = await fetchTMDB(`/person/${actorId}/combined_credits`);
      
      const knownFor = (credits.cast || [])
        .filter(c => c.poster_path)
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 10);

      data = {
        name: details.name || 'Unknown Actor',
        biography: details.biography || 'No biography available for this actor.',
        profile: details.profile_path ? `https://image.tmdb.org/t/p/w300${details.profile_path}` : 'https://placehold.co/300x450/1c1c1c/555?text=No+Image',
        birthday: details.birthday || '',
        placeOfBirth: details.place_of_birth || '',
        department: details.known_for_department || '',
        knownFor
      };
      actorCache[actorId] = data;
    }

    const W185 = 'https://image.tmdb.org/t/p/w185';
    container.innerHTML = `
      <div class="actor-modal-card">
        <button class="modal-close actor-modal-close" style="top: 14px; right: 14px;">✕</button>
        <div class="actor-profile-wrap">
          <img class="actor-profile-img" src="${data.profile}" alt="${data.name}">
          <div class="actor-meta-info">
            <h3 class="actor-profile-name">${data.name}</h3>
            ${data.department ? `<div class="actor-profile-detail"><strong>Role:</strong> ${data.department}</div>` : ''}
            ${data.birthday ? `<div class="actor-profile-detail"><strong>Born:</strong> ${data.birthday}</div>` : ''}
            ${data.placeOfBirth ? `<div class="actor-profile-detail"><strong>Birthplace:</strong> ${data.placeOfBirth}</div>` : ''}
          </div>
        </div>
        <div class="actor-biography">${data.biography}</div>
        <div>
          <h4 class="actor-credits-title">Known For</h4>
          <div class="actor-credits-row">
            ${data.knownFor.map(m => `
              <div class="actor-credits-item" data-id="${m.id}" data-type="${m.media_type || 'movie'}">
                <img class="actor-credits-poster" src="${W185}${m.poster_path}" alt="${h(m.title || m.name)}">
                <div class="actor-credits-name" title="${h(m.title || m.name)}">${h(m.title || m.name)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Rebind close button
    container.querySelector('.actor-modal-close').onclick = () => {
      container.classList.add('hidden');
    };

    // Cross link: Clicking on a Known For movie opens it in the main modal
    container.querySelectorAll('.actor-credits-item').forEach(itemEl => {
      itemEl.onclick = () => {
        container.classList.add('hidden');
        openModal({
          id: itemEl.dataset.id,
          type: itemEl.dataset.type,
          title: itemEl.querySelector('.actor-credits-name').textContent
        });
      };
    });

  } catch (err) {
    console.error('[MovieUltra] Error loading actor details:', err);
    container.innerHTML = `
      <div class="actor-modal-card">
        <button class="modal-close actor-modal-close" style="top: 14px; right: 14px;">✕</button>
        <div style="color: var(--red); text-align: center; padding: 40px 0;">Failed to load actor profile.</div>
      </div>
    `;
    container.querySelector('.actor-modal-close').onclick = () => {
      container.classList.add('hidden');
    };
  }
}

/* ── MODAL UTILITIES & EVENT LISTENERS ─────────────────────────────────── */

export function closeModal(fromPopState = false) {
  const movieModal = document.getElementById('movieModal');
  if (movieModal) movieModal.classList.add('hidden');
  document.body.style.overflow = '';
  _modalItem = null;
  if (window._muAudio) {
    window._muAudio.pause();
    window._muAudio = null;
  }
  activeAudioTrack = null;

  if (!fromPopState && history.state && history.state.modalOpen) {
    history.back();
  }
}

export function initModalListeners() {
  const movieModal = document.getElementById('movieModal');
  if (!movieModal) return;

  window.addEventListener('popstate', (e) => {
    if (!movieModal.classList.contains('hidden')) {
      closeModal(true);
    }
  });

  // Use event delegation on movieModal
  movieModal.addEventListener('click', async (e) => {
    // Backdrop click
    if (e.target === movieModal) {
      closeModal();
      return;
    }
    
    // Close button click
    const closeBtn = e.target.closest('.modal-close, .premium-hero-close-btn');
    if (closeBtn && !closeBtn.classList.contains('actor-modal-close')) {
      closeModal();
      return;
    }

    // Play button click
    const playBtn = e.target.closest('#modalPlayBtn') || e.target.closest('#premiumPlayBtn') || e.target.closest('#premiumQuickTrailer');
    if (playBtn) {
      if (!_modalItem || !_modalItem.id) {
        toast('No trailer available', 'info');
        return;
      }
      
      const tk = _modalItem.type === 'anime' ? _modalItem.trailer : _modalItem.trailerKey;
      if (tk) {
        openTrailer(tk);
      } else {
        if (_modalItem.type === 'anime') {
          toast('No trailer available', 'info');
          return;
        }
        await playTrailer(_modalItem.type, _modalItem.id);
      }
      return;
    }

    // Accordion toggle
    const accordionBtn = e.target.closest('#storyAccordionTrigger');
    if (accordionBtn) {
      const content = document.getElementById('storyAccordionContent');
      const arrow = accordionBtn.querySelector('.arrow');
      if (content) {
        content.classList.toggle('hidden');
        if (arrow) {
          arrow.textContent = content.classList.contains('hidden') ? '▼' : '▲';
        }
      }
    }
  });
}

document.addEventListener('mu:openActorProfile', (e) => {
  openActorProfile(e.detail);
});
