'use strict';

import { readStorage, writeStorage, SK } from '../utils/storage.js';
import { storeEvents } from './events.js';
import { libUpdateStatus } from './library.js';

export const animeState = {
  progress: readStorage(SK.animeProgress, {}),
  diary: readStorage(SK.animeDiary, {}),
  episodes: readStorage(SK.animeEpisodes, {}),
  history: readStorage(SK.animeHistory, [])
};

function saveAll() {
  writeStorage(SK.animeProgress, animeState.progress);
  writeStorage(SK.animeDiary, animeState.diary);
  writeStorage(SK.animeEpisodes, animeState.episodes);
  writeStorage(SK.animeHistory, animeState.history);
  storeEvents.emit('anime-updated');
}

export function getAnimeProgress(animeId) {
  return animeState.progress[animeId] || {
    status: 'Planned',
    currentSeason: 1,
    currentEpisode: 1,
    episodesWatched: 0,
    completionPercentage: 0,
    daysTracked: 0,
    lastWatchedDate: null,
    lastUpdatedTime: null,
    manualStatusOverride: false
  };
}

export function getAnimeDiary(animeId) {
  return animeState.diary[animeId] || {
    rating: 0,
    watchDate: '',
    notes: '',
    moodTags: [],
    favoriteEpisode: '',
    favoriteCharacter: '',
    createdAt: null,
    updatedAt: null
  };
}

export function getEpisodeData(animeId, seasonNum, episodeNum) {
  const key = `${animeId}_S${seasonNum}E${episodeNum}`;
  return animeState.episodes[key] || {
    watchCount: 0,
    lastWatchDate: null
  };
}

export function toggleEpisodeWatched(animeId, seasonNum, episodeNum, totalEpisodes) {
  const key = `${animeId}_S${seasonNum}E${episodeNum}`;
  const epData = getEpisodeData(animeId, seasonNum, episodeNum);
  const nowStr = new Date().toISOString();
  
  if (epData.watchCount > 0) {
    epData.watchCount = Math.max(0, epData.watchCount - 1);
    if (epData.watchCount === 0) epData.lastWatchDate = null;
    
    const histIdx = animeState.history.findIndex(h => String(h.animeId) === String(animeId) && h.season === seasonNum && h.episode === episodeNum);
    if (histIdx > -1) {
      animeState.history.splice(histIdx, 1);
    }
  } else {
    epData.watchCount = 1;
    epData.lastWatchDate = nowStr;
    
    animeState.history.unshift({
      id: Date.now().toString(),
      animeId: String(animeId),
      season: seasonNum,
      episode: episodeNum,
      date: epData.lastWatchDate
    });
  }
  
  animeState.episodes[key] = epData;
  
  // Update last watched date in progress
  const prog = getAnimeProgress(animeId);
  prog.lastWatchedDate = epData.lastWatchDate || nowStr;
  prog.lastUpdatedTime = nowStr;
  animeState.progress[animeId] = prog;

  recalculateAnimeProgress(animeId, totalEpisodes);
  saveAll();
  return epData;
}

export function updateAnimeDiary(animeId, data) {
  const current = getAnimeDiary(animeId);
  const now = new Date().toISOString();
  animeState.diary[animeId] = {
    ...current,
    ...data,
    createdAt: current.createdAt || now,
    updatedAt: now
  };
  saveAll();
}

export function deleteAnimeDiary(animeId) {
  if (animeState.diary[animeId]) {
    delete animeState.diary[animeId];
    saveAll();
    return true;
  }
  return false;
}

export function setManualAnimeStatusOverride(animeId, isOverride) {
  const prog = getAnimeProgress(animeId);
  prog.manualStatusOverride = isOverride;
  animeState.progress[animeId] = prog;
  saveAll();
}

