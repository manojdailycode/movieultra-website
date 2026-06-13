import * as mockDb from './mockDb.js';

function getMockResponse(path, queryParams) {
  if (path.startsWith('/trending/')) {
    const parts = path.split('/');
    const type = parts[2] || 'all';
    return mockDb.getTrending(type, parseInt(queryParams.page || 1));
  }
  if (path === '/movie/popular' || path === '/tv/popular') {
    const type = path.split('/')[1];
    return mockDb.getPopular(type, parseInt(queryParams.page || 1));
  }
  if (path === '/movie/top_rated' || path === '/tv/top_rated') {
    const type = path.split('/')[1];
    return mockDb.getTopRated(type, parseInt(queryParams.page || 1));
  }
  if (path === '/movie/now_playing') {
    return mockDb.getNowPlaying(parseInt(queryParams.page || 1));
  }
  if (path === '/movie/upcoming') {
    return mockDb.getUpcoming(parseInt(queryParams.page || 1));
  }
  if (path === '/tv/airing_today') {
    return mockDb.getAiringToday(parseInt(queryParams.page || 1));
  }
  if (path === '/tv/on_the_air') {
    return mockDb.getOnTheAir(parseInt(queryParams.page || 1));
  }
  if (path.startsWith('/search/')) {
    const type = path.split('/')[2];
    return mockDb.searchMulti(queryParams.query, type);
  }
  const detailMatch = path.match(/^\/(movie|tv)\/(\d+)$/);
  if (detailMatch) {
    const [, type, id] = detailMatch;
    return mockDb.getDetails(type, id);
  }
  const videoMatch = path.match(/^\/(movie|tv)\/(\d+)\/videos$/);
  if (videoMatch) {
    const [, type, id] = videoMatch;
    const details = mockDb.getDetails(type, id);
    return details.videos || { results: [] };
  }
  const seasonMatch = path.match(/^\/tv\/(\d+)\/season\/(\d+)$/);
  if (seasonMatch) {
    const [, tvId, seasonNum] = seasonMatch;
    return mockDb.getSeasonDetails(tvId, seasonNum);
  }
  return { results: [] };
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

  const { path, ...queryParams } = req.query;
  if (!path) {
    return res.status(400).json({ error: 'Missing path parameter' });
  }

  const apiKey = process.env.TMDB_KEY || 'cf73f47a609d2e71e31813358f64cb2f';
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  url.searchParams.set('api_key', apiKey);
  Object.entries(queryParams).forEach(([k, v]) => url.searchParams.set(k, v));

  try {
    const apiRes = await fetch(url.toString());
    if (!apiRes.ok) {
      console.warn(`[TMDB API Proxy] API request failed with status ${apiRes.status}. Using mock fallback.`);
      const data = getMockResponse(path, queryParams);
      return res.status(200).json(data);
    }
    const data = await apiRes.json();
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=43200');
    return res.status(200).json(data);
  } catch (err) {
    console.warn(`[TMDB API Proxy] Fetch error: ${err.message}. Using mock fallback.`);
    const data = getMockResponse(path, queryParams);
    return res.status(200).json(data);
  }
}

