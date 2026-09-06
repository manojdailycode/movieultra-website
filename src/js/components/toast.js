'use strict';

const ICONS = {
  ok:   '✓',
  err:  '✕',
  info: 'ℹ',
  warn: '⚠',
  copy: '📋',
  star: '★',
  add:  '＋',
  save: '🔖',
  play: '▶',
};

/**
 * Rich toast notification with icon + optional action button.
 * @param {string} msg 
 * @param {'ok'|'err'|'info'|'warn'|'copy'|'star'|'add'|'save'|'play'} type 
 * @param {{ label: string, onClick: Function }|null} action - Optional action button
 * @param {number} duration - ms before auto-dismiss (default 3000)
 */
export function toast(msg, type = 'ok', action = null, duration = 3000) {
  const container = document.getElementById('toasts');
  if (!container) return;

  // Haptic feedback on mobile (Vibration API)
  if (navigator.vibrate && type !== 'ok') {
    navigator.vibrate(type === 'err' ? [50, 20, 50] : 30);
  }

  const el = document.createElement('div');
  el.className = `toast toast-rich ${type}`;
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');

  const iconHtml = `<span class="toast-icon" aria-hidden="true">${ICONS[type] || ICONS.ok}</span>`;
  const msgHtml = `<span class="toast-msg">${msg}</span>`;
  const actionHtml = action
    ? `<button class="toast-action-btn">${action.label}</button>`
    : '';
  const closeHtml = `<button class="toast-close-btn" aria-label="Dismiss">&times;</button>`;

  el.innerHTML = `${iconHtml}<div class="toast-content">${msgHtml}${actionHtml}</div>${closeHtml}`;

  container.appendChild(el);

  // Action handler
  if (action) {
    el.querySelector('.toast-action-btn')?.addEventListener('click', () => {
      action.onClick?.();
      dismiss(el);
    });
  }

  // Close button
  el.querySelector('.toast-close-btn')?.addEventListener('click', () => dismiss(el));

  // Show animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.add('show'));
  });

  const timer = setTimeout(() => dismiss(el), duration);
  el._toastTimer = timer;
}

function dismiss(el) {
  clearTimeout(el._toastTimer);
  el.classList.remove('show');
  el.classList.add('hide');
  setTimeout(() => el.remove(), 380);
}

/**
 * Trigger bookmark/add animation on a target element.
 * @param {HTMLElement} el 
 */
export function triggerBookmarkAnim(el) {
  if (!el) return;
  el.classList.remove('anim-bookmark');
  void el.offsetWidth; // reflow
  el.classList.add('anim-bookmark');
  el.addEventListener('animationend', () => el.classList.remove('anim-bookmark'), { once: true });
}

/**
 * Trigger watched check animation.
 * @param {HTMLElement} el 
 */
export function triggerWatchedAnim(el) {
  if (!el) return;
  el.classList.remove('anim-watched');
  void el.offsetWidth;
  el.classList.add('anim-watched');
  el.addEventListener('animationend', () => el.classList.remove('anim-watched'), { once: true });
}
