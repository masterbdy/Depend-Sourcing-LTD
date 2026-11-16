import { perf } from './performanceDiagnostics';
import { systemHealth } from './systemHealthService';
import type { EmailErrorCategory } from './emailTransportService';

export interface EmailSendOptions {
  entityId?: string;
  idempotencyKey?: string;
  actorRole?: string;
  actorName?: string;
}

export interface QueuedFailedEmail {
  idempotencyKey: string;
  kind: 'BILL_STATUS' | 'FUND_ADDED' | 'GENERAL';
  actionName: string;
  to: string;
  subject: string;
  html: string;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  nextRetryAt: number;
  lastError?: string;
  errorCategory?: EmailErrorCategory;
  correlationId?: string;
}

const FAILED_EMAIL_QUEUE_KEY = 'ais_failed_email_queue_v1';
const SENT_IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;
const DEFAULT_ASYNC_API_TIMEOUT_MS = 10000;
const DEFAULT_OTP_API_TIMEOUT_MS = 15000;

const clientRecentEmailKeys = new Map<string, number>();

function generateCorrelationId(): string {
  return `cor_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function getSmtpConfigSafe(): any {
  try {
    if (typeof localStorage === 'undefined') return undefined;
    const saved = localStorage.getItem('smtp_config');
    return saved ? JSON.parse(saved) : undefined;
  } catch {
    return undefined;
  }
}

function getActiveSessionActor(): { actorRole?: string; actorName?: string } {
  try {
    if (typeof localStorage === 'undefined') return {};
    const saved = localStorage.getItem('active_session');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        actorRole: parsed?.role ? String(parsed.role) : undefined,
        actorName: parsed?.username ? String(parsed.username) : undefined,
      };
    }
    const role = localStorage.getItem('user_role');
    const name = localStorage.getItem('current_user');
    return {
      actorRole: role || undefined,
      actorName: name || undefined,
    };
  } catch {
    return {};
  }
}

function isSyntheticDependEmail(email: string): boolean {
  return String(email || '').trim().toLowerCase().endsWith('@depend.com');
}

function classifyClientErrorCategory(params: {
  httpStatus?: number;
  payloadCategory?: string;
  payloadStage?: string;
  error?: any;
}): EmailErrorCategory {
  if (params.payloadCategory) {
    return params.payloadCategory as EmailErrorCategory;
  }
  if (params.httpStatus === 401 || params.httpStatus === 403 || params.payloadStage === 'AUTH') {
    return params.payloadStage === 'AUTH' && params.httpStatus !== 401 && params.httpStatus !== 403
      ? 'SMTP_AUTH_ERROR'
      : 'AUTH_ERROR';
  }
  if (params.payloadStage === 'TIMEOUT' || params.error?.name === 'AbortError') {
    return 'SMTP_TIMEOUT';
  }
  if (params.payloadStage === 'CONNECTION' || params.payloadStage === 'TLS') {
    return 'SMTP_CONNECTION_ERROR';
  }
  if (params.payloadStage === 'PROVIDER_SEND') {
    return 'PROVIDER_REJECTION';
  }
  if (params.error) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return 'NETWORK_ERROR';
    }
    const msg = String(params.error?.message || '').toLowerCase();
    if (msg.includes('cors') || msg.includes('failed to fetch') || msg.includes('load failed')) {
      return msg.includes('cors') ? 'CORS_ERROR' : 'NETWORK_ERROR';
    }
  }
  if (params.httpStatus && params.httpStatus >= 400) {
    return 'API_ERROR';
  }
  return 'UNKNOWN_EMAIL_ERROR';
}

function pruneRecentKeys(now: number = Date.now()) {
  for (const [k, ts] of clientRecentEmailKeys.entries()) {
    if (now - ts > SENT_IDEMPOTENCY_TTL_MS) {
      clientRecentEmailKeys.delete(k);
    }
  }
}

function readRetryQueue(): QueuedFailedEmail[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(FAILED_EMAIL_QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRetryQueue(items: QueuedFailedEmail[]) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(FAILED_EMAIL_QUEUE_KEY, JSON.stringify(items.slice(-30)));
  } catch {}
}

function enqueueFailedEmail(item: Omit<QueuedFailedEmail, 'createdAt' | 'nextRetryAt'>) {
  const existing = readRetryQueue();
  const duplicate = existing.find((q) => q.idempotencyKey === item.idempotencyKey);
  if (duplicate) {
    duplicate.attempts = Math.max(duplicate.attempts, item.attempts);
    duplicate.lastError = item.lastError;
    duplicate.errorCategory = item.errorCategory;
    duplicate.correlationId = item.correlationId;
    duplicate.nextRetryAt = Date.now() + 15000 * Math.max(1, duplicate.attempts);
    writeRetryQueue(existing);
    return;
  }
  existing.push({
    ...item,
    createdAt: new Date().toISOString(),
    nextRetryAt: Date.now() + 15000,
  });
  writeRetryQueue(existing);
}

function removeFromRetryQueue(idempotencyKey: string) {
  const existing = readRetryQueue();
  const next = existing.filter((q) => q.idempotencyKey !== idempotencyKey);
  if (next.length !== existing.length) {
    writeRetryQueue(next);
  }
}

function reportEmailFailure(params: {
  kind: QueuedFailedEmail['kind'] | 'OTP';
  error: string;
  stage?: string;
  errorCategory: EmailErrorCategory;
  correlationId: string;
  willRetry: boolean;
}) {
  // Strictly PII-free diagnostic logging & incident visibility
  const cleanMsg = `${params.kind} email delivery issue [${params.errorCategory}] (${params.stage || 'API'}, ${params.correlationId}): ${params.error}${
    params.willRetry ? ' (auto-retry scheduled)' : ''
  }`;
  try {
    systemHealth.logEvent({
      type: 'SYNC_STATUS',
      severity: 'WARNING',
      service: 'ServerAPI',
      summary: cleanMsg,
      details: {
        kind: params.kind,
        errorCategory: params.errorCategory,
        correlationId: params.correlationId,
        willRetry: params.willRetry,
      },
    });
    systemHealth.recordIncident({
      type: 'EMAIL_DELIVERY_FAILURE',
      title: 'ইমেইল ডেলিভারি সমস্যা (Email Delivery Failure)',
      severity: params.errorCategory === 'AUTH_ERROR' || params.errorCategory === 'SMTP_AUTH_ERROR' ? 'CRITICAL' : 'WARNING',
      affectedService: 'ServerAPI',
      message: cleanMsg,
      recommendedAction:
        params.errorCategory === 'SMTP_AUTH_ERROR'
          ? 'Settings থেকে Gmail App Password / SMTP credentials যাচাই করুন।'
          : params.errorCategory === 'AUTH_ERROR'
          ? 'ইমেইল পাঠানোর জন্য Admin/MD হিসেবে পুনরায় লগইন করুন।'
          : 'ইন্টারনেট সংযোগ ও ব্যাকএন্ড সার্ভার (/api/send-email) পরীক্ষা করুন।',
    });
    if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('email-delivery-error', {
          detail: {
            kind: params.kind,
            errorCategory: params.errorCategory,
            correlationId: params.correlationId,
            message: cleanMsg,
            willRetry: params.willRetry,
          },
        }),
      );
    }
  } catch {}
}

function resolveEmailIncidentIfAny(kind: string) {
  try {
    const open = systemHealth
      .getIncidents()
      .find((i) => i.type === 'EMAIL_DELIVERY_FAILURE' && i.status !== 'RESOLVED');
    if (open) {
      systemHealth.resolveIncident(
        open.id,
        `${kind} email delivered successfully via pooled SMTP transport.`,
        'System Auto-Recovery',
      );
    }
  } catch {}
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  if (typeof AbortController === 'undefined') {
    return await fetch(url, init);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function parseResponseSafe(response: Response): Promise<{ data: any; rawText: string }> {
  try {
    if (typeof response.text === 'function') {
      const rawText = await response.text();
      if (!rawText) return { data: {}, rawText: '' };
      try {
        return { data: JSON.parse(rawText), rawText };
      } catch {
        return { data: {}, rawText };
      }
    }
    const data = await response.json().catch(() => ({}));
    return { data, rawText: '' };
  } catch {
    return { data: {}, rawText: '' };
  }
}

function scheduleQueuedJobVerification(params: {
  jobId: string;
  correlationId: string;
  retryItem: Omit<QueuedFailedEmail, 'attempts' | 'maxAttempts' | 'createdAt' | 'nextRetryAt'>;
  pollAttempt?: number;
}) {
  if (typeof window === 'undefined') return;
  const pollAttempt = params.pollAttempt || 1;
  const delayMs = pollAttempt === 1 ? 3000 : 5000;

  setTimeout(async () => {
    try {
      const res = await fetchWithTimeout(
        `/api/send-email?jobId=${encodeURIComponent(params.jobId)}`,
        {
          method: 'GET',
          headers: { 'X-Correlation-ID': params.correlationId },
        },
        5000,
      );
      if (!res.ok) return;
      const { data } = await parseResponseSafe(res);
      const job = data?.job;
      if (!job) return;

      if (job.status === 'SENT') {
        removeFromRetryQueue(params.retryItem.idempotencyKey);
        resolveEmailIncidentIfAny(params.retryItem.kind);
        return;
      }

      if (job.status === 'FAILED') {
        const errorCategory = classifyClientErrorCategory({
          payloadCategory: job.errorCategory,
          payloadStage: job.errorStage,
        });
        const isPermanentAuth =
          errorCategory === 'AUTH_ERROR' ||
          errorCategory === 'SMTP_AUTH_ERROR' ||
          errorCategory === 'PROVIDER_REJECTION' ||
          job.errorStage === 'CONFIG';
        if (!isPermanentAuth) {
          enqueueFailedEmail({
            ...params.retryItem,
            attempts: 1,
            maxAttempts: 3,
            lastError: job.lastError || 'SMTP background delivery failed',
            errorCategory,
            correlationId: params.correlationId,
          });
        }
        reportEmailFailure({
          kind: params.retryItem.kind,
          error: job.lastError || 'SMTP background delivery failed',
          stage: job.errorStage || 'PROVIDER_SEND',
          errorCategory,
          correlationId: params.correlationId,
          willRetry: !isPermanentAuth,
        });
        return;
      }

      if (pollAttempt < 3) {
        scheduleQueuedJobVerification({
          jobId: params.jobId,
          correlationId: params.correlationId,
          retryItem: params.retryItem,
          pollAttempt: pollAttempt + 1,
        });
      }
    } catch {}
  }, delayMs);
}

// Simple bounded concurrency gate so Approve All doesn't stampede serverless functions
let activeOperationalDispatches = 0;
const MAX_CONCURRENT_EMAIL_DISPATCHES = 2;
const dispatchWaiters: Array<() => void> = [];

async function acquireDispatchSlot(): Promise<void> {
  if (activeOperationalDispatches < MAX_CONCURRENT_EMAIL_DISPATCHES) {
    activeOperationalDispatches += 1;
    return;
  }
  await new Promise<void>((resolve) => dispatchWaiters.push(resolve));
  activeOperationalDispatches += 1;
}

function releaseDispatchSlot(): void {
  activeOperationalDispatches = Math.max(0, activeOperationalDispatches - 1);
  const next = dispatchWaiters.shift();
  if (next) next();
}

/**
 * Safely dispatches an operational notification email (Bill Status / Fund Added):
 * - Prevents duplicate requests for the same entity transition / 60s window
 * - Uses async deliveryMode + pooled backend transport with correlationId & actor headers
 * - Accurately classifies non-JSON HTTP 500s / CORS / Network / Auth / SMTP failures
 * - Bounded concurrency & automatic retry recovery on reconnect/foreground
 */
async function dispatchOperationalEmail(params: {
  actionName: string;
  kind: 'BILL_STATUS' | 'FUND_ADDED';
  to: string;
  subject: string;
  html: string;
  idempotencyKey: string;
  allowRetryFailed?: boolean;
  actorRole?: string;
  actorName?: string;
}): Promise<{
  dispatched: boolean;
  queued?: boolean;
  deduplicated?: boolean;
  error?: string;
  errorCategory?: EmailErrorCategory;
  correlationId?: string;
}> {
  const correlationId = generateCorrelationId();

  if (isSyntheticDependEmail(params.to)) {
    return {
      dispatched: false,
      error: 'Skipped synthetic @depend.com fallback email; staff email not configured.',
      errorCategory: 'PROVIDER_REJECTION',
      correlationId,
    };
  }

  const now = Date.now();
  pruneRecentKeys(now);

  if (!params.allowRetryFailed && clientRecentEmailKeys.has(params.idempotencyKey)) {
    return { dispatched: true, deduplicated: true, correlationId };
  }
  clientRecentEmailKeys.set(params.idempotencyKey, now);

  const sessionActor = getActiveSessionActor();
  const actorRole = params.actorRole || sessionActor.actorRole;
  const actorName = params.actorName || sessionActor.actorName;

  await acquireDispatchSlot();
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId,
    };
    if (actorRole) headers['X-User-Role'] = actorRole;
    if (actorName) headers['X-User-Name'] = actorName;

    const response = await perf.measure(params.actionName, 'api', async () => {
      return await fetchWithTimeout(
        '/api/send-email',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            to: params.to,
            subject: params.subject,
            html: params.html,
            smtpConfig: getSmtpConfigSafe(),
            kind: params.kind,
            deliveryMode: 'async',
            idempotencyKey: params.idempotencyKey,
            allowRetryFailed: Boolean(params.allowRetryFailed),
            correlationId,
            actorRole,
            actorName,
          }),
        },
        DEFAULT_ASYNC_API_TIMEOUT_MS,
      );
    });

    const { data: payload, rawText } = await parseResponseSafe(response);
    if (!response.ok) {
      const nonJsonHint =
        !payload?.error && rawText
          ? rawText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140)
          : '';
      const errMsg =
        payload?.details ||
        payload?.error ||
        (nonJsonHint ? `HTTP ${response.status}: ${nonJsonHint}` : `Server returned ${response.status}`);
      const errorCategory = classifyClientErrorCategory({
        httpStatus: response.status,
        payloadCategory: payload?.errorCategory,
        payloadStage: payload?.errorStage,
      });
      const isPermanent =
        errorCategory === 'AUTH_ERROR' ||
        errorCategory === 'SMTP_AUTH_ERROR' ||
        errorCategory === 'PROVIDER_REJECTION' ||
        payload?.errorStage === 'CONFIG';
      clientRecentEmailKeys.delete(params.idempotencyKey);

      if (!isPermanent) {
        enqueueFailedEmail({
          idempotencyKey: params.idempotencyKey,
          kind: params.kind,
          actionName: params.actionName,
          to: params.to,
          subject: params.subject,
          html: params.html,
          attempts: 1,
          maxAttempts: 3,
          lastError: errMsg,
          errorCategory,
          correlationId,
        });
      }
      reportEmailFailure({
        kind: params.kind,
        error: errMsg,
        stage: payload?.errorStage || `HTTP_${response.status}`,
        errorCategory,
        correlationId,
        willRetry: !isPermanent,
      });
      return { dispatched: false, error: errMsg, errorCategory, correlationId };
    }

    if (payload?.queued && payload?.jobId) {
      scheduleQueuedJobVerification({
        jobId: String(payload.jobId),
        correlationId: payload?.correlationId || correlationId,
        retryItem: {
          idempotencyKey: params.idempotencyKey,
          kind: params.kind,
          actionName: params.actionName,
          to: params.to,
          subject: params.subject,
          html: params.html,
        },
      });
    } else {
      removeFromRetryQueue(params.idempotencyKey);
      resolveEmailIncidentIfAny(params.kind);
    }

    return {
      dispatched: true,
      queued: Boolean(payload?.queued),
      deduplicated: Boolean(payload?.deduplicated),
      correlationId: payload?.correlationId || correlationId,
    };
  } catch (error: any) {
    const errorCategory = classifyClientErrorCategory({ error });
    const errMsg =
      error?.name === 'AbortError'
        ? 'Email API request timed out'
        : error?.message || 'Network/Fetch failure';
    clientRecentEmailKeys.delete(params.idempotencyKey);

    enqueueFailedEmail({
      idempotencyKey: params.idempotencyKey,
      kind: params.kind,
      actionName: params.actionName,
      to: params.to,
      subject: params.subject,
      html: params.html,
      attempts: 1,
      maxAttempts: 3,
      lastError: errMsg,
      errorCategory,
      correlationId,
    });
    reportEmailFailure({
      kind: params.kind,
      error: errMsg,
      stage: error?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK',
      errorCategory,
      correlationId,
      willRetry: true,
    });
    return { dispatched: false, error: errMsg, errorCategory, correlationId };
  } finally {
    releaseDispatchSlot();
  }
}

/**
 * Retries previously failed email notifications when connectivity/SMTP recovers.
 */
let isRetryingEmails = false;
export async function processPendingEmailRetries(): Promise<{
  processed: number;
  succeeded: number;
}> {
  if (isRetryingEmails) return { processed: 0, succeeded: 0 };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { processed: 0, succeeded: 0 };
  }

  const queue = readRetryQueue();
  if (queue.length === 0) return { processed: 0, succeeded: 0 };

  isRetryingEmails = true;
  let processed = 0;
  let succeeded = 0;
  const now = Date.now();
  const remaining: QueuedFailedEmail[] = [];

  try {
    for (const item of queue) {
      if (item.nextRetryAt > now) {
        remaining.push(item);
        continue;
      }
      if (item.attempts >= item.maxAttempts) {
        continue;
      }

      processed += 1;
      const res = await dispatchOperationalEmail({
        actionName: item.actionName,
        kind: item.kind === 'GENERAL' ? 'BILL_STATUS' : item.kind,
        to: item.to,
        subject: item.subject,
        html: item.html,
        idempotencyKey: item.idempotencyKey,
        allowRetryFailed: true,
      });

      if (res.dispatched) {
        succeeded += 1;
      } else if (item.attempts + 1 < item.maxAttempts) {
        remaining.push({
          ...item,
          attempts: item.attempts + 1,
          nextRetryAt: Date.now() + 30000 * (item.attempts + 1),
          lastError: res.error,
          errorCategory: res.errorCategory,
        });
      }
    }

    writeRetryQueue(remaining);
  } finally {
    isRetryingEmails = false;
  }

  return { processed, succeeded };
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void processPendingEmailRetries();
  });
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void processPendingEmailRetries();
      }
    });
  }
  setTimeout(() => {
    if (typeof navigator === 'undefined' || navigator.onLine !== false) {
      void processPendingEmailRetries();
    }
  }, 4000);
}

let lastPrewarmAt = 0;

/**
 * Quietly warms Vercel/Express serverless function & SMTP DNS cache before OTP submit.
 * Zero emails sent, zero credentials passed.
 */
export async function prewarmEmailTransport(): Promise<{ warmed: boolean }> {
  const now = Date.now();
  if (now - lastPrewarmAt < 45000) return { warmed: true };
  lastPrewarmAt = now;
  try {
    if (typeof fetch === 'undefined') return { warmed: false };
    const cfg = getSmtpConfigSafe();
    const hostParam = cfg?.host ? `&host=${encodeURIComponent(String(cfg.host))}` : '';
    const res = await fetchWithTimeout(`/api/send-email?warm=true${hostParam}`, { method: 'GET' }, 3000);
    return { warmed: Boolean(res?.ok) };
  } catch {
    return { warmed: false };
  }
}

export interface OtpDispatchResult {
  success: true;
  smtpAccepted: true;
  messageId: string;
  correlationId: string;
  deduplicated?: boolean;
  timings: {
    frontendPrepMs: number;
    networkAndServerMs: number;
    totalClientMs: number;
    coldStartMs?: number;
    authVerifyMs?: number;
    smtpConnectMs?: number;
    smtpAcceptMs?: number;
    totalServerMs?: number;
    poolReused?: boolean;
  };
}

/**
 * Sends OTP Email synchronously (Forgot Password flow expects verified SMTP delivery).
 * Rejects even if HTTP 200 is returned without confirmed SMTP/idempotent acceptance.
 */
export const sendOTPEmail = async (
  email: string,
  otpCode: string,
  name: string,
): Promise<OtpDispatchResult> => {
  const tClientStart = performance.now();
  const correlationId = generateCorrelationId();
  const subject = 'Password Reset OTP - Depend Sourcing Ltd';
  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px;">
      <h2 style="color: #ea580c; text-align: center;">Password Reset Request</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>We received a request to reset your password. Use the following OTP code to verify your identity:</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; text-align: center; margin: 20px 0;">
        <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1f2937;">${otpCode}</span>
      </div>
      <p style="color: #ef4444; font-size: 14px;"><strong>Note:</strong> This code is valid for 5 minutes. Do not share this code with anyone.</p>
      <p>If you did not request a password reset, please ignore this email.</p>
      <br>
      <p>Visit app:- <a href="https://depend-sourcing-ltd.vercel.app">depend-sourcing-ltd.vercel.app</a></p>
    </div>
  `;

  const requestBodyStr = JSON.stringify({
    to: email,
    subject,
    html,
    smtpConfig: getSmtpConfigSafe() || null,
    kind: 'OTP',
    deliveryMode: 'sync',
    idempotencyKey: `otp:${email.toLowerCase()}:${otpCode}`,
    correlationId,
  });
  const frontendPrepMs = Number((performance.now() - tClientStart).toFixed(2));

  try {
    const tNetStart = performance.now();
    const response = await perf.measure('Send Email OTP', 'api', async () => {
      return await fetchWithTimeout(
        '/api/send-email',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Correlation-ID': correlationId,
          },
          body: requestBodyStr,
        },
        DEFAULT_OTP_API_TIMEOUT_MS,
      );
    });
    const networkAndServerMs = Number((performance.now() - tNetStart).toFixed(2));
    const { data, rawText } = await parseResponseSafe(response);

    if (!response.ok) {
      const errMsg = data?.details || data?.error || rawText?.slice(0, 120) || 'Failed to send OTP over SMTP';
      const errorCategory = classifyClientErrorCategory({
        httpStatus: response.status,
        payloadCategory: data?.errorCategory,
        payloadStage: data?.errorStage,
      });
      reportEmailFailure({
        kind: 'OTP',
        error: errMsg,
        stage: data?.errorStage || `HTTP_${response.status}`,
        errorCategory,
        correlationId,
        willRetry: false,
      });
      const err: any = new Error(errMsg);
      err.errorCategory = errorCategory;
      err.correlationId = correlationId;
      throw err;
    }

    // Never report SMTP success merely because HTTP returned 200 without confirmed acceptance
    const hasConfirmedSmtpAccept =
      data?.success === true &&
      (data?.smtpAccepted === true || Boolean(data?.messageId) || data?.deduplicated === true);

    if (!hasConfirmedSmtpAccept) {
      const errMsg = data?.error || 'API returned 200 without confirmed SMTP delivery acceptance';
      reportEmailFailure({
        kind: 'OTP',
        error: errMsg,
        stage: 'PROVIDER_SEND',
        errorCategory: 'PROVIDER_REJECTION',
        correlationId,
        willRetry: false,
      });
      const err: any = new Error(errMsg);
      err.errorCategory = 'PROVIDER_REJECTION';
      err.correlationId = correlationId;
      throw err;
    }

    const totalClientMs = Number((performance.now() - tClientStart).toFixed(2));
    return {
      success: true,
      smtpAccepted: true,
      messageId: String(data?.messageId || `otp_${correlationId}`),
      correlationId: data?.correlationId || correlationId,
      deduplicated: Boolean(data?.deduplicated),
      timings: {
        frontendPrepMs,
        networkAndServerMs,
        totalClientMs,
        coldStartMs: data?.timings?.coldStartMs,
        authVerifyMs: data?.timings?.authVerifyMs,
        smtpConnectMs: data?.timings?.smtpConnectMs,
        smtpAcceptMs: data?.timings?.smtpAcceptMs,
        totalServerMs: data?.timings?.totalServerMs,
        poolReused: data?.timings?.poolReused,
      },
    };
  } catch (error: any) {
    console.error('Failed to send OTP email via API', error?.message || error);
    throw error;
  }
};

