'use strict';


import { h } from '../utils/escape.js';
import { toast } from './toast.js';
import { card, itemFrom } from './card.js';
import {
  getDetailsTMDB, getCollectionTMDB, getPersonTMDB, getSeasonTMDB, getReviewsTMDB,
} from '../api/tmdb.js';
import { setUserRating as _setUserRating, getUserRating as _getUserRating, removeUserRating as _removeUserRating } from '../store/ratings.js';
import { getAnimeDetails } from '../api/jikan.js';
import { getOMDBById } from '../api/omdb.js';
import { getTVMazeSchedule } from '../api/tvmaze.js';
import { libHas, libRemove, libSetOrUpdate, state as libState } from '../store/library.js';
import { histHas, histAdd, histRemove } from '../store/history.js';
import { getAllLists, addToList, removeFromList, listHas } from '../store/customLists.js';
import { showListDialog } from '../views/watchlist.js';
import { openTrailer, playTrailer } from './trailer.js';

const W1280 = 'https://image.tmdb.org/t/p/w1280';
const W500 = 'https://image.tmdb.org/t/p/w500';
const W342 = 'https://image.tmdb.org/t/p/w342';
const W185 = 'https://image.tmdb.org/t/p/w185';
const W92 = 'https://image.tmdb.org/t/p/w92';
const NOPOSTER = 'https://placehold.co/300x450/1c1c1c/555?text=No+Image';
const NOBACK = 'https://placehold.co/1280x720/1c1c1c/555?text=No+Image';
const NOFACE = 'https://placehold.co/185x278/1c1c1c/555?text=No+Photo';

let _modalItem = null;
let _modalStack = []; // for "back" navigation when opening a card from inside the modal
let _lastFocused = null;
let _lightboxImages = [];
let _lightboxIndex = 0;

/* ── ENTRY POINT ─────────────────────────────────────── */
export async function openModal(item, opts = {}) {
  if (!item) return;
  const { pushStack = false } = opts;

  if (pushStack && _modalItem) {
    _modalStack.push(_modalItem);
  } else if (!pushStack) {
    _modalStack = [];
  }

  _modalItem = item;
  _lastFocused = _lastFocused || document.activeElement;

  const movieModal = document.getElementById('movieModal');
  if (!movieModal) return;

  document.getElementById('modalBack')?.classList.toggle('hidden', _modalStack.length === 0);
  movieModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  resetModalSkeleton(item);
  trapFocus();

  if (item.id) {
    if (item.type === 'anime') {
      try {
        const d = await getAnimeDetails(item.id);
        if (_modalItem?.id === item.id) applyAnimeDetails(d.data, item);
      } catch (err) {
        console.error('[MovieUltra] Error fetching anime details:', err);
        renderDynamicError();
      }
    } else {
      try {
        const d = await getDetailsTMDB(item.type, item.id);
        if (_modalItem?.id === item.id) await applyDetails(d, item.type);
      } catch (err) {
        console.error('[MovieUltra] Error fetching details:', err);
        renderDynamicError();
      }
    }
  }
}

function resetModalSkeleton(item) {
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalPoster = document.getElementById('modalPoster');
  const modalTitle = document.getElementById('modalTitle');
  const modalOriginalTitle = document.getElementById('modalOriginalTitle');
  const modalTagline = document.getElementById('modalTagline');
  const modalOverview = document.getElementById('modalOverview');
  const modalPills = document.getElementById('modalPills');
  const modalGenres = document.getElementById('modalGenres');
  const modalStatusRow = document.getElementById('modalStatusRow');
  const modalPlayBtn = document.getElementById('modalPlayBtn');
  const modalDynamic = document.getElementById('modalDynamic');

  if (modalBackdrop) { modalBackdrop.src = item.backdrop || item.poster || NOBACK; modalBackdrop.alt = `${item.title} backdrop`; }
  if (modalPoster) { modalPoster.src = item.poster || NOPOSTER; modalPoster.alt = `${item.title} poster`; }
  if (modalTitle) modalTitle.textContent = item.title;
  if (modalOriginalTitle) { modalOriginalTitle.textContent = ''; modalOriginalTitle.classList.add('hidden'); }
  if (modalTagline) modalTagline.textContent = '';
  if (modalOverview) modalOverview.textContent = item.overview || 'Loading synopsis…';
  if (modalPills) modalPills.innerHTML = '';
  if (modalGenres) modalGenres.innerHTML = '';
  if (modalPlayBtn) modalPlayBtn.classList.add('hidden');
  if (modalDynamic) modalDynamic.innerHTML = renderSkeleton();

  modalStatusRow?.classList.remove('hidden');
  const inLib = libHas(item.id, item.title, item.type);
  const inH = histHas(item.id, item.type);
  let curStatus = '';
  if (inLib) {
    const libItem = libState.library.find(i => String(i.id) === String(item.id) && (!item.type || i.type === item.type));
    curStatus = libItem?.status || item.status || 'Planned';
  } else if (inH) {
    curStatus = 'Completed';
  }
  setupStatusPills(item.id, curStatus);

  renderModalButtons(item, null);

  const modalCard = document.getElementById('modalCard');
  if (modalCard) modalCard.scrollTop = 0;
}

function renderSkeleton() {
  return `<div class="modal-skel">
    <div class="skel-line w60"></div>
    <div class="skel-line w90"></div>
    <div class="skel-line w80"></div>
    <div class="skel-row">
      <div class="skel-box"></div><div class="skel-box"></div><div class="skel-box"></div><div class="skel-box"></div>
    </div>
  </div>`;
}

function renderDynamicError() {
  const modalDynamic = document.getElementById('modalDynamic');
  if (modalDynamic) {
    modalDynamic.innerHTML = `<div class="modal-error">
      <p>⚠️ Unable to load full details for this title right now.</p>
      <button class="btn-ghost" id="modalRetryBtn">Try Again</button>
    </div>`;
    modalDynamic.querySelector('#modalRetryBtn')?.addEventListener('click', () => {
      if (_modalItem) openModal(_modalItem, { pushStack: false });
    });
  }
}

function setupStatusPills(id, curStatus) {
  const pills = document.querySelectorAll('#modalStatusPills .status-pill');
  pills.forEach(p => {
    p.classList.toggle('active', p.dataset.s === curStatus);
    p.onclick = () => {
      const targetStatus = p.dataset.s;
      if (curStatus === targetStatus) {
        if (_modalItem) {
          libRemove(_modalItem.id, _modalItem.title, _modalItem.type);
          histRemove(_modalItem.id, _modalItem.type);
        }
        pills.forEach(x => x.classList.remove('active'));
        toast(`Untracked "${_modalItem?.title || 'title'}"`, 'info');
        renderModalButtons(_modalItem, null);
        setupStatusPills(_modalItem?.id, '');
        return;
      }
      libSetOrUpdate(_modalItem, targetStatus);
      pills.forEach(x => x.classList.toggle('active', x === p));
      if (targetStatus === 'Completed') {
        toast(`✅ Marked "${_modalItem?.title || 'title'}" as Completed`, 'ok', {
          label: 'View Completed →',
          onClick: () => {
            closeModal();
            if (window.filterWatchlistStatus) window.filterWatchlistStatus('Completed');
          }
        });
      } else if (targetStatus === 'Watching') {
        toast(`👁️ "${_modalItem?.title || 'title'}" set to Currently Watching`, 'ok', {
          label: 'View Watching →',
          onClick: () => {
            closeModal();
            if (window.filterWatchlistStatus) window.filterWatchlistStatus('Watching');
          }
        });
      } else {
        toast(`📋 "${_modalItem?.title || 'title'}" set to Plan to Watch`, 'ok', {
          label: 'View Watchlist →',
          onClick: () => {
            closeModal();
            if (window.filterWatchlistStatus) window.filterWatchlistStatus('Planned');
          }
        });
      }
      renderModalButtons(_modalItem, null);
    };
  });
}

