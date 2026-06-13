'use strict';

import { h } from '../utils/escape.js';
import { getDetailsTMDB, getSeasonDetailsTMDB } from '../api/tmdb.js';
import { getSeriesProgress, getSeriesDiary, getEpisodeData, toggleEpisodeWatched, updateSeriesDiary, getSeasonProgress, getStats, getWatchHistory, recalculateSeriesProgress, setManualSeriesStatusOverride } from '../store/seriesTracker.js';
import { toast } from './toast.js';
import { libHas, libAdd, libRemove, libUpdateStatus, saveLib, state as libState } from '../store/library.js';
import { openActorProfile } from './modal.js';

let _activeSeriesItem = null;
let _activeSeriesDetails = null;

const NOBACK = 'https://placehold.co/1280x720/1c1c1c/555?text=No+Image';
const NOPOSTER = 'https://placehold.co/300x450/1c1c1c/555?text=No+Image';

export function renderPremiumSeriesModal(item) {
  _activeSeriesItem = item;
  _activeSeriesDetails = null;
  const movieModal = document.getElementById('movieModal');
  if (!movieModal) return;

  const backdropUrl = item.backdrop || item.poster || NOBACK;

  movieModal.innerHTML = `
    <div class="premium-movie-backdrop-overlay" id="seriesBackdropOverlay" style="background-image: url('${backdropUrl}')"></div>
    <div class="premium-movie-card">
      <div class="premium-hero">
        <img class="premium-hero-img" src="${backdropUrl}" alt="${h(item.title)} backdrop">
        <div class="premium-hero-overlay"></div>
        
        <div class="premium-hero-ctrls-top">
          <div class="premium-hero-badges-left">
            <span class="premium-hero-badge" id="seriesQualityBadge">HD</span>
            <span class="premium-hero-badge hidden" id="seriesStatusBadge"></span>
          </div>
          <div class="premium-hero-actions-right">
            <button class="premium-hero-btn" id="seriesQuickAddNote" aria-label="Add Note" title="Add Note">📝</button>
            <button class="premium-hero-btn" id="seriesQuickShare" aria-label="Share" title="Share">🔗</button>
            <button class="premium-hero-btn premium-hero-close-btn" id="seriesCloseBtn" aria-label="Close">✕</button>
          </div>
        </div>
        <button class="premium-hero-play hidden" id="seriesHeroPlayBtn" aria-label="Play trailer">▶</button>
      </div>

      <div class="premium-body">
        <div class="premium-title-row">
          <h2 class="premium-title" id="seriesTitle">${h(item.title)}</h2>
          <div class="premium-original-title" id="seriesOrigTitle"></div>
        </div>
        
        <p class="premium-tagline" id="seriesTagline"></p>

        <div class="premium-meta-row">
          <span class="premium-rating-badge" id="seriesRatingStar">★ ${h(item.rating || 'N/A')}</span>
          <span class="premium-meta-dot"></span>
          <span class="premium-meta-item" id="seriesFirstAirYear">${h(item.year || 'N/A')}</span>
          <span class="premium-meta-dot"></span>
          <span class="premium-meta-item" id="seriesNetwork">N/A</span>
          <span class="premium-meta-dot"></span>
          <span class="premium-meta-item" id="seriesRating">NR</span>
        </div>

        <p class="premium-overview" id="seriesOverview">${h(item.overview || 'Loading details…')}</p>
        <div class="premium-genres" id="seriesGenres"></div>

        <!-- CONTINUE WATCHING WIDGET -->
        <div class="continue-watching-widget hidden" id="continueWatchingWidget">
          <div class="cw-info">
            <h3 id="cwTitle">Continue Watching</h3>
            <div class="cw-meta" id="cwMeta">Season 1 Episode 1</div>
          </div>
          <button class="cw-action-btn" id="cwActionBtn">Mark Watched</button>
        </div>

        <!-- ACTION ROW & STATUS -->
        <div class="premium-actions-section">
          <div class="actions-section-title">Logbook Status</div>
          <div class="premium-actions-row">
            <div class="status-pill-group" id="seriesStatusGroup">
              <button class="status-pill-btn" data-s="Watching">Watching</button>
              <button class="status-pill-btn" data-s="Watched">Completed</button>
              <button class="status-pill-btn" data-s="Planned">Planned</button>
              <button class="status-pill-btn" data-s="On Hold">On Hold</button>
              <button class="status-pill-btn" data-s="Dropped">Dropped</button>
            </div>
            <button class="compact-action-btn btn-delete hidden" id="seriesQuickDelete">✕ Remove</button>
          </div>
        </div>

        <!-- WATCH PROGRESS TRACKING -->
        <div class="series-progress-container hidden" id="seriesProgressContainer">
          <div class="series-progress-header">
            <div class="series-progress-title">Overall Progress</div>
            <div class="series-progress-stats" id="seriesProgressStats">0% • 0 / 0 Episodes</div>
          </div>
          <div class="series-progress-bar-bg">
            <div class="series-progress-bar-fill" id="seriesProgressBar" style="width: 0%"></div>
          </div>
        </div>

        <!-- SEASONS ACCORDION -->
        <div class="premium-section-title">📺 Seasons</div>
        <div id="seasonsContainer" class="seasons-container">Loading seasons...</div>

        <!-- TOP CAST (CHARACTERS) -->
        <div class="premium-section-title">🎭 Main Characters</div>
        <div class="cast-row" id="seriesCastRow">Loading cast...</div>

        <!-- VIDEOS & TRAILERS -->
        <div class="premium-section-title hidden" id="seriesVideosTitle">📹 Videos & Trailers</div>
        <div class="cast-row hidden" id="seriesVideosRow">Loading videos...</div>

        <!-- SERIES FACTS -->
        <div class="premium-section-title">📊 Series Facts</div>
        <div class="movie-facts-grid" id="seriesFactsGrid">
          <div class="fact-card"><div class="fact-label">Creator</div><div class="fact-value" id="factCreator">Loading…</div></div>
          <div class="fact-card"><div class="fact-label">Network</div><div class="fact-value" id="factNetworkValue">Loading…</div></div>
          <div class="fact-card"><div class="fact-label">First Air Date</div><div class="fact-value" id="factFirstAir">Loading…</div></div>
          <div class="fact-card"><div class="fact-label">Latest Episode</div><div class="fact-value" id="factLatestAir">Loading…</div></div>
          <div class="fact-card"><div class="fact-label">Country</div><div class="fact-value" id="factCountry">Loading…</div></div>
          <div class="fact-card"><div class="fact-label">Language</div><div class="fact-value" id="factLang">Loading…</div></div>
        </div>

        <!-- PERSONAL DIARY & TIMELINE -->
        <div class="diary-journal-panel" id="diaryJournalPanel" style="margin-top: 32px;">
          <div class="diary-header-wrap">
            <h3 style="font-size:16px;font-weight:900;color:var(--text)">📓 Personal Diary</h3>
            <span class="diary-tag">Private Log</span>
          </div>
          <div class="diary-layout-split" style="display: flex; flex-direction: column; gap: 16px;">
            <div class="diary-fields">
              <div class="diary-row">
                <label class="diary-row-label">Personal Rating</label>
                <div class="star-rating-10" id="seriesDiaryStars">
                  <span data-v="1">★</span><span data-v="2">★</span><span data-v="3">★</span><span data-v="4">★</span><span data-v="5">★</span>
                  <span data-v="6">★</span><span data-v="7">★</span><span data-v="8">★</span><span data-v="9">★</span><span data-v="10">★</span>
                </div>
              </div>
              <div class="diary-row">
                <label class="diary-row-label">Notes & Notable Moments</label>
                <textarea class="diary-notes-area" id="seriesDiaryNotes" placeholder="Favorite Episode, Memorable Scene Notes..." rows="3"></textarea>
              </div>
              <button class="diary-save-btn" id="seriesDiarySaveBtn">Save Diary</button>
            </div>
            
            <div class="diary-timeline-section">
              <h4 style="margin: 0 0 16px; font-size: 14px; font-weight: 700;">Watch Timeline</h4>
              <div class="timeline" id="seriesWatchTimeline">
                <!-- Timeline items -->
              </div>
            </div>
          </div>
        </div>

        <!-- STATISTICS DASHBOARD -->
        <div class="premium-section-title">📈 Tracker Statistics</div>
        <div class="stats-dashboard" id="seriesStatsDashboard">
          <div class="stat-card"><div class="stat-value" id="statSeasons">0</div><div class="stat-label">Total Seasons</div></div>
          <div class="stat-card"><div class="stat-value" id="statEpisodes">0</div><div class="stat-label">Total Episodes</div></div>
          <div class="stat-card"><div class="stat-value" id="statDays">0</div><div class="stat-label">Days Tracked</div></div>
          <div class="stat-card"><div class="stat-value" id="statStreak">0</div><div class="stat-label">Current Streak</div></div>
        </div>

        <!-- DISCOVERY -->
        <div class="premium-section-title">🔮 Related Series</div>
        <div class="cast-row" id="seriesRecommendationsRow">Loading...</div>

        <!-- SOUNDTRACK -->
        <div class="premium-section-title">🎵 Soundtrack</div>
        <div id="seriesSoundtrackList" style="margin-bottom: 24px;"></div>

        <!-- EXTERNAL LINKS -->
        <div class="premium-section-title">🔗 External Links</div>
        <div id="seriesExternalLinks" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 24px;"></div>

        <div style="height: 40px"></div>
      </div>
    </div>
  `;

  document.getElementById('seriesQuickShare')?.addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      toast('Link copied to clipboard!', 'success');
    });
  });

  document.getElementById('seriesQuickAddNote')?.addEventListener('click', () => {
    document.getElementById('seriesDiaryNotes')?.focus();
    document.getElementById('seriesDiaryNotes')?.scrollIntoView({behavior: 'smooth', block: 'center'});
  });

  loadSeriesDetails(item.id);
}

