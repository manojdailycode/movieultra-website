'use strict';

import { state as libState, libHas, saveLib, clearLibraryDirect } from '../store/library.js';
import { state as histState, histClearDirect } from '../store/history.js';
import { saveTheme } from '../store/user.js';
import { updateSbUser } from '../components/sidebar.js';
import { toast } from '../components/toast.js';
import { formatDate } from '../utils/date.js';

export const THEME_META = {
  dark: '#0f0f0f',
  light: '#f0f0f0',
  amoled: '#000000',
  cinema: '#050a14',
  blue: '#f0f4f8',
  forest: '#0e160e',
  cyberpunk: '#020005',
  sakura: '#fff2f5',
  sunset: '#14110f'
};

export function applyTheme(next) {
  const valid = ['dark', 'light', 'amoled', 'cinema', 'blue', 'forest', 'cyberpunk', 'sakura', 'sunset'];
  if (!valid.includes(next)) next = 'dark';
  
  document.documentElement.dataset.theme = next;
  saveTheme(next);

  const metaTheme = document.getElementById('metaTheme');
  if (metaTheme) metaTheme.content = THEME_META[next] || '#0f0f0f';

  const activeView = window.activeView || 'settings';
  if (activeView === 'settings') {
    renderSettings();
  }
}

export function toggleTheme() {
  const cur = document.documentElement.dataset.theme || 'dark';
  const cycle = ['dark', 'light', 'amoled', 'cinema', 'blue', 'forest', 'cyberpunk', 'sakura', 'sunset'];
  const next = cycle[(cycle.indexOf(cur) + 1) % cycle.length];
  applyTheme(next);
}

