'use strict';

import { getDetailsTMDB } from '../api/tmdb.js';
import { toast } from './toast.js';

export async function playTrailer(type, id) {
  try {
    const d = await getDetailsTMDB(type, id);
    const key = d.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube')?.key;
    if (key) {
      openTrailer(key);
    } else {
      toast('No trailer found', 'info');
    }
  } catch (err) {
    toast(`Trailer failed: ${err.message}`, 'err');
  }
}

export function openTrailer(key) {
  const iframe = document.getElementById('trailerIframe');
  const modal = document.getElementById('trailerModal');
  if (iframe && modal) {
    iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(key)}?autoplay=1`;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

export function closeTrailer() {
  const iframe = document.getElementById('trailerIframe');
  const modal = document.getElementById('trailerModal');
  if (iframe && modal) {
    iframe.src = '';
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

export function initTrailerListeners() {
  document.getElementById('trailerClose')?.addEventListener('click', closeTrailer);
  document.getElementById('trailerModal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('trailerModal')) {
      closeTrailer();
    }
  });
}
