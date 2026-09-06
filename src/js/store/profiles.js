'use strict';

/**
 * Multi-Profile Store
 * Supports up to 3 local profiles, each with their own library/history/ratings.
 * Profile data keys are namespaced by profile ID.
 */

const PROFILES_KEY = 'mu_profiles_v1';
const ACTIVE_PROFILE_KEY = 'mu_active_profile_v1';

const DEFAULT_AVATARS = ['🎬', '🎭', '🎮'];
const DEFAULT_COLORS  = ['#e50914', '#3b82f6', '#a855f7'];

export function getAllProfiles() {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveProfiles(profiles) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export function getActiveProfileId() {
  return localStorage.getItem(ACTIVE_PROFILE_KEY) || null;
}

export function getActiveProfile() {
  const id = getActiveProfileId();
  return getAllProfiles().find(p => p.id === id) || null;
}

export function setActiveProfile(profileId) {
  localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
  window.dispatchEvent(new CustomEvent('profile-switched', { detail: { profileId } }));
}

/**
 * Create a new profile. Returns the profile or null if limit reached.
 */
export function createProfile(name) {
  const profiles = getAllProfiles();
  if (profiles.length >= 3) return null;
  if (!name || !name.trim()) return null;
  const idx = profiles.length;
  const profile = {
    id: `profile_${Date.now()}`,
    name: name.trim(),
    emoji: DEFAULT_AVATARS[idx] || '👤',
    color: DEFAULT_COLORS[idx] || '#e50914',
    createdAt: new Date().toISOString(),
  };
  profiles.push(profile);
  saveProfiles(profiles);
  return profile;
}

/**
 * Delete a profile. Cannot delete the only profile or the active one.
 */
export function deleteProfile(profileId) {
  const profiles = getAllProfiles();
  if (profiles.length <= 1) throw new Error('Cannot delete the only profile');
  if (getActiveProfileId() === profileId) throw new Error('Cannot delete the active profile');
  saveProfiles(profiles.filter(p => p.id !== profileId));
}

/**
 * Rename a profile.
 */
export function renameProfile(profileId, newName) {
  const profiles = getAllProfiles();
  const p = profiles.find(p => p.id === profileId);
  if (p && newName.trim()) {
    p.name = newName.trim();
    saveProfiles(profiles);
  }
}

/**
 * Get a namespaced storage key for a profile.
 * Usage: getProfileKey('mu_library_v1', 'profile_123') → 'mu_library_v1__profile_123'
 */
export function getProfileKey(baseKey, profileId) {
  if (!profileId) return baseKey;
  return `${baseKey}__${profileId}`;
}

/**
 * Initialize the profile system.
 * If no profiles exist, create a default one from the current user.
 */
export function initProfiles(currentUser) {
  const profiles = getAllProfiles();
  if (profiles.length === 0) {
    const profile = {
      id: 'profile_default',
      name: currentUser?.name || 'Main Profile',
      emoji: '🎬',
      color: '#e50914',
      createdAt: new Date().toISOString(),
    };
    saveProfiles([profile]);
    setActiveProfile(profile.id);
    return profile;
  }
  if (!getActiveProfileId()) {
    setActiveProfile(profiles[0].id);
  }
  return getActiveProfile();
}

/**
 * Render the profile switcher HTML for injection into the sidebar.
 */
export function renderProfileSwitcherHtml() {
  const profiles = getAllProfiles();
  const activeId = getActiveProfileId();
  if (profiles.length === 0) return '';

  const profileItems = profiles.map(p => `
    <button class="profile-switch-btn ${p.id === activeId ? 'active' : ''}"
      data-profile-id="${p.id}" aria-label="Switch to ${p.name}"
      style="--profile-color:${p.color}">
      <span class="psb-avatar" style="background:${p.color}">${p.emoji}</span>
      <span class="psb-name">${p.name}</span>
      ${p.id === activeId ? '<span class="psb-active-dot" aria-hidden="true"></span>' : ''}
    </button>
  `).join('');

  const canAdd = profiles.length < 3;

  return `
    <div class="profile-switcher" id="profileSwitcher">
      <div class="psw-label">Profiles</div>
      <div class="psw-list">${profileItems}</div>
      ${canAdd ? `<button class="psw-add-btn" id="addProfileBtn">＋ Add Profile</button>` : ''}
    </div>
  `;
}