/* ── MOVIE / TV DETAILS ──────────────────────────────── */
async function applyDetails(d, type) {
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalPoster = document.getElementById('modalPoster');
  const modalPills = document.getElementById('modalPills');
  const modalTitle = document.getElementById('modalTitle');
  const modalOriginalTitle = document.getElementById('modalOriginalTitle');
  const modalTagline = document.getElementById('modalTagline');
  const modalOverview = document.getElementById('modalOverview');
  const modalGenres = document.getElementById('modalGenres');

  if (d.backdrop_path && modalBackdrop) {
    modalBackdrop.src = `${W1280}${d.backdrop_path}`;
    modalBackdrop.alt = `${d.title || d.name} backdrop`;
  }
  if (d.poster_path && modalPoster) {
    modalPoster.src = `${W500}${d.poster_path}`;
  }

  const name = d.title || d.name || '';
  const origName = d.original_title || d.original_name || '';
  const yr = (d.release_date || d.first_air_date || '').split('-')[0];

  const pills = [];
  if (d.vote_average) pills.push(`<span class="modal-pill gold">★ ${Number(d.vote_average).toFixed(1)}</span>`);
  if (yr) pills.push(`<span class="modal-pill">${h(yr)}</span>`);
  if (d.runtime) pills.push(`<span class="modal-pill">${formatRuntime(d.runtime)}</span>`);
  if (d.episode_run_time?.[0]) pills.push(`<span class="modal-pill">${formatRuntime(d.episode_run_time[0])}/ep</span>`);
  if (d.number_of_seasons) pills.push(`<span class="modal-pill">${h(String(d.number_of_seasons))} Season${d.number_of_seasons > 1 ? 's' : ''}</span>`);
  if (d.adult) pills.push(`<span class="modal-pill">18+</span>`);
  if (d.status) pills.push(`<span class="modal-pill green">${h(d.status)}</span>`);
  if (d.original_language) pills.push(`<span class="modal-pill">${h(d.original_language.toUpperCase())}</span>`);

  if (modalPills) modalPills.innerHTML = pills.join('');
  if (modalTitle) modalTitle.textContent = name;
  if (modalOriginalTitle) {
    if (origName && origName !== name) {
      modalOriginalTitle.textContent = `Original title: ${origName}`;
      modalOriginalTitle.classList.remove('hidden');
    } else {
      modalOriginalTitle.classList.add('hidden');
    }
  }
  if (modalTagline) modalTagline.textContent = d.tagline || '';
  if (modalOverview) modalOverview.textContent = d.overview || 'No synopsis available.';
  if (d.genres?.length && modalGenres) {
    modalGenres.innerHTML = d.genres.map(g => `<span class="genre-tag">${h(g.name)}</span>`).join('');
  }

  const fullItem = {
    id: d.id,
    title: name || 'Unknown',
    year: yr || 'N/A',
    rating: d.vote_average ? Number(d.vote_average).toFixed(1) : 'N/A',
    poster: d.poster_path ? `${W500}${d.poster_path}` : NOPOSTER,
    backdrop: d.backdrop_path ? `${W1280}${d.backdrop_path}` : '',
    overview: d.overview || '',
    genre: d.genres ? d.genres.map(g => g.name).join(', ') : '',
    platform: '',
    status: '',
    note: '',
    type,
  };
  _modalItem = fullItem;

  const tk = d.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube')?.key
    || d.videos?.results?.find(v => v.site === 'YouTube')?.key;
  const modalPlayBtn = document.getElementById('modalPlayBtn');
  if (modalPlayBtn) modalPlayBtn.classList.toggle('hidden', !tk);

  renderModalButtons(fullItem, d.videos);

  const inLibFull = libHas(fullItem.id, fullItem.title, fullItem.type);
  const inHFull = histHas(fullItem.id, fullItem.type);
  let curStatusFull = '';
  if (inLibFull) {
    const libItem = libState.library.find(i => String(i.id) === String(fullItem.id) && (!fullItem.type || i.type === fullItem.type));
    curStatusFull = libItem?.status || 'Planned';
  } else if (inHFull) {
    curStatusFull = 'Completed';
  }
  document.getElementById('modalStatusRow')?.classList.remove('hidden');
  setupStatusPills(fullItem.id, curStatusFull);

  await renderDynamicSections(d, type, fullItem);
}

/* ── DYNAMIC (RICH) SECTIONS ─────────────────────────── */
async function renderDynamicSections(d, type, item) {
  const container = document.getElementById('modalDynamic');
  if (!container) return;

  const sections = [];

  sections.push(buildMetaSection(d, type));

  const castHtml = buildCastSection(d.credits);
  if (castHtml) sections.push(castHtml);

  const crewHtml = buildCrewSection(d.credits);
  if (crewHtml) sections.push(crewHtml);

  const videosHtml = buildVideosSection(d.videos);
  if (videosHtml) sections.push(videosHtml);

  const photosHtml = buildPhotosSection(d.images);
  if (photosHtml) sections.push(photosHtml);

  // Ratings — fetch IMDb rating only if we have a real IMDb id
  const imdbId = d.external_ids?.imdb_id || d.imdb_id;
  sections.push(`<div id="ratingsSectionSlot">${buildRatingsSection(d, null)}</div>`);

  const providersHtml = buildProvidersSection(d['watch/providers']);
  if (providersHtml) sections.push(providersHtml);

  if (d.belongs_to_collection) {
    sections.push(`<div id="collectionSectionSlot">${renderSectionShell('Part of the Collection', '<div class="mini-loading">Loading collection…</div>')}</div>`);
  }

  if (type === 'tv' && d.seasons?.length) {
    sections.push(buildSeasonsSection(d));
    sections.push(`<div id="tvmazeScheduleSlot"></div>`);
  }

  const similarHtml = buildCarouselSection('More Like This', d.similar, type, 'similar');
  if (similarHtml) sections.push(similarHtml);

  const recHtml = buildCarouselSection('Recommended For You', d.recommendations, type, 'recommendations');
  if (recHtml) sections.push(recHtml);

  // User rating
  sections.push(`<div id="userRatingSlot">${buildUserRatingSection(item.id, type)}</div>`);

  // Reviews slot (loaded async)
  sections.push(`<div id="reviewsSectionSlot"><div class="mini-loading">Loading reviews…</div></div>`);

  container.innerHTML = sections.join('');
  wireDynamicInteractions(container, d, type, item);

  // Wire star rating
  wireStarRating(container);

  // Load reviews async
  loadReviewsSection(type, item.id);

  if (imdbId) {
    getOMDBById(imdbId).then(omdb => {
      const slot = document.getElementById('ratingsSectionSlot');
      if (slot) slot.innerHTML = buildRatingsSection(d, omdb);
    });
  }

  if (d.belongs_to_collection) {
    getCollectionTMDB(d.belongs_to_collection.id).then(coll => {
      const slot = document.getElementById('collectionSectionSlot');
      if (slot) slot.innerHTML = buildCollectionSection(coll, d.id);
      wireCollectionClicks(slot);
    }).catch(() => {
      const slot = document.getElementById('collectionSectionSlot');
      if (slot) slot.innerHTML = '';
    });
  }

  if (type === 'tv' && d.seasons?.length) {
    const firstSeason = d.seasons.find(s => s.season_number > 0) || d.seasons[0];
    loadSeasonEpisodes(d.id, firstSeason.season_number, item);

    // Fetch broadcast schedule and next episode from TVMaze (fails silently if unavailable)
    const showTitle = d.name || d.original_name || item.title || '';
    getTVMazeSchedule(showTitle, imdbId).then(show => {
      const slot = document.getElementById('tvmazeScheduleSlot');
      if (slot && show) {
        const scheduleHtml = buildTVMazeScheduleSection(show);
        if (scheduleHtml) slot.innerHTML = scheduleHtml;
      }
    }).catch(() => {
      // Fail silently without crashing or logging errors
    });
  }
}

