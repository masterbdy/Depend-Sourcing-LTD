import nodemailer from 'nodemailer';
import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import net from 'node:net';
import tls from 'node:tls';

export type EmailKind = 'OTP' | 'BILL_STATUS' | 'FUND_ADDED' | 'GENERAL';
export type DeliveryMode = 'async' | 'sync';

export interface SmtpRuntimeConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export interface EmailRequestPayload {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  smtpConfig?: any;
  kind?: EmailKind;
  deliveryMode?: DeliveryMode;
  idempotencyKey?: string;
  allowRetryFailed?: boolean;
}

export interface EmailStageTimings {
  configAndDedupMs: number;
  transportAcquireMs: number;
  smtpSendMs: number;
  totalServerMs: number;
  poolReused: boolean;
}

export interface EmailDeliveryJob {
  jobId: string;
  idempotencyKey: string;
  kind: EmailKind;
  status: 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED';
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
  messageId?: string;
  lastError?: string;
  errorStage?: 'CONFIG' | 'CONNECTION' | 'AUTH' | 'TLS' | 'PROVIDER_SEND' | 'TIMEOUT';
  timings?: EmailStageTimings;
}

interface CachedTransporterEntry {
  key: string;
  transporter: any;
  createdAt: number;
  lastUsedAt: number;
  sendCount: number;
}

interface IdempotencyEntry {
  key: string;
  jobId: string;
  status: EmailDeliveryJob['status'];
  messageId?: string;
  createdAt: number;
  updatedAt: number;
}

export type TransporterFactoryFn = (options: any) => any;

const TRANSPORTER_IDLE_TTL_MS = 15 * 60 * 1000;
const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;
const MAX_JOBS_RETAINED = 150;
const MAX_IDEMPOTENCY_ENTRIES = 500;

const transporterPool = new Map<string, CachedTransporterEntry>();
const deliveryJobs = new Map<string, EmailDeliveryJob>();
const idempotencyStore = new Map<string, IdempotencyEntry>();

let customTransporterFactory: TransporterFactoryFn | null = null;

export function setTransporterFactoryForTest(fn: TransporterFactoryFn | null) {
  customTransporterFactory = fn;
  if (fn === null) {
    resetEmailTransportStateForTest();
  }
}

export function resetEmailTransportStateForTest() {
  for (const entry of transporterPool.values()) {
    try {
      entry.transporter?.close?.();
    } catch {}
  }
  transporterPool.clear();
  deliveryJobs.clear();
  idempotencyStore.clear();
}

export function resolveSmtpConfig(clientSmtpConfig?: any): {
  config: SmtpRuntimeConfig | null;
  error?: string;
} {
  const host = String(
    clientSmtpConfig?.host || process.env.SMTP_HOST || 'smtp.gmail.com',
  ).trim();
  const port = parseInt(
    String(clientSmtpConfig?.port || process.env.SMTP_PORT || '587'),
    10,
  );
  const secure =
    clientSmtpConfig?.secure !== undefined
      ? Boolean(clientSmtpConfig.secure)
      : process.env.SMTP_SECURE === 'true' || port === 465;
  const user = String(
    clientSmtpConfig?.user ||
      process.env.SMTP_USER ||
      process.env.EMAIL_USER ||
      '',
  ).trim();
  const pass = String(
    clientSmtpConfig?.pass ||
      process.env.SMTP_PASS ||
      process.env.EMAIL_PASS ||
      '',
  );
  const from = String(
    clientSmtpConfig?.from ||
      clientSmtpConfig?.user ||
      process.env.SMTP_FROM ||
      process.env.SMTP_USER ||
      process.env.EMAIL_USER ||
      user,
  ).trim();

  if (!user || !pass) {
    return {
      config: null,
      error: 'SMTP credentials are not configured.',
    };
  }

  return {
    config: {
      host,
      port: Number.isFinite(port) && port > 0 ? port : 587,
      secure,
      user,
      pass,
      from: from || user,
    },
  };
}

