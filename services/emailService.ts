import { perf } from './performanceDiagnostics';
import { systemHealth } from './systemHealthService';

export interface EmailSendOptions {
  entityId?: string;
  idempotencyKey?: string;
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
}

const FAILED_EMAIL_QUEUE_KEY = 'ais_failed_email_queue_v1';
const SENT_IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;
const DEFAULT_ASYNC_API_TIMEOUT_MS = 8000;
const DEFAULT_OTP_API_TIMEOUT_MS = 12000;

const clientRecentEmailKeys = new Map<string, number>();

function getSmtpConfigSafe(): any {
  try {
    if (typeof localStorage === 'undefined') return undefined;
    const saved = localStorage.getItem('smtp_config');
    return saved ? JSON.parse(saved) : undefined;
  } catch {
    return undefined;
  }
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
  willRetry: boolean;
}) {
  // Strictly PII-free diagnostic logging & incident visibility
  const cleanMsg = `${params.kind} email delivery issue (${params.stage || 'API'}): ${params.error}${
    params.willRetry ? ' (auto-retry scheduled)' : ''
  }`;
  try {
    systemHealth.logEvent({
      type: 'SYNC_STATUS',
      severity: 'WARNING',
      service: 'ServerAPI',
      summary: cleanMsg,
    });
    systemHealth.recordIncident({
      type: 'EMAIL_DELIVERY_FAILURE',
      title: 'ইমেইল ডেলিভারি সমস্যা (Email Delivery Failure)',
      severity: 'WARNING',
      affectedService: 'ServerAPI',
      message: cleanMsg,
      recommendedAction:
        'Settings থেকে SMTP কনফিগারেশন অথবা ইন্টারনেট কানেকশন যাচাই করুন। সাময়িক ব্যর্থতা স্বয়ংক্রিয়ভাবে রিট্রাই হবে।',
    });
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

function scheduleQueuedJobVerification(params: {
  jobId: string;
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
        { method: 'GET' },
        5000,
      );
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      const job = data?.job;
      if (!job) return;

      if (job.status === 'SENT') {
        removeFromRetryQueue(params.retryItem.idempotencyKey);
        resolveEmailIncidentIfAny(params.retryItem.kind);
        return;
      }

      if (job.status === 'FAILED') {
        const isPermanentAuth = job.errorStage === 'AUTH' || job.errorStage === 'CONFIG';
        if (!isPermanentAuth) {
          enqueueFailedEmail({
            ...params.retryItem,
            attempts: 1,
            maxAttempts: 3,
            lastError: job.lastError || 'SMTP background delivery failed',
          });
        }
        reportEmailFailure({
          kind: params.retryItem.kind,
          error: job.lastError || 'SMTP background delivery failed',
          stage: job.errorStage || 'PROVIDER_SEND',
          willRetry: !isPermanentAuth,
        });
        return;
      }

      // Still QUEUED or SENDING -> allow one follow-up check outside perf tracking
      if (pollAttempt < 3) {
        scheduleQueuedJobVerification({
          jobId: params.jobId,
          retryItem: params.retryItem,
          pollAttempt: pollAttempt + 1,
        });
      }
    } catch {}
  }, delayMs);
}

/**
 * Safely dispatches an operational notification email (Bill Status / Fund Added):
 * - Prevents duplicate requests for the same entity transition / 60s window
 * - Uses async deliveryMode + pooled backend transport so callers/UI don't wait 4-6s
 * - Tracks background failures in SystemHealth and schedules automatic retries
 */
async function dispatchOperationalEmail(params: {
  actionName: string;
  kind: 'BILL_STATUS' | 'FUND_ADDED';
  to: string;
  subject: string;
  html: string;
  idempotencyKey: string;
  allowRetryFailed?: boolean;
}): Promise<{ dispatched: boolean; queued?: boolean; deduplicated?: boolean; error?: string }> {
  const now = Date.now();
  pruneRecentKeys(now);

  if (!params.allowRetryFailed && clientRecentEmailKeys.has(params.idempotencyKey)) {
    return { dispatched: true, deduplicated: true };
  }
  clientRecentEmailKeys.set(params.idempotencyKey, now);

  try {
    const response = await perf.measure(params.actionName, 'api', async () => {
      return await fetchWithTimeout(
        '/api/send-email',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: params.to,
            subject: params.subject,
            html: params.html,
            smtpConfig: getSmtpConfigSafe(),
            kind: params.kind,
            deliveryMode: 'async',
            idempotencyKey: params.idempotencyKey,
            allowRetryFailed: Boolean(params.allowRetryFailed),
          }),
        },
        DEFAULT_ASYNC_API_TIMEOUT_MS,
      );
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errMsg = payload?.details || payload?.error || `Server returned ${response.status}`;
      const isPermanent = payload?.errorStage === 'AUTH' || payload?.errorStage === 'CONFIG';
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
        });
      }
      reportEmailFailure({
        kind: params.kind,
        error: errMsg,
        stage: payload?.errorStage || `HTTP_${response.status}`,
        willRetry: !isPermanent,
      });
      return { dispatched: false, error: errMsg };
    }

    if (payload?.queued && payload?.jobId) {
      scheduleQueuedJobVerification({
        jobId: String(payload.jobId),
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
    };
  } catch (error: any) {
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
    });
    reportEmailFailure({
      kind: params.kind,
      error: errMsg,
      stage: error?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK',
      willRetry: true,
    });
    return { dispatched: false, error: errMsg };
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
}

/**
 * Sends OTP Email synchronously (Forgot Password flow expects delivery confirmation).
 */
export const sendOTPEmail = async (email: string, otpCode: string, name: string) => {
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

  try {
    const response = await perf.measure('Send Email OTP', 'api', async () => {
      return await fetchWithTimeout(
        '/api/send-email',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: email,
            subject,
            html,
            smtpConfig: getSmtpConfigSafe() || null,
            kind: 'OTP',
            deliveryMode: 'sync',
            idempotencyKey: `otp:${email.toLowerCase()}:${otpCode}`,
          }),
        },
        DEFAULT_OTP_API_TIMEOUT_MS,
      );
    });

    if (!response.ok) {
      throw new Error('Failed to send OTP over SMTP');
    }
    console.log('OTP email sent successfully');
  } catch (error) {
    console.error('Failed to send OTP email via API', error);
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
  if (!staffEmail) return;

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
  });
};
