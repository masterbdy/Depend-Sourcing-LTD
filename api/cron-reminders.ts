import { runScheduledRemindersCycle } from '../services/serverReminderScheduler';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const configuredSecret = process.env.CRON_SECRET?.trim();
  if (configuredSecret) {
    const authHeader = req.headers?.authorization || '';
    const querySecret = req.query?.secret;
    if (authHeader !== `Bearer ${configuredSecret}` && querySecret !== configuredSecret) {
      return res.status(401).json({ ok: false, error: 'Unauthorized cron invocation' });
    }
  }

  try {
    const simulatedNow =
      req.query?.nowMs && !Number.isNaN(Number(req.query.nowMs))
        ? Number(req.query.nowMs)
        : Date.now();
    const report = await runScheduledRemindersCycle(simulatedNow);
    return res.status(200).json(report);
  } catch (err: any) {
    console.error('[/api/cron-reminders] Error:', err);
    return res.status(500).json({
      ok: false,
      error: err?.message || 'Scheduled reminder cycle failed',
    });
  }
}
