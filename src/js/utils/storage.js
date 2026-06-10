'use strict';

export const STORAGE_VERSION = 'v2';

import { log } from '../firebase/config.js';

export const SK = {
  lib: `mu_lib_${STORAGE_VERSION}`,
  hist: `mu_hist_${STORAGE_VERSION}`,
  user: `mu_user_${STORAGE_VERSION}`,
  theme: 'mu_theme',
  feedback: 'mu_feedback',
};

export function readStorage(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  } catch (e) {
    console.warn('[MovieUltra] readStorage failed:', key, e);
    return fallback;
  }
}

export function writeStorage(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.warn('[MovieUltra] writeStorage failed:', key, e);
  }
}

export function migrateStorage() {
  try {
    if (localStorage.getItem(`mu_migrated_${STORAGE_VERSION}`)) return;
    const oldLib  = readStorage('mu_lib_v9', null) || readStorage('mu_lib_v8', null) || readStorage('mu_lib', null);
    const oldHist = readStorage('mu_hist_v9', null) || readStorage('mu_hist_v8', null) || readStorage('mu_hist', null);
    const oldUser = readStorage('mu_user_v9', null) || readStorage('mu_user_v8', null) || readStorage('mu_user', null);
    
    if (oldLib  && !readStorage(SK.lib,  null))  writeStorage(SK.lib,  oldLib);
    if (oldHist && !readStorage(SK.hist, null))  writeStorage(SK.hist, oldHist);
    if (oldUser && !readStorage(SK.user, null))  writeStorage(SK.user, oldUser);
    
    localStorage.setItem(`mu_migrated_${STORAGE_VERSION}`, '1');
    log('[MovieUltra] Storage migrated to', STORAGE_VERSION);
  } catch (e) {
    console.error('[MovieUltra] Migration failed:', e);
  }
}
