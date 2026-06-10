'use strict';

/**
 * Renders a RAF-based toast alert message on the screen.
 * @param {string} msg 
 * @param {'ok'|'err'|'info'} type 
 */
export function toast(msg, type = 'ok') {
  const container = document.getElementById('toasts');
  if (!container) return;

  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);

  // RAF-based animation double frame trick
  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.add('show'));
  });

  setTimeout(() => {
    el.classList.remove('show');
    el.classList.add('hide');
    setTimeout(() => el.remove(), 320);
  }, 3000);
}