function buildPoolKey(cfg: SmtpRuntimeConfig): string {
  return crypto
    .createHash('sha256')
    .update(`${cfg.host}|${cfg.port}|${cfg.secure}|${cfg.user}|${cfg.pass}`)
    .digest('hex')
    .slice(0, 20);
}

export function computeEmailIdempotencyKey(payload: EmailRequestPayload): string {
  if (payload.idempotencyKey && String(payload.idempotencyKey).trim()) {
    return String(payload.idempotencyKey).trim().slice(0, 160);
  }
  const normalizedTo = Array.isArray(payload.to)
    ? payload.to.join(',').toLowerCase()
    : String(payload.to || '').toLowerCase();
  const bodySeed = String(payload.html || payload.text || '').slice(0, 180);
  // Bucket into 60-second anti-double-click window when no explicit entity key is supplied
  const bucket = Math.floor(Date.now() / 60000);
  const digest = crypto
    .createHash('sha256')
    .update(`${payload.kind || 'GENERAL'}|${normalizedTo}|${payload.subject}|${bodySeed}|${bucket}`)
    .digest('hex')
    .slice(0, 24);
  return `auto_${digest}`;
}

function pruneMapsIfNeeded() {
  const now = Date.now();
  for (const [k, v] of idempotencyStore.entries()) {
    if (now - v.updatedAt > IDEMPOTENCY_TTL_MS) {
      idempotencyStore.delete(k);
    }
  }
  while (idempotencyStore.size > MAX_IDEMPOTENCY_ENTRIES) {
    const oldest = idempotencyStore.keys().next().value;
    if (!oldest) break;
    idempotencyStore.delete(oldest);
  }
  while (deliveryJobs.size > MAX_JOBS_RETAINED) {
    const oldest = deliveryJobs.keys().next().value;
    if (!oldest) break;
    deliveryJobs.delete(oldest);
  }
  for (const [k, entry] of transporterPool.entries()) {
    if (now - entry.lastUsedAt > TRANSPORTER_IDLE_TTL_MS) {
      try {
        entry.transporter?.close?.();
      } catch {}
      transporterPool.delete(k);
    }
  }
}

function getOrCreatePooledTransporter(cfg: SmtpRuntimeConfig): {
  poolKey: string;
  transporter: any;
  reused: boolean;
} {
  pruneMapsIfNeeded();
  const poolKey = buildPoolKey(cfg);
  const existing = transporterPool.get(poolKey);
  if (existing) {
    existing.lastUsedAt = Date.now();
    existing.sendCount += 1;
    return { poolKey, transporter: existing.transporter, reused: true };
  }

  const transportOptions: any = {
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 10,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
    dnsTimeout: 3000,
    tls: {
      minVersion: 'TLSv1.2',
    },
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
  };

  const factory = customTransporterFactory || nodemailer.createTransport;
  const transporter = factory(transportOptions);

  if (typeof transporter?.on === 'function') {
    transporter.on('error', () => {
      transporterPool.delete(poolKey);
    });
  }

  const now = Date.now();
  transporterPool.set(poolKey, {
    key: poolKey,
    transporter,
    createdAt: now,
    lastUsedAt: now,
    sendCount: 1,
  });

  return { poolKey, transporter, reused: false };
}

function classifySmtpErrorStage(err: any): {
  stage: NonNullable<EmailDeliveryJob['errorStage']>;
  transient: boolean;
} {
  const code = String(err?.code || '').toUpperCase();
  const msg = String(err?.message || '').toLowerCase();
  const responseCode = Number(err?.responseCode || 0);

  if (code === 'EAUTH' || responseCode === 535 || responseCode === 534 || msg.includes('invalid login')) {
    return { stage: 'AUTH', transient: false };
  }
  if (msg.includes('tls') || msg.includes('ssl') || code.includes('CERT')) {
    return { stage: 'TLS', transient: false };
  }
  if (code === 'ETIMEDOUT' || msg.includes('timeout')) {
    return { stage: 'TIMEOUT', transient: true };
  }
  if (
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    code === 'EHOSTUNREACH' ||
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN' ||
    code === 'ESOCKET'
  ) {
    return { stage: 'CONNECTION', transient: true };
  }
  if (responseCode >= 400 && responseCode < 500) {
    return { stage: 'PROVIDER_SEND', transient: true };
  }
  return { stage: 'PROVIDER_SEND', transient: responseCode >= 500 };
}

