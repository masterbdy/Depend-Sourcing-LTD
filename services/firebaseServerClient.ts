import crypto from 'node:crypto';
import fs from 'node:fs';
import { DEFAULT_FIREBASE_CONFIG } from '../constants';

interface ServiceAccountCreds {
  project_id: string;
  client_email: string;
  private_key: string;
}

let cachedAccessToken: { token: string; expiresAtMs: number; projectId: string } | null = null;

function parseServiceAccountFromEnv(): ServiceAccountCreds | null {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (rawJson) {
    try {
      const normalized = rawJson.startsWith('{')
        ? rawJson
        : Buffer.from(rawJson, 'base64').toString('utf8');
      const parsed = JSON.parse(normalized);
      if (parsed?.client_email && parsed?.private_key) {
        return {
          project_id: parsed.project_id || DEFAULT_FIREBASE_CONFIG.projectId,
          client_email: parsed.client_email,
          private_key: String(parsed.private_key).replace(/\\n/g, '\n'),
        };
      }
    } catch (err) {
      console.warn('[firebaseServerClient] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', err);
    }
  }

  const email = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  if (email && privateKey) {
    return {
      project_id:
        process.env.FIREBASE_PROJECT_ID?.trim() || DEFAULT_FIREBASE_CONFIG.projectId,
      client_email: email,
      private_key: privateKey.replace(/\\n/g, '\n'),
    };
  }

  const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (credsPath && fs.existsSync(credsPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
      if (parsed?.client_email && parsed?.private_key) {
        return {
          project_id: parsed.project_id || DEFAULT_FIREBASE_CONFIG.projectId,
          client_email: parsed.client_email,
          private_key: String(parsed.private_key).replace(/\\n/g, '\n'),
        };
      }
    } catch {}
  }

  return null;
}

