'use strict';

import { readStorage, writeStorage, SK } from '../utils/storage.js';
import { storeEvents } from './events.js';
import { histHas, histAdd } from './history.js';

export const state = {
  library: readStorage(SK.lib, []).map(i => ({
    genre: '',
    platform: '',
    status: 'Planned',
    note: '',
    ...i
  }))
};

export function saveLib() {
  writeStorage(SK.lib, state.library);
}

export function libHas(id, title, type) {
  if (id != null && id !== '') {
    return state.library.some(i => String(i.id) === String(id) && (!type || i.type === type));
  }
  return state.library.some(i => i.title.toLowerCase() === (title || '').toLowerCase() && (!type || i.type === type));
}

export function libAdd(item) {
  if (libHas(item.id, item.title, item.type)) {
    return { success: false, msg: `"${item.title}" already in library`, type: 'info' };
  }
  const full = {
    genre: '',
    platform: '',
    status: item.status || 'Planned',
    note: '',
    ...item,
    addedAt: item.addedAt || new Date().toISOString()
  };
  state.library.unshift(full);
  saveLib();
  if (full.status === 'Completed' && !histHas(full.id, full.type)) {
    histAdd(full);
  }
  storeEvents.emit('library-changed');
  return { success: true, msg: `✅ Added "${item.title}" (${full.status})`, item: full };
}

export function libRemove(id, title, type) {
  const before = state.library.length;
  state.library = state.library.filter(i => {
    if (id != null && id !== '') {
      return !(String(i.id) === String(id) && (!type || i.type === type));
    }
    return !(i.title.toLowerCase() === (title || '').toLowerCase() && (!type || i.type === type));
  });
  if (state.library.length < before) {
    saveLib();
    storeEvents.emit('library-changed');
    return true;
  }
  return false;
}

export function libUpdateStatus(id, status, type) {
  const item = state.library.find(i => String(i.id) === String(id) && (!type || i.type === type));
  if (!item) return false;
  item.status = status;
  if (status === 'Completed' && !histHas(item.id, item.type)) {
    histAdd(item);
  }
  saveLib();
  storeEvents.emit('library-changed');
  return true;
}

/**
 * Set status whether item is currently in library or not.
 */
export function libSetOrUpdate(item, status) {
  if (!item || !item.id) return { success: false };
  const existing = state.library.find(i => String(i.id) === String(item.id) && (!item.type || i.type === item.type));
  if (existing) {
    existing.status = status;
    if (status === 'Completed' && !histHas(item.id, item.type)) {
      histAdd(existing);
    }
    saveLib();
    storeEvents.emit('library-changed');
    return { success: true, item: existing, updated: true };
  } else {
    return libAdd({ ...item, status });
  }
}

// Automatically sync whenever history is added
storeEvents.on('history-added', (item) => {
  if (!item || !item.id) return;
  const existing = state.library.find(i => String(i.id) === String(item.id) && (!item.type || i.type === item.type));
  if (existing) {
    if (existing.status !== 'Completed') {
      existing.status = 'Completed';
      saveLib();
      storeEvents.emit('library-changed');
    }
  } else {
    const full = {
      genre: '',
      platform: '',
      status: 'Completed',
      note: '',
      ...item,
      addedAt: item.watchedAt || new Date().toISOString()
    };
    state.library.unshift(full);
    saveLib();
    storeEvents.emit('library-changed');
  }
});

export function clearLibraryDirect() {
  state.library = [];
  saveLib();
  storeEvents.emit('library-changed');
}

