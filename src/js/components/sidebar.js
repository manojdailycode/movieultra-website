'use strict';

import { state as userState } from '../store/user.js';
import { state as libState } from '../store/library.js';
import { h } from '../utils/escape.js';

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
}

export function initSidebarListeners() {
  document.getElementById('menuBtn')?.addEventListener('click', openSidebar);
  document.getElementById('sbClose')?.addEventListener('click', closeSidebar);
  document.getElementById('sidebarOverlay')?.addEventListener('click', closeSidebar);
}
