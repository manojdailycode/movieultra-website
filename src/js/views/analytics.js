'use strict';

import { card } from '../components/card.js';
import { state as libState } from '../store/library.js';
import { state as histState } from '../store/history.js';

export function renderAnalytics() {
  const el = document.getElementById('analyticsContent');
  if (!el) return;

  const library = libState.library;
  const watchHist = histState.watchHist;

  if (!library.length) {
    el.innerHTML = '<p class="placeholder-msg" style="margin-top:20px">Add titles to see analytics.</p>';
    return;
  }

  const counts = library.reduce((a, c) => {
    a[c.type] = (a[c.type] || 0) + 1;
    return a;
  }, { movie: 0, tv: 0, anime: 0 });

  const rated = library.filter(i => parseFloat(i.rating) > 0);
  const avg = rated.length 
    ? (rated.reduce((a, c) => a + parseFloat(c.rating), 0) / rated.length).toFixed(1) 
    : 'N/A';

  const wIds = new Set(watchHist.map(i => String(i.id)));
  const toW = library.filter(i => !wIds.has(String(i.id))).length;
  const pct = n => library.length ? ((n / library.length) * 100).toFixed(1) : 0;
  const byStatus = library.reduce((a, c) => {
    const s = c.status || 'Planned';
    a[s] = (a[s] || 0) + 1;
    return a;
  }, {});

  el.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon">📚</div><div class="stat-num">${library.length}</div><div class="stat-lbl">Library</div></div>
      <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-num">${watchHist.length}</div><div class="stat-lbl">Watched</div></div>
      <div class="stat-card"><div class="stat-icon">⏳</div><div class="stat-num">${toW}</div><div class="stat-lbl">To Watch</div></div>
      <div class="stat-card"><div class="stat-icon">⭐</div><div class="stat-num">${avg}</div><div class="stat-lbl">Avg Rating</div></div>
      <div class="stat-card"><div class="stat-icon">🎬</div><div class="stat-num">${counts.movie}</div><div class="stat-lbl">Movies</div></div>
      <div class="stat-card"><div class="stat-icon">📺</div><div class="stat-num">${counts.tv}</div><div class="stat-lbl">Series</div></div>
    </div>
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
    ${watchHist.length ? `<div class="chart-box"><h3>Recently Watched</h3><div class="mini-grid">${watchHist.slice(0, 6).map(i => card(i)).join('')}</div></div>` : ''}`;
}
