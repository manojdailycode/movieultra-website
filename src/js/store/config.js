'use strict';

import { readStorage, writeStorage } from '../utils/storage.js';
import { storeEvents } from './events.js';

const KEY_PREFIX = 'mu_config_';

export const configKeys = {
  useCustomKeys: `${KEY_PREFIX}use_custom_keys`,
  tmdbKey: `${KEY_PREFIX}tmdb_key`,
  firebaseApiKey: `${KEY_PREFIX}fb_api_key`,
  firebaseAuthDomain: `${KEY_PREFIX}fb_auth_domain`,
  firebaseProjectId: `${KEY_PREFIX}fb_project_id`,
  firebaseStorageBucket: `${KEY_PREFIX}fb_storage_bucket`,
  firebaseMessagingSenderId: `${KEY_PREFIX}fb_messaging_sender_id`,
  firebaseAppId: `${KEY_PREFIX}fb_app_id`,
  adultContent: `${KEY_PREFIX}adult_content`,
  imageQuality: `${KEY_PREFIX}image_quality`, // 'high' vs 'low'
  defaultLayout: `${KEY_PREFIX}default_layout` // 'grid' vs 'showcase'
};

export const configState = {
  useCustomKeys: readStorage(configKeys.useCustomKeys, false),
  tmdbKey: readStorage(configKeys.tmdbKey, ''),
  firebaseConfig: {
    apiKey: readStorage(configKeys.firebaseApiKey, ''),
    authDomain: readStorage(configKeys.firebaseAuthDomain, ''),
    projectId: readStorage(configKeys.firebaseProjectId, ''),
    storageBucket: readStorage(configKeys.firebaseStorageBucket, ''),
    messagingSenderId: readStorage(configKeys.firebaseMessagingSenderId, ''),
    appId: readStorage(configKeys.firebaseAppId, '')
  },
  adultContent: readStorage(configKeys.adultContent, false),
  imageQuality: readStorage(configKeys.imageQuality, 'high'),
  defaultLayout: readStorage(configKeys.defaultLayout, 'showcase')
};

export function saveConfig(key, value) {
  writeStorage(key, value);
  
  if (key === configKeys.useCustomKeys) configState.useCustomKeys = value;
  else if (key === configKeys.tmdbKey) configState.tmdbKey = value;
  else if (key === configKeys.firebaseApiKey) configState.firebaseConfig.apiKey = value;
  else if (key === configKeys.firebaseAuthDomain) configState.firebaseConfig.authDomain = value;
  else if (key === configKeys.firebaseProjectId) configState.firebaseConfig.projectId = value;
  else if (key === configKeys.firebaseStorageBucket) configState.firebaseConfig.storageBucket = value;
  else if (key === configKeys.firebaseMessagingSenderId) configState.firebaseConfig.messagingSenderId = value;
  else if (key === configKeys.firebaseAppId) configState.firebaseConfig.appId = value;
  else if (key === configKeys.adultContent) configState.adultContent = value;
  else if (key === configKeys.imageQuality) configState.imageQuality = value;
  else if (key === configKeys.defaultLayout) configState.defaultLayout = value;
  
  storeEvents.emit('config-changed', { key, value });
}

export function resetAllConfig() {
  Object.values(configKeys).forEach(key => {
    localStorage.removeItem(key);
  });
  
  configState.useCustomKeys = false;
  configState.tmdbKey = '';
  configState.firebaseConfig = {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  };
  configState.adultContent = false;
  configState.imageQuality = 'high';
  configState.defaultLayout = 'showcase';
  
  storeEvents.emit('config-changed', { reset: true });
}
