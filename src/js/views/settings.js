'use strict';

import { state as libState, libHas, saveLib, clearLibraryDirect } from '../store/library.js';
import { state as histState, histClearDirect, saveHist } from '../store/history.js';
import { seriesState } from '../store/seriesTracker.js';
import { animeState } from '../store/animeTracker.js';
import { configState, configKeys, saveConfig, resetAllConfig } from '../store/config.js';
import { writeStorage, SK } from '../utils/storage.js';
import { storeEvents } from '../store/events.js';
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
    <!-- SECTION 1: APPEARANCE -->
    <div class="settings-section">
      <h3 class="settings-sec-title">🎨 Appearance</h3>
      <div class="setting-row">
        <div><div class="setting-lbl">Theme</div><div class="setting-desc">${themeNames[theme] || theme} — tap a swatch to switch</div></div>
        <div class="theme-swatches">
          ${themes.map(t => `<div class="theme-swatch${t === theme ? ' active' : ''}" data-theme-pick="${t}" title="${themeNames[t]}" style="background:${swatchColors[t]};border-color:${t === theme ? 'var(--text)' : 'var(--border)'}" aria-label="Switch to ${t} theme"></div>`).join('')}
        </div>
      </div>
      <div class="setting-row">
        <div><div class="setting-lbl">Edit Profile</div><div class="setting-desc">Change avatar, name, bio, favorite genre</div></div>
        <button class="btn-ghost btn-sm" id="st-editprofile">Edit Profile →</button>
      </div>
    </div>

    <!-- SECTION 2: STANDALONE CLIENT & CUSTOM API KEYS -->
    <div class="settings-section">
      <h3 class="settings-sec-title">🔑 Custom API Keys (Standalone Client)</h3>
      <div class="setting-row">
        <div>
          <div class="setting-lbl">Use Custom API Keys</div>
          <div class="setting-desc">Bypass server proxies and use your own client-side API keys.</div>
        </div>
        <label class="switch-container">
          <input type="checkbox" id="use-custom-keys-chk" ${configState.useCustomKeys ? 'checked' : ''}>
          <span class="switch-slider"></span>
        </label>
      </div>
      
      <div id="custom-keys-panel" class="${configState.useCustomKeys ? '' : 'hidden'}" style="margin-top: 15px; padding: 15px; background: var(--bg2); border: 1px solid var(--border); border-radius: var(--r); display: flex; flex-direction: column; gap: 12px;">
        <div class="ep-field" style="margin-bottom: 0;">
          <label for="custom-tmdb-key-input">TMDB v3 API Key</label>
          <input type="text" id="custom-tmdb-key-input" value="${configState.tmdbKey}" placeholder="Paste TMDB API Key...">
        </div>
        <p style="font-size: 11px; color: var(--text-dim); margin-top: -4px;">Used directly for searching movies, anime, and series.</p>

        <div style="border-top: 1px dashed var(--border); margin: 6px 0;"></div>
        <div class="ep-title" style="font-size: 12px; font-weight: 700; color: var(--text); text-transform: uppercase; letter-spacing: 0.5px;">Firebase Realtime Sync</div>
        
        <div class="ep-field" style="margin-bottom: 0;">
          <label for="custom-firebase-api-key">Firebase API Key</label>
          <input type="text" id="custom-firebase-api-key" value="${configState.firebaseConfig.apiKey}" placeholder="API Key">
        </div>
        <div class="ep-field" style="margin-bottom: 0;">
          <label for="custom-firebase-project-id">Firebase Project ID</label>
          <input type="text" id="custom-firebase-project-id" value="${configState.firebaseConfig.projectId}" placeholder="movieultra-xxxx">
        </div>
        <div class="ep-field" style="margin-bottom: 0;">
          <label for="custom-firebase-app-id">Firebase App ID</label>
          <input type="text" id="custom-firebase-app-id" value="${configState.firebaseConfig.appId}" placeholder="1:xxxx:web:xxxx">
        </div>
        <button class="btn-blue btn-sm" id="st-save-api-keys" style="align-self: flex-start; margin-top: 5px;">Save Key Config</button>
      </div>
    </div>

    <!-- SECTION 3: BACKUP & RECOVERY -->
    <div class="settings-section">
      <h3 class="settings-sec-title">🔄 Backup & Portability</h3>
      <div class="setting-row">
        <div><div class="setting-lbl">Full JSON Backup</div><div class="setting-desc">Download all tracking history, episode lists, reviews, and library state in one file.</div></div>
        <button class="btn-blue btn-sm" id="st-export-json">Export JSON Backup ✦</button>
      </div>
      <div class="setting-row">
        <div><div class="setting-lbl">Restore JSON Backup</div><div class="setting-desc">Restore a previously saved full workspace JSON backup.</div></div>
        <label class="btn-ghost btn-sm" style="cursor:pointer">Restore Backup<input type="file" id="importFullJsonFile" accept=".json" style="display:none" aria-label="Import full json backup"></label>
      </div>
      <div class="setting-row">
        <div><div class="setting-lbl">Export Library (Classic)</div><div class="setting-desc">Export current watchlist catalog to Excel/CSV.</div></div>
        <div class="setting-actions">
          <button class="btn-ghost btn-sm" id="st-csv">CSV</button>
          <button class="btn-ghost btn-sm" id="st-excel">Excel</button>
        </div>
      </div>
      <div class="setting-row">
        <div><div class="setting-lbl">Download Import Template</div><div class="setting-desc">Blank Excel sheet for manual catalog entry.</div></div>
        <button class="btn-ghost btn-sm" id="st-template">Get Template</button>
      </div>
      <div class="setting-row">
        <div><div class="setting-lbl">Import Library (Classic)</div><div class="setting-desc">Import titles list from Excel or CSV sheet.</div></div>
        <label class="btn-ghost btn-sm" style="cursor:pointer">Import CSV/Excel<input type="file" id="importFile" accept=".csv,.xlsx,.xls" style="display:none" aria-label="Import library file"></label>
      </div>
    </div>

    <!-- SECTION 4: PREFERENCES -->
    <div class="settings-section">
      <h3 class="settings-sec-title">⚙️ Preferences</h3>
      <div class="setting-row">
        <div><div class="setting-lbl">Include Adult Content</div><div class="setting-desc">Toggle adult content in TMDB search results.</div></div>
        <label class="switch-container">
          <input type="checkbox" id="pref-adult-content-chk" ${configState.adultContent ? 'checked' : ''}>
          <span class="switch-slider"></span>
        </label>
      </div>
      <div class="setting-row">
        <div><div class="setting-lbl">Image Quality</div><div class="setting-desc">Switch to lower resolution posters/backdrops to save data.</div></div>
        <select id="pref-image-quality-select" style="background: var(--surface2); color: var(--text); border: 1px solid var(--border); padding: 6px 12px; border-radius: var(--r); font-family: inherit; font-size: 13px;">
          <option value="high" ${configState.imageQuality === 'high' ? 'selected' : ''}>High Definition</option>
          <option value="low" ${configState.imageQuality === 'low' ? 'selected' : ''}>Data Saver</option>
        </select>
      </div>
      <div class="setting-row">
        <div><div class="setting-lbl">Default View Layout</div><div class="setting-desc">Set default appearance style for homepage showcase.</div></div>
        <select id="pref-default-layout-select" style="background: var(--surface2); color: var(--text); border: 1px solid var(--border); padding: 6px 12px; border-radius: var(--r); font-family: inherit; font-size: 13px;">
          <option value="showcase" ${configState.defaultLayout === 'showcase' ? 'selected' : ''}>Showcase Carousel</option>
          <option value="grid" ${configState.defaultLayout === 'grid' ? 'selected' : ''}>Simple Grid</option>
        </select>
      </div>
    </div>

    <!-- SECTION 5: DANGER ZONE -->
    <div class="settings-section danger-zone" style="border: 1px solid rgba(229,9,20,.2); padding: 15px; border-radius: var(--r); background: rgba(229,9,20,.02);">
      <h3 class="settings-sec-title" style="color: var(--red);">⚠️ Danger Zone</h3>
      <div class="setting-row" style="border-bottom: 1px solid var(--border2); padding-bottom: 12px;">
        <div><div class="setting-lbl">Clear Library</div><div class="setting-desc">Delete all titles currently in your collection (${library.length} items).</div></div>
        <button class="btn-danger btn-sm" id="st-clearlib">Clear Library</button>
      </div>
      <div class="setting-row" style="border-bottom: 1px solid var(--border2); padding: 12px 0;">
        <div><div class="setting-lbl">Clear Watch History</div><div class="setting-desc">Delete tracking history logs (${watchHist.length} items).</div></div>
        <button class="btn-danger btn-sm" id="st-clearhist">Clear History</button>
      </div>
      <div class="setting-row" style="padding-top: 12px;">
        <div><div class="setting-lbl">Factory Reset App</div><div class="setting-desc">Delete all custom keys, library datasets, tracking status, and user session values.</div></div>
        <button class="btn-danger btn-sm" id="st-factory-reset">Factory Reset</button>
      </div>
    </div>

    <!-- ABOUT SECTION -->
    <div class="setting-row" style="margin-top: 25px; opacity: 0.7;">
      <div><div class="setting-lbl">About MovieUltra</div><div class="setting-desc">MovieUltra v2.1.0 · Powered by TMDB + Jikan APIs</div></div>
      <span style="font-size:12px;color:var(--text-muted)">v2.1.0</span>
    </div>
  `;

  // Bind Swatches
  el.querySelectorAll('[data-theme-pick]').forEach(sw => {
    sw.addEventListener('click', () => applyTheme(sw.dataset.themePick));
  });

  // Toggle custom keys panel
  const useCustomKeysChk = document.getElementById('use-custom-keys-chk');
  const customKeysPanel = document.getElementById('custom-keys-panel');
  useCustomKeysChk?.addEventListener('change', () => {
    const checked = useCustomKeysChk.checked;
    saveConfig(configKeys.useCustomKeys, checked);
    if (checked) {
      customKeysPanel?.classList.remove('hidden');
      toast('Custom API keys mode enabled. Save keys below to apply.', 'info');
    } else {
      customKeysPanel?.classList.add('hidden');
      toast('Proxy APIs restored. Reloading page to apply...', 'info');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  });

  // Save API keys
  document.getElementById('st-save-api-keys')?.addEventListener('click', () => {
    const tmdbKey = document.getElementById('custom-tmdb-key-input')?.value.trim() || '';
    const fbApiKey = document.getElementById('custom-firebase-api-key')?.value.trim() || '';
    const fbProjectId = document.getElementById('custom-firebase-project-id')?.value.trim() || '';
    const fbAppId = document.getElementById('custom-firebase-app-id')?.value.trim() || '';

    saveConfig(configKeys.tmdbKey, tmdbKey);
    saveConfig(configKeys.firebaseApiKey, fbApiKey);
    saveConfig(configKeys.firebaseProjectId, fbProjectId);
    saveConfig(configKeys.firebaseAppId, fbAppId);

    toast('✅ Keys saved! Reloading to apply credentials...', 'info');
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  });

  // Bind Clicks
  document.getElementById('st-editprofile')?.addEventListener('click', () => {
    if (window.openEditProfile) window.openEditProfile();
  });
  document.getElementById('st-csv')?.addEventListener('click', exportCSV);
  document.getElementById('st-excel')?.addEventListener('click', exportExcelPro);
  document.getElementById('st-template')?.addEventListener('click', downloadTemplate);
  
  // JSON Backup exports
  document.getElementById('st-export-json')?.addEventListener('click', exportFullJSON);
  
  // Preferences change listeners
  const adultContentChk = document.getElementById('pref-adult-content-chk');
  adultContentChk?.addEventListener('change', () => {
    saveConfig(configKeys.adultContent, adultContentChk.checked);
    toast(`Adult Content: ${adultContentChk.checked ? 'Enabled' : 'Disabled'}`);
  });

  const imgQualitySelect = document.getElementById('pref-image-quality-select');
  imgQualitySelect?.addEventListener('change', () => {
    saveConfig(configKeys.imageQuality, imgQualitySelect.value);
    toast(`Image Quality: ${imgQualitySelect.value === 'high' ? 'HD Resolution' : 'Data Saver'}`);
  });

  const layoutSelect = document.getElementById('pref-default-layout-select');
  layoutSelect?.addEventListener('change', () => {
    saveConfig(configKeys.defaultLayout, layoutSelect.value);
    toast(`Layout preference set to ${layoutSelect.value}`);
  });

  // Danger actions
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

  document.getElementById('st-factory-reset')?.addEventListener('click', () => {
    if (!confirm('🚨 WARNING: This will factory reset MovieUltra. All lists, history, and keys will be permanently deleted! Proceed?')) return;
    if (!confirm('Are you absolutely sure? This cannot be undone.')) return;
    
    // Clear storage and reset states
    localStorage.clear();
    resetAllConfig();
    
    toast('Factory reset completed. Reloading...', 'info');
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  });

  document.getElementById('importFile')?.addEventListener('change', function() {
    importLibrary(this);
  });

  document.getElementById('importFullJsonFile')?.addEventListener('change', function() {
    if (this.files[0]) {
      importFullJSON(this.files[0]);
      this.value = '';
    }
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
    ['MovieUltra v2.1.0 — Library Template'],
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
    storeEvents.emit('library-changed');
    updateSbUser();
    toast(`Imported ${added} item${added !== 1 ? 's' : ''} ✓`);
    
    const activeView = window.activeView || 'settings';
    if (activeView === 'settings') renderSettings();
  } catch (err) {
    console.error('[MovieUltra] Import failed:', err);
    toast('Import failed — check file format', 'err');
  }
}

export function exportFullJSON() {
  const exportPayload = {
    version: '2.1.0',
    exportDate: new Date().toISOString(),
    library: libState.library,
    watchHist: histState.watchHist,
    seriesProgress: seriesState.progress,
    seriesDiary: seriesState.diary,
    seriesEpisodes: seriesState.episodes,
    seriesHistory: seriesState.history,
    animeProgress: animeState.progress,
    animeDiary: animeState.diary,
    animeEpisodes: animeState.episodes,
    animeHistory: animeState.history,
    config: {
      useCustomKeys: configState.useCustomKeys,
      tmdbKey: configState.tmdbKey,
      firebaseConfig: configState.firebaseConfig,
      adultContent: configState.adultContent,
      imageQuality: configState.imageQuality,
      defaultLayout: configState.defaultLayout
    }
  };

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
  downloadHelper(blob, `MovieUltra_Full_Backup_${new Date().toISOString().split('T')[0]}.json`);
  toast('Full JSON backup exported ✓');
}

export async function importFullJSON(file) {
  try {
    const text = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsText(file);
    });
    
    const data = JSON.parse(text);
    if (!data.library || !data.watchHist) {
      throw new Error('Invalid backup file structure.');
    }
    
    // Restore library
    libState.library = data.library || [];
    saveLib();
    
    // Restore watch history
    histState.watchHist = data.watchHist || [];
    saveHist();
    
    // Restore series progress
    if (data.seriesProgress) {
      Object.assign(seriesState.progress, data.seriesProgress);
      writeStorage(SK.seriesProgress, seriesState.progress);
    }
    if (data.seriesDiary) {
      Object.assign(seriesState.diary, data.seriesDiary);
      writeStorage(SK.seriesDiary, seriesState.diary);
    }
    if (data.seriesEpisodes) {
      Object.assign(seriesState.episodes, data.seriesEpisodes);
      writeStorage(SK.seriesEpisodes, seriesState.episodes);
    }
    if (data.seriesHistory) {
      seriesState.history.length = 0;
      data.seriesHistory.forEach(item => seriesState.history.push(item));
      writeStorage(SK.seriesHistory, seriesState.history);
    }
    
    // Restore anime progress
    if (data.animeProgress) {
      Object.assign(animeState.progress, data.animeProgress);
      writeStorage(SK.animeProgress, animeState.progress);
    }
    if (data.animeDiary) {
      Object.assign(animeState.diary, data.animeDiary);
      writeStorage(SK.animeDiary, animeState.diary);
    }
    if (data.animeEpisodes) {
      Object.assign(animeState.episodes, data.animeEpisodes);
      writeStorage(SK.animeEpisodes, animeState.episodes);
    }
    if (data.animeHistory) {
      animeState.history.length = 0;
      data.animeHistory.forEach(item => animeState.history.push(item));
      writeStorage(SK.animeHistory, animeState.history);
    }
    
    // Restore configs
    if (data.config) {
      saveConfig(configKeys.useCustomKeys, !!data.config.useCustomKeys);
      saveConfig(configKeys.tmdbKey, data.config.tmdbKey || '');
      if (data.config.firebaseConfig) {
        saveConfig(configKeys.firebaseApiKey, data.config.firebaseConfig.apiKey || '');
        saveConfig(configKeys.firebaseProjectId, data.config.firebaseConfig.projectId || '');
        saveConfig(configKeys.firebaseAppId, data.config.firebaseConfig.appId || '');
      }
      saveConfig(configKeys.adultContent, !!data.config.adultContent);
      saveConfig(configKeys.imageQuality, data.config.imageQuality || 'high');
      saveConfig(configKeys.defaultLayout, data.config.defaultLayout || 'showcase');
    }
    
    storeEvents.emit('library-changed');
    storeEvents.emit('history-changed');
    storeEvents.emit('series-updated');
    storeEvents.emit('anime-updated');
    
    toast('✅ Full backup restored successfully!');
    renderSettings();
  } catch (err) {
    console.error('[MovieUltra] Full restore failed:', err);
    toast('Import failed — check backup file format', 'err');
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
  // Config state triggers rendering layout dynamic binding elements.
}
