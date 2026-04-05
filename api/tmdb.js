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