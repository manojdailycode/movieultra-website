export default async function handler(req, res) {
  const { i, t, s, y, type, page } = req.query;
  const query = new URLSearchParams({
    apikey: process.env.OMDB_KEY || '',
  });
  if (i) query.set('i', i);
  if (t) query.set('t', t);
  if (s) query.set('s', s);
  if (y) query.set('y', y);
  if (type) query.set('type', type);
  if (page) query.set('page', page);

  try {
    const response = await fetch(`https://www.omdbapi.com/?${query.toString()}`);
    const data = await response.json();
    res.status(200).json(data);
  } catch {
    res.status(500).json({ error: 'OMDb fetch failed' });
  }
}
