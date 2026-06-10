export default async function handler(req, res) {
<<<<<<< HEAD
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
      return res.status(apiRes.status).json({ error: `Jikan API error: ${apiRes.statusText}` });
    }
    const data = await apiRes.json();
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=43200');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
=======
  const { path = 'top/anime', ...params } = req.query;
  const query = new URLSearchParams(params);
  const url = `https://api.jikan.moe/v4/${path}${query.toString() ? `?${query.toString()}` : ''}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(200).json(data);
  } catch {
    res.status(500).json({ error: 'Jikan fetch failed' });
>>>>>>> origin/main
  }
}
