export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Correlation-ID');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({
    version: '1.1.0',
    buildTimestamp: process.env.BUILD_TIMESTAMP || '2026-10-21T12:00:00.000Z',
    commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_REF || 'prod-build',
    minSupportedVersion: '1.0.0',
    releaseName: 'Safe Update & Recovery Center',
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'production',
    runtime: 'Vercel Serverless',
    serviceStatus: 'HEALTHY',
    timestamp: new Date().toISOString(),
  });
}
