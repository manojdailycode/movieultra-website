'use strict';

/**
 * Returns HTML string containing n shimmer skeleton card placeholders.
 * @param {number} n 
 * @returns {string}
 */
export function skeletonCards(n = 10) {
  return Array.from({ length: n }, () => `
    <div class="skeleton-card">
      <div class="skeleton-poster"></div>
      <div style="padding:8px 0 0">
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
      </div>
    </div>`).join('');
}

/**
 * Replaces target element content with row loading skeletons.
 * @param {HTMLElement} el 
 */
export function spinRow(el) {
  if (el) el.innerHTML = skeletonCards(8);
}

/**
 * Replaces target element content with grid loading skeletons.
 * @param {HTMLElement} el 
 */
export function spinGrid(el) {
  if (el) el.innerHTML = skeletonCards(14);
}
