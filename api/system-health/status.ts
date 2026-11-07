// Vercel Serverless Function: /api/system-health/status.ts
// Provides verified health status and runtime diagnostics for Vercel production deployments.

export default async function handler(req: any, res: any) {
  // CORS & caching headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const memory = process.memoryUsage ? process.memoryUsage() : null;
    return res.status(200).json({
      status: 'OK',
      service: 'Depend Sourcing API',
      runtime: 'Vercel Serverless / Node.js',
      uptime: Math.floor(process.uptime ? process.uptime() : 0),
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      memoryMb: memory
        ? {
            rss: Math.round(memory.rss / (1024 * 1024)),
            heapTotal: Math.round(memory.heapTotal / (1024 * 1024)),
            heapUsed: Math.round(memory.heapUsed / (1024 * 1024)),
          }
        : undefined,
      capabilities: {
        emailService: true,
        aiTutor: Boolean(process.env.GEMINI_API_KEY),
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'ERROR',
      error: err?.message || 'Internal health check error',
    });
  }
}
