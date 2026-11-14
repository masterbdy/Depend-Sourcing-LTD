import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import {
  handleEmailDispatch,
  getEmailJobStatus,
  getEmailTransportSummary,
  probeSmtpNetworkStages,
  resetEmailTransportStateForTest,
  setTransporterFactoryForTest,
} from '../services/emailTransportService';
import { systemHealth } from '../services/systemHealthService';
import {
  sendBillStatusEmailToStaff,
  sendFundAddedEmailToMD,
  processPendingEmailRetries,
} from '../services/emailService';

function startLocalBenchmarkSmtpServer(opts: {
  handshakeDelayMs: number;
  dataDelayMs: number;
}): Promise<{
  port: number;
  connectionsOpened: number;
  messagesReceived: Array<{ to: string; body: string }>;
  close: () => Promise<void>;
}> {
  return new Promise((resolve) => {
    let connectionsOpened = 0;
    const messagesReceived: Array<{ to: string; body: string }> = [];

    const server = net.createServer((socket) => {
      connectionsOpened += 1;
      let inData = false;
      let rcptTo = '';
      let dataBuf = '';
      let authExpectPassword = false;

      const sendLine = (line: string, delay = 0) => {
        if (delay > 0) {
          setTimeout(() => {
            if (!socket.destroyed) socket.write(`${line}\r\n`);
          }, delay);
        } else {
          if (!socket.destroyed) socket.write(`${line}\r\n`);
        }
      };

      sendLine('220 localhost ESMTP MockBench', opts.handshakeDelayMs);

      let lineBuf = '';
      socket.on('data', (chunk) => {
        lineBuf += chunk.toString('utf8');
        while (lineBuf.includes('\r\n')) {
          const idx = lineBuf.indexOf('\r\n');
          const line = lineBuf.slice(0, idx);
          lineBuf = lineBuf.slice(idx + 2);

          if (inData) {
            if (line === '.') {
              inData = false;
              messagesReceived.push({ to: rcptTo, body: dataBuf });
              dataBuf = '';
              sendLine('250 2.0.0 OK queued', opts.dataDelayMs);
            } else {
              dataBuf += `${line}\n`;
            }
            continue;
          }

          if (authExpectPassword) {
            authExpectPassword = false;
            sendLine('235 2.7.0 Authentication successful', Math.round(opts.handshakeDelayMs / 2));
            continue;
          }

          const upper = line.toUpperCase();
          if (upper.startsWith('EHLO') || upper.startsWith('HELO')) {
            sendLine('250-localhost\r\n250 AUTH PLAIN LOGIN');
          } else if (upper.startsWith('AUTH PLAIN')) {
            if (line.trim().split(' ').length >= 3) {
              sendLine('235 2.7.0 Authentication successful', Math.round(opts.handshakeDelayMs / 2));
            } else {
              authExpectPassword = true;
              sendLine('334 ');
            }
          } else if (upper.startsWith('AUTH LOGIN')) {
            authExpectPassword = true;
            sendLine('334 VXNlcm5hbWU6');
          } else if (upper.startsWith('MAIL FROM:')) {
            sendLine('250 2.1.0 OK');
          } else if (upper.startsWith('RCPT TO:')) {
            rcptTo = line.slice(8).trim();
            sendLine('250 2.1.5 OK');
          } else if (upper === 'DATA') {
            inData = true;
            dataBuf = '';
            sendLine('354 End data with <CR><LF>.<CR><LF>');
          } else if (upper === 'RSET') {
            sendLine('250 2.0.0 OK');
          } else if (upper === 'QUIT') {
            sendLine('221 2.0.0 Bye');
            socket.end();
          } else {
            sendLine('250 OK');
          }
        }
      });
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as net.AddressInfo;
      resolve({
        port: addr.port,
        get connectionsOpened() {
          return connectionsOpened;
        },
        messagesReceived,
        close: () =>
          new Promise<void>((resClose) => {
            server.close(() => resClose());
          }),
      });
    });
  });
}

