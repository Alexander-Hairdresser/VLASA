// Vercel Serverless Function — проксирует Google Sheets без CORS
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  const SHEET_ID = '1nTNR_l6Ci2Tg51LA3pVyl8yxO4Rp-YG3GdThcdY-arQ';
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Dashboard_Source`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(502).json({ error: 'Google Sheets fetch failed', status: response.status });
    }
    const text = await response.text();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.status(200).send(text);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