function renderSectionShell(title, innerHtml, extraClass = '') {
  return `<div class="modal-section ${extraClass}">
    <h3 class="modal-section-title">${h(title)}</h3>
    ${innerHtml}
  </div>`;
}

function formatRuntime(mins) {
  const m = Number(mins);
  if (!m) return '';
  const hrs = Math.floor(m / 60), mm = m % 60;
  return hrs > 0 ? `${hrs}h ${mm}m` : `${mm}m`;
}

function formatMoney(n) {
  if (!n) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

/* ── OVERVIEW / META ─────────────────────────────────── */
function buildMetaSection(d, type) {
  const rows = [];
  if (d.release_date) rows.push(['Release Date', formatDate(d.release_date)]);
  if (d.first_air_date) rows.push(['First Air Date', formatDate(d.first_air_date)]);
  if (d.last_air_date) rows.push(['Last Air Date', formatDate(d.last_air_date)]);
  if (d.spoken_languages?.length) rows.push(['Language', d.spoken_languages.map(l => l.english_name || l.name).join(', ')]);
  if (d.production_countries?.length) rows.push(['Country', d.production_countries.map(c => c.name).join(', ')]);
  if (d.networks?.length) rows.push(['Network', d.networks.map(n => n.name).join(', ')]);
  if (type === 'movie' && d.budget) rows.push(['Budget', formatMoney(d.budget)]);
  if (type === 'movie' && d.revenue) rows.push(['Revenue', formatMoney(d.revenue)]);
  if (d.vote_count) rows.push(['Votes', Number(d.vote_count).toLocaleString()]);

  const companies = d.production_companies?.filter(c => c.logo_path).slice(0, 6) || [];
  const keywords = (d.keywords?.keywords || d.keywords?.results || []).slice(0, 10);

  if (!rows.length && !companies.length && !keywords.length) return '';

  const rowsHtml = rows.map(([k, v]) => `<div class="meta-row"><span class="meta-k">${h(k)}</span><span class="meta-v">${h(String(v))}</span></div>`).join('');
  const companiesHtml = companies.length ? `<div class="meta-companies">
      ${companies.map(c => `<img class="company-logo" src="${W92}${c.logo_path}" alt="${h(c.name)}" title="${h(c.name)}" loading="lazy">`).join('')}
    </div>` : '';
  const keywordsHtml = keywords.length ? `<div class="modal-genres keyword-tags">
      ${keywords.map(k => `<span class="genre-tag kw-tag">${h(k.name)}</span>`).join('')}
    </div>` : '';

  return renderSectionShell('Overview', `
    <div class="meta-grid">${rowsHtml}</div>
    ${companiesHtml}
    ${keywordsHtml}
  `);
}

function formatDate(s) {
  if (!s) return '';
  try {
    return new Date(s + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return s; }
}

/* ── CAST ─────────────────────────────────────────────── */
function buildCastSection(credits) {
  const cast = credits?.cast?.slice(0, 20) || [];
  if (!cast.length) return '';
  const visible = cast.slice(0, 12);
  const cards = visible.map(c => `
    <div class="cast-card" data-person-id="${h(String(c.id))}" role="button" tabindex="0" aria-label="${h(c.name)}">
      <img class="cast-photo" src="${c.profile_path ? W185 + c.profile_path : NOFACE}" alt="${h(c.name)}" loading="lazy" onerror="this.onerror=null;this.src='${NOFACE}'">
      <div class="cast-name">${h(c.name)}</div>
      <div class="cast-char">${h(c.character || '')}</div>
    </div>`).join('');
  const more = cast.length > 12 ? `<button class="btn-ghost btn-sm view-full-cast-btn">View Full Cast (${cast.length})</button>` : '';
  return renderSectionShell('Cast', `<div class="carousel cast-carousel" data-full-cast='${h(JSON.stringify(cast.map(c => ({ id: c.id, name: c.name, character: c.character, profile_path: c.profile_path }))))}'>${cards}</div>${more}`);
}

/* ── CREW ─────────────────────────────────────────────── */
const KEY_CREW_JOBS = ['Director', 'Writer', 'Screenplay', 'Producer', 'Executive Producer', 'Cinematography', 'Director of Photography', 'Original Music Composer', 'Editor'];
function buildCrewSection(credits) {
  const crew = credits?.crew || [];
  if (!crew.length) return '';
  const key = crew.filter(c => KEY_CREW_JOBS.includes(c.job));
  const seen = new Set();
  const dedup = key.filter(c => {
    const k = `${c.id}-${c.job}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 12);
  if (!dedup.length) return '';
  const cards = dedup.map(c => `
    <div class="crew-card">
      <img class="crew-photo" src="${c.profile_path ? W92 + c.profile_path : NOFACE}" alt="${h(c.name)}" loading="lazy" onerror="this.onerror=null;this.src='${NOFACE}'">
      <div class="crew-info">
        <div class="crew-name">${h(c.name)}</div>
        <div class="crew-job">${h(c.job)}</div>
      </div>
    </div>`).join('');
  return renderSectionShell('Crew', `<div class="crew-grid">${cards}</div>`);
}

/* ── VIDEOS / TRAILERS ───────────────────────────────── */
function buildVideosSection(videos) {
  const list = (videos?.results || []).filter(v => v.site === 'YouTube').slice(0, 10);
  if (!list.length) return '';
  const cards = list.map(v => `
    <div class="video-card" data-key="${h(v.key)}" role="button" tabindex="0" aria-label="Play ${h(v.name)}">
      <div class="video-thumb-wrap">
        <img class="video-thumb" src="https://img.youtube.com/vi/${h(v.key)}/mqdefault.jpg" alt="${h(v.name)}" loading="lazy">
        <div class="video-play-icon">▶</div>
        <span class="video-type-badge">${h(v.type || 'Video')}</span>
      </div>
      <div class="video-title" title="${h(v.name)}">${h(v.name)}</div>
    </div>`).join('');
  return renderSectionShell('Trailers & Videos', `<div class="carousel video-carousel">${cards}</div>`);
}

/* ── PHOTOS ───────────────────────────────────────────── */
function buildPhotosSection(images) {
  const backdrops = (images?.backdrops || []).slice(0, 12);
  const posters = (images?.posters || []).slice(0, 8);
  const all = [...backdrops.map(i => ({ ...i, kind: 'backdrop' })), ...posters.map(i => ({ ...i, kind: 'poster' }))];
  if (!all.length) return '';
  const cards = all.slice(0, 18).map((img, i) => `
    <div class="photo-thumb ${img.kind}" data-idx="${i}" role="button" tabindex="0" aria-label="View photo ${i + 1}">
      <img src="${W342}${img.file_path}" alt="Photo ${i + 1}" loading="lazy">
    </div>`).join('');
  const fullUrls = JSON.stringify(all.slice(0, 18).map(img => `${W1280}${img.file_path}`));
  return renderSectionShell('Photos & Media', `<div class="photo-grid" data-photos='${h(fullUrls)}'>${cards}</div>`);
}

/* ── RATINGS ──────────────────────────────────────────── */
function buildRatingsSection(d, omdb) {
  const items = [];
  if (d.vote_average) {
    items.push({ label: 'TMDB', value: Number(d.vote_average).toFixed(1), max: 10, sub: `${Number(d.vote_count || 0).toLocaleString()} votes` });
  }
  if (omdb?.imdbRating && omdb.imdbRating !== 'N/A') {
    items.push({ label: 'IMDb', value: omdb.imdbRating, max: 10, sub: omdb.imdbVotes && omdb.imdbVotes !== 'N/A' ? `${omdb.imdbVotes} votes` : '' });
  }
  const rt = omdb?.Ratings?.find(r => r.Source === 'Rotten Tomatoes');
  if (rt) items.push({ label: 'Rotten Tomatoes', value: rt.Value.replace('%', ''), max: 100, sub: 'Critics' });
  const mc = omdb?.Ratings?.find(r => r.Source === 'Metacritic');
  if (mc) items.push({ label: 'Metacritic', value: mc.Value.split('/')[0], max: 100, sub: 'Metascore' });

  if (!items.length) return '';

  const cards = items.map(it => {
    const pct = Math.max(0, Math.min(100, (parseFloat(it.value) / it.max) * 100));
    return `<div class="rating-circle-card">
      <div class="rating-circle" style="--pct:${pct}">
        <span class="rating-circle-val">${h(String(it.value))}</span>
      </div>
      <div class="rating-circle-label">${h(it.label)}</div>
      ${it.sub ? `<div class="rating-circle-sub">${h(it.sub)}</div>` : ''}
    </div>`;
  }).join('');

  return renderSectionShell('Ratings', `<div class="ratings-grid">${cards}</div>`);
}

/* ── TVMAZE BROADCAST & AIRING SCHEDULE ────────────────── */
function buildTVMazeScheduleSection(show) {
  if (!show) return '';
  const nextEp = show._embedded?.nextepisode;
  const schedule = show.schedule;
  const network = show.network?.name || show.webChannel?.name || '';
  const status = show.status || '';

  const metaItems = [];
  if (status) {
    const isRunning = status.toLowerCase() === 'running';
    metaItems.push(`<span class="badge-pill ${isRunning ? 'source-badge' : 'trailer-badge'}">${isRunning ? '🟢 Currently Airing' : '⏹ ' + h(status)}</span>`);
  }
  if (network) {
    metaItems.push(`<span class="tvmaze-network">📺 <strong>${h(network)}</strong></span>`);
  }
  if (schedule?.days?.length && schedule.time) {
    metaItems.push(`<span class="tvmaze-airtime">⏰ ${h(schedule.days.join(', '))} at ${h(schedule.time)}</span>`);
  } else if (schedule?.days?.length) {
    metaItems.push(`<span class="tvmaze-airtime">⏰ ${h(schedule.days.join(', '))}</span>`);
  }

  let nextEpCard = '';
  if (nextEp) {
    const epCode = `S${nextEp.season}:E${nextEp.number}`;
    const epName = nextEp.name ? ` "${h(nextEp.name)}"` : '';
    const airDate = nextEp.airdate ? ` on <strong>${h(nextEp.airdate)}</strong>` : '';
    const airTime = nextEp.airtime ? ` at <strong>${h(nextEp.airtime)}</strong>` : '';
    nextEpCard = `
      <div class="tvmaze-next-ep-box">
        <div class="tvmaze-next-ep-icon">🗓️</div>
        <div class="tvmaze-next-ep-text">
          <div class="tvmaze-next-ep-header">Next Episode: <span>${epCode}${epName}</span></div>
          <div class="tvmaze-next-ep-date">Scheduled to air${airDate}${airTime}</div>
        </div>
      </div>`;
  }

  if (!metaItems.length && !nextEpCard) return '';

  return renderSectionShell('Broadcast & Airing Schedule', `
    <div class="tvmaze-schedule-wrap">
      ${metaItems.length ? `<div class="tvmaze-meta-row">${metaItems.join('')}</div>` : ''}
      ${nextEpCard}
    </div>
  `, 'tvmaze-section');
}

/* ── WHERE TO WATCH ───────────────────────────────────── */
function buildProvidersSection(watchProviders) {
  const localeRegion = Intl.DateTimeFormat().resolvedOptions().locale?.split('-')[1];
  const region = watchProviders?.results?.[localeRegion] || watchProviders?.results?.US;
  if (!region) return '';

  const groups = [
    ['Stream', region.flatrate], ['Free', region.free],
    ['Rent', region.rent], ['Buy', region.buy],
  ].filter(([, list]) => list?.length);

  if (!groups.length) return '';

  const groupsHtml = groups.map(([label, list]) => `
    <div class="provider-group">
      <div class="provider-group-label">${h(label)}</div>
      <div class="provider-row">
        ${list.slice(0, 8).map(p => `<div class="provider-chip" title="${h(p.provider_name)}">
          <img src="${W92}${p.logo_path}" alt="${h(p.provider_name)}" loading="lazy">
        </div>`).join('')}
      </div>
    </div>`).join('');

  return renderSectionShell('Where to Watch', `<div class="providers-wrap">${groupsHtml}</div><p class="provider-note">Availability via JustWatch/TMDB — may vary by region.</p>`);
}

/* ── COLLECTION ───────────────────────────────────────── */
function buildCollectionSection(coll, currentId) {
  const parts = (coll.parts || []).slice().sort((a, b) => (a.release_date || '9999').localeCompare(b.release_date || '9999'));
  if (parts.length < 2) return '';
  const cards = parts.map(p => `
    <div class="collection-card ${String(p.id) === String(currentId) ? 'current' : ''}" data-id="${h(String(p.id))}" data-title="${h(p.title)}" role="button" tabindex="0" aria-label="${h(p.title)}">
      <img src="${p.poster_path ? W342 + p.poster_path : NOPOSTER}" alt="${h(p.title)}" loading="lazy" onerror="this.onerror=null;this.src='${NOPOSTER}'">
      <div class="collection-card-title">${h(p.title)}</div>
      <div class="collection-card-year">${h((p.release_date || '').split('-')[0] || '')}</div>
    </div>`).join('');
  return renderSectionShell('Part of the Collection', `<div class="carousel collection-carousel">${cards}</div>`);
}

function wireCollectionClicks(slot) {
  if (!slot) return;
  slot.querySelectorAll('.collection-card').forEach(elCard => {
    const open = () => {
      const id = elCard.dataset.id;
      if (String(id) === String(_modalItem?.id)) return;
      openModal({ id, type: 'movie', title: elCard.dataset.title || '' }, { pushStack: true });
    };
    elCard.addEventListener('click', open);
    elCard.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
}

/* ── TV SEASONS / EPISODES ───────────────────────────── */
function buildSeasonsSection(d) {
  const seasons = d.seasons.filter(s => s.episode_count > 0);
  if (!seasons.length) return '';
  const options = seasons.map(s => `<option value="${s.season_number}">${h(s.name || `Season ${s.season_number}`)} (${s.episode_count} eps)</option>`).join('');
  return `<div class="modal-section" id="seasonsSection">
    <div class="season-header">
      <h3 class="modal-section-title">Seasons</h3>
      <select class="season-select" id="seasonSelect" data-tv-id="${h(String(d.id))}" aria-label="Select season">${options}</select>
    </div>
    <div id="episodesList" class="episodes-list"><div class="mini-loading">Loading episodes…</div></div>
  </div>`;
}

async function loadSeasonEpisodes(tvId, seasonNumber, tvItem) {
  const container = document.getElementById('episodesList');
  if (!container) return;
  container.innerHTML = '<div class="mini-loading">Loading episodes…</div>';
  try {
    const season = await getSeasonTMDB(tvId, seasonNumber);
    const episodes = season.episodes || [];
    if (!episodes.length) {
      container.innerHTML = '<p class="empty-note">No episode data available for this season.</p>';
      return;
    }
    container.innerHTML = episodes.map(ep => {
      const epKey = `${tvId}-s${seasonNumber}e${ep.episode_number}`;
      const watched = histHas(epKey);
      return `<div class="episode-row" data-ep-key="${h(epKey)}" data-ep-num="${ep.episode_number}">
        <img class="episode-still" src="${ep.still_path ? W342 + ep.still_path : NOBACK}" alt="${h(ep.name)}" loading="lazy" onerror="this.onerror=null;this.src='${NOBACK}'">
        <div class="episode-info">
          <div class="episode-title-row">
            <span class="episode-num">E${ep.episode_number}</span>
            <span class="episode-name">${h(ep.name || `Episode ${ep.episode_number}`)}</span>
            ${ep.vote_average ? `<span class="episode-rating">★ ${Number(ep.vote_average).toFixed(1)}</span>` : ''}
          </div>
          <div class="episode-meta">${ep.air_date ? h(formatDate(ep.air_date)) : ''}${ep.runtime ? ' · ' + formatRuntime(ep.runtime) : ''}</div>
          <p class="episode-overview">${h((ep.overview || 'No overview available.').slice(0, 220))}</p>
        </div>
        <button class="episode-watch-btn ${watched ? 'watched' : ''}" data-ep-key="${h(epKey)}" aria-label="${watched ? 'Mark unwatched' : 'Mark watched'}">
          ${watched ? '✓ Watched' : '👁 Mark Watched'}
        </button>
      </div>`;
    }).join('');

    container.querySelectorAll('.episode-watch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.epKey;
        if (histHas(key)) {
          histRemove(key);
          btn.textContent = '👁 Mark Watched';
          btn.classList.remove('watched');
        } else {
          const epName = btn.closest('.episode-row')?.querySelector('.episode-name')?.textContent || '';
          histAdd({ id: key, title: `${tvItem?.title || 'Episode'} — ${epName}`, type: 'tv', poster: tvItem?.poster || '' });
          btn.textContent = '✓ Watched';
          btn.classList.add('watched');
          toast('Episode marked as watched');
        }
      });
    });
  } catch (err) {
    console.error('[MovieUltra] Season fetch failed:', err);
    container.innerHTML = '<p class="empty-note">Unable to load episodes right now.</p>';
  }
}

/* ── SIMILAR / RECOMMENDED CAROUSELS ─────────────────── */
function buildCarouselSection(title, resultsObj, type, key) {
  const results = (resultsObj?.results || []).filter(r => r.poster_path).slice(0, 16);
  if (!results.length) return '';
  const items = results.map(r => card({
    id: r.id,
    title: r.title || r.name || 'Unknown',
    year: (r.release_date || r.first_air_date || '').split('-')[0] || '',
    rating: r.vote_average ? Number(r.vote_average).toFixed(1) : '',
    poster: r.poster_path ? `${W500}${r.poster_path}` : NOPOSTER,
    backdrop: r.backdrop_path ? `${W1280}${r.backdrop_path}` : '',
    overview: r.overview || '',
    type: r.media_type === 'movie' ? 'movie' : (r.media_type === 'tv' ? 'tv' : type),
  })).join('');
  return renderSectionShell(title, `<div class="carousel similar-carousel" data-carousel-key="${key}">${items}</div>`);
}

/* ── ANIME DETAILS ────────────────────────────────────── */
function applyAnimeDetails(d, item) {
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
  if (modalPlayBtn) modalPlayBtn.classList.toggle('hidden', !ytId);

  const modalPills = document.getElementById('modalPills');
  const modalOriginalTitle = document.getElementById('modalOriginalTitle');
  const modalGenres = document.getElementById('modalGenres');
  const modalOverview = document.getElementById('modalOverview');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalPoster = document.getElementById('modalPoster');

  if (d.images?.jpg?.large_image_url && modalPoster) modalPoster.src = d.images.jpg.large_image_url;
  if (d.trailer?.images?.maximum_image_url && modalBackdrop) modalBackdrop.src = d.trailer.images.maximum_image_url;

  const pills = [];
  if (d.score) pills.push(`<span class="modal-pill gold">★ ${h(String(d.score))}</span>`);
  if (d.year || d.aired?.prop?.from?.year) pills.push(`<span class="modal-pill">${h(String(d.year || d.aired.prop.from.year))}</span>`);
  if (d.episodes) pills.push(`<span class="modal-pill">${h(String(d.episodes))} Episodes</span>`);
  if (d.duration) pills.push(`<span class="modal-pill">${h(d.duration)}</span>`);
  if (d.status) pills.push(`<span class="modal-pill green">${h(d.status)}</span>`);
  if (d.rating) pills.push(`<span class="modal-pill">${h(d.rating)}</span>`);
  if (modalPills) modalPills.innerHTML = pills.join('');

  if (d.title_japanese && modalOriginalTitle) {
    modalOriginalTitle.textContent = `Original: ${d.title_japanese}`;
    modalOriginalTitle.classList.remove('hidden');
  }
  if (d.genres?.length && modalGenres) {
    modalGenres.innerHTML = d.genres.map(g => `<span class="genre-tag">${h(g.name)}</span>`).join('');
  }
  if (modalOverview) modalOverview.textContent = d.synopsis || item.overview || 'No synopsis available.';

  if (_modalItem) {
    _modalItem.trailer = ytId;
    _modalItem.backdrop = d.trailer?.images?.maximum_image_url || _modalItem.backdrop;
    renderModalButtons(_modalItem, null);
  }

  const container = document.getElementById('modalDynamic');
  if (!container) return;
  const sections = [];

  const rows = [];
  if (d.studios?.length) rows.push(['Studio', d.studios.map(s => s.name).join(', ')]);
  if (d.source) rows.push(['Source', d.source]);
  if (d.aired?.string) rows.push(['Aired', d.aired.string]);
  if (d.broadcast?.string) rows.push(['Broadcast', d.broadcast.string]);
  if (d.demographics?.length) rows.push(['Demographic', d.demographics.map(x => x.name).join(', ')]);
  if (d.score) rows.push(['Scored By', `${d.scored_by ? Number(d.scored_by).toLocaleString() : '—'} users`]);
  if (d.popularity) rows.push(['Popularity', `#${d.popularity}`]);
  if (rows.length) {
    sections.push(renderSectionShell('Overview', `<div class="meta-grid">${rows.map(([k, v]) => `<div class="meta-row"><span class="meta-k">${h(k)}</span><span class="meta-v">${h(String(v))}</span></div>`).join('')}</div>`));
  }

  if (ytId) {
    sections.push(renderSectionShell('Trailers & Videos', `<div class="carousel video-carousel">
      <div class="video-card" data-key="${h(ytId)}" role="button" tabindex="0" aria-label="Play trailer">
        <div class="video-thumb-wrap">
          <img class="video-thumb" src="https://img.youtube.com/vi/${h(ytId)}/mqdefault.jpg" alt="Trailer" loading="lazy">
          <div class="video-play-icon">▶</div>
          <span class="video-type-badge">Trailer</span>
        </div>
        <div class="video-title">Official Trailer</div>
      </div>
    </div>`));
  }

  const rel = (d.relations || []).filter(r => ['Sequel', 'Prequel', 'Side Story', 'Alternative Version', 'Parent Story'].includes(r.relation) && r.entry?.length);
  if (rel.length) {
    const relRows = rel.map(r => `<div class="meta-row"><span class="meta-k">${h(r.relation)}</span><span class="meta-v">${r.entry.map(e => h(e.name)).join(', ')}</span></div>`).join('');
    sections.push(renderSectionShell('Related Anime', `<div class="meta-grid">${relRows}</div><p class="provider-note">Titles are linked by MyAnimeList — search MovieUltra to open them individually.</p>`));
  }

  // Anime user rating
  sections.push(`<div id="userRatingSlot">${buildUserRatingSection(_modalItem?.id || item.id, 'anime')}</div>`);

  container.innerHTML = sections.join('');
  wireDynamicInteractions(container, d, 'anime', _modalItem);
  wireStarRating(container);
}

/* ── INTERACTION WIRING (delegated, scoped to modalDynamic) ── */
function wireDynamicInteractions(container, d, type, item) {
  // Cast -> person modal
  container.querySelectorAll('.cast-card').forEach(elCard => {
    const open = () => openPersonModal(elCard.dataset.personId);
    elCard.addEventListener('click', open);
    elCard.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });

  container.querySelector('.view-full-cast-btn')?.addEventListener('click', e => {
    const wrap = e.target.closest('.modal-section').querySelector('.cast-carousel');
    const full = JSON.parse(wrap.dataset.fullCast || '[]');
    wrap.innerHTML = full.map(c => `
      <div class="cast-card" data-person-id="${h(String(c.id))}" role="button" tabindex="0" aria-label="${h(c.name)}">
        <img class="cast-photo" src="${c.profile_path ? W185 + c.profile_path : NOFACE}" alt="${h(c.name)}" loading="lazy" onerror="this.onerror=null;this.src='${NOFACE}'">
        <div class="cast-name">${h(c.name)}</div>
        <div class="cast-char">${h(c.character || '')}</div>
      </div>`).join('');
    wireDynamicInteractions(container, d, type, item);
    e.target.remove();
  });

  // Videos -> trailer modal
  container.querySelectorAll('.video-card').forEach(v => {
    const open = () => openTrailer(v.dataset.key);
    v.addEventListener('click', open);
    v.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });

  // Photos -> lightbox
  const photoGrid = container.querySelector('.photo-grid');
  if (photoGrid) {
    const urls = JSON.parse(photoGrid.dataset.photos || '[]');
    photoGrid.querySelectorAll('.photo-thumb').forEach(thumb => {
      const open = () => openLightbox(urls, Number(thumb.dataset.idx));
      thumb.addEventListener('click', open);
      thumb.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
  }

  // Season change
  const seasonSelect = container.querySelector('#seasonSelect');
  seasonSelect?.addEventListener('change', () => {
    loadSeasonEpisodes(seasonSelect.dataset.tvId, seasonSelect.value, item);
  });

  // Similar / recommended cards -> open recursively (collection cards are wired separately after fetch)
  container.querySelectorAll('.similar-carousel .movie-card').forEach(elCard => {
    elCard.addEventListener('click', e => {
      if (e.target.closest('[data-ca]')) return;
      openModal(itemFrom(elCard), { pushStack: true });
    });
  });
}

/* ── PERSON (ACTOR) MODAL ─────────────────────────────── */
export async function openPersonModal(personId) {
  const modal = document.getElementById('personModal');
  const content = document.getElementById('personContent');
  if (!modal || !content) return;

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  content.innerHTML = '<div class="mini-loading">Loading profile…</div>';

  try {
    const p = await getPersonTMDB(personId);
    const credits = (p.combined_credits?.cast || [])
      .filter(c => c.poster_path)
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 18);

    content.innerHTML = `
      <div class="person-header">
        <img class="person-photo" src="${p.profile_path ? W342 + p.profile_path : NOFACE}" alt="${h(p.name)}" onerror="this.onerror=null;this.src='${NOFACE}'">
        <div>
          <h2 class="person-name" id="personName">${h(p.name)}</h2>
          <div class="modal-pills">
            ${p.known_for_department ? `<span class="modal-pill">${h(p.known_for_department)}</span>` : ''}
            ${p.birthday ? `<span class="modal-pill">🎂 ${h(formatDate(p.birthday))}</span>` : ''}
            ${p.place_of_birth ? `<span class="modal-pill">📍 ${h(p.place_of_birth)}</span>` : ''}
            ${p.popularity ? `<span class="modal-pill gold">🔥 ${Number(p.popularity).toFixed(0)}</span>` : ''}
          </div>
        </div>
      </div>
      ${p.biography ? `<p class="modal-overview person-bio">${h(p.biography.slice(0, 900))}${p.biography.length > 900 ? '…' : ''}</p>` : '<p class="empty-note">No biography available.</p>'}
      ${credits.length ? `<h3 class="modal-section-title">Filmography</h3><div class="carousel similar-carousel">
        ${credits.map(c => card({
          id: c.id,
          title: c.title || c.name || 'Unknown',
          year: (c.release_date || c.first_air_date || '').split('-')[0] || '',
          rating: c.vote_average ? Number(c.vote_average).toFixed(1) : '',
          poster: c.poster_path ? `${W500}${c.poster_path}` : NOPOSTER,
          backdrop: c.backdrop_path ? `${W1280}${c.backdrop_path}` : '',
          overview: c.overview || '',
          type: c.media_type === 'tv' ? 'tv' : 'movie',
        })).join('')}
      </div>` : ''}
    `;

    content.querySelectorAll('.movie-card').forEach(elCard => {
      elCard.addEventListener('click', () => {
        closePersonModal();
        openModal(itemFrom(elCard), { pushStack: false });
      });
    });
  } catch (err) {
    console.error('[MovieUltra] Person fetch failed:', err);
    content.innerHTML = '<p class="empty-note">Unable to load this profile right now.</p>';
  }
}

function closePersonModal() {
  document.getElementById('personModal')?.classList.add('hidden');
  document.body.style.overflow = document.getElementById('movieModal')?.classList.contains('hidden') ? '' : 'hidden';
}

/* ── LIGHTBOX ─────────────────────────────────────────── */
function openLightbox(urls, idx) {
  _lightboxImages = urls;
  _lightboxIndex = idx;
  renderLightbox();
  document.getElementById('lightbox')?.classList.remove('hidden');
}

function renderLightbox() {
  const img = document.getElementById('lightboxImg');
  const count = document.getElementById('lightboxCount');
  if (img) img.src = _lightboxImages[_lightboxIndex];
  if (count) count.textContent = `${_lightboxIndex + 1} / ${_lightboxImages.length}`;
}

function lightboxNav(dir) {
  if (!_lightboxImages.length) return;
  _lightboxIndex = (_lightboxIndex + dir + _lightboxImages.length) % _lightboxImages.length;
  renderLightbox();
}

function closeLightbox() {
  document.getElementById('lightbox')?.classList.add('hidden');
}

/* ── ACTION BUTTONS (Watchlist / Watched / Trailer / Share) ── */
function renderModalButtons(item, videos) {
  const foot = document.getElementById('modalFoot');
  if (!foot) return;

  const inLib = libHas(item.id, item.title, item.type);
  const inH = histHas(item.id, item.type);
  const libItem = libState.library.find(i => String(i.id) === String(item.id) && (!item.type || i.type === item.type));
  const currentStatus = libItem?.status || (inH ? 'Completed' : '');
  const tk = item.type === 'anime' ? item.trailer : videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube')?.key;
  const btns = [];

  // Watch / Play button
  btns.push(`<button class="btn-primary mf-openwatch">▶ Watch</button>`);

  // Add to Library / In Library Toggle Button
  if (inLib || inH) {
    btns.push(`<button class="btn-ghost mf-remove" title="Click to remove from library">✓ In Library (✕)</button>`);
  } else {
    btns.push(`<button class="btn-ghost mf-add">＋ Add to Watchlist</button>`);
  }

  if (tk) {
    btns.push(`<button class="btn-ghost mf-trailer">🎬 Trailer</button>`);
  } else if (item.id && item.type !== 'anime') {
    btns.push(`<button class="btn-ghost mf-findtrailer">🎬 Find Trailer</button>`);
  }
  
  if (inH || currentStatus === 'Completed') {
    btns.push(`<button class="btn-ghost mf-view-completed" title="View Completed List in Watchlist">⭐ Completed List ↗</button>`);
  }
  
  // Custom lists dropdown
  const customLists = getAllLists();
  btns.push(`
    <div class="mf-dropdown">
      <button class="btn-ghost mf-lists-btn" type="button" aria-haspopup="true">📁 Add to List ▾</button>
      <div class="mf-dropdown-menu">
        ${customLists.length > 0 ? customLists.map(l => {
          const inList = listHas(l.id, item.id, item.type);
          return `<button type="button" class="mf-list-option" data-list-id="${l.id}" data-in-list="${inList}">
            ${inList ? '✅' : '📁'} ${h(l.name)}
          </button>`;
        }).join('') : '<div class="mf-dropdown-empty">No custom folders yet</div>'}
        <div class="mf-dropdown-divider"></div>
        <button type="button" class="mf-list-option mf-create-list-opt">＋ Create New List</button>
      </div>
    </div>
  `);

  btns.push(`<button class="btn-ghost mf-share" aria-label="Share">↗ Share</button>`);

  foot.innerHTML = btns.join('');

  const dd = foot.querySelector('.mf-dropdown');
  foot.querySelector('.mf-lists-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    dd?.classList.toggle('open');
  });

  foot.querySelector('.mf-openwatch')?.addEventListener('click', () => {
    closeModal();
    import('../views/watch.js').then(({ openWatchView }) => openWatchView(item.type, item.id));
  });
  foot.querySelector('.mf-trailer')?.addEventListener('click', () => openTrailer(tk));
  foot.querySelector('.mf-findtrailer')?.addEventListener('click', async () => await playTrailer(item.type, item.id));

  foot.querySelector('.mf-add')?.addEventListener('click', () => {
    libSetOrUpdate(item, 'Planned');
    toast(`✅ Added "${item.title}" to Watchlist`, 'ok', {
      label: 'View Watchlist →',
      onClick: () => {
        closeModal();
        if (window.filterWatchlistStatus) window.filterWatchlistStatus('Planned');
      }
    });
    renderModalButtons(item, videos);
    setupStatusPills(item.id, 'Planned');
  });

  foot.querySelector('.mf-remove')?.addEventListener('click', () => {
    libRemove(item.id, item.title, item.type);
    histRemove(item.id, item.type);
    toast('Removed from library', 'info');
    renderModalButtons(item, videos);
    setupStatusPills(item.id, '');
  });

  foot.querySelector('.mf-view-completed')?.addEventListener('click', () => {
    closeModal();
    if (window.filterWatchlistStatus) window.filterWatchlistStatus('Completed');
  });

  foot.querySelectorAll('.mf-list-option[data-list-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const lid = btn.dataset.listId;
      const inList = btn.dataset.inList === 'true';
      const targetList = customLists.find(l => l.id === lid);
      const listName = targetList?.name || 'list';
      if (inList) {
        removeFromList(lid, item.id, item.type);
        toast(`Removed from "${listName}"`, 'info');
      } else {
        addToList(lid, item);
        toast(`✅ Added to "${listName}"`);
      }
      renderModalButtons(item, videos);
    });
  });

  foot.querySelector('.mf-create-list-opt')?.addEventListener('click', (e) => {
    e.stopPropagation();
    dd?.classList.remove('open');
    showListDialog({
      mode: 'create',
      onSuccess: (nl) => {
        if (!nl) return;
        addToList(nl.id, item);
        toast(`✅ Created "${nl.name}" & added "${item.title}"`);
        renderModalButtons(item, videos);
      }
    });
  });

  foot.querySelector('.mf-share')?.addEventListener('click', () => shareItem(item));
}

async function shareItem(item) {
  const url = `${window.location.origin}${window.location.pathname}#${item.type}-${item.id}`;
  const shareData = { title: `${item.title} — MovieUltra`, text: `Check out ${item.title} on MovieUltra`, url };
  try {
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }
  } catch { /* user cancelled or unsupported — fall through to clipboard */ }
  try {
    await navigator.clipboard.writeText(url);
    toast('Link copied');
  } catch {
    toast('Unable to copy link', 'err');
  }
}

