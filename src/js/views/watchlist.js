'use strict';

import { h } from '../utils/escape.js';
import { card } from '../components/card.js';
import { toast } from '../components/toast.js';
import { storeEvents } from '../store/events.js';
import {
  getFilteredWatchlist, getAllMasterItems, setWatchlistFilter, setWatchlistStatus, setWatchlistSort,
  setWatchlistSearch, state as watchlistState
} from '../store/watchlist.js';
import {
  getAllLists, createList, renameList, deleteList
} from '../store/customLists.js';

let currentListId = 'default';
let activeMenuId = null;

/**
 * Shows the List Action Modal for Create / Rename / Delete
 */
export function showListDialog({ mode, listId = null, currentName = '', onSuccess = null }) {
  const modal = document.getElementById('listActionModal');
  if (!modal) {
    // Fallback if modal DOM element is missing
    if (mode === 'create') {
      const name = prompt('Enter new list name:');
      if (name && name.trim()) {
        try {
          const nl = createList(name);
          currentListId = nl.id;
          renderWatchlist();
          toast(`📁 Created list "${name.trim()}"`);
          if (typeof onSuccess === 'function') onSuccess(nl);
        } catch (e) { toast(e.message, 'warn'); }
      }
    } else if (mode === 'rename') {
      const name = prompt(`Rename "${currentName}":`, currentName);
      if (name && name.trim()) {
        try {
          renameList(listId, name);
          renderWatchlist();
          toast(`✏️ Renamed to "${name.trim()}"`);
          if (typeof onSuccess === 'function') onSuccess(name.trim());
        } catch (e) { toast(e.message, 'warn'); }
      }
    } else if (mode === 'delete') {
      if (confirm(`Delete list "${currentName}"?`)) {
        deleteList(listId);
        if (currentListId === listId) currentListId = 'default';
        renderWatchlist();
        toast(`🗑️ Deleted list "${currentName}"`, 'info');
        if (typeof onSuccess === 'function') onSuccess();
      }
    }
    return;
  }

  const titleEl = document.getElementById('listActionTitle');
  const descEl = document.getElementById('listActionDesc');
  const fieldEl = document.getElementById('listActionField');
  const inputEl = document.getElementById('listActionInput');
  const confirmBtn = document.getElementById('listActionConfirm');
  const cancelBtn = document.getElementById('listActionCancel');
  const closeBtn = document.getElementById('listActionClose');

  if (mode === 'create') {
    titleEl.textContent = '📁 Create New List';
    descEl.classList.add('hidden');
    fieldEl.classList.remove('hidden');
    inputEl.value = '';
    inputEl.placeholder = 'e.g. Marvel Universe, Anime Picks...';
    confirmBtn.textContent = 'Create List';
    confirmBtn.className = 'btn-primary';
  } else if (mode === 'rename') {
    titleEl.textContent = `✏️ Rename "${currentName}"`;
    descEl.classList.add('hidden');
    fieldEl.classList.remove('hidden');
    inputEl.value = currentName;
    inputEl.placeholder = 'Enter new list name...';
    confirmBtn.textContent = 'Save Name';
    confirmBtn.className = 'btn-primary';
  } else if (mode === 'delete') {
    titleEl.textContent = `🗑️ Delete "${currentName}"?`;
    descEl.textContent = `Are you sure you want to delete "${currentName}"? Titles will remain in your library if added elsewhere.`;
    descEl.classList.remove('hidden');
    fieldEl.classList.add('hidden');
    confirmBtn.textContent = 'Delete List';
    confirmBtn.className = 'btn-danger';
  }

  modal.classList.remove('hidden');
  if (mode !== 'delete') {
    setTimeout(() => { inputEl?.focus(); inputEl?.select(); }, 50);
  }

  function closeModal() {
    modal.classList.add('hidden');
    cleanup();
  }

  function handleConfirm() {
    if (mode === 'create') {
      const val = inputEl.value.trim();
      if (!val) { toast('Please enter a list name', 'warn'); return; }
      try {
        const nl = createList(val);
        currentListId = nl.id;
        renderWatchlist();
        toast(`📁 Created list "${val}"`);
        closeModal();
        if (typeof onSuccess === 'function') onSuccess(nl);
      } catch (err) {
        toast(err.message, 'warn');
      }
    } else if (mode === 'rename') {
      const val = inputEl.value.trim();
      if (!val) { toast('Please enter a list name', 'warn'); return; }
      try {
        renameList(listId, val);
        renderWatchlist();
        toast(`✏️ Renamed to "${val}"`);
        closeModal();
        if (typeof onSuccess === 'function') onSuccess(val);
      } catch (err) {
        toast(err.message, 'warn');
      }
    } else if (mode === 'delete') {
      deleteList(listId);
      if (currentListId === listId) currentListId = 'default';
      renderWatchlist();
      toast(`🗑️ Deleted list "${currentName}"`, 'info');
      closeModal();
      if (typeof onSuccess === 'function') onSuccess();
    }
  }

  function onKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      closeModal();
    }
  }

  function cleanup() {
    confirmBtn?.removeEventListener('click', handleConfirm);
    cancelBtn?.removeEventListener('click', closeModal);
    closeBtn?.removeEventListener('click', closeModal);
    inputEl?.removeEventListener('keydown', onKeydown);
  }

  confirmBtn?.addEventListener('click', handleConfirm);
  cancelBtn?.addEventListener('click', closeModal);
  closeBtn?.addEventListener('click', closeModal);
  inputEl?.addEventListener('keydown', onKeydown);
}