async function loadSeriesDetails(id) {
  try {
    const d = await getDetailsTMDB('tv', id);
    _activeSeriesDetails = d;
    applyPremiumSeriesDetails(d);
  } catch (err) {
    console.error(err);
    toast('Failed to load series details.', 'error');
  }
}

function applyPremiumSeriesDetails(d) {
  if (!_activeSeriesDetails) return;

  const titleEl = document.getElementById('seriesTitle');
  if (titleEl) titleEl.textContent = d.name || _activeSeriesItem.title;
  
  if (d.original_name && d.original_name !== d.name) {
    document.getElementById('seriesOrigTitle').textContent = d.original_name;
  }
  
  document.getElementById('seriesTagline').textContent = d.tagline || '';
  document.getElementById('seriesOverview').textContent = d.overview || 'No overview available.';
  
  // Badges & Meta
  if (d.status) {
    const statB = document.getElementById('seriesStatusBadge');
    statB.textContent = d.status;
    statB.classList.remove('hidden');
  }
  
  const contentRatings = d.content_ratings?.results?.find(r => r.iso_3166_1 === 'US') || d.content_ratings?.results?.[0];
  document.getElementById('seriesRating').textContent = contentRatings ? contentRatings.rating : 'NR';
  
  const network = d.networks?.[0]?.name || 'N/A';
  document.getElementById('seriesNetwork').textContent = network;
  
  const genres = d.genres?.map(g => `<span class="premium-genre-chip">${h(g.name)}</span>`).join('') || '';
  document.getElementById('seriesGenres').innerHTML = genres;

  // Facts
  document.getElementById('factCreator').textContent = d.created_by?.map(c => c.name).join(', ') || 'Unknown';
  document.getElementById('factNetworkValue').textContent = network;
  document.getElementById('factFirstAir').textContent = d.first_air_date || 'Unknown';
  document.getElementById('factLatestAir').textContent = d.last_air_date || 'Unknown';
  document.getElementById('factCountry').textContent = d.origin_country?.join(', ') || 'Unknown';
  document.getElementById('factLang').textContent = d.original_language?.toUpperCase() || 'Unknown';

  // Cast
  const castContainer = document.getElementById('seriesCastRow');
  if (d.credits?.cast?.length > 0) {
    castContainer.innerHTML = d.credits.cast.slice(0, 15).map(actor => `
      <div class="character-card" style="cursor: pointer;" onclick="document.dispatchEvent(new CustomEvent('mu:openActorProfile', {detail: ${actor.id}}))">
        <img class="character-img" src="${actor.profile_path ? 'https://image.tmdb.org/t/p/w185' + actor.profile_path : 'https://placehold.co/185x278/1c1c1c/555?text=No+Photo'}" alt="${h(actor.name)}" loading="lazy">
        <div class="character-info">
          <div class="character-name">${h(actor.character)}</div>
          <div class="character-actor">${h(actor.name)}</div>
        </div>
      </div>
    `).join('');
  } else {
    castContainer.innerHTML = '<p class="placeholder-msg">No cast info.</p>';
  }

  // Recommendations
  const recContainer = document.getElementById('seriesRecommendationsRow');
  const recs = d.recommendations?.results || [];
  if (recs.length > 0) {
    recContainer.innerHTML = recs.slice(0, 10).map(r => `
      <div class="character-card" style="cursor: pointer;" onclick="document.dispatchEvent(new CustomEvent('mu:openSeries', {detail: {id: ${r.id}, type: 'tv'}}))">
        <img class="character-img" src="${r.poster_path ? 'https://image.tmdb.org/t/p/w342' + r.poster_path : NOPOSTER}" alt="${h(r.name)}" loading="lazy">
        <div class="character-info">
          <div class="character-name">${h(r.name)}</div>
          <div class="character-actor">★ ${Number(r.vote_average).toFixed(1)}</div>
        </div>
      </div>
    `).join('');
  } else {
    recContainer.innerHTML = '<p class="placeholder-msg">No recommendations.</p>';
  }

  // Trailer Play Button logic
  let trailerKey = '';
  if (d.videos && d.videos.results) {
    const trailer = d.videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube') || d.videos.results.find(v => v.site === 'YouTube');
    if (trailer) trailerKey = trailer.key;
  }
  const heroPlayBtn = document.getElementById('seriesHeroPlayBtn');
  if (trailerKey) {
    heroPlayBtn.classList.remove('hidden');
    heroPlayBtn.onclick = () => document.dispatchEvent(new CustomEvent('mu:playTrailer', {detail: trailerKey}));
  } else {
    heroPlayBtn.classList.add('hidden');
  }

  // Videos Row
  const videosRow = document.getElementById('seriesVideosRow');
  const videosTitle = document.getElementById('seriesVideosTitle');
  if (d.videos?.results?.length > 0) {
    const vids = d.videos.results.slice(0, 5);
    videosRow.innerHTML = vids.map(v => `
      <div class="video-card" style="width: 256px; flex-shrink: 0; cursor: pointer; position: relative;" onclick="document.dispatchEvent(new CustomEvent('mu:playTrailer', {detail: '${v.key}'}))">
        <div style="width: 100%; aspect-ratio: 16/9; background: #1e293b; border-radius: 8px; overflow: hidden; position: relative; border: 1px solid rgba(255,255,255,0.1);">
          <img src="https://img.youtube.com/vi/${v.key}/mqdefault.jpg" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.7; transition: 0.3s;" onmouseover="this.style.opacity=1; this.style.transform='scale(1.05)';" onmouseout="this.style.opacity=0.7; this.style.transform='scale(1)';">
          <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; color: white;">▶</div>
          </div>
        </div>
        <h4 style="font-weight: 600; margin-top: 8px; font-size: 14px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${h(v.name)}</h4>
      </div>
    `).join('');
    videosRow.classList.remove('hidden');
    videosTitle.classList.remove('hidden');
  } else {
    videosRow.classList.add('hidden');
    videosTitle.classList.add('hidden');
  }

  // Soundtrack
  const stList = document.getElementById('seriesSoundtrackList');
  if (stList) {
    stList.innerHTML = `
      <div style="display: flex; gap: 12px; margin-bottom: 12px; align-items: center; cursor: pointer;">
         <button style="width: 32px; height: 32px; border-radius: 50%; background: var(--surface); border: 1px solid var(--border); color: var(--text); display: flex; align-items: center; justify-content: center;">▶</button>
         <div>
           <p style="font-size: 14px; font-weight: 600; margin: 0; color: var(--text);">Opening Theme</p>
           <p style="font-size: 10px; color: var(--text-dim); margin: 0;">Main Title</p>
         </div>
      </div>
      <div style="display: flex; gap: 12px; margin-bottom: 12px; align-items: center; cursor: pointer;">
         <button style="width: 32px; height: 32px; border-radius: 50%; background: var(--surface); border: 1px solid var(--border); color: var(--text); display: flex; align-items: center; justify-content: center;">▶</button>
         <div>
           <p style="font-size: 14px; font-weight: 600; margin: 0; color: var(--text);">Original Score</p>
           <p style="font-size: 10px; color: var(--text-dim); margin: 0;">Various Artists</p>
         </div>
      </div>
    `;
  }

  // External Links
  const extGrid = document.getElementById('seriesExternalLinks');
  if (extGrid) {
    const ext = d.external_ids || {};
    let html = '';
    if (ext.imdb_id) html += `<a href="https://www.imdb.com/title/${ext.imdb_id}" target="_blank" style="padding: 10px; text-align: center; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: #f5c518; font-weight: bold; text-decoration: none; font-size: 14px;">IMDb</a>`;
    html += `<a href="https://www.themoviedb.org/tv/${d.id}" target="_blank" style="padding: 10px; text-align: center; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: #01b4e4; font-weight: bold; text-decoration: none; font-size: 14px;">TMDB</a>`;
    if (ext.wikidata_id) html += `<a href="https://www.wikidata.org/wiki/${ext.wikidata_id}" target="_blank" style="padding: 10px; text-align: center; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: #ccc; font-weight: bold; text-decoration: none; font-size: 14px;">Wikidata</a>`;
    if (d.homepage) html += `<a href="${d.homepage}" target="_blank" style="padding: 10px; text-align: center; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: var(--red); font-weight: bold; text-decoration: none; font-size: 14px;">Official Web</a>`;
    extGrid.innerHTML = html;
  }

  // Stats
  document.getElementById('statSeasons').textContent = d.number_of_seasons || 0;
  document.getElementById('statEpisodes').textContent = d.number_of_episodes || 0;

  // Init Diary
  const diary = getSeriesDiary(d.id);
  document.getElementById('seriesDiaryNotes').value = diary.notes || '';

  const totalEps = d.number_of_episodes || d.seasons?.reduce((acc, s) => s.season_number > 0 ? acc + s.episode_count : acc, 0) || 1;
  recalculateSeriesProgress(d.id, totalEps);

  // Sync Library & Tracker UI
  syncTrackerUI();
  renderSeasons();
}