/* ── CLOSE / BACK / FOCUS TRAP ────────────────────────── */
export function closeModal() {
  const movieModal = document.getElementById('movieModal');
  if (movieModal) movieModal.classList.add('hidden');
  document.body.style.overflow = '';
  _modalItem = null;
  _modalStack = [];
  document.getElementById('modalBack')?.classList.add('hidden');
  if (_lastFocused && typeof _lastFocused.focus === 'function') _lastFocused.focus();
  _lastFocused = null;
}

function goBack() {
  const prev = _modalStack.pop();
  if (prev) {
    openModal(prev, { pushStack: false });
    document.getElementById('modalBack')?.classList.toggle('hidden', _modalStack.length === 0);
  }
}

function trapFocus() {
  document.getElementById('modalClose')?.focus();
}

export function initModalListeners() {
  document.getElementById('modalClose')?.addEventListener('click', closeModal);
  document.getElementById('modalBack')?.addEventListener('click', goBack);
  document.getElementById('movieModal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('movieModal')) closeModal();
  });
  document.getElementById('modalPlayBtn')?.addEventListener('click', async () => {
    if (!_modalItem || !_modalItem.id) {
      toast('No trailer available', 'info');
      return;
    }
    if (_modalItem.type === 'anime') {
      if (_modalItem.trailer) openTrailer(_modalItem.trailer);
      else toast('No trailer available', 'info');
      return;
    }
    await playTrailer(_modalItem.type, _modalItem.id);
  });

  // Person modal
  document.getElementById('personClose')?.addEventListener('click', closePersonModal);
  document.getElementById('personModal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('personModal')) closePersonModal();
  });

  // Lightbox
  document.getElementById('lightboxClose')?.addEventListener('click', closeLightbox);
  document.getElementById('lightboxPrev')?.addEventListener('click', () => lightboxNav(-1));
  document.getElementById('lightboxNext')?.addEventListener('click', () => lightboxNav(1));
  document.getElementById('lightbox')?.addEventListener('click', e => {
    if (e.target === document.getElementById('lightbox')) closeLightbox();
  });

  // Global keyboard: ESC closes topmost open overlay, arrows navigate lightbox, focus trap Tab cycling
  document.addEventListener('keydown', e => {
    const lightbox = document.getElementById('lightbox');
    const personModal = document.getElementById('personModal');
    const movieModal = document.getElementById('movieModal');

    if (e.key === 'Escape') {
      if (lightbox && !lightbox.classList.contains('hidden')) { closeLightbox(); return; }
      if (personModal && !personModal.classList.contains('hidden')) { closePersonModal(); return; }
      if (movieModal && !movieModal.classList.contains('hidden')) { closeModal(); return; }
    }
    if (lightbox && !lightbox.classList.contains('hidden')) {
      if (e.key === 'ArrowLeft') lightboxNav(-1);
      if (e.key === 'ArrowRight') lightboxNav(1);
    }
    if (e.key === 'Tab' && movieModal && !movieModal.classList.contains('hidden')) {
      const modalCard = document.getElementById('modalCard');
      const focusables = modalCard?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusables || !focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
}

/* ── USER RATINGS ─────────────────────────────────────── */

/**
 * Build the star rating widget HTML.
 */
function buildUserRatingSection(id, type) {
  const existing = _getUserRating(id, type);
  const currentRating = existing?.rating || 0;

  return `<div class="user-rating-section" id="userRatingSection">
    <h3 class="modal-section-title">Your Rating</h3>
    <div class="star-rating-wrap">
      <div class="star-row" id="starRow" data-id="${h(String(id))}" data-type="${h(type)}" role="group" aria-label="Rate this title">
        ${[1,2,3,4,5,6,7,8,9,10].map(n => `
          <button class="star-btn ${n <= Math.round(currentRating) ? 'active' : ''}"
            data-val="${n}" aria-label="Rate ${n}/10" title="${n}/10">★</button>`).join('')}
      </div>
      <div class="star-display">
        ${currentRating ? `<span class="star-current">Your rating: <strong>${currentRating}/10</strong></span>
          <button class="btn-ghost btn-xs star-clear" id="starClearBtn" aria-label="Remove rating">✕ Remove</button>` 
          : '<span class="star-hint">Click to rate</span>'}
      </div>
    </div>
  </div>`;
}

function wireStarRating(container) {
  const starRow = container.querySelector('#starRow');
  if (!starRow) return;
  const id = starRow.dataset.id;
  const type = starRow.dataset.type;
  const stars = starRow.querySelectorAll('.star-btn');

  stars.forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      const val = Number(btn.dataset.val);
      stars.forEach((s, i) => s.classList.toggle('hover', i < val));
    });
    btn.addEventListener('mouseleave', () => {
      stars.forEach(s => s.classList.remove('hover'));
    });
    btn.addEventListener('click', () => {
      const val = Number(btn.dataset.val);
      _setUserRating(id, type, val);
      stars.forEach((s, i) => s.classList.toggle('active', i < val));
      const display = container.querySelector('.star-display');
      if (display) {
        display.innerHTML = `<span class="star-current">Your rating: <strong>${val}/10</strong></span>
          <button class="btn-ghost btn-xs star-clear" id="starClearBtn">✕ Remove</button>`;
        display.querySelector('#starClearBtn')?.addEventListener('click', () => {
          _removeUserRating(id, type);
          stars.forEach(s => s.classList.remove('active'));
          display.innerHTML = '<span class="star-hint">Click to rate</span>';
        });
      }
      toast(`Rated ${val}/10 ★`);
    });
  });

  container.querySelector('#starClearBtn')?.addEventListener('click', () => {
    _removeUserRating(id, type);
    stars.forEach(s => s.classList.remove('active'));
    const display = container.querySelector('.star-display');
    if (display) display.innerHTML = '<span class="star-hint">Click to rate</span>';
  });
}

