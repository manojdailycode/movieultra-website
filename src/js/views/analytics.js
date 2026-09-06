'use strict';

import { card } from '../components/card.js';
import { h } from '../utils/escape.js';
import { openModal } from '../components/modal.js';
import { state as libState } from '../store/library.js';
import { state as histState } from '../store/history.js';
import { getAllUserRatings, getAverageUserRating } from '../store/ratings.js';
import { getContinueWatching } from '../store/progress.js';
import { openWatchView } from './watch.js';

// Module state for active filter
let currentFilter = 'all'; // 'all' | 'movie' | 'tv' | 'anime'

/**
 * Format total decimal hours into a readable string (e.g., '2d 14h' or '18h 30m')
 */
function formatScreenTime(hours) {
  if (!hours || hours <= 0) return '0 hrs';
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = Math.round(hours % 24);
    return `${days}d ${remHours}h`;
  }
  const fullHours = Math.floor(hours);
  const minutes = Math.round((hours % 1) * 60);
  return minutes > 0 ? `${fullHours}h ${minutes}m` : `${fullHours}h`;
}

/**
 * Determine cinephile title persona based on watch time
 */
function getPersona(hours) {
  if (hours <= 0) return { title: 'New Explorer', icon: '🌱', desc: 'Start tracking to build your profile' };
  if (hours < 15) return { title: 'Casual Streamer', icon: '🍿', desc: 'Getting into the groove' };
  if (hours < 50) return { title: 'Film Enthusiast', icon: '🎬', desc: 'Broadening cinematic horizons' };
  if (hours < 120) return { title: 'Dedicated Binger', icon: '⚡', desc: 'Committed to the screen' };
  if (hours < 250) return { title: 'Cinephile Veteran', icon: '🏆', desc: 'Exceptional visual taste' };
  return { title: 'Cinematic Maestro', icon: '👑', desc: 'Legendary entertainment connoisseur' };
}

