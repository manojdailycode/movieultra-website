'use strict';

import { setCors, rateLimit, isOriginAllowed } from './lib/security.js';

export default async function handler(req, res) {
  if (setCors(req, res)) return;
  if (rateLimit(req, res, { max: 30, windowMs: 60000 })) return;

  // Strict origin check: Only serve Firebase credentials to authorized origins
  if (!isOriginAllowed(req)) {
    return res.status(403).json({ error: 'Access denied: unauthorized origin' });
  }

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  return res.status(200).json({
    apiKey: process.env.FIREBASE_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.FIREBASE_APP_ID || ''
  });
}
