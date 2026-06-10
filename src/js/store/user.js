'use strict';

import { readStorage, writeStorage, SK } from '../utils/storage.js';

export const state = {
  currentUser: readStorage(SK.user, null)
};

export function saveUser() {
  writeStorage(SK.user, state.currentUser);
}

export function saveTheme(theme) {
  writeStorage(SK.theme, theme);
}

export function readTheme() {
  return readStorage(SK.theme, 'dark');
}

export function bootApp(user) {
  state.currentUser = user;
  saveUser();
}

export function logout() {
  state.currentUser = null;
  saveUser();
}
