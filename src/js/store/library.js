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
