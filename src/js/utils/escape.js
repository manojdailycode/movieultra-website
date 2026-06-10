'use strict';

/**
 * Escapes characters in a string to prevent XSS.
 * @param {string|null|undefined} str 
 * @returns {string}
 */
export function h(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