export function getFirebaseServerConfigStatus(): {
  projectId: string;
  databaseURL: string;
  hasServiceAccount: boolean;
  canSendFcmPush: boolean;
  missingReason?: string;
} {
  const sa = parseServiceAccountFromEnv();
  const projectId =
    sa?.project_id ||
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    DEFAULT_FIREBASE_CONFIG.projectId;
  const databaseURL =
    process.env.FIREBASE_DATABASE_URL?.trim() ||
    DEFAULT_FIREBASE_CONFIG.databaseURL;

  return {
    projectId,
    databaseURL,
    hasServiceAccount: Boolean(sa),
    canSendFcmPush: Boolean(sa),
    missingReason: sa
      ? undefined
      : 'FIREBASE_SERVICE_ACCOUNT_JSON (Firebase Admin Service Account) is not configured in environment variables.',
  };
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function getGoogleAccessToken(): Promise<{ token: string; projectId: string } | null> {
  const sa = parseServiceAccountFromEnv();
  if (!sa) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  if (
    cachedAccessToken &&
    cachedAccessToken.expiresAtMs > Date.now() + 60_000 &&
    cachedAccessToken.projectId === sa.project_id
  ) {
    return { token: cachedAccessToken.token, projectId: cachedAccessToken.projectId };
  }

  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claimSet = base64UrlEncode(
    JSON.stringify({
      iss: sa.client_email,
      scope: [
        'https://www.googleapis.com/auth/firebase.messaging',
        'https://www.googleapis.com/auth/firebase.database',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' '),
      aud: 'https://oauth2.googleapis.com/token',
      exp: nowSec + 3600,
      iat: nowSec,
    }),
  );

  const signingInput = `${header}.${claimSet}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  const signature = base64UrlEncode(signer.sign(sa.private_key));
  const jwt = `${signingInput}.${signature}`;

  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResp.ok) {
    const errText = await tokenResp.text().catch(() => '');
    throw new Error(`Google OAuth token exchange failed (${tokenResp.status}): ${errText}`);
  }

  const tokenData: any = await tokenResp.json();
  if (!tokenData?.access_token) {
    throw new Error('Google OAuth response missing access_token');
  }

  cachedAccessToken = {
    token: tokenData.access_token,
    projectId: sa.project_id,
    expiresAtMs: Date.now() + (Number(tokenData.expires_in) || 3600) * 1000,
  };

  return { token: cachedAccessToken.token, projectId: cachedAccessToken.projectId };
}

function getDbBaseUrl(): string {
  return (
    process.env.FIREBASE_DATABASE_URL?.trim() ||
    DEFAULT_FIREBASE_CONFIG.databaseURL
  ).replace(/\/+$/, '');
}

async function buildRtdbHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extra || {}),
  };
  try {
    const auth = await getGoogleAccessToken();
    if (auth?.token) {
      headers.Authorization = `Bearer ${auth.token}`;
    }
  } catch (err) {
    console.warn('[firebaseServerClient] OAuth token unavailable for RTDB request:', err);
  }
  return headers;
}

export async function rtdbRead<T = any>(
  nodePath: string,
): Promise<{ ok: boolean; data: T | null; status: number; error?: string }> {
  const cleanPath = nodePath.replace(/^\/+/, '');
  const url = `${getDbBaseUrl()}/${cleanPath}.json`;
  const headers = await buildRtdbHeaders();
  const resp = await fetch(url, { method: 'GET', headers });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    return { ok: false, data: null, status: resp.status, error: txt || resp.statusText };
  }
  const data = (await resp.json()) as T | null;
  return { ok: true, data, status: resp.status };
}

export async function rtdbWrite(
  nodePath: string,
  payload: any,
): Promise<{ ok: boolean; status: number; error?: string }> {
  const cleanPath = nodePath.replace(/^\/+/, '');
  const url = `${getDbBaseUrl()}/${cleanPath}.json`;
  const headers = await buildRtdbHeaders();
  const resp = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    return { ok: false, status: resp.status, error: txt || resp.statusText };
  }
  return { ok: true, status: resp.status };
}

export async function rtdbPatch(
  nodePath: string,
  payload: Record<string, any>,
): Promise<{ ok: boolean; status: number; error?: string }> {
  const cleanPath = nodePath.replace(/^\/+/, '');
  const url = `${getDbBaseUrl()}/${cleanPath}.json`;
  const headers = await buildRtdbHeaders();
  const resp = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    return { ok: false, status: resp.status, error: txt || resp.statusText };
  }
  return { ok: true, status: resp.status };
}

/**
 * Atomic idempotency lock via Firebase RTDB ETag (`if-match: null_etag`).
 * Succeeds ONLY if the node does not currently exist, guaranteeing duplicate cron
 * invocations never dispatch duplicate notifications.
 */
export async function acquireRtdbIdempotencyLock(
  lockPath: string,
  metadata: Record<string, any>,
): Promise<{ acquired: boolean; status: number; error?: string }> {
  const cleanPath = lockPath.replace(/^\/+/, '');
  const url = `${getDbBaseUrl()}/${cleanPath}.json`;
  const headers = await buildRtdbHeaders({ 'if-match': 'null_etag' });
  const resp = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(metadata),
  });

  if (resp.status === 412) {
    return { acquired: false, status: 412, error: 'ALREADY_LOCKED' };
  }
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    return { acquired: false, status: resp.status, error: txt || resp.statusText };
  }
  return { acquired: true, status: resp.status };
}

export async function sendFcmPushMessage(params: {
  token: string;
  title: string;
  body: string;
  link?: string;
  url?: string;
  tag?: string;
  category?: string;
  actions?: Array<{ action: string; title: string }>;
  extraData?: Record<string, string>;
}): Promise<{
  ok: boolean;
  messageId?: string;
  missingCredentials?: boolean;
  invalidToken?: boolean;
  error?: string;
}> {
  if (!params.token || typeof params.token !== 'string') {
    return { ok: false, error: 'Missing recipient FCM token' };
  }

  let auth: { token: string; projectId: string } | null = null;
  try {
    auth = await getGoogleAccessToken();
  } catch (err: any) {
    return { ok: false, error: err?.message || 'OAuth failure' };
  }

  if (!auth) {
    return {
      ok: false,
      missingCredentials: true,
      error: 'FIREBASE_SERVICE_ACCOUNT_JSON is not configured on the server.',
    };
  }

  const endpoint = `https://fcm.googleapis.com/v1/projects/${auth.projectId}/messages:send`;
  const dataPayload: Record<string, string> = {
    title: params.title,
    body: params.body,
    tab: params.link || 'dashboard',
    link: params.link || 'dashboard',
    url: params.url || `/?tab=${encodeURIComponent(params.link || 'dashboard')}`,
    tag: params.tag || 'depend-sourcing-push',
    category: params.category || 'general',
    timestamp: new Date().toISOString(),
    ...(params.actions ? { actionsJson: JSON.stringify(params.actions) } : {}),
    ...(params.extraData || {}),
  };

  // Use data-centric + webpush metadata so firebase-messaging-sw.js & sw-notifications.js
  // construct unified Depend Sourcing Ltd. branding, large /logo.png icon, monochrome badge,
  // and 3 interactive action buttons without OS double-displaying or stripping actions.
  const fcmPayload = {
    message: {
      token: params.token,
      data: dataPayload,
      android: {
        priority: 'HIGH',
      },
      webpush: {
        headers: {
          Urgency: 'high',
          TTL: '86400',
        },
        fcm_options: {
          link: dataPayload.url,
        },
      },
    },
  };

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(fcmPayload),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    const isUnregistered =
      errText.includes('UNREGISTERED') || errText.includes('INVALID_ARGUMENT');
    return {
      ok: false,
      invalidToken: isUnregistered,
      error: `FCM HTTP ${resp.status}: ${errText}`,
    };
  }

  const json: any = await resp.json().catch(() => ({}));
  return { ok: true, messageId: json?.name };
}
