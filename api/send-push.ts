import { dispatchPopPushNotifications } from '../services/serverReminderScheduler.js';
import { sendFcmPushMessage } from '../services/firebaseServerClient.js';

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
    const body = req.body || {};

    if (body.kind === 'POP_MESSAGE' || body.popupId) {
      if (!body.popupId || !body.targetUserId || !body.title || !body.message) {
        return res.status(400).json({
          ok: false,
          error: 'Missing popupId, targetUserId, title, or message',
        });
      }

      const result = await dispatchPopPushNotifications({
        popupId: String(body.popupId),
        targetUserId: String(body.targetUserId),
        title: String(body.title),
        message: String(body.message),
        senderName: body.senderName ? String(body.senderName) : undefined,
      });

      return res.status(200).json(result);
    }

    // Standard single-token direct push (used by notifications.ts sendPush)
    const { token, title, body: msgBody, data } = body;
    if (!token || !title) {
      return res.status(400).json({ ok: false, error: 'Missing token or title' });
    }

    const pushRes = await sendFcmPushMessage({
      token: String(token),
      title: String(title),
      body: String(msgBody || ''),
      link: data?.link || data?.tab || 'dashboard',
      url: data?.url,
      tag: data?.tag,
      category: data?.type,
    });

    return res.status(pushRes.ok ? 200 : pushRes.missingCredentials ? 503 : 500).json(pushRes);
  } catch (err: any) {
    console.error('[/api/send-push] Error:', err);
    return res.status(500).json({ ok: false, error: err?.message || 'Internal push error' });
  }
}
