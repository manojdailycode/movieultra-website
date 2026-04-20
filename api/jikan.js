export default async function handler(req, res) {
  const { path = 'top/anime', ...params } = req.query;
  const query = new URLSearchParams(params);
  const url = `https://api.jikan.moe/v4/${path}${query.toString() ? `?${query.toString()}` : ''}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(200).json(data);
  } catch {
    res.status(500).json({ error: 'Jikan fetch failed' });
  }
}
