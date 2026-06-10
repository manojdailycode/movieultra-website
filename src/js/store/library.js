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

export function libHas(id, title) {
  if (id != null && id !== '') {
    return state.library.some(i => String(i.id) === String(id));
  }
  return state.library.some(i => i.title.toLowerCase() === (title || '').toLowerCase());
}

export function libAdd(item) {
  if (libHas(item.id, item.title)) {
    return { success: false, msg: `"${item.title}" already in library`, type: 'info' };
  }
  const full = {
    genre: '',
    platform: '',
    status: 'Planned',
    note: '',
    ...item,
    addedAt: new Date().toISOString()
  };
  state.library.unshift(full);
  saveLib();
  storeEvents.emit('library-changed');
  return { success: true, msg: `✅ Added "${item.title}"`, item: full };
}

export function libRemove(id, title) {
  const before = state.library.length;
  state.library = state.library.filter(i =>
    id != null && id !== ''
      ? String(i.id) !== String(id)
      : i.title.toLowerCase() !== (title || '').toLowerCase()
  );
  if (state.library.length < before) {
    saveLib();
    storeEvents.emit('library-changed');
    return true;
  }
  return false;
}

export function libUpdateStatus(id, status) {
  const item = state.library.find(i => String(i.id) === String(id));
  if (!item) return false;
  item.status = status;
  if (status === 'Completed' && !histHas(item.id)) {
    histAdd(item);
  }
  saveLib();
  storeEvents.emit('library-changed');
  return true;
}

export function clearLibraryDirect() {
  state.library = [];
  saveLib();
  storeEvents.emit('library-changed');
}
