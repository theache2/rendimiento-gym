// api/img.js — Vercel Serverless Function
// Actúa como proxy para imágenes del CDN de Stenfit
// URL de uso: /api/img?url=https://d370ick9oh8tvn.cloudfront.net/...

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url || !url.includes('cloudfront.net')) {
    return res.status(400).json({ error: 'URL inválida' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
        'Accept': 'image/gif,image/png,image/jpeg,image/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://app.stenfit.com/',
        'Origin': 'https://app.stenfit.com',
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'No se pudo obtener la imagen' });
    }

    const contentType = response.headers.get('content-type') || 'image/gif';
    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(buffer);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