function syncTrackerUI() {
  if (!_activeSeriesDetails) return;
  const d = _activeSeriesDetails;
  
  const inLib = libHas(d.id, d.name, 'tv');
  const libItem = inLib ? libState.library.find(i => String(i.id) === String(d.id) && i.type === 'tv') : null;
  if (libItem) {
    let changed = false;
    let runtime = null;
    if (d.episode_run_time && d.episode_run_time.length) {
      runtime = d.episode_run_time[0];
    } else if (d.last_episode_to_air && d.last_episode_to_air.runtime) {
      runtime = d.last_episode_to_air.runtime;
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
  
  const logbookBtns = document.querySelectorAll('#seriesStatusGroup .status-pill-btn');
  logbookBtns.forEach(btn => {
    btn.classList.toggle('active', inLib && btn.dataset.s === libStatus);
    btn.onclick = () => {
      if (!inLib) {
        libAdd({ id: d.id, title: d.name, type: 'tv', poster: d.poster_path ? 'https://image.tmdb.org/t/p/w500' + d.poster_path : '' });
      }
      libUpdateStatus(d.id, btn.dataset.s, 'tv');
      
      if (btn.dataset.s === 'Watching') {
        setManualSeriesStatusOverride(d.id, false); // Resume auto-tracking
      } else {
        setManualSeriesStatusOverride(d.id, true); // Lock manual status
      }
      
      syncTrackerUI();
    };
  });

  const delBtn = document.getElementById('seriesQuickDelete');
  if (inLib) {
    delBtn.classList.remove('hidden');
    delBtn.onclick = () => {
      libRemove(d.id, d.name, 'tv');
      syncTrackerUI();
      // Hide tracker UI if removed from library? Keep it simple for now.
    };
  } else {
    delBtn.classList.add('hidden');
  }

  // Progress Tracking UI
  const progressContainer = document.getElementById('seriesProgressContainer');
  if (inLib) {
    progressContainer.classList.remove('hidden');
    const prog = getSeriesProgress(d.id);
    const totalEps = d.number_of_episodes || d.seasons?.reduce((acc, s) => s.season_number > 0 ? acc + s.episode_count : acc, 0) || 1;
    document.getElementById('seriesProgressBar').style.width = `${prog.completionPercentage}%`;
    document.getElementById('seriesProgressStats').textContent = `${prog.completionPercentage}% • ${prog.episodesWatched} / ${totalEps} Episodes`;
    
    // Refresh logbook pill UI based on backend status
    const updatedLibItem = libState.library.find(i => String(i.id) === String(d.id) && i.type === 'tv');
    const currentStatus = updatedLibItem?.status || prog.status || 'Planned';
    document.querySelectorAll('#seriesStatusGroup .status-pill-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.s === currentStatus);
    });
  } else {
    progressContainer.classList.add('hidden');
    document.querySelectorAll('#seriesStatusGroup .status-pill-btn').forEach(btn => {
      btn.classList.remove('active');
    });
  }

  // Diary UI
  const diary = getSeriesDiary(d.id);
  const stars = document.querySelectorAll('#seriesDiaryStars span');
  stars.forEach(st => {
    st.classList.remove('selected');
    if (parseInt(st.dataset.v) <= diary.rating) st.classList.add('selected');
    st.onclick = () => {
      updateSeriesDiary(d.id, { rating: parseInt(st.dataset.v) });
      syncTrackerUI();
    };
    st.onmouseover = () => {
      const val = parseInt(st.dataset.v);
      stars.forEach(x => {
        x.classList.remove('hovered');
        if (parseInt(x.dataset.v) <= val) x.classList.add('hovered');
      });
    };
    st.onmouseout = () => {
      stars.forEach(x => x.classList.remove('hovered'));
    };
  });
  
  document.getElementById('seriesDiarySaveBtn').onclick = () => {
    updateSeriesDiary(d.id, { notes: document.getElementById('seriesDiaryNotes').value });
    toast('Diary saved!', 'success');
  };

  // Timeline UI
  const historyList = getWatchHistory(d.id);
  const timelineEl = document.getElementById('seriesWatchTimeline');
  if (historyList.length > 0) {
    timelineEl.innerHTML = historyList.slice(0, 10).map(h => `
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-date">${new Date(h.date).toLocaleString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</div>
        <div class="timeline-content">Watched Season ${h.season} Episode ${h.episode}</div>
      </div>
    `).join('');
  } else {
    timelineEl.innerHTML = 'No history yet.';
  }

  // Stats Dashboard
  const globalStats = getStats();
  document.getElementById('statDays').textContent = globalStats.daysTracked;
  document.getElementById('statStreak').textContent = globalStats.currentStreak;

  // Continue Watching Widget
  updateContinueWatchingWidget();
}

function updateContinueWatchingWidget() {
  const d = _activeSeriesDetails;
  const prog = getSeriesProgress(d.id);
  const cwWidget = document.getElementById('continueWatchingWidget');
  
  if (!libHas(d.id, d.name, 'tv') || prog.completionPercentage === 100) {
    cwWidget.classList.add('hidden');
    return;
  }

  cwWidget.classList.remove('hidden');
  
  // Calculate next episode
  let nextS = prog.currentSeason;
  let nextE = prog.currentEpisode + 1;
  
  // Quick check if next episode exceeds season boundaries (requires season data loaded, so we approximate)
  const currentSeasonData = d.seasons?.find(s => s.season_number === nextS);
  if (currentSeasonData && nextE > currentSeasonData.episode_count) {
    nextS++;
    nextE = 1;
  }

  const totalEps = d.number_of_episodes || d.seasons?.reduce((acc, s) => s.season_number > 0 ? acc + s.episode_count : acc, 0) || 1;

  document.getElementById('cwMeta').textContent = `Season ${nextS} Episode ${nextE}`;
  document.getElementById('cwActionBtn').onclick = () => {
    toggleEpisodeWatched(d.id, nextS, nextE, totalEps);
    syncTrackerUI();
    const seasonContent = document.getElementById(`season-content-${nextS}`);
    if (seasonContent && !seasonContent.classList.contains('hidden')) {
      loadSeasonEpisodes(nextS, seasonContent);
    } else {
      updateSeasonProgressHeaders();
    }
  };
}

function renderSeasons() {
  const d = _activeSeriesDetails;
  const container = document.getElementById('seasonsContainer');
  if (!d.seasons || d.seasons.length === 0) {
    container.innerHTML = '<p class="placeholder-msg">No seasons found.</p>';
    return;
  }

  const validSeasons = d.seasons.filter(s => s.season_number > 0);
  
  container.innerHTML = validSeasons.map(s => {
    const sProg = getSeasonProgress(d.id, s.season_number, s.episode_count);
    return `
      <div class="season-accordion">
        <div class="season-header" data-season="${s.season_number}" data-epcount="${s.episode_count}">
          <div class="season-info-left">
            <img class="season-poster-mini" src="${s.poster_path ? 'https://image.tmdb.org/t/p/w154' + s.poster_path : NOPOSTER}" loading="lazy">
            <div class="season-title-group">
              <h4>Season ${s.season_number}</h4>
              <div class="season-meta">${s.air_date ? s.air_date.split('-')[0] : 'TBA'} • ${s.episode_count} Episodes</div>
            </div>
          </div>
          <div class="season-progress-mini">
            <span>${sProg.percentage}%</span>
            <span>▼</span>
          </div>
        </div>
        <div class="season-content hidden" id="season-content-${s.season_number}">Loading episodes...</div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.season-header').forEach(header => {
    header.addEventListener('click', () => {
      const sNum = parseInt(header.dataset.season);
      const content = document.getElementById(`season-content-${sNum}`);
      if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        loadSeasonEpisodes(sNum, content);
      } else {
        content.classList.add('hidden');
      }
    });
  });
}

async function loadSeasonEpisodes(seasonNum, container) {
  const d = _activeSeriesDetails;
  try {
    const seasonData = await getSeasonDetailsTMDB(d.id, seasonNum);
    if (!seasonData.episodes || seasonData.episodes.length === 0) {
      container.innerHTML = '<p>No episodes found.</p>';
      return;
    }

    container.innerHTML = seasonData.episodes.map(ep => {
      const epData = getEpisodeData(d.id, seasonNum, ep.episode_number);
      const isWatched = epData.watchCount > 0;
      
      return `
        <div class="episode-tracker-item">
          <div class="ep-info">
            <div class="ep-title">${ep.episode_number}. ${h(ep.name)}</div>
            <div class="ep-meta">${ep.air_date || 'TBA'} • ${ep.runtime ? ep.runtime + ' min' : 'TBA'}</div>
          </div>
          <div class="ep-actions">
            ${isWatched && epData.watchCount > 1 ? `<span class="ep-watch-count">${epData.watchCount}x</span>` : ''}
            <button class="ep-toggle-btn ${isWatched ? 'watched' : ''}" data-sn="${seasonNum}" data-en="${ep.episode_number}">
              ${isWatched ? '✓ Watched' : 'Mark'}
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.ep-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sNum = parseInt(btn.dataset.sn);
        const eNum = parseInt(btn.dataset.en);
        
        if (!libHas(d.id, d.name, 'tv')) {
           libAdd({ id: d.id, title: d.name, type: 'tv', poster: d.poster_path ? 'https://image.tmdb.org/t/p/w500' + d.poster_path : '' });
        }
        
        const totalEps = d.number_of_episodes || d.seasons?.reduce((acc, s) => s.season_number > 0 ? acc + s.episode_count : acc, 0) || 1;
        const epData = toggleEpisodeWatched(d.id, sNum, eNum, totalEps);
        syncTrackerUI();
        updateSeasonProgressHeaders();
        
        // Update this button's UI directly
        const isWatched = epData.watchCount > 0;
        btn.textContent = isWatched ? '✓ Watched' : 'Mark';
        if (isWatched) {
          btn.classList.add('watched');
        } else {
          btn.classList.remove('watched');
        }
        
        // Update watch count pill if needed
        const actionsDiv = btn.parentElement;
        let countPill = actionsDiv.querySelector('.ep-watch-count');
        if (isWatched && epData.watchCount > 1) {
          if (!countPill) {
            countPill = document.createElement('span');
            countPill.className = 'ep-watch-count';
            actionsDiv.insertBefore(countPill, btn);
          }
          countPill.textContent = `${epData.watchCount}x`;
        } else if (countPill) {
          countPill.remove();
        }
      });
    });

  } catch (err) {
    console.error(err);
    container.innerHTML = '<p>Error loading episodes.</p>';
  }
}

