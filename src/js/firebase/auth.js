import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

import { firebaseConfigFallback } from './config.js';

let app = null;
let auth = null;
export let isMockMode = true;

// Mock database for users when Firebase is not configured
const getMockUsers = () => {
  try {
    return JSON.parse(localStorage.getItem('mu_mock_users') || '{}');
  } catch {
    return {};
  }
};

const saveMockUser = (email, user) => {
  const users = getMockUsers();
  users[email.toLowerCase()] = user;
  localStorage.setItem('mu_mock_users', JSON.stringify(users));
};

let currentMockUser = null;
let authChangeCallbacks = [];
let resolvedUser = null;
let initialStateDetermined = false;

// Load active mock session on boot
try {
  const session = localStorage.getItem('mu_mock_session');
  if (session) {
    currentMockUser = JSON.parse(session);
  }
} catch (e) {
  console.warn('[MovieUltra] Failed to load mock session:', e);
}

let configPromiseResolve = null;
const configPromise = new Promise(resolve => {
  configPromiseResolve = resolve;
});

// Perform async configuration detection
async function loadConfig() {
  let config = null;
  
  // 1. Try to fetch from serverless API
  try {
    const res = await fetch('/api/firebase-config');
    if (res.ok) {
      const data = await res.json();
      if (data.apiKey && !data.apiKey.includes('YOUR_API_KEY')) {
        config = data;
      }
    }
  } catch (err) {
    // API endpoint doesn't exist locally or offline
  }

  // 2. Try static fallback if serverless didn't return keys
  if (!config && firebaseConfigFallback.apiKey && !firebaseConfigFallback.apiKey.includes('YOUR_API_KEY')) {
    config = firebaseConfigFallback;
  }

  if (config) {
    try {
      app = initializeApp(config);
      auth = getAuth(app);
      isMockMode = false;
      console.log('[MovieUltra] Firebase successfully initialized with keys.');
    } catch (err) {
      console.warn('[MovieUltra] Firebase initialization failed. Falling back to Mock Mode:', err);
    }
  } else {
    console.log('[MovieUltra] Running in Mock Authentication Mode.');
  }

  // If in real Firebase mode, bridge Firebase state to our callback system
  if (!isMockMode && auth) {
    onAuthStateChanged(auth, user => {
      triggerAuthChange(user);
    });
  } else {
    // In mock mode, trigger initial change immediately
    triggerAuthChange(currentMockUser);
  }
  
  configPromiseResolve();
}

loadConfig();

export async function signUpUser(email, password, displayName) {
  await configPromise;
  if (isMockMode) {
    const users = getMockUsers();
    if (users[email.toLowerCase()]) {
      throw new Error('Email already in use.');
    }
    const newUser = {
      uid: 'mock-' + Math.random().toString(36).substring(2, 9),
      email: email,
      displayName: displayName || email.split('@')[0],
      emailVerified: true
    };
    saveMockUser(email, { ...newUser, password });
    
    currentMockUser = newUser;
    localStorage.setItem('mu_mock_session', JSON.stringify(newUser));
    triggerAuthChange(newUser);
    return newUser;
  } else {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(userCredential.user, { displayName });
    }
    triggerAuthChange(userCredential.user);
    return userCredential.user;
  }
}

export async function signInUser(email, password) {
  await configPromise;
  if (isMockMode) {
    const users = getMockUsers();
    const user = users[email.toLowerCase()];
    if (!user || user.password !== password) {
      throw new Error('Invalid email or password.');
    }
    const userInfo = { ...user };
    delete userInfo.password;
    currentMockUser = userInfo;
    localStorage.setItem('mu_mock_session', JSON.stringify(userInfo));
    triggerAuthChange(userInfo);
    return userInfo;
  } else {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  }
}

export async function signOutUser() {
  await configPromise;
  if (isMockMode) {
    currentMockUser = null;
    localStorage.removeItem('mu_mock_session');
    triggerAuthChange(null);
  } else {
    await signOut(auth);
  }
}

export async function resetPassword(email) {
  await configPromise;
  if (isMockMode) {
    const users = getMockUsers();
    if (!users[email.toLowerCase()]) {
      throw new Error('User not found.');
    }
    return true;
  } else {
    await sendPasswordResetEmail(auth, email);
  }
}

export function onAuthChange(callback) {
  authChangeCallbacks.push(callback);
  
  if (initialStateDetermined) {
    callback(resolvedUser);
  }

  return () => {
    authChangeCallbacks = authChangeCallbacks.filter(cb => cb !== callback);
  };
}

function triggerAuthChange(user) {
  resolvedUser = user;
  initialStateDetermined = true;
  authChangeCallbacks.forEach(callback => {
    try {
      callback(user);
    } catch (e) {
      console.error('[MovieUltra] AuthChange callback error:', e);
    }
  });
}