async function runEmailPerformanceTests() {
  console.log('--- DEPEND SOURCING LTD. EMAIL PERFORMANCE & RELIABILITY TEST SUITE ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
      failed++;
    }
  }

  // Provide lightweight localStorage polyfill for Node execution
  const memoryStorage = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (memoryStorage.has(k) ? memoryStorage.get(k)! : null),
    setItem: (k: string, v: string) => memoryStorage.set(k, String(v)),
    removeItem: (k: string) => memoryStorage.delete(k),
    clear: () => memoryStorage.clear(),
  };

  // =========================================================================
  // 1. REAL LOCAL SMTP BENCHMARK: Unpooled Sync vs Pooled Sync vs Pooled Async
  // =========================================================================
  const smtpServer = await startLocalBenchmarkSmtpServer({
    handshakeDelayMs: 120,
    dataDelayMs: 25,
  });

  try {
    resetEmailTransportStateForTest();
    const baseSmtp = {
      host: '127.0.0.1',
      port: smtpServer.port,
      secure: false,
      user: 'tester@depend.local',
      pass: 'test-pass-123',
      from: 'tester@depend.local',
    };

    // First synchronous pooled email (cold connection opens pool)
    const r1 = await handleEmailDispatch({
      to: 'staff1@depend.com',
      subject: 'Bill Status Update: APPROVED',
      html: '<p>Test 1</p>',
      smtpConfig: baseSmtp,
      kind: 'BILL_STATUS',
      deliveryMode: 'sync',
      idempotencyKey: 'bench-sync-1',
    });

    // Second synchronous pooled email (reuses warm SMTP socket — skips handshake)
    const r2 = await handleEmailDispatch({
      to: 'staff2@depend.com',
      subject: 'Bill Status Update: APPROVED',
      html: '<p>Test 2</p>',
      smtpConfig: baseSmtp,
      kind: 'BILL_STATUS',
      deliveryMode: 'sync',
      idempotencyKey: 'bench-sync-2',
    });

    assert(r1.httpStatus === 200 && r1.body.success === true, '1st pooled sync email sent via real SMTP');
    assert(r2.httpStatus === 200 && r2.body.success === true, '2nd pooled sync email sent via real SMTP');
    assert(
      r1.body.timings.poolReused === false && r2.body.timings.poolReused === true,
      `Connection reuse confirmed (1st poolReused=false [${r1.body.timings.smtpSendMs}ms], 2nd poolReused=true [${r2.body.timings.smtpSendMs}ms])`,
    );
    assert(
      r2.body.timings.smtpSendMs < r1.body.timings.smtpSendMs,
      `Warm pooled connection (${r2.body.timings.smtpSendMs}ms) faster than cold connection (${r1.body.timings.smtpSendMs}ms)`,
    );
    assert(
      smtpServer.connectionsOpened === 1,
      `Single pooled TCP connection reused for multiple emails (opened=${smtpServer.connectionsOpened})`,
    );

    // Async non-blocking mode (Express default for BILL_STATUS & FUND_ADDED)
    const prevVercel = process.env.VERCEL;
    delete process.env.VERCEL;
    const tAsyncStart = performance.now();
    const rAsync = await handleEmailDispatch({
      to: 'dependsource@gmail.com',
      subject: 'Company Fund Added',
      html: '<p>Fund 5000</p>',
      smtpConfig: baseSmtp,
      kind: 'FUND_ADDED',
      deliveryMode: 'async',
      idempotencyKey: 'bench-async-1',
    });
    const asyncApiMs = Number((performance.now() - tAsyncStart).toFixed(2));
    assert(
      rAsync.httpStatus === 202 && rAsync.body.queued === true && asyncApiMs < 50,
      `Async Fund email returned 202 Accepted cleanly in ${asyncApiMs}ms (< 50ms)`,
    );

    // Wait briefly for background SMTP delivery to complete
    await new Promise((r) => setTimeout(r, 150));
    const jobStatus = getEmailJobStatus(rAsync.body.jobId);
    assert(
      jobStatus?.status === 'SENT' && smtpServer.messagesReceived.length === 3,
      `Background queued email actually delivered to SMTP server (status=${jobStatus?.status}, received=${smtpServer.messagesReceived.length})`,
    );

    // =========================================================================
    // 2. DUPLICATE EMAIL PREVENTION (Idempotency)
    // =========================================================================
    const rDup = await handleEmailDispatch({
      to: 'dependsource@gmail.com',
      subject: 'Company Fund Added',
      html: '<p>Fund 5000</p>',
      smtpConfig: baseSmtp,
      kind: 'FUND_ADDED',
      deliveryMode: 'async',
      idempotencyKey: 'bench-async-1',
    });
    assert(
      rDup.httpStatus === 200 &&
        rDup.body.deduplicated === true &&
        rDup.body.skippedDuplicate === true &&
        smtpServer.messagesReceived.length === 3,
      'Duplicate email with same idempotencyKey skipped without second SMTP delivery',
    );

    // Distinct status transition for same bill MUST send
    const rTransition = await handleEmailDispatch({
      to: 'staff1@depend.com',
      subject: 'Bill Status Update: VERIFIED',
      html: '<p>Verified</p>',
      smtpConfig: baseSmtp,
      kind: 'BILL_STATUS',
      deliveryMode: 'sync',
      idempotencyKey: 'bill:exp99:VERIFIED',
    });
    const rTransition2 = await handleEmailDispatch({
      to: 'staff1@depend.com',
      subject: 'Bill Status Update: APPROVED',
      html: '<p>Approved</p>',
      smtpConfig: baseSmtp,
      kind: 'BILL_STATUS',
      deliveryMode: 'sync',
      idempotencyKey: 'bill:exp99:APPROVED',
    });
    assert(
      rTransition.httpStatus === 200 && rTransition2.httpStatus === 200 && smtpServer.messagesReceived.length === 5,
      'Legitimate bill status transitions (VERIFIED -> APPROVED) both deliver distinctly',
    );

    // =========================================================================
    // 3. TRANSIENT RETRY & PERMANENT AUTH FAILURE CLASSIFICATION
    // =========================================================================
    resetEmailTransportStateForTest();
    let mockAttempts = 0;
    setTransporterFactoryForTest(() => ({
      sendMail: async () => {
        mockAttempts += 1;
        if (mockAttempts === 1) {
          const err: any = new Error('Connection timed out');
          err.code = 'ETIMEDOUT';
          throw err;
        }
        return { messageId: 'recovered-msg-id' };
      },
      on: () => {},
      close: () => {},
    }));

    const rRetry = await handleEmailDispatch(
      {
        to: 'staff@depend.com',
        subject: 'Bill Status Update: APPROVED',
        html: '<p>Retry test</p>',
        smtpConfig: baseSmtp,
        kind: 'BILL_STATUS',
        deliveryMode: 'sync',
        idempotencyKey: 'retry-transient-1',
      },
      { retryDelaysMs: [10] },
    );
    assert(
      rRetry.httpStatus === 200 && rRetry.body.messageId === 'recovered-msg-id' && mockAttempts === 2,
      `Transient ETIMEDOUT auto-retried and succeeded on attempt 2`,
    );

    // Permanent AUTH error must NOT loop retries and must record failure in summary
    resetEmailTransportStateForTest();
    let authAttempts = 0;
    setTransporterFactoryForTest(() => ({
      sendMail: async () => {
        authAttempts += 1;
        const err: any = new Error('535-5.7.8 Username and Password not accepted');
        err.code = 'EAUTH';
        err.responseCode = 535;
        throw err;
      },
      on: () => {},
      close: () => {},
    }));
    const rAuthFail = await handleEmailDispatch({
      to: 'staff@depend.com',
      subject: 'Bill Status Update: APPROVED',
      html: '<p>Auth fail test</p>',
      smtpConfig: baseSmtp,
      kind: 'BILL_STATUS',
      deliveryMode: 'sync',
      idempotencyKey: 'auth-fail-1',
    });
    const summaryAfterFail = getEmailTransportSummary();
    assert(
      rAuthFail.httpStatus === 500 &&
        rAuthFail.body.errorStage === 'AUTH' &&
        authAttempts === 1 &&
        summaryAfterFail.failedCount === 1,
      'Permanent EAUTH failure fails fast (1 attempt), classifies stage=AUTH, and tracks failure in summary',
    );

    // =========================================================================
    // 4. VERCEL SERVERLESS FALLBACK SAFETY (no waitUntil -> safe sync; with waitUntil -> 202 async)
    // =========================================================================
    resetEmailTransportStateForTest();
    setTransporterFactoryForTest(() => ({
      sendMail: async () => ({ messageId: 'vercel-msg-1' }),
      on: () => {},
      close: () => {},
    }));
    process.env.VERCEL = '1';
    const rVercelNoWaitUntil = await handleEmailDispatch({
      to: 'md@depend.com',
      subject: 'Company Fund Added',
      html: '<p>Vercel safe sync</p>',
      smtpConfig: baseSmtp,
      kind: 'FUND_ADDED',
      deliveryMode: 'async',
      idempotencyKey: 'vercel-sync-fallback',
    });
    assert(
      rVercelNoWaitUntil.httpStatus === 200 && rVercelNoWaitUntil.body.queued === false,
      'Vercel without waitUntil safely executes synchronously so emails are never lost on lambda freeze',
    );

    // Simulate Vercel request context waitUntil
    const waitUntilPromises: Promise<unknown>[] = [];
    const reqCtxSymbol = Symbol.for('@vercel/request-context');
    (globalThis as any)[reqCtxSymbol] = {
      get: () => ({
        waitUntil: (p: Promise<unknown>) => waitUntilPromises.push(p),
      }),
    };
    const rVercelWithWaitUntil = await handleEmailDispatch({
      to: 'md@depend.com',
      subject: 'Company Fund Added',
      html: '<p>Vercel async waitUntil</p>',
      smtpConfig: baseSmtp,
      kind: 'FUND_ADDED',
      deliveryMode: 'async',
      idempotencyKey: 'vercel-waituntil-1',
    });
    await Promise.all(waitUntilPromises);
    assert(
      rVercelWithWaitUntil.httpStatus === 202 &&
        waitUntilPromises.length === 1 &&
        getEmailJobStatus(rVercelWithWaitUntil.body.jobId)?.status === 'SENT',
      'Vercel with waitUntil returns 202 Accepted immediately and delivers inside waitUntil',
    );
    delete (globalThis as any)[reqCtxSymbol];
    if (prevVercel !== undefined) process.env.VERCEL = prevVercel;
    else delete process.env.VERCEL;

    // =========================================================================
    // 5. CLIENT-SIDE EMAIL SERVICE: FAILURE TRACKING, QUEUED RETRY & NO DUPLICATES
    // =========================================================================
    setTransporterFactoryForTest(null);
    const originalFetch = globalThis.fetch;
    let fetchMode: 'FAIL_500' | 'OK_202' = 'FAIL_500';
    let clientFetchCalls = 0;
    const mockJobStatus = 'SENT';

    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      if (String(url).includes('/api/send-email') && init?.method === 'POST') {
        clientFetchCalls += 1;
        if (fetchMode === 'FAIL_500') {
          return {
            ok: false,
            status: 500,
            json: async () => ({ success: false, error: 'Simulated temporary SMTP outage', errorStage: 'CONNECTION' }),
          } as any;
        }
        return {
          ok: true,
          status: 202,
          json: async () => ({ success: true, accepted: true, queued: true, jobId: 'em_mock_1' }),
        } as any;
      }
      if (String(url).includes('jobId=em_mock_1')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, job: { jobId: 'em_mock_1', status: mockJobStatus } }),
        } as any;
      }
      return { ok: true, status: 200, json: async () => ({}) } as any;
    }) as any;

    const failRes = await sendBillStatusEmailToStaff(
      'mehedi@depend.com',
      'Mehedi Hasan',
      1500,
      'Transport',
      'APPROVED',
      '',
      { entityId: 'exp_client_1' },
    );
    const retryQueueAfterFail = JSON.parse(memoryStorage.get('ais_failed_email_queue_v1') || '[]');
    const openEmailIncidents = systemHealth
      .getIncidents()
      .filter((i) => i.type === 'EMAIL_DELIVERY_FAILURE' && i.status !== 'RESOLVED');
    assert(
      failRes?.dispatched === false &&
        retryQueueAfterFail.length === 1 &&
        openEmailIncidents.length >= 1,
      'Failed email notification records visible SystemHealth incident + queues retry safely',
    );
    // Ensure Zero-PII in recorded incident message (no staff email address leaked!)
    assert(
      !openEmailIncidents[0].message.includes('mehedi@depend.com'),
      'Recorded Email SystemHealth incident preserves Zero-PII policy',
    );

    // Force retry readiness & recover backend -> processPendingEmailRetries succeeds!
    retryQueueAfterFail[0].nextRetryAt = Date.now() - 1000;
    memoryStorage.set('ais_failed_email_queue_v1', JSON.stringify(retryQueueAfterFail));
    fetchMode = 'OK_202';

    const retrySummary = await processPendingEmailRetries();
    assert(
      retrySummary.processed === 1 && retrySummary.succeeded === 1,
      'Client retry queue recovers and dispatches queued failed email when backend recovers',
    );

    // Same entity called again within client idempotency window must deduplicate cleanly without network call
    const callsBeforeDup = clientFetchCalls;
    const dupClientRes = await sendBillStatusEmailToStaff(
      'mehedi@depend.com',
      'Mehedi Hasan',
      1500,
      'Transport',
      'APPROVED',
      '',
      { entityId: 'exp_client_1' },
    );
    assert(
      dupClientRes?.deduplicated === true && clientFetchCalls === callsBeforeDup,
      'Client-side idempotency prevents duplicate Bill Status email HTTP calls',
    );

    // Non-blocking FundLedger verification (source assertion)
    const fundLedgerSrc = fs.readFileSync(path.join(process.cwd(), 'views', 'FundLedger.tsx'), 'utf8');
    assert(
      !fundLedgerSrc.includes('await sendFundAddedEmailToMD(') &&
        fundLedgerSrc.includes('void sendFundAddedEmailToMD('),
      'FundLedger.tsx dispatches Send Fund Email asynchronously without blocking UI modal close',
    );

    // Diagnostic stage probe check on live local SMTP mock
    const stageProbe = await probeSmtpNetworkStages('127.0.0.1', smtpServer.port);
    assert(
      typeof stageProbe.dnsMs === 'number' && typeof stageProbe.tcpBannerMs === 'number',
      `Diagnostic stage probe measures DNS (${stageProbe.dnsMs}ms) & TCP+Banner (${stageProbe.tcpBannerMs}ms) independently`,
    );

    globalThis.fetch = originalFetch;
  } finally {
    setTransporterFactoryForTest(null);
    await smtpServer.close();
  }

  console.log(`\n================================================`);
  console.log(`EMAIL PERFORMANCE & RELIABILITY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`================================================`);
  if (failed > 0) {
    process.exit(1);
  }
}

runEmailPerformanceTests();