/**
 * Sends an email notification to the MD when funds are added (non-blocking async + dedupe + retry).
 */
export const sendFundAddedEmailToMD = async (
  amount: number,
  source: string,
  addedBy: string,
  mdEmail: string = 'dependsource@gmail.com',
  opts?: EmailSendOptions,
) => {
  const date = new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' });
  const subject = 'Company Fund Added';
  const html = `
    <h3>Company Fund Added</h3>
    <p><strong>Amount:</strong> ${amount} ৳</p>
    <p><strong>Source:</strong> ${source}</p>
    <p><strong>Added By:</strong> ${addedBy}</p>
    <p><strong>Date:</strong> ${date}</p>
    <br>
    <p>Visit app:- <a href="https://depend-sourcing-ltd.vercel.app">depend-sourcing-ltd.vercel.app</a></p>
  `;

  const idempotencyKey =
    opts?.idempotencyKey ||
    (opts?.entityId
      ? `fund:${opts.entityId}`
      : `fund:${mdEmail.toLowerCase()}:${amount}:${Math.floor(Date.now() / 60000)}`);

  return await dispatchOperationalEmail({
    actionName: 'Send Fund Email',
    kind: 'FUND_ADDED',
    to: mdEmail,
    subject,
    html,
    idempotencyKey,
    actorRole: opts?.actorRole,
    actorName: opts?.actorName,
  });
};

