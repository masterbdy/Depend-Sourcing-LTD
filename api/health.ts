// Vercel Serverless Function: /api/health.ts
// Standard health probe endpoint

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    status: 'OK',
    healthy: true,
    service: 'Depend Sourcing API',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime ? process.uptime() : 0),
  });
}