export function renderAnalytics() {
  const el = document.getElementById('analyticsContent');
  if (!el) return;

  const library = libState.library || [];
  const watchHist = histState.watchHist || [];
  const userRatings = getAllUserRatings() || [];
  const inProgress = getContinueWatching() || [];

  // Global counts across whole library
  const totalCounts = library.reduce((acc, item) => {
    const t = item.type || 'movie';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, { movie: 0, tv: 0, anime: 0 });

  // Filtered dataset based on current active tab
  const filteredLib = currentFilter === 'all'
    ? library
    : library.filter(i => (i.type || 'movie') === currentFilter);

  const filteredHist = currentFilter === 'all'
    ? watchHist
    : watchHist.filter(i => (i.type || 'movie') === currentFilter);

  const filteredRatings = currentFilter === 'all'
    ? userRatings
    : userRatings.filter(r => (r.type || 'movie') === currentFilter);

  const filteredInProgress = currentFilter === 'all'
    ? inProgress
    : inProgress.filter(p => (p.type || 'movie') === currentFilter);

  // Union of all unique titles known to the user (library + watch history)
  const allKnownMap = new Map();
  filteredLib.forEach(i => allKnownMap.set(`${i.type || 'movie'}-${i.id}`, i));
  filteredHist.forEach(i => {
    const k = `${i.type || 'movie'}-${i.id}`;
    if (!allKnownMap.has(k)) allKnownMap.set(k, i);
  });
  const allKnownItems = Array.from(allKnownMap.values());


  // If entire user library & history is empty, show modern empty state
  if (!library.length && !watchHist.length) {
    el.innerHTML = `
      <div class="insights-empty-hero">
        <div class="insights-empty-glow"></div>
        <div class="insights-empty-icon-wrap">
          <span class="insights-empty-icon">📊</span>
        </div>
        <h3 class="insights-empty-title">Your Cinematic Story Starts Here</h3>
        <p class="insights-empty-desc">
          Add movies, TV shows, and anime to your watchlist or start watching to unlock deep-dive personal statistics, screen time metrics, taste benchmarks, and genre radars.
        </p>
        <div class="insights-empty-actions">
          <button class="insights-cta-btn btn-primary" onclick="window.showView && window.showView('trending')">
            🔥 Explore Trending
          </button>
          <button class="insights-cta-btn btn-secondary" onclick="window.showView && window.showView('movies')">
            🎬 Browse Movies
          </button>
          <button class="insights-cta-btn btn-secondary" onclick="window.showView && window.showView('series')">
            📺 Browse Series
          </button>
          <button class="insights-cta-btn btn-secondary" onclick="window.showView && window.showView('anime')">
            🌸 Browse Anime
          </button>
        </div>

        <div class="insights-empty-preview">
          <div class="insights-preview-badge">✨ Live Real-Time Overview</div>
          <div class="insights-preview-grid">
            <div class="insights-preview-card">
              <span class="preview-stat-num">0h</span>
              <span class="preview-stat-lbl">Screen Time</span>
            </div>
            <div class="insights-preview-card">
              <span class="preview-stat-num">0%</span>
              <span class="preview-stat-lbl">Completion</span>
            </div>
            <div class="insights-preview-card">
              <span class="preview-stat-num">0</span>
              <span class="preview-stat-lbl">Titles Tracked</span>
            </div>
            <div class="insights-preview-card">
              <span class="preview-stat-num">0</span>
              <span class="preview-stat-lbl">Ratings Given</span>
            </div>
          </div>
          <p class="insights-preview-tip">
            💡 <strong>How it works:</strong> Use the <strong>＋ Track</strong> button or status selector (<em>📋 Plan</em>, <em>👁️ Watching</em>, <em>✅ Done</em>) directly on any card across the site. Your genuine statistics and genre radar will generate here live in real time!
          </p>
        </div>
      </div>
    `;
    return;
  }

  // Calculate metrics for current filtered view
  const wIds = new Set(filteredHist.map(i => String(i.id)));
  const completedInLib = filteredLib.filter(i => wIds.has(String(i.id)) || i.status === 'Completed').length;
  const toWatchCount = filteredLib.filter(i => !wIds.has(String(i.id)) && i.status !== 'Completed').length;

  // Screen time calculation
  let estimatedHours = 0;
  filteredHist.forEach(item => {
    const t = item.type || 'movie';
    if (t === 'movie') estimatedHours += 2.0;
    else if (t === 'tv') estimatedHours += 0.8;
    else if (t === 'anime') estimatedHours += 0.45;
    else estimatedHours += 1.5;
  });
  if (estimatedHours === 0 && filteredLib.length > 0) {
    // If user marked some as completed in library without history entries
    estimatedHours = completedInLib * 1.8;
  }

  const persona = getPersona(estimatedHours);

  // Completion Rate
  const completionRate = filteredLib.length
    ? Math.min(100, Math.round((completedInLib / filteredLib.length) * 100))
    : (filteredHist.length ? 100 : 0);

  // TMDB Average
  const tmdbRated = filteredLib.filter(i => parseFloat(i.rating) > 0);
  const avgTmdb = tmdbRated.length
    ? (tmdbRated.reduce((a, c) => a + parseFloat(c.rating), 0) / tmdbRated.length).toFixed(1)
    : null;

  // User Average Rating
  const avgUser = filteredRatings.length
    ? (filteredRatings.reduce((s, r) => s + r.rating, 0) / filteredRatings.length).toFixed(1)
    : null;

  // Rating comparison benchmark
  let ratingBenchmark = null;
  if (avgUser && avgTmdb) {
    const diff = parseFloat((avgUser - avgTmdb).toFixed(1));
    if (diff > 0.3) {
      ratingBenchmark = { text: `+${diff} Above Critics`, class: 'benchmark-generous', tip: 'You enjoy cinema more generously than public averages' };
    } else if (diff < -0.3) {
      ratingBenchmark = { text: `${diff} Tough Critic`, class: 'benchmark-strict', tip: 'You have very high standards for quality' };
    } else {
      ratingBenchmark = { text: 'In Sync with Critics', class: 'benchmark-sync', tip: 'Your ratings closely match global averages' };
    }
  }

  // Watch status breakdown
  const byStatus = filteredLib.reduce((a, c) => {
    const s = c.status || 'Planned';
    a[s] = (a[s] || 0) + 1;
    return a;
  }, { Completed: 0, Watching: 0, Planned: 0 });

  // Top Genres breakdown across all known items
  const genreCounts = {};
  allKnownItems.forEach(item => {
    if (!item.genre) return;
    item.genre.split(/[,/]\s*/).forEach(g => {
      const trimmed = g.trim();
      if (trimmed) genreCounts[trimmed] = (genreCounts[trimmed] || 0) + 1;
    });
  });
  const sortedGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);
  const topGenres = sortedGenres.slice(0, 7);
  const primaryGenre = sortedGenres[0] || null;

  // Decade / Era breakdown across all known items
  const decadeCounts = {
    '2020s': 0,
    '2010s': 0,
    '2000s': 0,
    '1990s': 0,
    '1980s': 0,
    'Classics (<80)': 0
  };
  let validYearsCount = 0;
  allKnownItems.forEach(item => {
    const yStr = String(item.year || '').split('-')[0].trim();
    const y = parseInt(yStr, 10);
    if (!isNaN(y) && y > 1900 && y < 2100) {
      validYearsCount++;
      if (y >= 2020) decadeCounts['2020s']++;
      else if (y >= 2010) decadeCounts['2010s']++;
      else if (y >= 2000) decadeCounts['2000s']++;
      else if (y >= 1990) decadeCounts['1990s']++;
      else if (y >= 1980) decadeCounts['1980s']++;
      else decadeCounts['Classics (<80)']++;
    }
  });
  const activeDecades = Object.entries(decadeCounts).filter(([_, count]) => count > 0);
  const topDecade = activeDecades.sort((a, b) => b[1] - a[1])[0];

  // Helper for percentage
  const pct = (n, total) => total > 0 ? ((n / total) * 100).toFixed(1) : '0';

  // Render HTML
  el.innerHTML = `
    <!-- Top Filter Pill Navigation -->
    <div class="insights-header">
      <div class="insights-intro">
        <p class="insights-subtitle">Your personal watch habits, ratings profile, and entertainment velocity.</p>
      </div>
      <div class="insights-filter-bar" id="analyticsFilterBar" role="tablist" aria-label="Insights category filter">
        <button class="insights-filter-tab ${currentFilter === 'all' ? 'active' : ''}" data-filter="all" role="tab" aria-selected="${currentFilter === 'all'}">
          🌐 All Media <span class="tab-count">${library.length}</span>
        </button>
        <button class="insights-filter-tab ${currentFilter === 'movie' ? 'active' : ''}" data-filter="movie" role="tab" aria-selected="${currentFilter === 'movie'}">
          🎬 Movies <span class="tab-count">${totalCounts.movie}</span>
        </button>
        <button class="insights-filter-tab ${currentFilter === 'tv' ? 'active' : ''}" data-filter="tv" role="tab" aria-selected="${currentFilter === 'tv'}">
          📺 Series <span class="tab-count">${totalCounts.tv}</span>
        </button>
        <button class="insights-filter-tab ${currentFilter === 'anime' ? 'active' : ''}" data-filter="anime" role="tab" aria-selected="${currentFilter === 'anime'}">
          🌸 Anime <span class="tab-count">${totalCounts.anime}</span>
        </button>
      </div>
    </div>

    <!-- If filtered section has no items -->
    ${filteredLib.length === 0 && filteredHist.length === 0 ? `
      <div class="insights-tab-empty">
        <div class="tab-empty-icon">🔍</div>
        <h4>No ${currentFilter === 'movie' ? 'Movies' : currentFilter === 'tv' ? 'Series' : 'Anime'} in your records</h4>
        <p>Add titles to your library or start streaming to see personalized insights for this medium.</p>
        <button class="btn-primary btn-sm" onclick="window.showView && window.showView('${currentFilter === 'anime' ? 'anime' : currentFilter === 'tv' ? 'series' : 'movies'}')">
          Browse ${currentFilter === 'movie' ? 'Movies' : currentFilter === 'tv' ? 'Series' : 'Anime'}
        </button>
      </div>
    ` : `
      <!-- Hero KPI Banner (Letterboxd Pro / Trakt VIP tier) -->
      <div class="insights-hero-grid">
        <!-- Hero Card 1: Screen Time & Persona -->
        <div class="insights-hero-card hero-screen-time insights-clickable" onclick="window.showView && window.showView('history')" title="Click to view Watch History">
          <div class="hero-card-glow"></div>
          <div class="hero-header-line">
            <span class="hero-label">Estimated Screen Time ↗</span>
            <span class="hero-persona-pill" title="${h(persona.desc)}">${persona.icon} ${h(persona.title)}</span>
          </div>
          <div class="hero-stat-primary">${formatScreenTime(estimatedHours)}</div>
          <div class="hero-subtext">
            <span>~${filteredHist.length} titles logged</span> • <span>${estimatedHours ? `${estimatedHours.toFixed(0)} total hrs` : 'Building data'}</span>
          </div>
          <div class="hero-micro-track">
            <div class="hero-micro-fill" style="width:${Math.min(100, Math.max(12, estimatedHours / 2.5))}%"></div>
          </div>
        </div>

        <!-- Hero Card 2: Completion Progress -->
        <div class="insights-hero-card hero-completion insights-clickable" onclick="window.filterWatchlistStatus && window.filterWatchlistStatus('Completed')" title="Click to view Completed titles in Watchlist">
          <div class="hero-card-glow"></div>
          <div class="hero-header-line">
            <span class="hero-label">Completion Velocity ↗</span>
            <span class="hero-badge ${completionRate >= 60 ? 'badge-green' : 'badge-blue'}">${completionRate}% Watched</span>
          </div>
          <div class="hero-stat-primary">${completionRate}%</div>
          <div class="hero-subtext">
            <span>${completedInLib} watched</span> • <span>${toWatchCount} remaining in backlog</span>
          </div>
          <div class="status-bar-track hero-track">
            <div class="status-bar-fill" style="width:${completionRate}%;background:linear-gradient(90deg, var(--green) 0%, #10b981 100%)"></div>
          </div>
        </div>

        <!-- Hero Card 3: Taste Benchmark -->
        <div class="insights-hero-card hero-taste">
          <div class="hero-card-glow"></div>
          <div class="hero-header-line">
            <span class="hero-label">Taste Benchmark</span>
            ${ratingBenchmark ? `<span class="hero-badge ${ratingBenchmark.class}" title="${h(ratingBenchmark.tip)}">${h(ratingBenchmark.text)}</span>` : ''}
          </div>
          <div class="hero-dual-stat">
            <div class="dual-stat-item">
              <span class="dual-val gold">🌟 ${avgUser || '—'}</span>
              <span class="dual-lbl">My Rating</span>
            </div>
            <div class="dual-divider">/</div>
            <div class="dual-stat-item">
              <span class="dual-val">⭐ ${avgTmdb || '—'}</span>
              <span class="dual-lbl">TMDB Global</span>
            </div>
          </div>
          <div class="hero-subtext">
            ${filteredRatings.length ? `Based on ${filteredRatings.length} rated titles` : 'Rate titles to unlock taste comparison'}
          </div>
        </div>

        <!-- Hero Card 4: Top Obsession -->
        <div class="insights-hero-card hero-passion">
          <div class="hero-card-glow"></div>
          <div class="hero-header-line">
            <span class="hero-label">Top Genre Obsession</span>
            <span class="hero-badge badge-purple">Primary Taste</span>
          </div>
          <div class="hero-stat-primary genre-title">${primaryGenre ? h(primaryGenre[0]) : 'Exploring'}</div>
          <div class="hero-subtext">
            ${primaryGenre ? `${primaryGenre[1]} titles (${pct(primaryGenre[1], filteredLib.length)}% of collection)` : 'Add more genres'}
          </div>
          <div class="hero-micro-track">
            <div class="hero-micro-fill purple" style="width:${primaryGenre ? Math.min(100, Math.round((primaryGenre[1] / filteredLib.length) * 100)) : 0}%"></div>
          </div>
        </div>
      </div>

      <!-- Compact Numbers Bar (Clickable Links) -->
      <div class="insights-kpi-bar">
        <div class="kpi-item insights-clickable" onclick="window.showView && window.showView('watchlist')" title="Click to view Watchlist">
          <span class="kpi-icon">📚</span>
          <div class="kpi-data">
            <span class="kpi-num">${filteredLib.length}</span>
            <span class="kpi-lbl">In Library ↗</span>
          </div>
        </div>
        <div class="kpi-item insights-clickable" onclick="window.showView && window.showView('history')" title="Click to view Watch History">
          <span class="kpi-icon">✅</span>
          <div class="kpi-data">
            <span class="kpi-num">${filteredHist.length || completedInLib}</span>
            <span class="kpi-lbl">Watched ↗</span>
          </div>
        </div>
        <div class="kpi-item insights-clickable" onclick="window.filterWatchlistStatus && window.filterWatchlistStatus('Planned')" title="Click to view Planned titles">
          <span class="kpi-icon">⏳</span>
          <div class="kpi-data">
            <span class="kpi-num">${toWatchCount}</span>
            <span class="kpi-lbl">Plan to Watch ↗</span>
          </div>
        </div>
        <div class="kpi-item insights-clickable" onclick="document.querySelector('.insights-in-progress-box')?.scrollIntoView({ behavior: 'smooth' })" title="Scroll to in-progress titles">
          <span class="kpi-icon">▶</span>
          <div class="kpi-data">
            <span class="kpi-num">${filteredInProgress.length}</span>
            <span class="kpi-lbl">In Progress ↗</span>
          </div>
        </div>
        <div class="kpi-item insights-clickable" onclick="window.showView && window.showView('watchlist')" title="Click to view rated titles in Watchlist">
          <span class="kpi-icon">⭐</span>
          <div class="kpi-data">
            <span class="kpi-num">${filteredRatings.length}</span>
            <span class="kpi-lbl">Rated ↗</span>
          </div>
        </div>
      </div>

      <!-- Charts & Visual Analytics Section -->
      <div class="insights-charts-grid">
        <!-- 1. Format Breakdown (Only on 'All' tab, or comparison) -->
        <div class="chart-box">
          <div class="chart-box-header">
            <h3>Format Breakdown</h3>
            <span class="chart-badge">${library.length} Total Titles</span>
          </div>
          <div class="bar-track multi">
            <div class="bar-seg" style="width:${pct(totalCounts.movie, library.length)}%;background:var(--red)" title="Movies ${pct(totalCounts.movie, library.length)}%"></div>
            <div class="bar-seg" style="width:${pct(totalCounts.tv, library.length)}%;background:var(--blue)" title="Series ${pct(totalCounts.tv, library.length)}%"></div>
            <div class="bar-seg" style="width:${pct(totalCounts.anime, library.length)}%;background:var(--purple)" title="Anime ${pct(totalCounts.anime, library.length)}%"></div>
          </div>
          <div class="format-legend-grid">
            <div class="legend-card" style="border-left-color:var(--red)">
              <div class="legend-card-title">🎬 Movies</div>
              <div class="legend-card-val">${totalCounts.movie} <span class="legend-pct">(${pct(totalCounts.movie, library.length)}%)</span></div>
            </div>
            <div class="legend-card" style="border-left-color:var(--blue)">
              <div class="legend-card-title">📺 Series</div>
              <div class="legend-card-val">${totalCounts.tv} <span class="legend-pct">(${pct(totalCounts.tv, library.length)}%)</span></div>
            </div>
            <div class="legend-card" style="border-left-color:var(--purple)">
              <div class="legend-card-title">🌸 Anime</div>
              <div class="legend-card-val">${totalCounts.anime} <span class="legend-pct">(${pct(totalCounts.anime, library.length)}%)</span></div>
            </div>
          </div>
        </div>

        <!-- 2. Watch Status Funnel -->
        <div class="chart-box">
          <div class="chart-box-header">
            <h3>Watch Journey Pipeline</h3>
            <span class="chart-badge">${filteredLib.length} Filtered</span>
          </div>
          <div class="status-pipeline-list">
            ${[
              { key: 'Completed', label: 'Completed', icon: '✅', color: 'var(--green)', count: byStatus.Completed || completedInLib },
              { key: 'Watching', label: 'Currently Watching', icon: '👁️', color: 'var(--orange)', count: byStatus.Watching || filteredInProgress.length },
              { key: 'Planned', label: 'Plan to Watch', icon: '📋', color: 'var(--blue)', count: byStatus.Planned || toWatchCount }
            ].map(item => {
              const p = filteredLib.length ? Math.round((item.count / filteredLib.length) * 100) : 0;
              return `
                <div class="status-bar-row insights-clickable" onclick="window.filterWatchlistStatus && window.filterWatchlistStatus('${item.key}')" title="Click to view ${h(item.label)} in Watchlist">
                  <span class="status-bar-label">${item.icon} ${h(item.label)} ↗</span>
                  <div class="status-bar-track">
                    <div class="status-bar-fill" style="width:${p}%;background:${item.color}"></div>
                  </div>
                  <div class="status-bar-count-group">
                    <span class="status-bar-count">${item.count}</span>
                    <span class="status-bar-pct">${p}%</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 3. Top Genres Leaderboard -->
        ${topGenres.length ? `
          <div class="chart-box">
            <div class="chart-box-header">
              <h3>Top Genres Leaderboard</h3>
              <span class="chart-badge">Taste Profile</span>
            </div>
            <div class="genre-rank-list">
              ${topGenres.map(([genreName, count], idx) => {
                const maxCount = topGenres[0][1] || 1;
                const fillPercent = Math.round((count / maxCount) * 100);
                const sharePercent = filteredLib.length ? Math.round((count / filteredLib.length) * 100) : 0;
                return `
                  <div class="genre-rank-row">
                    <span class="genre-rank-badge ${idx === 0 ? 'rank-gold' : idx === 1 ? 'rank-silver' : idx === 2 ? 'rank-bronze' : ''}">#${idx + 1}</span>
                    <span class="status-bar-label genre-name">${h(genreName)}</span>
                    <div class="status-bar-track">
                      <div class="status-bar-fill" style="width:${fillPercent}%;background:linear-gradient(90deg, var(--red) 0%, #f43f5e 100%)"></div>
                    </div>
                    <div class="status-bar-count-group">
                      <span class="status-bar-count">${count}</span>
                      <span class="status-bar-pct">${sharePercent}%</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <!-- 4. Star Ratings Distribution -->
        <div class="chart-box">
          <div class="chart-box-header">
            <h3>My Ratings Curve</h3>
            <span class="chart-badge">${filteredRatings.length} Rated</span>
          </div>
          ${filteredRatings.length ? `
            <div class="ratings-dist">
              ${(() => {
                const countsPerScore = {};
                let maxCount = 1;
                [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].forEach(score => {
                  const count = filteredRatings.filter(r => Math.round(r.rating) === score).length;
                  countsPerScore[score] = count;
                  if (count > maxCount) maxCount = count;
                });

                return [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(score => {
                  const count = countsPerScore[score];
                  const barW = filteredRatings.length ? Math.round((count / maxCount) * 100) : 0;
                  const isPeak = count > 0 && count === maxCount;
                  return `
                    <div class="ratings-dist-row ${isPeak ? 'rating-peak' : ''}">
                      <span class="ratings-dist-score">★${score}</span>
                      <div class="status-bar-track">
                        <div class="status-bar-fill" style="width:${barW}%;background:${score >= 8 ? 'var(--gold)' : score >= 6 ? 'var(--blue)' : 'var(--text-dim)'}"></div>
                      </div>
                      <div class="status-bar-count-group">
                        <span class="status-bar-count">${count}</span>
                        ${isPeak ? '<span class="peak-tag">Peak</span>' : ''}
                      </div>
                    </div>
                  `;
                }).join('');
              })()}
            </div>
          ` : `
            <div class="insights-empty-sub">
              <span class="empty-sub-icon">⭐</span>
              <p>You haven't rated any titles yet. Rate items with the star button on any movie, series, or anime card to see your personal rating curve.</p>
            </div>
          `}
        </div>

        <!-- 5. Release Era Timeline -->
        ${validYearsCount > 0 ? `
          <div class="chart-box">
            <div class="chart-box-header">
              <h3>Release Eras & Decades</h3>
              <span class="chart-badge">Favorite: ${topDecade ? h(topDecade[0]) : '—'}</span>
            </div>
            <div class="era-timeline-list">
              ${activeDecades.map(([era, count]) => {
                const maxEra = topDecade ? topDecade[1] || 1 : 1;
                const w = Math.round((count / maxEra) * 100);
                const share = Math.round((count / validYearsCount) * 100);
                return `
                  <div class="status-bar-row">
                    <span class="status-bar-label">${h(era)}</span>
                    <div class="status-bar-track">
                      <div class="status-bar-fill" style="width:${w}%;background:linear-gradient(90deg, var(--blue) 0%, #60a5fa 100%)"></div>
                    </div>
                    <div class="status-bar-count-group">
                      <span class="status-bar-count">${count}</span>
                      <span class="status-bar-pct">${share}%</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <!-- In Progress Quick Spotlight -->
      ${filteredInProgress.length ? `
        <div class="chart-box insights-in-progress-box">
          <div class="chart-box-header">
            <h3>▶ Resume Watching (${filteredInProgress.length})</h3>
            <span class="chart-badge">Active Sessions</span>
          </div>
          <div class="in-progress-list">
            ${filteredInProgress.slice(0, 6).map(p => `
              <div class="in-progress-row" data-id="${h(p.id)}" data-type="${h(p.type || 'movie')}">
                <img src="${h(p.poster || '')}" alt="${h(p.title || '')}" class="in-progress-poster"
                  onerror="this.onerror=null;this.src='https://placehold.co/60x90/1c1c1c/555?text=?'" loading="lazy">
                <div class="in-progress-info">
                  <div class="in-progress-title">${h(p.title || 'Unknown')}</div>
                  <div class="in-progress-meta">
                    ${p.season ? `<span class="in-progress-ep">S${p.season}:E${p.episode || 1}</span>` : ''}
                    <span class="in-progress-pct-badge">${Math.round(p.percent || 0)}% completed</span>
                  </div>
                  <div class="status-bar-track in-progress-track">
                    <div class="status-bar-fill" style="width:${Math.round(p.percent || 0)}%;background:var(--red)"></div>
                  </div>
                </div>
                <button class="btn-resume-play" data-id="${h(p.id)}" data-type="${h(p.type || 'movie')}" data-season="${p.season || ''}" data-episode="${p.episode || ''}" title="Resume Playback" aria-label="Resume ${h(p.title || '')}">
                  ▶ Resume
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Recently Watched Showcase -->
      ${filteredHist.length ? `
        <div class="chart-box insights-recent-box">
          <div class="chart-box-header">
            <h3>🕒 Recently Watched Showcase</h3>
            <span class="chart-badge">${filteredHist.length} Logged</span>
          </div>
          <div class="mini-grid">
            ${filteredHist.slice(0, 8).map(i => card(i)).join('')}
          </div>
        </div>
      ` : ''}
    `}
  `;

  // Attach event listener for tab filtering
  const filterBar = el.querySelector('#analyticsFilterBar');
  if (filterBar) {
    filterBar.addEventListener('click', e => {
      const btn = e.target.closest('.insights-filter-tab');
      if (!btn) return;
      const f = btn.dataset.filter;
      if (f && f !== currentFilter) {
        currentFilter = f;
        renderAnalytics();
      }
    });
  }

  // Attach event listeners for Resume Play buttons
  el.querySelectorAll('.btn-resume-play').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const type = btn.dataset.type || 'movie';
      const season = btn.dataset.season ? Number(btn.dataset.season) : null;
      const episode = btn.dataset.episode ? Number(btn.dataset.episode) : null;
      if (typeof openWatchView === 'function') {
        openWatchView(type, id, { season, episode });
      } else if (window.openWatchView) {
        window.openWatchView(type, id, { season, episode });
      }
    });
  });

  // Clicking an in-progress row opens details modal
  el.querySelectorAll('.in-progress-row').forEach(row => {
    row.addEventListener('click', e => {
      if (e.target.closest('.btn-resume-play')) return;
      const id = row.dataset.id;
      const type = row.dataset.type || 'movie';
      if (id) {
        const p = inProgress.find(x => String(x.id) === String(id) && (x.type || 'movie') === type);
        const modalFn = typeof openModal === 'function' ? openModal : window.openModal;
        if (modalFn) {
          modalFn({
            id,
            type,
            title: p?.title || '',
            poster: p?.poster || '',
            backdrop: p?.backdrop || '',
            overview: ''
          });
        }
      }
    });
  });

  // Animate progress bars smoothly
  requestAnimationFrame(() => {
    el.querySelectorAll('.status-bar-fill, .hero-micro-fill').forEach(b => {
      const w = b.style.width;
      b.style.width = '0%';
      requestAnimationFrame(() => {
        b.style.transition = 'width 0.85s cubic-bezier(0.16, 1, 0.3, 1)';
        b.style.width = w;
      });
    });
  });
}

