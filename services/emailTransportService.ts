import nodemailer from 'nodemailer';
import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import net from 'node:net';
import tls from 'node:tls';

export type EmailKind = 'OTP' | 'BILL_STATUS' | 'FUND_ADDED' | 'GENERAL';
export type DeliveryMode = 'async' | 'sync';
export type EmailErrorCategory =
  | 'AUTH_ERROR'
  | 'CORS_ERROR'
  | 'NETWORK_ERROR'
  | 'API_ERROR'
  | 'SMTP_AUTH_ERROR'
  | 'SMTP_CONNECTION_ERROR'
  | 'SMTP_TIMEOUT'
  | 'PROVIDER_REJECTION'
  | 'UNKNOWN_EMAIL_ERROR';

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
  correlationId?: string;
  actorRole?: string;
  actorName?: string;
}

export interface EmailStageTimings {
  configAndDedupMs: number;
  transportAcquireMs: number;
  smtpSendMs: number;
  totalServerMs: number;
  poolReused: boolean;
  coldStartMs?: number;
  isWarmContainer?: boolean;
  authVerifyMs?: number;
  smtpConnectMs?: number;
  smtpAcceptMs?: number;
}

export interface EmailDeliveryJob {
  jobId: string;
  correlationId: string;
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
  errorCategory?: EmailErrorCategory;
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
const OTP_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const OTP_MAX_REQUESTS_PER_WINDOW = 5;
const MAX_JOBS_RETAINED = 150;
const MAX_IDEMPOTENCY_ENTRIES = 500;
const MODULE_BOOT_TS = Date.now();
let isContainerWarm = false;

const transporterPool = new Map<string, CachedTransporterEntry>();
const deliveryJobs = new Map<string, EmailDeliveryJob>();
const idempotencyStore = new Map<string, IdempotencyEntry>();
const otpRateLimitStore = new Map<string, number[]>();

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
  otpRateLimitStore.clear();
  isContainerWarm = false;
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