async function sendOnceWithPool(
  cfg: SmtpRuntimeConfig,
  payload: EmailRequestPayload,
  configAndDedupMs: number,
): Promise<{
  messageId: string;
  timings: EmailStageTimings;
}> {
  const tAcquireStart = performance.now();
  const { poolKey, transporter, reused } = getOrCreatePooledTransporter(cfg);
  const transportAcquireMs = Number((performance.now() - tAcquireStart).toFixed(2));

  const tSendStart = performance.now();
  try {
    const info = await transporter.sendMail({
      from: cfg.from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
    const smtpSendMs = Number((performance.now() - tSendStart).toFixed(2));
    const totalServerMs = Number(
      (configAndDedupMs + transportAcquireMs + smtpSendMs).toFixed(2),
    );
    return {
      messageId: String(info?.messageId || `msg_${Date.now()}`),
      timings: {
        configAndDedupMs,
        transportAcquireMs,
        smtpSendMs,
        totalServerMs,
        poolReused: reused,
      },
    };
  } catch (err) {
    const { transient, stage } = classifySmtpErrorStage(err);
    if (stage === 'CONNECTION' || stage === 'TIMEOUT' || stage === 'AUTH' || transient) {
      // Evict stale pooled socket cleanly so next retry establishes a fresh socket
      transporterPool.delete(poolKey);
      try {
        transporter?.close?.();
      } catch {}
    }
    throw err;
  }
}

async function executeJobWithRetries(
  job: EmailDeliveryJob,
  cfg: SmtpRuntimeConfig,
  payload: EmailRequestPayload,
  configAndDedupMs: number,
  retryDelaysMs: number[],
): Promise<EmailDeliveryJob> {
  const totalAttempts = 1 + retryDelaysMs.length;
  job.maxAttempts = totalAttempts;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    job.attempts = attempt;
    job.status = 'SENDING';
    job.updatedAt = new Date().toISOString();

    try {
      const sent = await sendOnceWithPool(cfg, payload, configAndDedupMs);
      job.status = 'SENT';
      job.messageId = sent.messageId;
      job.timings = sent.timings;
      job.lastError = undefined;
      job.errorStage = undefined;
      job.updatedAt = new Date().toISOString();

      const idem = idempotencyStore.get(job.idempotencyKey);
      if (idem) {
        idem.status = 'SENT';
        idem.messageId = sent.messageId;
        idem.updatedAt = Date.now();
      }
      return job;
    } catch (err: any) {
      const { stage, transient } = classifySmtpErrorStage(err);
      job.lastError = err?.message || String(err);
      job.errorStage = stage;
      job.updatedAt = new Date().toISOString();

      if (!transient || attempt >= totalAttempts) {
        job.status = 'FAILED';
        const idem = idempotencyStore.get(job.idempotencyKey);
        if (idem) {
          idem.status = 'FAILED';
          idem.updatedAt = Date.now();
        }
        console.error(
          `[EmailTransport] Delivery FAILED (${job.kind}, job=${job.jobId}, stage=${stage}, attempts=${attempt}):`,
          job.lastError,
        );
        return job;
      }

      const delay = retryDelaysMs[attempt - 1] ?? 1500;
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  return job;
}

function getVercelWaitUntil(): ((p: Promise<unknown>) => void) | null {
  try {
    const reqCtxSymbol = Symbol.for('@vercel/request-context');
    const store = (globalThis as any)[reqCtxSymbol]?.get?.();
    if (store && typeof store.waitUntil === 'function') {
      return (p: Promise<unknown>) => store.waitUntil(p);
    }
  } catch {}
  return null;
}

export interface HandleEmailDispatchResult {
  httpStatus: number;
  body: Record<string, any>;
}

/**
 * Handles `/api/send-email` requests with:
 * - Immediate validation & duplicate prevention (idempotencyKey)
 * - Connection-pooled Nodemailer reuse with strict timeouts (5s connect/greeting, 10s socket)
 * - Safe non-blocking async queuing + retry when runtime supports post-response execution
 * - Synchronous fast fallback if running on serverless without waitUntil (never silently dropping emails)
 */
export async function handleEmailDispatch(
  payload: EmailRequestPayload,
  opts?: { retryDelaysMs?: number[] },
): Promise<HandleEmailDispatchResult> {
  const tStart = performance.now();

  if (!payload || !payload.to || !payload.subject) {
    return {
      httpStatus: 400,
      body: { success: false, error: 'Missing required fields: to, subject' },
    };
  }

  const { config: smtpCfg, error: configError } = resolveSmtpConfig(payload.smtpConfig);
  if (!smtpCfg) {
    return {
      httpStatus: 500,
      body: {
        success: false,
        error: configError || 'SMTP credentials are not configured.',
        errorStage: 'CONFIG',
      },
    };
  }

  pruneMapsIfNeeded();
  const kind: EmailKind = payload.kind || 'GENERAL';
  const idempotencyKey = computeEmailIdempotencyKey(payload);
  const existingIdem = idempotencyStore.get(idempotencyKey);

  if (existingIdem) {
    const canRetry = Boolean(payload.allowRetryFailed) && existingIdem.status === 'FAILED';
    if (!canRetry && existingIdem.status !== 'FAILED') {
      const elapsed = Number((performance.now() - tStart).toFixed(2));
      return {
        httpStatus: 200,
        body: {
          success: true,
          deduplicated: true,
          skippedDuplicate: true,
          jobId: existingIdem.jobId,
          status: existingIdem.status,
          messageId: existingIdem.messageId,
          timings: {
            configAndDedupMs: elapsed,
            transportAcquireMs: 0,
            smtpSendMs: 0,
            totalServerMs: elapsed,
            poolReused: false,
          },
        },
      };
    }
  }

  const jobId = `em_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
  const nowIso = new Date().toISOString();
  const job: EmailDeliveryJob = {
    jobId,
    idempotencyKey,
    kind,
    status: 'QUEUED',
    attempts: 0,
    maxAttempts: 3,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  deliveryJobs.set(jobId, job);
  idempotencyStore.set(idempotencyKey, {
    key: idempotencyKey,
    jobId,
    status: 'QUEUED',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const configAndDedupMs = Number((performance.now() - tStart).toFixed(2));
  const requestedAsync = payload.deliveryMode === 'async' && kind !== 'OTP';
  const isVercel = process.env.VERCEL === '1' || Boolean(process.env.VERCEL_ENV);
  const waitUntil = isVercel ? getVercelWaitUntil() : null;
  const canRunPostResponse = !isVercel || Boolean(waitUntil);
  const retryDelaysMs = opts?.retryDelaysMs || [1500, 4000];

  if (requestedAsync && canRunPostResponse) {
    const bgPromise = executeJobWithRetries(
      job,
      smtpCfg,
      payload,
      configAndDedupMs,
      retryDelaysMs,
    );

    if (waitUntil) {
      waitUntil(bgPromise);
    } else {
      bgPromise.catch((err) => {
        console.error('[EmailTransport] Background delivery uncaught error:', err);
      });
    }

    const totalServerMs = Number((performance.now() - tStart).toFixed(2));
    return {
      httpStatus: 202,
      body: {
        success: true,
        accepted: true,
        queued: true,
        asyncProcessing: true,
        jobId,
        idempotencyKey,
        status: 'QUEUED',
        timings: {
          configAndDedupMs,
          transportAcquireMs: 0,
          smtpSendMs: 0,
          totalServerMs,
          poolReused: transporterPool.has(buildPoolKey(smtpCfg)),
        },
      },
    };
  }

  // Synchronous path (for OTP or serverless environments lacking post-response waitUntil)
  const syncRetryDelays = isVercel ? [500] : [800];
  const finalJob = await executeJobWithRetries(
    job,
    smtpCfg,
    payload,
    configAndDedupMs,
    syncRetryDelays,
  );

  if (finalJob.status === 'SENT') {
    return {
      httpStatus: 200,
      body: {
        success: true,
        queued: false,
        asyncProcessing: false,
        jobId: finalJob.jobId,
        idempotencyKey: finalJob.idempotencyKey,
        messageId: finalJob.messageId,
        timings: finalJob.timings,
      },
    };
  }

  return {
    httpStatus: 500,
    body: {
      success: false,
      error: 'Failed to send email',
      details: finalJob.lastError,
      errorStage: finalJob.errorStage,
      jobId: finalJob.jobId,
      attempts: finalJob.attempts,
    },
  };
}

export function getEmailJobStatus(jobId: string): EmailDeliveryJob | null {
  return deliveryJobs.get(jobId) || null;
}

export function getEmailTransportSummary() {
  const jobs = Array.from(deliveryJobs.values());
  const sent = jobs.filter((j) => j.status === 'SENT');
  const failed = jobs.filter((j) => j.status === 'FAILED');
  const inProgress = jobs.filter((j) => j.status === 'QUEUED' || j.status === 'SENDING');
  const avgSmtpSendMs =
    sent.length > 0
      ? Number(
          (
            sent.reduce((sum, j) => sum + (j.timings?.smtpSendMs || 0), 0) /
            sent.length
          ).toFixed(2),
        )
      : null;

  return {
    activePools: transporterPool.size,
    totalJobs: jobs.length,
    sentCount: sent.length,
    failedCount: failed.length,
    inProgressCount: inProgress.length,
    avgSmtpSendMs,
    recentFailures: failed.slice(-10).map((f) => ({
      jobId: f.jobId,
      kind: f.kind,
      attempts: f.attempts,
      errorStage: f.errorStage,
      updatedAt: f.updatedAt,
    })),
  };
}

/**
 * Diagnostic-only stage latency probe (does NOT authenticate or send email).
 * Separately measures DNS resolution, TCP+banner greeting, and TLS handshake times.
 */
export async function probeSmtpNetworkStages(host = 'smtp.gmail.com', port = 587): Promise<{
  host: string;
  port: number;
  dnsMs: number;
  tcpBannerMs: number | null;
  tlsHandshakeMs: number | null;
  error?: string;
}> {
  const t0 = performance.now();
  try {
    await dns.lookup(host);
  } catch (err: any) {
    return {
      host,
      port,
      dnsMs: Number((performance.now() - t0).toFixed(2)),
      tcpBannerMs: null,
      tlsHandshakeMs: null,
      error: err?.message || 'DNS lookup failed',
    };
  }
  const dnsMs = Number((performance.now() - t0).toFixed(2));

  const tcpBannerMs = await new Promise<number | null>((resolve) => {
    const tTcp = performance.now();
    const sock = net.createConnection({ host, port, timeout: 4000 });
    sock.once('data', () => {
      const elapsed = Number((performance.now() - tTcp).toFixed(2));
      sock.destroy();
      resolve(elapsed);
    });
    sock.once('error', () => {
      sock.destroy();
      resolve(null);
    });
    sock.once('timeout', () => {
      sock.destroy();
      resolve(null);
    });
  });

  const tlsHandshakeMs = await new Promise<number | null>((resolve) => {
    const tTls = performance.now();
    const sock = tls.connect({ host, port: port === 587 ? 465 : port, timeout: 4000 });
    sock.once('secureConnect', () => {
      const elapsed = Number((performance.now() - tTls).toFixed(2));
      sock.destroy();
      resolve(elapsed);
    });
    sock.once('error', () => {
      sock.destroy();
      resolve(null);
    });
    sock.once('timeout', () => {
      sock.destroy();
      resolve(null);
    });
  });

  return { host, port, dnsMs, tcpBannerMs, tlsHandshakeMs };
}
