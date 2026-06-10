'use strict';

/**
 * Formats a date into DD-MM-YYYY format.
 * @param {string|Date} d 
 * @returns {string}
 */
export function formatDate(d) {
  const dt = new Date(d || Date.now());
  return `${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${dt.getFullYear()}`;
}

/**
 * Parses and returns the year from a date string.
 * @param {string} dateStr 
 * @returns {string}
 */
export function getYear(dateStr) {
  if (!dateStr) return 'N/A';
  const parts = dateStr.split('-');
  return parts[0] || 'N/A';
}

/**
 * Estimates watched hours.
 * @param {number} moviesCount 
 * @param {number} tvCount 
 * @param {number} animeCount 
 * @returns {number}
 */
export function estimateHours(moviesCount, tvCount, animeCount) {
  return Math.round(moviesCount * 2 + tvCount * 0.75 + animeCount * 0.4);
}
