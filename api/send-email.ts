import {
  getEmailJobStatus,
  getEmailTransportSummary,
  handleEmailDispatch,
  probeSmtpNetworkStages,
} from '../services/emailTransportService';

export default async function handler(req: any, res: any) {
  // CORS HTTP headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const jobId = typeof req.query?.jobId === 'string' ? req.query.jobId.trim() : '';
    if (jobId) {
      const job = getEmailJobStatus(jobId);
      if (!job) {
        return res.status(404).json({ ok: false, error: 'Email job not found' });
      }
      return res.status(200).json({ ok: true, job });
    }

    if (req.query?.probe === 'true') {
      const host = typeof req.query?.host === 'string' ? req.query.host : 'smtp.gmail.com';
      const port = parseInt(String(req.query?.port || '587'), 10) || 587;
      const stages = await probeSmtpNetworkStages(host, port);
      return res.status(200).json({ ok: true, summary: getEmailTransportSummary(), stages });
    }

    return res.status(200).json({ ok: true, summary: getEmailTransportSummary() });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await handleEmailDispatch(req.body || {});
    return res.status(result.httpStatus).json(result.body);
  } catch (error: any) {
    console.error('Error in /api/send-email handler:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send email',
      details: error?.message || String(error),
    });
  }
}
