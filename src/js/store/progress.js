'use strict';

import { getProfileKey, getActiveProfileId } from './profiles.js';

const PROGRESS_KEY_BASE = 'mu_progress_v2';
function getProgressKey() {
  return getProfileKey(PROGRESS_KEY_BASE, getActiveProfileId());
}

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(getProgressKey()) || '{}');
  } catch { return {}; }
}

export const state = {
  progress: loadProgress()
};

function persist() {
  localStorage.setItem(getProgressKey(), JSON.stringify(state.progress));
}

/**
 * Save watch progress for a movie or episode.
 * @param {string|number} id - TMDB/Jikan ID
 * @param {string} type - 'movie' | 'tv' | 'anime'
 * @param {object} data - { percent, currentTime, duration, season?, episode?, episodeTitle?, title, poster, backdrop }
 */
export function saveProgress(id, type, data) {
  const key = `${type}-${id}`;
  state.progress[key] = {
    id: String(id),
    type,
    ...data,
    updatedAt: new Date().toISOString()
  };
  persist();
}

export function getProgress(id, type) {
  return state.progress[`${type}-${id}`] || null;
}

export function removeProgress(id, type) {
  delete state.progress[`${type}-${id}`];
  persist();
}

export function clearAllProgress() {
  state.progress = {};
  persist();
}

/**
 * Get all in-progress items (2% < progress < 95%), sorted newest first.
 */
export function getContinueWatching(limit = 15) {
  return Object.values(state.progress)
    .filter(p => p.percent > 2 && p.percent < 95)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, limit);
}

export function hasProgress(id, type) {
  const p = getProgress(id, type);
  return p && p.percent > 2 && p.percent < 95;
}