/**
 * Sends an email notification to the staff when a bill changes status (Verified, Approved, Rejected).
 * Uses non-blocking async processing + pooled SMTP + duplicate prevention + retry queue.
 */
export const sendBillStatusEmailToStaff = async (
  staffEmail: string,
  staffName: string,
  amount: number,
  purpose: string,
  status: string,
  notes: string = '',
  opts?: EmailSendOptions,
) => {
  if (!staffEmail || isSyntheticDependEmail(staffEmail)) {
    return {
      dispatched: false,
      error: 'Skipped empty or synthetic @depend.com fallback email; staff email not configured.',
      errorCategory: 'PROVIDER_REJECTION' as EmailErrorCategory,
    };
  }

  const date = new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' });
  const subject = `Bill Status Update: ${status}`;
  const html = `
    <h3>Hello ${staffName},</h3>
    <p>Your bill status has been updated.</p>
    <p><strong>Purpose:</strong> ${purpose}</p>
    <p><strong>Amount:</strong> ${amount} ৳</p>
    <p><strong>Status:</strong> <span style="font-weight: bold; color: ${status === 'APPROVED' ? 'green' : status === 'REJECTED' ? 'red' : 'orange'}">${status}</span></p>
    <p><strong>Notes:</strong> ${notes || 'N/A'}</p>
    <p><strong>Date:</strong> ${date}</p>
    <br>
    <p>Visit app:- <a href="https://depend-sourcing-ltd.vercel.app">depend-sourcing-ltd.vercel.app</a></p>
  `;

  const idempotencyKey =
    opts?.idempotencyKey ||
    (opts?.entityId
      ? `bill:${opts.entityId}:${status}`
      : `bill:${staffEmail.toLowerCase()}:${amount}:${status}:${Math.floor(Date.now() / 60000)}`);

  return await dispatchOperationalEmail({
    actionName: 'Send Bill Status Email',
    kind: 'BILL_STATUS',
    to: staffEmail,
    subject,
    html,
    idempotencyKey,
    actorRole: opts?.actorRole,
    actorName: opts?.actorName,
  });
};
