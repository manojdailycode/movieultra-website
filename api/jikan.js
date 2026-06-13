import * as mockDb from './mockDb.js';

function getMockResponse(path) {
  try {
    const parsedUrl = new URL(path, 'http://localhost');
    const pathname = parsedUrl.pathname;
    const searchParams = parsedUrl.searchParams;

    if (pathname === '/top/anime') {
      return mockDb.getTopAnime(searchParams.get('filter') || 'bypopularity', parseInt(searchParams.get('page') || 1));
    }
    if (pathname === '/anime') {
      return mockDb.searchAnime(searchParams.get('q'), searchParams.get('genres'), parseInt(searchParams.get('page') || 1));
    }
    const detailMatch = pathname.match(/^\/anime\/(\d+)\/full$/) || pathname.match(/^\/anime\/(\d+)$/);
    if (detailMatch) {
      const [, id] = detailMatch;
      return mockDb.getAnimeDetails(id);
    }
  } catch (e) {
    console.error(`Error parsing path for mock response: ${path}`, e);
  }
  return { data: [] };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { path } = req.query;
  if (!path) {
    return res.status(400).json({ error: 'Missing path parameter' });
  }

  const url = `https://api.jikan.moe/v4${path}`;

  try {
    const apiRes = await fetch(url);
    if (!apiRes.ok) {
      console.warn(`[Jikan API Proxy] API request failed with status ${apiRes.status}. Using mock fallback.`);
      const data = getMockResponse(path);
      return res.status(200).json(data);
    }
    const data = await apiRes.json();
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=43200');
    return res.status(200).json(data);
  } catch (err) {
    console.warn(`[Jikan API Proxy] Fetch error: ${err.message}. Using mock fallback.`);
    const data = getMockResponse(path);
    return res.status(200).json(data);
  }
}

