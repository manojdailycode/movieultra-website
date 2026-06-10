<<<<<<< HEAD
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
      return res.status(apiRes.status).json({ error: `TMDB error: ${apiRes.statusText}` });
    }
    const data = await apiRes.json();
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=43200');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
=======
// Vercel serverless function — keeps TMDB key hidden server-side
export default async function handler(req, res) {
  const { path, ...params } = req.query;

  const query = new URLSearchParams({
    ...params,
    api_key: process.env.TMDB_KEY,
  });

  const url = `https://api.themoviedb.org/3/${path}?${query}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'TMDB fetch failed' });
  }
}
>>>>>>> origin/main
