export default async function handler(req, res) {
  const { url } = req.query;
  if (!url || !url.includes('cloudfront.net')) {
    return res.status(400).json({ error: 'URL invalida' });
  }
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
        'Accept': 'image/gif,image/png,image/jpeg,image/*',
        'Referer': 'https://app.stenfit.com/',
      }
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'image/gif';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
