import { processReminderUserAction } from '../../services/serverReminderScheduler';
import { ReminderActionType } from '../../types';

const ALLOWED_ACTIONS = new Set<ReminderActionType>([
  'NOW_OPENED',
  'SNOOZE_10M',
  'NO_BILL_TODAY',
  'BILL_SUBMITTED_CONFIRMED',
]);

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { action, staffId, staffName, dateBn } = req.body || {};
    if (!action || !ALLOWED_ACTIONS.has(action)) {
      return res.status(400).json({ ok: false, error: 'Invalid reminder action' });
    }
    if (!staffId || typeof staffId !== 'string') {
      return res.status(400).json({ ok: false, error: 'Missing staffId' });
    }

    const result = await processReminderUserAction({
      action,
      staffId,
      staffName: staffName ? String(staffName) : undefined,
      dateBn: dateBn ? String(dateBn) : undefined,
    });

    return res.status(result.ok ? 200 : 500).json(result);
  } catch (err: any) {
    console.error('[/api/reminders/action] Error:', err);
    return res.status(500).json({ ok: false, error: err?.message || 'Action failed' });
  }
}
