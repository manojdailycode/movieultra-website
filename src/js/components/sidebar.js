'use strict';

import { state as userState } from '../store/user.js';
import { state as libState } from '../store/library.js';
import { renderProfileSwitcherHtml, setActiveProfile, createProfile } from '../store/profiles.js';
import { h } from '../utils/escape.js';
import { toast } from './toast.js';

export function openSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar && overlay) {
    sidebar.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

export function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar && overlay) {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }
}

export function updateSbUser() {
  const user = userState.currentUser || { name: 'Guest', username: 'guest', avatar: null };
  const initials = user.name ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'U';

  const sbUsername = document.getElementById('sbUsername');
  const sbUsersub = document.getElementById('sbUsersub');
  const sbAvatar = document.getElementById('sbAvatar');
  const navAvatar = document.getElementById('navAvatar');

  if (sbUsername) sbUsername.textContent = user.name;
  if (sbUsersub) sbUsersub.textContent = `${libState.library.length} titles tracked`;

  const avatarHTML = user.avatar
    ? `<img src="${h(user.avatar)}" alt="avatar" loading="lazy">`
    : initials;

  if (sbAvatar) {
    sbAvatar.innerHTML = avatarHTML;
  }
  if (navAvatar) {
    navAvatar.innerHTML = avatarHTML;
  }

  // Update profile switcher HTML
  const pContainer = document.getElementById('profileSwitcherContainer');
  if (pContainer) {
    pContainer.innerHTML = renderProfileSwitcherHtml();
    
    // Bind profile switch events
    pContainer.querySelectorAll('.profile-switch-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.dataset.profileId;
        if (id) {
          setActiveProfile(id);
          toast('Profile switched', 'ok');
          closeSidebar();
          // Reload page to re-initialize stores with new namespace (simplest approach for single-page multi-profile)
          setTimeout(() => window.location.reload(), 500);
        }
      });
    });

    // Bind add profile event
    const addBtn = document.getElementById('addProfileBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const name = prompt('Enter new profile name:');
        if (name && name.trim()) {
          const p = createProfile(name);
          if (p) {
            toast('Profile created', 'ok');
            updateSbUser(); // re-render switcher
          } else {
            toast('Cannot create more than 3 profiles', 'err');
          }
        }
      });
    }
  }
}

export function initSidebarListeners() {
  document.getElementById('menuBtn')?.addEventListener('click', openSidebar);
  document.getElementById('sbClose')?.addEventListener('click', closeSidebar);
  document.getElementById('sidebarOverlay')?.addEventListener('click', closeSidebar);
}
