'use strict';

import { readStorage, writeStorage, SK } from '../utils/storage.js';
import { storeEvents } from './events.js';
import { libUpdateStatus } from './library.js';

export const seriesState = {
  progress: readStorage(SK.seriesProgress, {}),
  diary: readStorage(SK.seriesDiary, {}),
  episodes: readStorage(SK.seriesEpisodes, {}),
  history: readStorage(SK.seriesHistory, [])
};

function saveAll() {
  writeStorage(SK.seriesProgress, seriesState.progress);
  writeStorage(SK.seriesDiary, seriesState.diary);
  writeStorage(SK.seriesEpisodes, seriesState.episodes);
  writeStorage(SK.seriesHistory, seriesState.history);
  storeEvents.emit('series-updated');
}

export function getSeriesProgress(seriesId) {
  return seriesState.progress[seriesId] || {
    status: 'Planned',
    currentSeason: 1,
    currentEpisode: 1,
    episodesWatched: 0,
    completionPercentage: 0,
    daysTracked: 0
  };
}

export function getSeriesDiary(seriesId) {
  return seriesState.diary[seriesId] || {
    rating: 0,
    notes: '',
    moodTags: [],
    favoriteEpisode: '',
    favoriteCharacter: ''
  };
}

export function getEpisodeData(seriesId, seasonNum, episodeNum) {
  const key = `${seriesId}_S${seasonNum}E${episodeNum}`;
  return seriesState.episodes[key] || {
    watchCount: 0,
    lastWatchDate: null
  };
}

export function toggleEpisodeWatched(seriesId, seasonNum, episodeNum, totalEpisodes) {
  const key = `${seriesId}_S${seasonNum}E${episodeNum}`;
  const epData = getEpisodeData(seriesId, seasonNum, episodeNum);
  
  if (epData.watchCount > 0) {
    epData.watchCount = Math.max(0, epData.watchCount - 1);
    if (epData.watchCount === 0) epData.lastWatchDate = null;
    
    const histIdx = seriesState.history.findIndex(h => String(h.seriesId) === String(seriesId) && h.season === seasonNum && h.episode === episodeNum);
    if (histIdx > -1) {
      seriesState.history.splice(histIdx, 1);
    }
  } else {
    epData.watchCount = 1;
    epData.lastWatchDate = new Date().toISOString();
    
    seriesState.history.unshift({
      id: Date.now().toString(),
      seriesId: String(seriesId),
      season: seasonNum,
      episode: episodeNum,
      date: epData.lastWatchDate
    });
  }
  
  seriesState.episodes[key] = epData;
  recalculateSeriesProgress(seriesId, totalEpisodes);
  saveAll();
  return epData;
}

export function updateSeriesDiary(seriesId, data) {
  seriesState.diary[seriesId] = { ...getSeriesDiary(seriesId), ...data };
  saveAll();
}

export function setManualSeriesStatusOverride(seriesId, isOverride) {
  const prog = getSeriesProgress(seriesId);
  prog.manualStatusOverride = isOverride;
  seriesState.progress[seriesId] = prog;
  saveAll();
}

export function recalculateSeriesProgress(seriesId, totalEpisodes) {
  let watchedCount = 0;
  let highestSeason = 1;
  let highestEpisode = 0;
  
  let lastWatchTime = 0;
  
  Object.keys(seriesState.episodes).forEach(key => {
    if (key.startsWith(`${seriesId}_`)) {
      const epData = seriesState.episodes[key];
      if (epData.watchCount > 0) {
        watchedCount++;
        if (epData.lastWatchDate > lastWatchTime) {
          lastWatchTime = epData.lastWatchDate;
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

  const prog = getSeriesProgress(seriesId);
  
  prog.episodesWatched = watchedCount;
  prog.currentSeason = highestSeason;
  prog.currentEpisode = highestEpisode;
  prog.completionPercentage = totalEpisodes > 0 ? Math.round((watchedCount / totalEpisodes) * 100) : 0;
  
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
    
    // Aggressively sync with library if not manually overridden
    libUpdateStatus(seriesId, prog.status, 'tv');
  }

  seriesState.progress[seriesId] = prog;
}

export function getSeasonProgress(seriesId, seasonNum, seasonTotalEpisodes) {
  let watched = 0;
  for (let i = 1; i <= seasonTotalEpisodes; i++) {
    if (getEpisodeData(seriesId, seasonNum, i).watchCount > 0) {
      watched++;
    }
  }
  return {
    watched,
    total: seasonTotalEpisodes,
    percentage: seasonTotalEpisodes > 0 ? Math.round((watched / seasonTotalEpisodes) * 100) : 0
  };
}

export function getWatchHistory(seriesId) {
  return seriesState.history.filter(h => String(h.seriesId) === String(seriesId));
}

export function getStats() {
  const allSeries = Object.keys(seriesState.progress);
  let watchedEpisodes = 0;
  
  Object.values(seriesState.episodes).forEach(e => {
    if (e.watchCount > 0) watchedEpisodes += e.watchCount;
  });

  const historyDates = seriesState.history.map(h => new Date(h.date).toDateString());
  const uniqueDays = new Set(historyDates).size;

  let totalRating = 0;
  let ratedCount = 0;
  Object.values(seriesState.diary).forEach(d => {
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
      currentStreak = streak; // This includes checking if latest watch is today or yesterday
    }
  }

  return {
    totalSeries: allSeries.length,
    watchedEpisodes,
    daysTracked: uniqueDays,
    avgRating,
    currentStreak,
    longestStreak
  };
}
