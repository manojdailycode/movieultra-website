'use strict';

import { readStorage, writeStorage, SK } from '../utils/storage.js';
import { storeEvents } from './events.js';

export const state = {
  watchHist: readStorage(SK.hist, [])
};

export function saveHist() {
  writeStorage(SK.hist, state.watchHist);
}

export function histHas(id) {
  return id != null && state.watchHist.some(i => String(i.id) === String(id));
}

export function histAdd(item) {
  state.watchHist = state.watchHist.filter(i => String(i.id) !== String(item.id));
  state.watchHist.unshift({ ...item, watchedAt: new Date().toISOString() });
  state.watchHist = state.watchHist.slice(0, 100);
  saveHist();
  storeEvents.emit('history-changed');
}

export function histRemove(id) {
  state.watchHist = state.watchHist.filter(i => String(i.id) !== String(id));
  saveHist();
  storeEvents.emit('history-changed');
}

export function histClearDirect() {
  state.watchHist = [];
  saveHist();
  storeEvents.emit('history-changed');
}
