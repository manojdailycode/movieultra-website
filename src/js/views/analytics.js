'use strict';

import { card } from '../components/card.js';
import { state as libState } from '../store/library.js';
import { state as histState } from '../store/history.js';
import { getStats as getSeriesStats } from '../store/seriesTracker.js';
import { getStats as getAnimeStats } from '../store/animeTracker.js';

export function renderAnalytics() {
  const el = document.getElementById('analyticsContent');
  if (!el) return;

  const library = libState.library;
  const watchHist = histState.watchHist;

  if (!library.length) {
    el.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: var(--text-dim);">
        <span style="font-size: 48px; display: block; margin-bottom: 15px;">📊</span>
        <p style="font-size: 15px; font-weight: 500;">No analytics available yet.</p>
        <p style="font-size: 13px; opacity: 0.7; margin-top: 5px;">Add movies, anime, or series to your library to unlock insights.</p>
      </div>
    `;
    return;
  }

  // 1. Calculations
  const counts = library.reduce((acc, curr) => {
    acc[curr.type] = (acc[curr.type] || 0) + 1;
    return acc;
  }, { movie: 0, tv: 0, anime: 0 });

  const ratedItems = library.filter(i => i.rating && !isNaN(parseFloat(i.rating)) && parseFloat(i.rating) > 0);
  const avgRating = ratedItems.length 
    ? (ratedItems.reduce((acc, curr) => acc + parseFloat(curr.rating), 0) / ratedItems.length).toFixed(1) 
    : 'N/A';

  // 2. Trackers & Streaks Stats
  const seriesStats = getSeriesStats();
  const animeStats = getAnimeStats();
  
  // 3. Time Spent Watching Calculation
  // Estimates: Movies = 100 min (if no specific runtime cached), Series Ep = 40 min, Anime Ep = 24 min
  const movieRuntimes = library
    .filter(i => i.type === 'movie' && i.status === 'Completed')
    .reduce((acc, curr) => acc + (curr.runtime && !isNaN(parseInt(curr.runtime)) ? parseInt(curr.runtime) : 100), 0);
  const seriesEpisodes = seriesStats.watchedEpisodes || 0;
  const animeEpisodes = animeStats.watchedEpisodes || 0;

  const totalMin = movieRuntimes + (seriesEpisodes * 40) + (animeEpisodes * 24);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  
  let watchTimeStr = '';
  if (days > 0) watchTimeStr += `${days}d `;
  if (hours > 0 || days > 0) watchTimeStr += `${hours}h `;
  watchTimeStr += `${mins}m`;

  const watchHistIds = new Set(watchHist.map(i => String(i.id)));
  const toWatchCount = library.filter(i => !watchHistIds.has(String(i.id))).length;
  const pct = n => library.length ? ((n / library.length) * 100).toFixed(1) : 0;

  const byStatus = library.reduce((acc, curr) => {
    const s = curr.status || 'Planned';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  // 4. Rating Distribution (1 to 10 Scale)
  const ratingFreq = Array(11).fill(0); // Index 0-10, we ignore 0
  ratedItems.forEach(item => {
    const r = Math.round(parseFloat(item.rating));
    if (r >= 1 && r <= 10) ratingFreq[r]++;
  });
  const maxFreq = Math.max(...ratingFreq, 1);

  // 5. Platform Breakdown
  const platformCounts = library.reduce((acc, curr) => {
    if (curr.platform) {
      const p = curr.platform.trim();
      acc[p] = (acc[p] || 0) + 1;
    }
    return acc;
  }, {});
  const platformsSorted = Object.entries(platformCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const platformColors = {
    'Netflix': '#e50914',
    'Amazon': '#00a8e1',
    'Amazon Prime': '#00a8e1',
    'Crunchyroll': '#f47521',
    'Disney+': '#113ccf',
    'Apple TV': '#ffffff',
    'YouTube': '#ff0000',
    'Hulu': '#1ce783',
    'Plex': '#e5a93b'
  };

  el.innerHTML = `
    <!-- ROW 1: PRIMARY COUNTERS -->
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon">📚</div><div class="stat-num">${library.length}</div><div class="stat-lbl">Library Size</div></div>
      <div class="stat-card accent-green"><div class="stat-icon">⏱</div><div class="stat-num" style="font-size: 18px; line-height: 24px; padding: 2px 0;">${watchTimeStr}</div><div class="stat-lbl">Time Spent</div></div>
      <div class="stat-card"><div class="stat-icon">⏳</div><div class="stat-num">${toWatchCount}</div><div class="stat-lbl">To Watch</div></div>
      <div class="stat-card"><div class="stat-icon">⭐</div><div class="stat-num">${avgRating}</div><div class="stat-lbl">Avg Rating</div></div>
    </div>

    <!-- ROW 2: EPISODE COUNT CARDS -->
    <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); margin-top: 15px;">
      <div class="stat-card"><div class="stat-icon">🎬</div><div class="stat-num">${counts.movie}</div><div class="stat-lbl">Movies</div></div>
      <div class="stat-card"><div class="stat-icon">📺</div><div class="stat-num">${seriesEpisodes}</div><div class="stat-lbl">Series Episodes</div></div>
      <div class="stat-card accent-purple"><div class="stat-icon">🌸</div><div class="stat-num">${animeEpisodes}</div><div class="stat-lbl">Anime Episodes</div></div>
    </div>

    <!-- STREAKS DASHBOARD -->
    <div class="chart-box">
      <h3>🔥 Tracking Milestones</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px;">
        <div style="background: var(--surface2); padding: 12px; border-radius: var(--r); text-align: center; border: 1px solid var(--border2);">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: var(--text-dim); letter-spacing: 0.5px; margin-bottom: 4px;">Series Streak</div>
          <div style="font-size: 20px; font-weight: 900; color: var(--orange);">${seriesStats.currentStreak || 0}d</div>
          <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">Longest: ${seriesStats.longestStreak || 0}d</div>
        </div>
        <div style="background: var(--surface2); padding: 12px; border-radius: var(--r); text-align: center; border: 1px solid var(--border2);">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: var(--text-dim); letter-spacing: 0.5px; margin-bottom: 4px;">Anime Streak</div>
          <div style="font-size: 20px; font-weight: 900; color: var(--purple);">${animeStats.currentStreak || 0}d</div>
          <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">Longest: ${animeStats.longestStreak || 0}d</div>
        </div>
      </div>
    </div>

    <!-- RATING DISTRIBUTION CHART -->
    <div class="chart-box">
      <h3>📊 Rating Distribution</h3>
      <div class="rating-chart-container" style="display: flex; align-items: flex-end; justify-content: space-between; height: 120px; padding: 15px 5px 5px 5px; margin-top: 15px; border-bottom: 1px solid var(--border);">
        ${Array.from({ length: 10 }, (_, i) => i + 1).map(val => {
          const count = ratingFreq[val];
          const heightPct = count > 0 ? (count / maxFreq) * 100 : 0;
          return `
            <div class="rating-bar-wrap" style="flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end;">
              <div class="rating-bar-val" style="font-size: 9px; font-weight: 700; color: var(--text-dim); margin-bottom: 4px; visibility: ${count > 0 ? 'visible' : 'hidden'};">${count}</div>
              <div class="rating-bar" style="width: 60%; max-width: 20px; height: ${heightPct}%; background: var(--red); border-radius: 4px 4px 0 0; transition: height 0.6s ease; opacity: 0.85;" title="${count} titles rated ${val}"></div>
              <div class="rating-label" style="font-size: 10px; font-weight: 600; color: var(--text-dim); margin-top: 6px;">${val}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- CATEGORY DISTRIBUTION BAR -->
    <div class="chart-box">
      <h3>Library Breakdown</h3>
      <div class="bar-labels">
        <span>🎬 Movies ${pct(counts.movie)}%</span>
        <span>📺 Series ${pct(counts.tv)}%</span>
        <span>🌸 Anime ${pct(counts.anime)}%</span>
      </div>
      <div class="bar-track">
        <div class="bar-seg" style="width:${pct(counts.movie)}%;background:var(--red)"></div>
        <div class="bar-seg" style="width:${pct(counts.tv)}%;background:var(--blue)"></div>
        <div class="bar-seg" style="width:${pct(counts.anime)}%;background:var(--purple)"></div>
      </div>
    </div>

    <!-- WATCH STATUS TRACKS -->
    <div class="chart-box">
      <h3>By Status</h3>
      ${['Completed', 'Watching', 'Planned'].map(s => `
        <div style="display:grid;grid-template-columns:90px 1fr 36px;align-items:center;gap:10px;margin-bottom:10px">
          <span style="font-size:12px;color:var(--text-dim);font-weight:600">${s === 'Completed' ? '✅' : s === 'Watching' ? '👁' : '📋'} ${s}</span>
          <div style="height:8px;background:var(--surface3);border-radius:99px;overflow:hidden">
            <div style="height:100%;width:${library.length ? ((byStatus[s] || 0) / library.length * 100).toFixed(0) : 0}%;background:${s === 'Completed' ? 'var(--green)' : s === 'Watching' ? 'var(--orange)' : 'var(--blue)'};border-radius:99px;transition:width .85s"></div>
          </div>
          <span style="font-size:12px;color:var(--text-dim);font-weight:700;text-align:right">${byStatus[s] || 0}</span>
        </div>`).join('')}
    </div>

    <!-- PLATFORM ANALYSIS -->
    ${platformsSorted.length ? `
      <div class="chart-box">
        <h3>📡 Favorite Platforms</h3>
        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
          ${platformsSorted.map(([plat, count]) => {
            const pctVal = ((count / library.length) * 100).toFixed(0);
            const color = platformColors[plat] || 'var(--text-dim)';
            return `
              <div style="display: grid; grid-template-columns: 100px 1fr 30px; align-items: center; gap: 12px;">
                <span style="font-size: 12px; font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${plat}</span>
                <div style="height: 6px; background: var(--surface3); border-radius: 99px; overflow: hidden;">
                  <div style="height: 100%; width: ${pctVal}%; background: ${color}; border-radius: 99px;"></div>
                </div>
                <span style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-align: right;">${count}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    ` : ''}

    <!-- RECENTLY WATCHED ITEMS -->
    ${watchHist.length ? `<div class="chart-box"><h3>Recently Watched</h3><div class="mini-grid">${watchHist.slice(0, 6).map(i => card(i)).join('')}</div></div>` : ''}
  `;
}
