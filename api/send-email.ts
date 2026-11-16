import {
  getEmailJobStatus,
  getEmailTransportSummary,
  handleEmailDispatch,
  prewarmSmtpEnvironment,
  probeSmtpNetworkStages,
} from '../services/emailTransportService.js';

export default async function handler(req: any, res: any) {
  const correlationId =
    (typeof req.headers?.['x-correlation-id'] === 'string' && req.headers['x-correlation-id'].trim()) ||
    (typeof req.body?.correlationId === 'string' && req.body.correlationId.trim()) ||
    `cor_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  // CORS HTTP headers (compatible with AI Studio Browser & Android APK WebView/TWA)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, X-User-Role, X-User-Name, X-Correlation-ID',
  );
  res.setHeader('X-Correlation-ID', correlationId);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const jobId = typeof req.query?.jobId === 'string' ? req.query.jobId.trim() : '';
    if (jobId) {
      const job = getEmailJobStatus(jobId);
      if (!job) {
        return res.status(404).json({ ok: false, error: 'Email job not found', correlationId });
      }
      return res.status(200).json({ ok: true, job, correlationId });
    }

    if (req.query?.warm === 'true') {
      const warm = await prewarmSmtpEnvironment(
        typeof req.query?.host === 'string' ? req.query.host : undefined,
      );
      return res.status(200).json({ ok: true, warm, summary: getEmailTransportSummary(), correlationId });
    }

    if (req.query?.probe === 'true') {
      const host = typeof req.query?.host === 'string' ? req.query.host : 'smtp.gmail.com';
      const port = parseInt(String(req.query?.port || '587'), 10) || 587;
      const stages = await probeSmtpNetworkStages(host, port);
      return res.status(200).json({ ok: true, summary: getEmailTransportSummary(), stages, correlationId });
    }

    return res.status(200).json({ ok: true, summary: getEmailTransportSummary(), correlationId });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', errorCategory: 'API_ERROR', correlationId });
  }

  try {
    const authHeader = typeof req.headers?.authorization === 'string' ? req.headers.authorization.trim() : '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (authHeader && (!authHeader.startsWith('Bearer ') || bearerToken.length < 16 || /^invalid/i.test(bearerToken))) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or malformed authorization token.',
        errorStage: 'AUTH',
        errorCategory: 'AUTH_ERROR',
        correlationId,
      });
    }

    const headerRole = typeof req.headers?.['x-user-role'] === 'string' ? req.headers['x-user-role'].trim() : undefined;
    const headerUser = typeof req.headers?.['x-user-name'] === 'string' ? req.headers['x-user-name'].trim() : undefined;
    const body = req.body && typeof req.body === 'object' ? req.body : {};

    const result = await handleEmailDispatch({
      ...body,
      correlationId,
      actorRole: body.actorRole ?? headerRole,
      actorName: body.actorName ?? headerUser,
    });
    return res.status(result.httpStatus).json(result.body);
  } catch (error: any) {
    console.error(`[EmailAPI][${correlationId}] Handler error:`, error?.message || String(error));
    return res.status(500).json({
      success: false,
      error: 'Failed to send email',
      errorCategory: 'API_ERROR',
      correlationId,
      details: error?.message || String(error),
    });
  }
}