export function renderWatchlist() {
  const grid = document.getElementById('watchlistGrid');
  const nav = document.getElementById('customListsNav');
  if (!grid || !nav) return;

  // Render tabs
  const lists = getAllLists();
  const allItems = getAllMasterItems();
  const masterCount = allItems.length;
  const plannedCount = allItems.filter(i => (i.status || 'Planned') === 'Planned').length;
  const watchingCount = allItems.filter(i => i.status === 'Watching').length;
  const completedCount = allItems.filter(i => i.status === 'Completed').length;

  const curStatus = watchlistState.watchlistStatus || 'all';
  const isDefault = currentListId === 'default';

  let tabsHtml = `
    <div class="wl-smart-views" role="group" aria-label="Smart Status Views">
      <button class="cl-tab ${isDefault && curStatus === 'all' ? 'active' : ''}" data-wl-nav="all">
        <span class="cl-tab-name">⭐ All Saved</span>
        <span class="cl-tab-count">${masterCount}</span>
      </button>
      <button class="cl-tab ${isDefault && curStatus === 'Planned' ? 'active' : ''}" data-wl-nav="Planned">
        <span class="cl-tab-name">📋 Plan to Watch</span>
        <span class="cl-tab-count">${plannedCount}</span>
      </button>
      <button class="cl-tab ${isDefault && curStatus === 'Watching' ? 'active' : ''}" data-wl-nav="Watching">
        <span class="cl-tab-name">👁️ Watching</span>
        <span class="cl-tab-count">${watchingCount}</span>
      </button>
      <button class="cl-tab ${isDefault && curStatus === 'Completed' ? 'active' : ''}" data-wl-nav="Completed">
        <span class="cl-tab-name">✅ Completed</span>
        <span class="cl-tab-count">${completedCount}</span>
      </button>
    </div>
    <div class="wl-sidebar-divider"><span>Custom Folders</span></div>
  `;
  
  lists.forEach(l => {
    const isMenuOpen = activeMenuId === l.id;
    const count = (l.items || []).length;
    tabsHtml += `
      <div class="cl-tab-wrap ${currentListId === l.id ? 'active' : ''}">
        <button class="cl-tab cl-tab-custom" data-list-id="${l.id}" title="${h(l.name)}">
          <span class="cl-tab-name">📁 ${h(l.name)}</span>
          <span class="cl-tab-count">${count}</span>
        </button>
        <button class="cl-menu-btn" data-list-menu="${l.id}" aria-label="List options for ${h(l.name)}" title="Options">⋮</button>
        ${isMenuOpen ? `
          <div class="cl-dropdown-menu" id="clMenuPopover">
            <button class="cl-menu-item" data-cl-action="rename" data-list-id="${l.id}">✏️ Rename</button>
            <button class="cl-menu-item danger" data-cl-action="delete" data-list-id="${l.id}">🗑️ Delete</button>
          </div>
        ` : ''}
      </div>`;
  });
  nav.innerHTML = tabsHtml;

  // Render items
  let items = [];
  if (currentListId === 'default') {
    items = getFilteredWatchlist();
  } else {
    const customList = lists.find(l => l.id === currentListId);
    if (customList) {
      // Filtering for custom list items
      const { watchlistFilter, watchlistSort, watchlistSearch, watchlistStatus } = watchlistState;
      // Clone items so we don't mutate the customList in memory when sorting
      items = [...customList.items];
      
      // Filter by type
      if (watchlistFilter !== 'all') {
        items = items.filter(i => i.type === watchlistFilter);
      }
      // Filter by status (Planned, Watching, Completed)
      if (watchlistStatus && watchlistStatus !== 'all') {
        items = items.filter(i => (i.status || 'Planned') === watchlistStatus);
      }
      // Filter by search
      if (watchlistSearch && watchlistSearch.trim()) {
        const q = watchlistSearch.toLowerCase().trim();
        items = items.filter(i => (i.title || '').toLowerCase().includes(q));
      }
      // Sort
      items.sort((a, b) => {
        if (watchlistSort === 'title') return (a.title || '').localeCompare(b.title || '');
        if (watchlistSort === 'rating') return parseFloat(b.rating || 0) - parseFloat(a.rating || 0);
        if (watchlistSort === 'year') return parseInt(b.year || 0, 10) - parseInt(a.year || 0, 10);
        return new Date(b.addedAt || 0) - new Date(a.addedAt || 0);
      });
    } else {
      currentListId = 'default';
      renderWatchlist();
      return;
    }
  }

  const titleEl = document.getElementById('watchlistMainTitle');
  if (titleEl) {
    if (currentListId === 'default') {
      const s = watchlistState.watchlistStatus;
      if (s === 'Planned') titleEl.textContent = '📋 Plan to Watch';
      else if (s === 'Watching') titleEl.textContent = '👁️ Currently Watching';
      else if (s === 'Completed') titleEl.textContent = '✅ Completed Titles';
      else titleEl.textContent = '⭐ All Saved Titles';
    } else {
      const n = lists.find(l => l.id === currentListId)?.name || 'List';
      titleEl.textContent = `📁 ${n}`;
    }
  }

  if (!items.length) {
    const filter = watchlistState.watchlistFilter;
    const status = watchlistState.watchlistStatus;
    const isFiltered = filter !== 'all' || status !== 'all' || !!(watchlistState.watchlistSearch && watchlistState.watchlistSearch.trim());
    const filterLabel = filter === 'tv' ? 'series' : filter === 'movie' ? 'movies' : filter === 'anime' ? 'anime' : 'titles';
    const isDefault = currentListId === 'default';
    const listName = isDefault ? 'Default Watchlist' : (lists.find(l => l.id === currentListId)?.name || 'this list');
    
    let icon = '📁';
    let title = `No ${filterLabel} found`;
    let subtitle = 'Try switching filter chips or clearing your search.';

    if (isDefault) {
      if (status === 'Completed') {
        icon = '✅';
        title = 'No completed titles yet';
        subtitle = 'Mark titles as Completed using the ✅ button on cards or details modal to see them here!';
      } else if (status === 'Watching') {
        icon = '👁️';
        title = 'No currently watching titles';
        subtitle = 'Set status to 👁️ Watching on any title you are actively enjoying!';
      } else if (status === 'Planned') {
        icon = '📋';
        title = 'No planned titles in your watchlist';
        subtitle = 'Browse movies, series, or anime and save them to your Plan to Watch list!';
      } else if (!isFiltered) {
        icon = '⭐';
        title = 'Your Watchlist is empty';
        subtitle = 'Add movies, series, and anime to track what you want to watch!';
      }
    } else if (!isFiltered) {
      icon = '📁';
      title = `"${listName}" is empty`;
      subtitle = 'Add titles to this folder using the "Add to List" option in any title details.';
    }

    grid.innerHTML = `
      <div class="placeholder-msg">
        <div class="placeholder-icon">${icon}</div>
        <div class="placeholder-title">${h(title)}</div>
        <div class="placeholder-desc">${h(subtitle)}</div>
        <button class="btn-primary placeholder-add-btn" id="emptySearchBtn">
          <span>🔍</span> Search & Add Titles
        </button>
      </div>`;
    return;
  }

  grid.innerHTML = items.map(i => card(i, { 
    showRemove: true, 
    showWatched: true,
    listId: currentListId === 'default' ? null : currentListId 
  })).join('');
}