export function renderSettings() {
  const el = document.getElementById('settingsContent');
  if (!el) return;

  const theme = document.documentElement.dataset.theme || 'dark';
  const themeNames = {
    dark: 'Dark 🌑',
    light: 'Light ☀️',
    amoled: 'AMOLED ⚫',
    cinema: 'Cinema 🎥',
    blue: 'Blue 🔵',
    forest: 'Forest 🌲',
    cyberpunk: 'Cyberpunk 👾',
    sakura: 'Sakura 🌸',
    sunset: 'Sunset 🌇'
  };
  const swatchColors = {
    dark: '#1c1c1c',
    light: '#f0f0f0',
    amoled: '#000000',
    cinema: '#0e1829',
    blue: '#3b82f6',
    forest: '#1c2d1c',
    cyberpunk: '#1c0038',
    sakura: '#ffffff',
    sunset: '#2b221c'
  };
  const themes = ['dark', 'light', 'amoled', 'cinema', 'blue', 'forest', 'cyberpunk', 'sakura', 'sunset'];
  const library = libState.library;
  const watchHist = histState.watchHist;

  el.innerHTML = `
    <div class="setting-row">
      <div><div class="setting-lbl">🎨 Theme</div><div class="setting-desc">${themeNames[theme] || theme} — tap a swatch to switch</div></div>
      <div class="theme-swatches">
        ${themes.map(t => `<div class="theme-swatch${t === theme ? ' active' : ''}" data-theme-pick="${t}" title="${themeNames[t]}" style="background:${swatchColors[t]};border-color:${t === theme ? 'var(--text)' : 'var(--border)'}" aria-label="Switch to ${t} theme"></div>`).join('')}
      </div>
    </div>
    <div class="setting-row">
      <div><div class="setting-lbl">👤 Edit Profile</div><div class="setting-desc">Change avatar, name, bio, genre</div></div>
      <button class="btn-ghost btn-sm" id="st-editprofile">Edit →</button>
    </div>
    <div class="setting-row">
      <div><div class="setting-lbl">📤 Export Library</div><div class="setting-desc">${library.length} items — Pro schema (9 columns)</div></div>
      <div class="setting-actions">
        <button class="btn-ghost btn-sm" id="st-csv">CSV</button>
        <button class="btn-blue btn-sm" id="st-excel">Excel ✦</button>
      </div>
    </div>
    <div class="setting-row">
      <div><div class="setting-lbl">📋 Download Template</div><div class="setting-desc">Blank Excel template for manual entry</div></div>
      <button class="btn-ghost btn-sm" id="st-template">Template</button>
    </div>
    <div class="setting-row">
      <div><div class="setting-lbl">📥 Import Library</div><div class="setting-desc">CSV or Excel (supports both schemas)</div></div>
      <label class="btn-ghost btn-sm" style="cursor:pointer">Import<input type="file" id="importFile" accept=".csv,.xlsx,.xls" style="display:none" aria-label="Import library file"></label>
    </div>
    <div class="setting-row">
      <div><div class="setting-lbl">🗑️ Clear Library</div><div class="setting-desc">${library.length} items</div></div>
      <button class="btn-danger btn-sm" id="st-clearlib">Clear All</button>
    </div>
    <div class="setting-row">
      <div><div class="setting-lbl">🕒 Clear History</div><div class="setting-desc">${watchHist.length} items</div></div>
      <button class="btn-danger btn-sm" id="st-clearhist">Clear</button>
    </div>
    <div class="setting-row" id="st-pwaRow" style="display:none">
      <div><div class="setting-lbl">📲 Install App</div><div class="setting-desc">Add to home screen</div></div>
      <button class="btn-primary btn-sm" id="st-pwa">Install</button>
    </div>
    <div class="setting-row">
      <div><div class="setting-lbl">ℹ️ About</div><div class="setting-desc">MovieUltra v2.0.0 · TMDB + Jikan APIs</div></div>
      <span style="font-size:12px;color:var(--text-muted)">v2.0.0</span>
    </div>`;

  // Dynamic PWA button visibility check
  if (window.deferredPWA) {
    const pwaRow = document.getElementById('st-pwaRow');
    if (pwaRow) pwaRow.style.display = 'flex';
  }

  // Bind Swatches
  el.querySelectorAll('[data-theme-pick]').forEach(sw => {
    sw.addEventListener('click', () => applyTheme(sw.dataset.themePick));
  });

  // Bind Clicks
  document.getElementById('st-editprofile')?.addEventListener('click', () => {
    if (window.openEditProfile) window.openEditProfile();
  });
  document.getElementById('st-csv')?.addEventListener('click', exportCSV);
  document.getElementById('st-excel')?.addEventListener('click', exportExcelPro);
  document.getElementById('st-template')?.addEventListener('click', downloadTemplate);
  
  document.getElementById('st-clearlib')?.addEventListener('click', () => {
    if (!confirm(`Delete all ${libState.library.length} items?`)) return;
    clearLibraryDirect();
    toast('Library cleared', 'info');
    renderSettings();
    updateSbUser();
  });

  document.getElementById('st-clearhist')?.addEventListener('click', () => {
    if (!confirm('Clear all watch history?')) return;
    histClearDirect();
    toast('History cleared', 'info');
    renderSettings();
  });

  document.getElementById('st-pwa')?.addEventListener('click', () => {
    if (window.installPWA) window.installPWA();
  });

  document.getElementById('importFile')?.addEventListener('change', function() {
    importLibrary(this);
  });
}