export function recalculateAnimeProgress(animeId, totalEpisodes) {
  let watchedCount = 0;
  let highestSeason = 1;
  let highestEpisode = 0;
  let lastWatchTime = 0;
  
  Object.keys(animeState.episodes).forEach(key => {
    if (key.startsWith(`${animeId}_`)) {
      const epData = animeState.episodes[key];
      if (epData.watchCount > 0) {
        watchedCount++;
        if (epData.lastWatchDate && new Date(epData.lastWatchDate).getTime() > lastWatchTime) {
          lastWatchTime = new Date(epData.lastWatchDate).getTime();
        }
        const match = key.match(/S(\d+)E(\d+)/);
        if (match) {
          const s = parseInt(match[1]);
          const e = parseInt(match[2]);
          if (s > highestSeason || (s === highestSeason && e > highestEpisode)) {
            highestSeason = s;
            highestEpisode = e;
          }
        }
      }
    }
  });

  const prog = getAnimeProgress(animeId);
  
  prog.episodesWatched = watchedCount;
  prog.currentSeason = highestSeason;
  prog.currentEpisode = highestEpisode;
  prog.completionPercentage = totalEpisodes > 0 ? Math.round((watchedCount / totalEpisodes) * 100) : 0;
  prog.lastUpdatedTime = new Date().toISOString();
  
  if (!prog.manualStatusOverride) {
    if (prog.completionPercentage === 100 && totalEpisodes > 0) {
      prog.status = 'Completed';
    } else if (watchedCount > 0) {
      const daysSinceWatch = lastWatchTime ? (Date.now() - lastWatchTime) / (1000 * 3600 * 24) : 0;
      if (daysSinceWatch >= 90) {
        prog.status = 'Dropped';
      } else if (daysSinceWatch >= 5) {
        prog.status = 'On Hold';
      } else {
        prog.status = 'Watching';
      }
    } else {
      prog.status = 'Planned';
    }
    
    // Sync with library using active type label 'anime'
    libUpdateStatus(animeId, prog.status, 'anime');
  }

  animeState.progress[animeId] = prog;
}

export function getSeasonProgress(animeId, seasonNum, seasonTotalEpisodes) {
  let watched = 0;
  for (let i = 1; i <= seasonTotalEpisodes; i++) {
    if (getEpisodeData(animeId, seasonNum, i).watchCount > 0) {
      watched++;
    }
  }
  return {
    watched,
    total: seasonTotalEpisodes,
    percentage: seasonTotalEpisodes > 0 ? Math.round((watched / seasonTotalEpisodes) * 100) : 0
  };
}

export function getWatchHistory(animeId) {
  return animeState.history.filter(h => String(h.animeId) === String(animeId));
}

export function getStats() {
  const allAnime = Object.keys(animeState.progress);
  let watchedEpisodes = 0;
  
  Object.values(animeState.episodes).forEach(e => {
    if (e.watchCount > 0) watchedEpisodes += e.watchCount;
  });

  const historyDates = animeState.history.map(h => new Date(h.date).toDateString());
  const uniqueDays = new Set(historyDates).size;

  let totalRating = 0;
  let ratedCount = 0;
  Object.values(animeState.diary).forEach(d => {
    if (d.rating > 0) {
      totalRating += d.rating;
      ratedCount++;
    }
  });
  const avgRating = ratedCount > 0 ? (totalRating / ratedCount).toFixed(1) : 0;

  let currentStreak = 0;
  let longestStreak = 0;
  const sortedDates = [...new Set(historyDates)].map(d => new Date(d)).sort((a,b) => b-a);
  
  if (sortedDates.length > 0) {
    let streak = 1;
    longestStreak = 1;
    for (let i = 0; i < sortedDates.length - 1; i++) {
      const diff = Math.round((sortedDates[i] - sortedDates[i+1]) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        streak++;
      } else {
        if (streak > longestStreak) longestStreak = streak;
        streak = 1;
      }
    }
    if (streak > longestStreak) longestStreak = streak;
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const diffToday = Math.round((today - sortedDates[0]) / (1000 * 60 * 60 * 24));
    if (diffToday <= 1) {
      currentStreak = streak;
    }
  }

  return {
    totalAnime: allAnime.length,
    watchedEpisodes,
    daysTracked: uniqueDays,
    avgRating,
    currentStreak,
    longestStreak
  };
}

export function exportAnimeData() {
  const exportPayload = {
    version: '2.0.0',
    exportDate: new Date().toISOString(),
    progress: animeState.progress,
    diary: animeState.diary,
    episodes: animeState.episodes,
    history: animeState.history
  };

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `movieultra_anime_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