export function initWatchlistListeners() {
  const section = document.getElementById('view-watchlist');
  if (!section) return;

  // Type filter chips
  section.addEventListener('click', e => {
    const chip = e.target.closest('[data-wf]');
    if (!chip) return;
    setWatchlistFilter(chip.dataset.wf);
    section.querySelectorAll('[data-wf]').forEach(c => c.classList.toggle('active', c === chip));
    renderWatchlist();
  });

  // Status filter chips (Planned, Watching, Completed, All)
  section.addEventListener('click', e => {
    const chip = e.target.closest('[data-wsf]');
    if (!chip) return;
    setWatchlistStatus(chip.dataset.wsf);
    section.querySelectorAll('[data-wsf]').forEach(c => c.classList.toggle('active', c === chip));
    renderWatchlist();
  });

  // Expose global status filter for links from Insights, Toast, and Profile
  window.filterWatchlistStatus = (status) => {
    currentListId = 'default';
    activeMenuId = null;
    setWatchlistStatus(status);
    section.querySelectorAll('[data-wsf]').forEach(c => c.classList.toggle('active', c.dataset.wsf === status));
    if (window.showView) window.showView('watchlist');
    renderWatchlist();
  };

  // Sort select
  section.querySelector('#watchlistSort')?.addEventListener('change', e => {
    setWatchlistSort(e.target.value);
    renderWatchlist();
  });

  // Search
  section.querySelector('#watchlistSearch')?.addEventListener('input', e => {
    setWatchlistSearch(e.target.value);
    renderWatchlist();
  });

  // Create List button in sidebar header
  document.getElementById('createListBtn')?.addEventListener('click', () => {
    showListDialog({ mode: 'create' });
  });

  // Empty state search button
  section.addEventListener('click', e => {
    if (e.target.closest('#emptySearchBtn')) {
      document.getElementById('searchToggle')?.click();
    }
  });

  // Switch List / Menu Options
  section.addEventListener('click', e => {
    // Smart status nav tab clicked
    const smartNav = e.target.closest('[data-wl-nav]');
    if (smartNav) {
      currentListId = 'default';
      activeMenuId = null;
      const targetStatus = smartNav.dataset.wlNav;
      setWatchlistStatus(targetStatus);
      section.querySelectorAll('[data-wsf]').forEach(c => c.classList.toggle('active', c.dataset.wsf === targetStatus));
      renderWatchlist();
      return;
    }

    // Menu item action (Rename / Delete)
    const actionBtn = e.target.closest('[data-cl-action]');
    if (actionBtn) {
      e.stopPropagation();
      const action = actionBtn.dataset.clAction;
      const listId = actionBtn.dataset.listId;
      const lists = getAllLists();
      const list = lists.find(l => l.id === listId);
      activeMenuId = null;
      renderWatchlist();

      if (!list) return;
      if (action === 'rename') {
        showListDialog({ mode: 'rename', listId, currentName: list.name });
      } else if (action === 'delete') {
        showListDialog({ mode: 'delete', listId, currentName: list.name });
      }
      return;
    }

    // Toggle menu button (⋮)
    const menuBtn = e.target.closest('[data-list-menu]');
    if (menuBtn) {
      e.stopPropagation();
      const listId = menuBtn.dataset.listMenu;
      activeMenuId = activeMenuId === listId ? null : listId;
      renderWatchlist();
      return;
    }

    // Tab clicked (switch active list)
    const tab = e.target.closest('[data-list-id]');
    if (tab) {
      currentListId = tab.dataset.listId;
      activeMenuId = null;
      renderWatchlist();
      return;
    }

    // Clicked elsewhere — close any open context menu
    if (activeMenuId !== null) {
      activeMenuId = null;
      renderWatchlist();
    }
  });

  // Close context menu on global click outside or escape
  document.addEventListener('click', e => {
    if (activeMenuId !== null && !e.target.closest('.cl-tab-wrap')) {
      activeMenuId = null;
      renderWatchlist();
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && activeMenuId !== null) {
      activeMenuId = null;
      renderWatchlist();
    }
  });
}

// Global listen for custom list changes & library changes
window.addEventListener('customlists-changed', () => {
  if (document.getElementById('view-watchlist')?.classList?.contains('active')) {
    renderWatchlist();
  }
});

storeEvents.on('library-changed', () => {
  if (document.getElementById('view-watchlist')?.classList?.contains('active')) {
    renderWatchlist();
  }
});