export function exportCSV() {
  const library = libState.library;
  if (!library.length) {
    toast('Library is empty', 'info');
    return;
  }
  const typeMap = { movie: 'Movie', tv: 'WebSeries', anime: 'Anime' };
  const rows = [
    ['S.No', 'Date', 'Type', 'Name', 'Rating', 'Genre', 'Platform', 'Status', 'Note'],
    ...library.map((i, idx) => [
      idx + 1,
      formatDate(i.addedAt),
      typeMap[i.type] || 'Movie',
      i.title,
      i.rating && !isNaN(parseFloat(i.rating)) ? parseFloat(i.rating) : '',
      i.genre || '',
      i.platform || '',
      i.status || 'Planned',
      i.note || ''
    ].map(v => `"${String(v).replace(/"/g, '""')}"`))
  ];
  downloadHelper(new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' }), 'MovieUltra_Library.csv');
  toast('Exported CSV ✓');
}

export function exportExcelPro() {
  const library = libState.library;
  if (!library.length) {
    toast('Library is empty', 'info');
    return;
  }
  if (typeof window.XLSX === 'undefined') {
    toast('XLSX not loaded', 'err');
    return;
  }

  const typeMap = { movie: 'Movie', tv: 'WebSeries', anime: 'Anime' };

  const headers = ['S.No', 'Date', 'Type', 'Name', 'Rating', 'Genre', 'Platform', 'Status', 'Note'];
  const rows = library.map((i, idx) => [
    idx + 1,
    formatDate(i.addedAt),
    typeMap[i.type] || 'Movie',
    i.title || '',
    i.rating && !isNaN(parseFloat(i.rating)) ? parseFloat(i.rating) : '',
    i.genre || '',
    i.platform || '',
    i.status || 'Planned',
    i.note || ''
  ]);

  const XLSX = window.XLSX;
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  ws['!cols'] = [
    { wch: 6 },
    { wch: 13 },
    { wch: 10 },
    { wch: 30 },
    { wch: 8 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 30 },
  ];

  const headerStyle = {
    font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: 'C0392B' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: { bottom: { style: 'medium', color: { rgb: '922B21' } } }
  };
  headers.forEach((_, ci) => {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c: ci })];
    if (cell) cell.s = headerStyle;
  });

  rows.forEach((_, ri) => {
    headers.forEach((_, ci) => {
      const cell = ws[XLSX.utils.encode_cell({ r: ri + 1, c: ci })];
      if (cell) cell.s = { fill: { fgColor: { rgb: ri % 2 === 0 ? 'FDF2F8' : 'FFFFFF' } }, alignment: { vertical: 'center' } };
    });
  });

  ws['C1'].c = [{ t: 'Type options: Movie, Anime, WebSeries' }];
  ws['H1'].c = [{ t: 'Status options: Watching, Completed, Planned' }];
  ws['E1'].c = [{ t: 'Rating: numeric value 1-10' }];

  const instr = [
    ['MovieUltra v2.0.0 — Library Template'],
    [''],
    ['Column', 'Format / Options', 'Example'],
    ['S.No', 'Auto-increment number', '1'],
    ['Date', 'DD-MM-YYYY', '22-10-2026'],
    ['Type', 'Movie | Anime | WebSeries', 'Movie'],
    ['Name', 'Title of movie/anime/series', 'Interstellar'],
    ['Rating', 'Number 1–10', '9'],
    ['Genre', 'Text', 'Sci-Fi'],
    ['Platform', 'Netflix | Amazon | Crunchyroll | Disney+ | etc.', 'Netflix'],
    ['Status', 'Watching | Completed | Planned', 'Completed'],
    ['Note', 'Short personal comment', 'Amazing visuals'],
    [''],
    ['Example Rows:'],
    ['1', '22-10-2026', 'Movie', 'Interstellar', '9', 'Sci-Fi', 'Netflix', 'Completed', 'Amazing'],
    ['2', '20-10-2026', 'Anime', 'Naruto', '8', 'Action', 'Crunchyroll', 'Watching', 'Long series'],
    ['3', '18-10-2026', 'WebSeries', 'Breaking Bad', '9.5', 'Drama', 'Netflix', 'Completed', 'Greatest ever'],
  ];
  const wsI = XLSX.utils.aoa_to_sheet(instr);
  wsI['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 30 }];
  if (wsI['A1']) wsI['A1'].s = { font: { bold: true, sz: 14, color: { rgb: 'C0392B' } } };
  if (wsI['A3']) wsI['A3'].s = { font: { bold: true }, fill: { fgColor: { rgb: 'ECF0F1' } } };
  if (wsI['B3']) wsI['B3'].s = { font: { bold: true }, fill: { fgColor: { rgb: 'ECF0F1' } } };
  if (wsI['C3']) wsI['C3'].s = { font: { bold: true }, fill: { fgColor: { rgb: 'ECF0F1' } } };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Library');
  XLSX.utils.book_append_sheet(wb, wsI, 'Instructions');
  XLSX.writeFile(wb, 'MovieUltra_Library.xlsx');
  toast('Exported Excel Pro ✓ (9-col schema)');
}

