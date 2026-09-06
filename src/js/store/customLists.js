'use strict';

/**
 * Custom Lists Store
 * Allows users to create named watchlists beyond the default watchlist.
 * Each list: { id, name, createdAt, items: [] }
 */

import { getProfileKey, getActiveProfileId } from './profiles.js';

const STORAGE_KEY_BASE = 'mu_custom_lists_v1';
function getStorageKey() {
  return getProfileKey(STORAGE_KEY_BASE, getActiveProfileId());
}

function load() {
  try {
    const raw = localStorage.getItem(getStorageKey());
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function save(lists) {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(lists));
    window.dispatchEvent(new CustomEvent('customlists-changed'));
  } catch { console.warn('[MovieUltra] Custom lists save failed'); }
}

/**
 * Get all custom lists.
 */
export function getAllLists() {
  return load();
}

/**
 * Create a new named list. Returns the new list object.
 */
export function createList(name) {
  if (!name || !name.trim()) throw new Error('List name cannot be empty');
  const lists = load();
  const existing = lists.find(l => l.name.toLowerCase() === name.trim().toLowerCase());
  if (existing) throw new Error(`A list named "${name}" already exists`);
  const newList = {
    id: `list_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    createdAt: new Date().toISOString(),
    items: [],
  };
  lists.push(newList);
  save(lists);
  return newList;
}

/**
 * Rename an existing list.
 */
export function renameList(listId, newName) {
  if (!newName || !newName.trim()) throw new Error('Name cannot be empty');
  const lists = load();
  const idx = lists.findIndex(l => l.id === listId);
  if (idx === -1) throw new Error('List not found');
  lists[idx].name = newName.trim();
  save(lists);
}

/**
 * Delete a list by ID.
 */
export function deleteList(listId) {
  const lists = load().filter(l => l.id !== listId);
  save(lists);
}

/**
 * Add an item to a list.
 */
export function addToList(listId, item) {
  const lists = load();
  const list = lists.find(l => l.id === listId);
  if (!list) throw new Error('List not found');
  const already = list.items.some(i => String(i.id) === String(item.id) && i.type === item.type);
  if (!already) {
    list.items.push({ ...item, addedAt: new Date().toISOString() });
    save(lists);
  }
}

/**
 * Remove an item from a list.
 */
export function removeFromList(listId, itemId, itemType) {
  const lists = load();
  const list = lists.find(l => l.id === listId);
  if (!list) return;
  list.items = list.items.filter(i => !(String(i.id) === String(itemId) && i.type === itemType));
  save(lists);
}

/**
 * Check if an item is in a specific list.
 */
export function isInList(listId, itemId, itemType = null) {
  const list = load().find(l => l.id === listId);
  if (!list) return false;
  return list.items.some(i => String(i.id) === String(itemId) && (itemType ? i.type === itemType : true));
}

export const listHas = isInList;

/**
 * Get all lists that contain a specific item.
 */
export function getListsForItem(itemId, itemType = null) {
  return load().filter(l => l.items.some(i => String(i.id) === String(itemId) && (itemType ? i.type === itemType : true)));
}