function updateSeasonProgressHeaders() {
  const d = _activeSeriesDetails;
  if (!d || !d.seasons) return;
  document.querySelectorAll('.season-header').forEach(header => {
    const sNum = parseInt(header.dataset.season);
    const epCount = parseInt(header.dataset.epcount);
    const sProg = getSeasonProgress(d.id, sNum, epCount);
    const span = header.querySelector('.season-progress-mini span:first-child');
    if (span) span.textContent = `${sProg.percentage}%`;
  });
}

// Listen for global open requests for series
document.addEventListener('mu:openSeries', (e) => {
  const { id, type } = e.detail;
  // This requires a full TMDB item to open properly like openModal does
  // As a shortcut, we fetch minimal details and call renderPremiumSeriesModal
  getDetailsTMDB(type, id).then(data => {
    const item = {
      id: data.id,
      title: data.name,
      type: 'tv',
      poster: data.poster_path ? 'https://image.tmdb.org/t/p/w500' + data.poster_path : '',
      backdrop: data.backdrop_path ? 'https://image.tmdb.org/t/p/w1280' + data.backdrop_path : '',
      year: data.first_air_date ? data.first_air_date.split('-')[0] : '',
      overview: data.overview,
      rating: data.vote_average
    };
    renderPremiumSeriesModal(item);
  });
});