export function downloadTemplate() {
  if (typeof window.XLSX === 'undefined') {
    toast('XLSX not loaded', 'err');
    return;
  }
  const headers = ['S.No', 'Date', 'Type', 'Name', 'Rating', 'Genre', 'Platform', 'Status', 'Note'];
  const examples = [
    [1, '22-10-2026', 'Movie', 'Interstellar', 9, 'Sci-Fi', 'Netflix', 'Completed', 'Amazing visuals'],
    [2, '20-10-2026', 'Anime', 'Naruto', 8, 'Action', 'Crunchyroll', 'Watching', 'Long but great'],
    [3, '18-10-2026', 'WebSeries', 'Breaking Bad', 9.5, 'Drama', 'Netflix', 'Completed', 'Greatest TV ever'],
  ];
  const XLSX = window.XLSX;
  const ws = XLSX.utils.aoa_to_sheet([headers, ...examples]);
  ws['!cols'] = [{ wch: 6 }, { wch: 13 }, { wch: 12 }, { wch: 30 }, { wch: 8 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 30 }];
  const hStyle = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: 'C0392B' } }, alignment: { horizontal: 'center' } };
  headers.forEach((_, ci) => {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c: ci })];
    if (cell) cell.s = hStyle;
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Library Template');
  XLSX.writeFile(wb, 'MovieUltra_Template.xlsx');
  toast('Template downloaded ✓');
}

export async function importLibrary(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = '';
  try {
    let rows = [];
    if (file.name.endsWith('.csv')) {
      rows = await parseCSV(file);
    } else {
      if (typeof window.XLSX === 'undefined') {
        toast('XLSX not loaded', 'err');
        return;
      }
      rows = await parseExcel(file);
    }
    const typeRev = { Movie: 'movie', Anime: 'anime', WebSeries: 'tv', TV: 'tv', Series: 'tv', movie: 'movie', anime: 'anime', tv: 'tv' };
    let added = 0;
    rows.forEach(row => {
      const normRow = {};
      for (const key in row) {
        if (Object.prototype.hasOwnProperty.call(row, key)) {
          normRow[key.toLowerCase()] = row[key];
        }
      }
      
      const name = (normRow.name || normRow.title || '').trim();
      if (!name) return;
      const rawDate = normRow.date || '';
      let addedAt = new Date().toISOString();
      if (rawDate) {
        const parts = String(rawDate).split('-');
        if (parts.length === 3) {
          const [dd, mm, yyyy] = parts.map(Number);
          const d = new Date(yyyy, mm - 1, dd);
          if (!isNaN(d.getTime())) addedAt = d.toISOString();
        }
      }
      const item = {
        id: null,
        title: name,
        year: String(normRow.year || addedAt.slice(0, 4) || 'N/A').trim(),
        type: typeRev[String(normRow.type || 'movie').trim()] || 'movie',
        rating: String(normRow.rating || 'N/A').trim(),
        poster: String(normRow.poster || '').trim() || 'https://placehold.co/300x450/1c1c1c/555?text=No+Image',
        backdrop: '',
        overview: '',
        genre: String(normRow.genre || '').trim(),
        platform: String(normRow.platform || '').trim(),
        status: String(normRow.status || 'Planned').trim(),
        note: String(normRow.note || '').trim(),
        addedAt,
      };
      if (!libHas(null, item.title)) {
        libState.library.push(item);
        added++;
      }
    });
    saveLib();
    updateSbUser();
    toast(`Imported ${added} item${added !== 1 ? 's' : ''} ✓`);
    
    const activeView = window.activeView || 'settings';
    if (activeView === 'settings') renderSettings();
  } catch (err) {
    console.error('[MovieUltra] Import failed:', err);
    toast('Import failed — check file format', 'err');
  }
}

function parseCSV(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const lines = r.result.split('\n').filter(l => l.trim());
      if (!lines.length) return resolve([]);
      const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
      resolve(lines.slice(1).map(line => {
        const vals = [];
        let cur = '', inQ = false;
        for (const ch of line) {
          if (ch === '"') inQ = !inQ;
          else if (ch === ',' && !inQ) {
            vals.push(cur);
            cur = '';
          } else cur += ch;
        }
        vals.push(cur);
        return Object.fromEntries(headers.map((k, i) => [k, (vals[i] || '').trim()]));
      }));
    };
    r.onerror = reject;
    r.readAsText(file);
  });
}

function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = e => {
      try {
        const wb = window.XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        resolve(window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]));
      } catch (err) {
        reject(err);
      }
    };
    r.onerror = reject;
    r.readAsArrayBuffer(file);
  });
}

function downloadHelper(blob, name) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    document.body.removeChild(a);
  }, 2000);
}

export function initSettingsListeners() {
  // Listeners are dynamically bound in renderSettings to handle theme selector switches and options correctly.
}
