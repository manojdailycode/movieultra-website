'use strict';

import { h } from '../utils/escape.js';
import { toast } from './toast.js';
import { getDetailsTMDB } from '../api/tmdb.js';
import { getAnimeDetails } from '../api/jikan.js';
import { libHas, libAdd, libRemove, libUpdateStatus, state as libState } from '../store/library.js';
import { histHas, histAdd, histRemove } from '../store/history.js';
import { openTrailer, playTrailer } from './trailer.js';

let _modalItem = null;

export async function openModal(item) {
  if (!item) return;
  _modalItem = item;

  const movieModal = document.getElementById('movieModal');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalTitle = document.getElementById('modalTitle');
  const modalTagline = document.getElementById('modalTagline');
  const modalOverview = document.getElementById('modalOverview');
  const modalPills = document.getElementById('modalPills');
  const modalGenres = document.getElementById('modalGenres');
  const modalStatusRow = document.getElementById('modalStatusRow');

  if (!movieModal) return;

  movieModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  const modalPlayBtn = document.getElementById('modalPlayBtn');
  if (modalPlayBtn) modalPlayBtn.classList.add('hidden');

  const NOBACK = 'https://placehold.co/1280x720/1c1c1c/555?text=No+Image';
  modalBackdrop.src = item.backdrop || item.poster || NOBACK;
  modalBackdrop.alt = `${item.title} backdrop`;
  modalTitle.textContent = item.title;
  modalTagline.textContent = '';
  modalOverview.textContent = item.overview || 'Loading details…';
  modalPills.innerHTML = '';
  modalGenres.innerHTML = '';

  const inLib = libHas(item.id, item.title);
  if (inLib) {
    modalStatusRow.classList.remove('hidden');
    const libItem = libState.library.find(i => String(i.id) === String(item.id));
    const curStatus = libItem?.status || 'Planned';
    setupStatusPills(item.id, curStatus);
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

function setupStatusPills(id, curStatus) {
  const pills = document.querySelectorAll('#modalStatusPills .status-pill');
  pills.forEach(p => {
    p.classList.toggle('active', p.dataset.s === curStatus);
    p.onclick = () => {
      libUpdateStatus(id, p.dataset.s);
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

  if (libHas(fullItem.id, fullItem.title)) {
    const statusRow = document.getElementById('modalStatusRow');
    if (statusRow) statusRow.classList.remove('hidden');
    const libItem = libState.library.find(i => String(i.id) === String(fullItem.id));
    setupStatusPills(fullItem.id, libItem?.status || 'Planned');
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

  const inLib = libHas(item.id, item.title);
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
    setupStatusPills(item.id, libItem?.status || 'Planned');
  });

  foot.querySelector('.mf-remove')?.addEventListener('click', () => {
    libRemove(item.id, item.title);
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

export function closeModal() {
  const movieModal = document.getElementById('movieModal');
  if (movieModal) movieModal.classList.add('hidden');
  document.body.style.overflow = '';
  _modalItem = null;
}

export function initModalListeners() {
  document.getElementById('modalClose')?.addEventListener('click', closeModal);
  document.getElementById('movieModal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('movieModal')) closeModal();
  });
  document.getElementById('modalPlayBtn')?.addEventListener('click', async () => {
    if (!_modalItem || !_modalItem.id) {
      toast('No trailer available', 'info');
      return;
    }
    if (_modalItem.type === 'anime') {
      if (_modalItem.trailer) {
        openTrailer(_modalItem.trailer);
      } else {
        toast('No trailer available', 'info');
      }
      return;
    }
    await playTrailer(_modalItem.type, _modalItem.id);
  });
}