/* ── REVIEWS ─────────────────────────────────────────── */
async function loadReviewsSection(type, id) {
  if (type === 'anime') return; // Jikan doesn't expose reviews easily
  const slot = document.getElementById('reviewsSectionSlot');
  if (!slot) return;
  try {
    const data = await getReviewsTMDB(type, id);
    const reviews = (data.results || []).slice(0, 5);
    if (!reviews.length) {
      slot.innerHTML = '';
      return;
    }
    slot.innerHTML = renderSectionShell('Reviews', `
      <div class="reviews-list">
        ${reviews.map(r => buildReviewCard(r)).join('')}
      </div>`);
    // Wire expand/collapse
    slot.querySelectorAll('.review-expand-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.review-card');
        const full = card?.querySelector('.review-full');
        const preview = card?.querySelector('.review-preview');
        if (!full || !preview) return;
        const expanded = full.style.display !== 'none';
        full.style.display = expanded ? 'none' : 'block';
        preview.style.display = expanded ? 'block' : 'none';
        btn.textContent = expanded ? 'Read more' : 'Show less';
      });
    });
  } catch (err) {
    const slot2 = document.getElementById('reviewsSectionSlot');
    if (slot2) slot2.innerHTML = '';
  }
}

function buildReviewCard(r) {
  const author = h(r.author || 'Anonymous');
  const rating = r.author_details?.rating;
  const content = r.content || '';
  const preview = content.slice(0, 300);
  const hasMore = content.length > 300;
  const date = r.created_at ? new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';
  const avatar = r.author_details?.avatar_path
    ? (r.author_details.avatar_path.startsWith('/https') ? r.author_details.avatar_path.slice(1) : `https://image.tmdb.org/t/p/w92${r.author_details.avatar_path}`)
    : null;

  return `<div class="review-card">
    <div class="review-header">
      <div class="review-author-wrap">
        ${avatar ? `<img class="review-avatar" src="${h(avatar)}" alt="${author}" loading="lazy" onerror="this.onerror=null;this.style.display='none'">` : `<div class="review-avatar-fallback">${author.charAt(0).toUpperCase()}</div>`}
        <div>
          <div class="review-author">${author}</div>
          <div class="review-date">${h(date)}</div>
        </div>
      </div>
      ${rating ? `<div class="review-score">★ ${h(String(Number(rating).toFixed(1)))}<span>/10</span></div>` : ''}
    </div>
    <p class="review-preview">${h(preview)}${hasMore ? '…' : ''}</p>
    ${hasMore ? `<p class="review-full" style="display:none">${h(content)}</p>
      <button class="review-expand-btn btn-ghost btn-xs">Read more</button>` : ''}
  </div>`;
}