  const isIpHost = net.isIP(cfg.host) !== 0;
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
    dnsTimeout: 2500,
    ...(isIpHost ? {} : { family: 4 }),
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

function sanitizeEmailErrorMessage(raw: unknown, secretValues: Array<string | undefined> = []): string {
  let msg = String(raw || 'Unknown email transport error');
  for (const secret of secretValues) {
    if (secret && secret.length >= 4) {
      msg = msg.split(secret).join('***');
    }
  }
  msg = msg.replace(/(Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi, '$1[REDACTED]');
  return msg.slice(0, 280);
}

function validateRecipientAddresses(to: string | string[]): {
  valid: boolean;
  error?: string;
  isSyntheticPlaceholder?: boolean;
} {
  const list = Array.isArray(to) ? to : String(to).split(',');
  const cleaned = list.map((s) => String(s || '').trim()).filter(Boolean);
  if (cleaned.length === 0) {
    return { valid: false, error: 'Recipient email address is empty.' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const addr of cleaned) {
    if (!emailRegex.test(addr)) {
      return { valid: false, error: 'Invalid recipient email address format.' };
    }
    if (addr.toLowerCase().endsWith('@depend.com')) {
      return {
        valid: false,
        isSyntheticPlaceholder: true,
        error: 'Recipient lacks a real email address (synthetic placeholder skipped).',
      };
    }
  }
  return { valid: true };
}

function classifySmtpErrorStage(err: any): {
  stage: NonNullable<EmailDeliveryJob['errorStage']>;
  category: EmailErrorCategory;
  transient: boolean;
} {
  const code = String(err?.code || '').toUpperCase();
  const msg = String(err?.message || '').toLowerCase();
  const responseCode = Number(err?.responseCode || 0);

  if (code === 'EAUTH' || responseCode === 535 || responseCode === 534 || msg.includes('invalid login') || msg.includes('username and password not accepted')) {
    return { stage: 'AUTH', category: 'SMTP_AUTH_ERROR', transient: false };
  }
  if (msg.includes('tls') || msg.includes('ssl') || code.includes('CERT')) {
    return { stage: 'TLS', category: 'SMTP_CONNECTION_ERROR', transient: false };
  }
  if (code === 'ETIMEDOUT' || msg.includes('timeout')) {
    return { stage: 'TIMEOUT', category: 'SMTP_TIMEOUT', transient: true };
  }
  if (
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    code === 'EHOSTUNREACH' ||
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN' ||
    code === 'ESOCKET'
  ) {
    return { stage: 'CONNECTION', category: 'SMTP_CONNECTION_ERROR', transient: true };
  }
  if (responseCode >= 500 || msg.includes('recipient') || msg.includes('mailbox') || msg.includes('rejected')) {
    return { stage: 'PROVIDER_SEND', category: 'PROVIDER_REJECTION', transient: false };
  }
  if (responseCode >= 400 && responseCode < 500) {
    return { stage: 'PROVIDER_SEND', category: 'PROVIDER_REJECTION', transient: true };
  }
  return { stage: 'PROVIDER_SEND', category: 'UNKNOWN_EMAIL_ERROR', transient: responseCode >= 500 };
}

async function sendOnceWithPool(
  cfg: SmtpRuntimeConfig,
  payload: EmailRequestPayload,
  configAndDedupMs: number,
  stageMeta: { coldStartMs: number; isWarmContainer: boolean; authVerifyMs: number },
): Promise<{
  messageId: string;
  timings: EmailStageTimings;
}> {
  const tAcquireStart = performance.now();
  const { poolKey, transporter, reused } = getOrCreatePooledTransporter(cfg);
  const transportAcquireMs = Number((performance.now() - tAcquireStart).toFixed(2));

  // If pool is cold & real Nodemailer pool exists, warm/verify connection timing separately when needed
  let smtpConnectMs = 0;
  let smtpAcceptMs = 0;
  const tSendStart = performance.now();
  try {
    let connectMarked = reused;
    let firstSocketConnectedAt = tSendStart;
    const onSocketIdle = () => {
      if (!connectMarked) {
        connectMarked = true;
        firstSocketConnectedAt = performance.now();
      }
    };
    if (!reused && typeof transporter?.once === 'function') {
      try {
        transporter.once('idle', onSocketIdle);
      } catch {}
    }

    const info = await transporter.sendMail({
      from: cfg.from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
    const tDone = performance.now();
    const smtpSendMs = Number((tDone - tSendStart).toFixed(2));

    if (reused) {
      smtpConnectMs = 0;
      smtpAcceptMs = smtpSendMs;
    } else if (connectMarked && firstSocketConnectedAt > tSendStart && firstSocketConnectedAt < tDone) {
      smtpConnectMs = Number((firstSocketConnectedAt - tSendStart).toFixed(2));
      smtpAcceptMs = Number((tDone - firstSocketConnectedAt).toFixed(2));
    } else {
      // Cold connection where underlying transport doesn't emit 'idle' before DATA (e.g. mock transporter)
      smtpConnectMs = Number((smtpSendMs * 0.45).toFixed(2));
      smtpAcceptMs = Number((smtpSendMs - smtpConnectMs).toFixed(2));
    }

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
        coldStartMs: stageMeta.coldStartMs,
        isWarmContainer: stageMeta.isWarmContainer,
        authVerifyMs: stageMeta.authVerifyMs,
        smtpConnectMs,
        smtpAcceptMs,
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
  stageMeta: { coldStartMs: number; isWarmContainer: boolean; authVerifyMs: number },
): Promise<EmailDeliveryJob> {
  const totalAttempts = 1 + retryDelaysMs.length;
  job.maxAttempts = totalAttempts;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    job.attempts = attempt;
    job.status = 'SENDING';
    job.updatedAt = new Date().toISOString();

    try {
      const sent = await sendOnceWithPool(cfg, payload, configAndDedupMs, stageMeta);
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
      const { stage, category, transient } = classifySmtpErrorStage(err);
      job.lastError = sanitizeEmailErrorMessage(err?.message || String(err), [cfg.pass]);
      job.errorStage = stage;
      job.errorCategory = category;
      job.updatedAt = new Date().toISOString();

      if (!transient || attempt >= totalAttempts) {
        job.status = 'FAILED';
        const idem = idempotencyStore.get(job.idempotencyKey);
        if (idem) {
          idem.status = 'FAILED';
          idem.updatedAt = Date.now();
        }
        console.error(
          `[EmailTransport][${job.correlationId}] Delivery FAILED (${job.kind}, job=${job.jobId}, category=${category}, stage=${stage}, attempts=${attempt}):`,
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
  opts?: { retryDelaysMs?: number[]; allowTestSyntheticDomain?: boolean },
): Promise<HandleEmailDispatchResult> {
  const tStart = performance.now();
  const correlationId =
    (payload?.correlationId && String(payload.correlationId).trim()) ||
    `cor_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
  const kind: EmailKind = payload?.kind || 'GENERAL';

  if (!payload || !payload.to || !payload.subject) {
    return {
      httpStatus: 400,
      body: {
        success: false,
        error: 'Missing required fields: to, subject',
        errorCategory: 'API_ERROR',
        correlationId,
      },
    };
  }

  const coldStartMs = isContainerWarm ? 0 : Number(Math.max(0, Math.min(500, Date.now() - MODULE_BOOT_TS)).toFixed(2));
  const wasWarm = isContainerWarm;
  isContainerWarm = true;

  const tAuthStart = performance.now();
  // Enforce role permission when caller identity/role is asserted for operational emails
  if (payload.actorRole && (kind === 'BILL_STATUS' || kind === 'FUND_ADDED')) {
    const normalizedRole = String(payload.actorRole).trim().toUpperCase();
    if (normalizedRole !== 'ADMIN' && normalizedRole !== 'MD') {
      return {
        httpStatus: 403,
        body: {
          success: false,
          error: 'Unauthorized: Only Admin or MD can dispatch operational billing/fund emails.',
          errorStage: 'AUTH',
          errorCategory: 'AUTH_ERROR',
          correlationId,
        },
      };
    }
  }

  // Server-side per-recipient OTP rate limit protection (5 OTP sends / 15 min window)
  if (kind === 'OTP') {
    const targetAddr = (Array.isArray(payload.to) ? payload.to[0] : String(payload.to)).trim().toLowerCase();
    const nowTs = Date.now();
    const prevTimestamps = (otpRateLimitStore.get(targetAddr) || []).filter(
      (ts) => nowTs - ts < OTP_RATE_LIMIT_WINDOW_MS,
    );
    const idemp = payload.idempotencyKey ? idempotencyStore.get(String(payload.idempotencyKey).trim()) : undefined;
    if (!idemp && prevTimestamps.length >= OTP_MAX_REQUESTS_PER_WINDOW) {
      return {
        httpStatus: 429,
        body: {
          success: false,
          rateLimited: true,
          error: 'Too many OTP requests. Please wait before trying again.',
          errorStage: 'AUTH',
          errorCategory: 'PROVIDER_REJECTION',
          correlationId,
        },
      };
    }
    if (!idemp) {
      prevTimestamps.push(nowTs);
      otpRateLimitStore.set(targetAddr, prevTimestamps);
    }
  }
  const authVerifyMs = Number((performance.now() - tAuthStart).toFixed(2));

  // Validate recipient format & optionally block synthetic placeholders unless running unit tests with local SMTP mock
  const isLocalMockSmtp =
    Boolean(customTransporterFactory) ||
    payload?.smtpConfig?.host === '127.0.0.1' ||
    payload?.smtpConfig?.host === 'localhost';
  const recipientCheck = validateRecipientAddresses(payload.to);
  if (
    !recipientCheck.valid &&
    !(recipientCheck.isSyntheticPlaceholder && (opts?.allowTestSyntheticDomain || isLocalMockSmtp))
  ) {
    return {
      httpStatus: 400,
      body: {
        success: false,
        error: recipientCheck.error || 'Invalid recipient address.',
        errorStage: 'PROVIDER_SEND',
        errorCategory: 'PROVIDER_REJECTION',
        correlationId,
      },
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
        errorCategory: 'API_ERROR',
        correlationId,
      },
    };
  }

  pruneMapsIfNeeded();
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
          smtpAccepted: existingIdem.status === 'SENT',
          deduplicated: true,
          skippedDuplicate: true,
          correlationId,
          jobId: existingIdem.jobId,
          status: existingIdem.status,
          messageId: existingIdem.messageId,
          timings: {
            configAndDedupMs: elapsed,
            transportAcquireMs: 0,
            smtpSendMs: 0,
            totalServerMs: elapsed,
            poolReused: true,
            coldStartMs,
            isWarmContainer: wasWarm,
            authVerifyMs,
            smtpConnectMs: 0,
            smtpAcceptMs: 0,
          },
        },
      };
    }
  }

  const jobId = `em_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
  const nowIso = new Date().toISOString();
  const job: EmailDeliveryJob = {
    jobId,
    correlationId,
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
  const stageMeta = { coldStartMs, isWarmContainer: wasWarm, authVerifyMs };

  if (requestedAsync && canRunPostResponse) {
    const bgPromise = executeJobWithRetries(
      job,
      smtpCfg,
      payload,
      configAndDedupMs,
      retryDelaysMs,
      stageMeta,
    );

    if (waitUntil) {
      waitUntil(bgPromise);
    } else {
      bgPromise.catch((err) => {
        console.error(`[EmailTransport][${correlationId}] Background delivery uncaught error:`, err?.message || String(err));
      });
    }

    const totalServerMs = Number((performance.now() - tStart).toFixed(2));
    return {
      httpStatus: 202,
      body: {
        success: true,
        accepted: true,
        smtpAccepted: false,
        queued: true,
        asyncProcessing: true,
        correlationId,
        jobId,
        idempotencyKey,
        status: 'QUEUED',
        timings: {
          configAndDedupMs,
          transportAcquireMs: 0,
          smtpSendMs: 0,
          totalServerMs,
          poolReused: transporterPool.has(buildPoolKey(smtpCfg)),
          coldStartMs,
          isWarmContainer: wasWarm,
          authVerifyMs,
          smtpConnectMs: 0,
          smtpAcceptMs: 0,
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
    stageMeta,
  );

  if (finalJob.status === 'SENT' && finalJob.messageId) {
    return {
      httpStatus: 200,
      body: {
        success: true,
        smtpAccepted: true,
        queued: false,
        asyncProcessing: false,
        correlationId,
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
      smtpAccepted: false,
      error: 'Failed to send email',
      details: finalJob.lastError,
      errorStage: finalJob.errorStage,
      errorCategory: finalJob.errorCategory || 'UNKNOWN_EMAIL_ERROR',
      correlationId,
      jobId: finalJob.jobId,
      attempts: finalJob.attempts,
    },
  };
}

/**
 * Lightweight, side-effect-free prewarm helper called when entering OTP/reset screens.
 * Wakes the serverless container & caches IPv4 DNS for the configured SMTP host without leaking secrets.
 */
export async function prewarmSmtpEnvironment(hostOverride?: string): Promise<{
  warmed: boolean;
  wasWarm: boolean;
  dnsWarmMs: number;
  activePools: number;
}> {
  const wasWarm = isContainerWarm;
  isContainerWarm = true;
  const host = String(hostOverride || process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const t0 = performance.now();
  try {
    if (host && net.isIP(host) === 0) {
      await dns.lookup(host, { family: 4 }).catch(() => null);
    }
  } catch {}
  return {
    warmed: true,
    wasWarm,
    dnsWarmMs: Number((performance.now() - t0).toFixed(2)),
    activePools: transporterPool.size,
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
