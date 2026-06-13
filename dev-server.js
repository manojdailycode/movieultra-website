'use strict';

import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple .env parser to populate process.env locally
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const index = trimmed.indexOf('=');
      if (index === -1) return;
      const key = trimmed.substring(0, index).trim();
      const val = trimmed.substring(index + 1).trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = val;
    });
  }
}
loadEnv();

const PORT = process.env.PORT || 5000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // Serve API endpoints (replicating Vercel Serverless Function behavior locally)
  if (pathname.startsWith('/api/')) {
    const apiName = pathname.substring(5); // e.g. "firebase-config", "tmdb", "jikan"
    const apiPath = path.join(__dirname, 'api', `${apiName}.js`);
    
    if (fs.existsSync(apiPath)) {
      try {
        const module = await import(`./api/${apiName}.js`);
        const handler = module.default;
        
        // Mock the Vercel response object
        const mockRes = {
          status(code) {
            res.statusCode = code;
            return this;
          },
          setHeader(name, val) {
            res.setHeader(name, val);
            return this;
          },
          json(data) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
            return this;
          },
          end(data) {
            res.end(data);
            return this;
          }
        };

        // Mock the Vercel request object
        const query = Object.fromEntries(parsedUrl.searchParams.entries());
        const mockReq = {
          method: req.method,
          headers: req.headers,
          query: query,
        };

        await handler(mockReq, mockRes);
        return;
      } catch (err) {
        console.error(`Error in API handler /api/${apiName}:`, err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
    }
  }

  // Serve static files
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  
  // Security check: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[MovieUltra Dev Server] Port ${PORT} is already in use. Stop any other server on that port or set PORT to a different value.`);
  } else {
    console.error('[MovieUltra Dev Server] Server error:', err);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`[MovieUltra Dev Server] Running at http://localhost:${PORT}`);
  console.log(`[MovieUltra Dev Server] Reading config from .env and routing /api/* requests successfully.`);
});
