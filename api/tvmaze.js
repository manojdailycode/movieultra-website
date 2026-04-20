export default async function handler(req, res) {
  const { path = 'shows', ...params } = req.query;
  const query = new URLSearchParams(params);
  const url = `https://api.tvmaze.com/${path}${query.toString() ? `?${query.toString()}` : ''}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(200).json(data);
  } catch {
    res.status(500).json({ error: 'TVMaze fetch failed' });
  }
}
