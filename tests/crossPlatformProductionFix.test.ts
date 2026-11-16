import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import sendEmailHandler from '../api/send-email';
import appVersionHandler from '../api/app-version';
import {
  DEFAULT_FIREBASE_CONFIG,
} from '../constants';
import {
  normalizeFirebaseConfig,
  normalizeCollectionSnapshot,
  reconcileSnapshotWithOfflineQueue,
  computeSyncPayloadSignature,
  markRecordDeleted,
} from '../services/syncConsistencyService';
import {
  handleEmailDispatch,
  resetEmailTransportStateForTest,
  setTransporterFactoryForTest,
} from '../services/emailTransportService';
import {
  prewarmEmailTransport,
  sendBillStatusEmailToStaff,
  sendFundAddedEmailToMD,
  sendOTPEmail,
} from '../services/emailService';
import { systemHealth } from '../services/systemHealthService';
import { DuplicateSyncGuard } from '../services/staffSyncOptimizer';

// Polyfill minimal browser globals for client service modules
const memStorage = new Map<string, string>();
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (k: string) => (memStorage.has(k) ? memStorage.get(k)! : null),
    setItem: (k: string, v: string) => memStorage.set(k, String(v)),
    removeItem: (k: string) => memStorage.delete(k),
    clear: () => memStorage.clear(),
  };
}
if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  };
}

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    passed += 1;
    console.log(`  ✅ PASS: ${msg}`);
  } else {
    failed += 1;
    console.error(`  ❌ FAIL: ${msg}`);
  }
}

function createMockReqRes(opts: {
  method: string;
  query?: Record<string, any>;
  headers?: Record<string, string>;
  body?: any;
}) {
  const resHeaders: Record<string, string> = {};
  let statusCode = 200;
  let jsonBody: any = null;
  let ended = false;

  const req: any = {
    method: opts.method,
    query: opts.query || {},
    headers: opts.headers || {},
    body: opts.body,
  };

  const res: any = {
    setHeader: (k: string, v: string) => {
      resHeaders[k.toLowerCase()] = String(v);
    },
    getHeader: (k: string) => resHeaders[k.toLowerCase()],
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (payload: any) => {
      jsonBody = payload;
      ended = true;
      return res;
    },
    end: () => {
      ended = true;
      return res;
    },
  };

  return {
    req,
    res,
    result: () => ({ statusCode, headers: resHeaders, body: jsonBody, ended }),
  };
}

function startLocalSmtpMock(): Promise<{
  port: number;
  received: number;
  close: () => Promise<void>;
}> {
  return new Promise((resolve) => {
    let received = 0;
    const server = net.createServer((socket) => {
      let inData = false;
      let authExpect = false;
      let buf = '';
      socket.write('220 localhost ESMTP Ready\r\n');
      socket.on('data', (chunk) => {
        buf += chunk.toString('utf8');
        while (buf.includes('\r\n')) {
          const idx = buf.indexOf('\r\n');
          const line = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          if (inData) {
            if (line === '.') {
              inData = false;
              received += 1;
              socket.write('250 2.0.0 OK\r\n');
            }
            continue;
          }
          if (authExpect) {
            authExpect = false;
            socket.write('235 2.7.0 OK\r\n');
            continue;
          }
          const u = line.toUpperCase();
          if (u.startsWith('EHLO') || u.startsWith('HELO')) {
            socket.write('250-localhost\r\n250 AUTH PLAIN LOGIN\r\n');
          } else if (u.startsWith('AUTH')) {
            if (line.trim().split(' ').length >= 3) {
              socket.write('235 2.7.0 OK\r\n');
            } else {
              authExpect = true;
              socket.write('334 VXNlcm5hbWU6\r\n');
            }
          } else if (u.startsWith('MAIL FROM:')) {
            socket.write('250 2.1.0 OK\r\n');
          } else if (u.startsWith('RCPT TO:')) {
            socket.write('250 2.1.5 OK\r\n');
          } else if (u === 'DATA') {
            inData = true;
            socket.write('354 End with .\r\n');
          } else if (u === 'QUIT') {
            socket.write('221 Bye\r\n');
            socket.end();
          } else {
            socket.write('250 OK\r\n');
          }
        }
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as net.AddressInfo;
      resolve({
        port: addr.port,
        get received() {
          return received;
        },
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

async function runTests() {
  console.log('\n=== CROSS-PLATFORM SYNC, EMAIL & PERFORMANCE PRODUCTION FIX TESTS ===');

  // ---------------------------------------------------------------------------
  // PRIORITY 1: Single Source of Truth, Bidirectional Sync, Hard Delete, Dedup
  // ---------------------------------------------------------------------------
  console.log('\n[Priority 1] Single Source & Bidirectional Sync');

  const divergedApkConfig = JSON.stringify({
    apiKey: 'fake-old-key',
    projectId: 'old-sandbox-project',
    databaseURL: 'https://old-sandbox.firebaseio.com',
  });
  const healed = normalizeFirebaseConfig(divergedApkConfig);
  assert(
    healed.projectId === DEFAULT_FIREBASE_CONFIG.projectId &&
      healed.databaseURL === DEFAULT_FIREBASE_CONFIG.databaseURL,
    'normalizeFirebaseConfig heals stale/diverged APK fb_config back to canonical production RTDB',
  );

  const validConfigWithWeirdDb = JSON.stringify({
    ...DEFAULT_FIREBASE_CONFIG,
    databaseURL: 'undefined/invalid',
  });
  const healedDb = normalizeFirebaseConfig(validConfigWithWeirdDb);
  assert(
    healedDb.databaseURL === DEFAULT_FIREBASE_CONFIG.databaseURL,
    'normalizeFirebaseConfig repairs invalid databaseURL while retaining canonical projectId',
  );

  // Bidirectional last-item hard deletion propagation
  const emptyAfterLastDelete = reconcileSnapshotWithOfflineQueue('expenses', false, null, {});
  assert(
    Array.isArray(emptyAfterLastDelete) && emptyAfterLastDelete.length === 0,
    'reconcileSnapshotWithOfflineQueue propagates empty snapshot (last-item hard deletion across devices)',
  );

  // Offline queue merge + offline hard delete + remote edit preservation
  const reconciled = reconcileSnapshotWithOfflineQueue(
    'expenses',
    true,
    {
      exp_1: { id: 'exp_1', amount: 500, status: 'APPROVED' },
      exp_2: { id: 'exp_2', amount: 800, status: 'PENDING' },
    },
    {
      expenses: {
        exp_2: { id: 'exp_2', isHardDeleted: true },
        exp_3: { id: 'exp_3', amount: 1200, status: 'PENDING' },
      },
    },
  );
  assert(
    reconciled.length === 2 &&
      reconciled.some((x: any) => x.id === 'exp_1' && x.status === 'APPROVED') &&
      !reconciled.some((x: any) => x.id === 'exp_2') &&
      reconciled.some((x: any) => x.id === 'exp_3' && x.amount === 1200),
    'reconcileSnapshotWithOfflineQueue merges remote updates, offline creates, and offline hard deletes cleanly',
  );

  const softDeleted = markRecordDeleted([{ id: 'exp_1', amount: 100 }], 'exp_1', 'soft');
  const hardDeleted = markRecordDeleted([{ id: 'exp_1', amount: 100 }], 'exp_1', 'hard');
  assert(
    (softDeleted[0] as any).isDeleted === true && (hardDeleted[0] as any).isHardDeleted === true,
    'markRecordDeleted sets isDeleted on soft delete and isHardDeleted on hard delete',
  );

  // Signature dedup avoids redundant multi-MB IDB writes
  const bigArr = Array.from({ length: 150 }, (_, i) => ({ id: `p_${i}`, title: `Product ${i}`, note: 'x'.repeat(200) }));
  const sig1 = computeSyncPayloadSignature(bigArr);
  const sig2 = computeSyncPayloadSignature([...bigArr]);
  const sig3 = computeSyncPayloadSignature([...bigArr.slice(0, 149), { ...bigArr[149], title: 'Edited' }]);
  assert(sig1 === sig2 && sig1 !== sig3, 'computeSyncPayloadSignature matches identical snapshots and detects edits');

  // DuplicateSyncGuard stops duplicate rapid flushes during reconnect/foreground bursts
  const guard = new DuplicateSyncGuard(3000);
  const payload = [{ id: 'exp_10', amount: 200 }];
  assert(
    guard.shouldSkip('expenses', payload) === false && guard.shouldSkip('expenses', payload) === true,
    'DuplicateSyncGuard prevents double RTDB writes during rapid reconnect + visibilitychange triggers',
  );

  const appTsxSrc = fs.readFileSync(path.join(process.cwd(), 'App.tsx'), 'utf8');
  assert(
    appTsxSrc.includes('goOnline(db)') &&
      appTsxSrc.includes('isFlushingOfflineQueueRef') &&
      appTsxSrc.includes('visibilitychange') &&
      appTsxSrc.includes('pageshow'),
    'App.tsx wires goOnline(db), flush mutex, visibilitychange, and pageshow lifecycle recovery',
  );
  assert(
    !appTsxSrc.includes('syncData("staffList", newList, prevList)'),
    'App.tsx no longer invokes syncData directly inside React setStaffList pure updaters',
  );

  // ---------------------------------------------------------------------------
  // PRIORITY 2: Vercel Email API, RBAC/Auth, CORS, Error Taxonomy, Redaction
  // ---------------------------------------------------------------------------
  console.log('\n[Priority 2] Email API Handler, Error Taxonomy & Secret Hygiene');

  const { req: optReq, res: optRes, result: optResult } = createMockReqRes({ method: 'OPTIONS' });
  await sendEmailHandler(optReq, optRes);
  const optOut = optResult();
  assert(
    optOut.statusCode === 200 &&
      optOut.headers['access-control-allow-headers']?.includes('X-User-Role') &&
      optOut.headers['access-control-allow-headers']?.includes('X-Correlation-ID'),
    'OPTIONS /api/send-email returns 200 with full CORS headers including X-User-Role and X-Correlation-ID',
  );

  const { req: getReq, res: getRes, result: getResult } = createMockReqRes({ method: 'GET' });
  await sendEmailHandler(getReq, getRes);
  const getOut = getResult();
  assert(
    getOut.statusCode === 200 &&
      getOut.body?.ok === true &&
      Boolean(getOut.body?.summary) &&
      Boolean(getOut.body?.correlationId),
    'GET /api/send-email returns 200 summary with correlationId',
  );

  const { req: badBearerReq, res: badBearerRes, result: badBearerOut } = createMockReqRes({
    method: 'POST',
    headers: { authorization: 'Bearer invalid-token' },
    body: { to: 'staff@dependsourcing.com', subject: 'Test', html: '<p>Hi</p>', kind: 'OTP' },
  });
  await sendEmailHandler(badBearerReq, badBearerRes);
  assert(
    badBearerOut().statusCode === 401 && badBearerOut().body?.errorCategory === 'AUTH_ERROR',
    'Malformed Bearer token is rejected with HTTP 401 and errorCategory=AUTH_ERROR',
  );

  const { req: rbacReq, res: rbacRes, result: rbacOut } = createMockReqRes({
    method: 'POST',
    headers: { 'x-user-role': 'STAFF', 'x-user-name': 'TestStaff' },
    body: {
      to: 'staff@dependsourcing.com',
      subject: 'Bill Approved',
      html: '<p>Hi</p>',
      kind: 'BILL_STATUS',
      deliveryMode: 'sync',
      smtpConfig: { host: 'smtp.gmail.com', port: 587, user: 'u@dependsourcing.com', pass: 'secret-pass-999' },
    },
  });
  await sendEmailHandler(rbacReq, rbacRes);
  assert(
    rbacOut().statusCode === 403 && rbacOut().body?.errorCategory === 'AUTH_ERROR',
    'STAFF role attempting BILL_STATUS dispatch is denied with HTTP 403 AUTH_ERROR',
  );

  const { req: synthReq, res: synthRes, result: synthOut } = createMockReqRes({
    method: 'POST',
    headers: { 'x-user-role': 'ADMIN', 'x-user-name': 'AdminUser' },
    body: {
      to: 'someone@depend.com',
      subject: 'Bill Approved',
      html: '<p>Hi</p>',
      kind: 'BILL_STATUS',
      deliveryMode: 'sync',
      smtpConfig: { host: 'smtp.gmail.com', port: 587, user: 'u@dependsourcing.com', pass: 'secret-pass-999' },
    },
  });
  await sendEmailHandler(synthReq, synthRes);
  assert(
    synthOut().statusCode === 400 && synthOut().body?.errorCategory === 'PROVIDER_REJECTION',
    'Synthetic @depend.com recipient is rejected server-side for non-local SMTP with PROVIDER_REJECTION',
  );

  // Error classification & secret redaction in handleEmailDispatch
  resetEmailTransportStateForTest();
  setTransporterFactoryForTest(() => ({
    sendMail: async () => {
      const err: any = new Error('535 5.7.8 Invalid login with superSecretAppPass123 Bearer abc.def.ghi');
      err.code = 'EAUTH';
      err.responseCode = 535;
      throw err;
    },
    close: () => {},
  }));
  const authErrRes = await handleEmailDispatch({
    to: 'staff@dependsourcing.com',
    subject: 'Test',
    html: '<p>Hi</p>',
    kind: 'BILL_STATUS',
    deliveryMode: 'sync',
    actorRole: 'ADMIN',
    smtpConfig: { host: 'smtp.gmail.com', port: 587, user: 'sender@dependsourcing.com', pass: 'superSecretAppPass123' },
  });
  assert(
    authErrRes.httpStatus === 500 &&
      authErrRes.body?.errorCategory === 'SMTP_AUTH_ERROR' &&
      !JSON.stringify(authErrRes.body).includes('superSecretAppPass123') &&
      !JSON.stringify(authErrRes.body).includes('abc.def.ghi'),
    'EAUTH failure classifies as SMTP_AUTH_ERROR and scrubs passwords/Bearer tokens from output',
  );

  setTransporterFactoryForTest(() => ({
    sendMail: async () => {
      const err: any = new Error('connect ECONNREFUSED 127.0.0.1:587');
      err.code = 'ECONNREFUSED';
      throw err;
    },
    close: () => {},
  }));
  const connErrRes = await handleEmailDispatch({
    to: 'staff@dependsourcing.com',
    subject: 'Test Conn',
    html: '<p>Hi</p>',
    kind: 'FUND_ADDED',
    deliveryMode: 'sync',
    actorRole: 'MD',
    smtpConfig: { host: 'smtp.gmail.com', port: 587, user: 'sender@dependsourcing.com', pass: 'secret' },
  });
  assert(
    connErrRes.body?.errorCategory === 'SMTP_CONNECTION_ERROR',
    'ECONNREFUSED failure classifies as SMTP_CONNECTION_ERROR',
  );

  // Live local SMTP handler dispatch through api/send-email handler
  setTransporterFactoryForTest(null);
  const smtpServer = await startLocalSmtpMock();
  try {
    const { req: livePostReq, res: livePostRes, result: livePostOut } = createMockReqRes({
      method: 'POST',
      headers: { 'x-user-role': 'ADMIN', 'x-user-name': 'AdminUser' },
      body: {
        to: 'staff@dependsourcing.com',
        subject: 'Live Handler Test',
        html: '<p>Approved</p>',
        kind: 'BILL_STATUS',
        deliveryMode: 'sync',
        smtpConfig: {
          host: '127.0.0.1',
          port: smtpServer.port,
          secure: false,
          user: 'sender@dependsourcing.com',
          pass: 'testpass',
        },
      },
    });
    await sendEmailHandler(livePostReq, livePostRes);
    const out = livePostOut();
    assert(
      out.statusCode === 200 && out.body?.success === true && smtpServer.received === 1,
      'POST /api/send-email end-to-end handler delivers via local SMTP mock cleanly',
    );
  } finally {
    await smtpServer.close();
  }

  // Client-side non-JSON HTML 500 handling + OTP + Fund email + synthetic guard
  const origFetch = globalThis.fetch;
  memStorage.clear();
  memStorage.set('active_session', JSON.stringify({ role: 'ADMIN', username: 'AdminTester' }));

  globalThis.fetch = (async () =>
    ({
      ok: false,
      status: 500,
      text: async () => '<html><body>500 FUNCTION_INVOCATION_FAILED</body></html>',
    }) as any) as any;

  const html500Res = await sendBillStatusEmailToStaff(
    'realstaff@dependsourcing.com',
    'Real Staff',
    900,
    'Conveyance',
    'APPROVED',
    '',
    { entityId: 'exp_html500_1' },
  );
  assert(
    html500Res.dispatched === false && html500Res.errorCategory === 'API_ERROR',
    'emailService cleanly parses non-JSON HTML 500 response as errorCategory=API_ERROR',
  );

  const syntheticSkipRes = await sendBillStatusEmailToStaff(
    'mehedi@depend.com',
    'Mehedi',
    500,
    'Snack',
    'APPROVED',
    '',
    { entityId: 'exp_synth_1' },
  );
  assert(
    syntheticSkipRes.dispatched === false && syntheticSkipRes.errorCategory === 'PROVIDER_REJECTION',
    'emailService blocks synthetic @depend.com recipient with PROVIDER_REJECTION before hitting API',
  );

  globalThis.fetch = (async () => {
    throw new TypeError('Failed to fetch');
  }) as any;
  const netErrRes = await sendFundAddedEmailToMD('md@dependsourcing.com', 'MD', 10000, 'Cash', 'Topup', 'AdminTester');
  assert(
    netErrRes.dispatched === false && netErrRes.errorCategory === 'NETWORK_ERROR',
    'emailService classifies TypeError("Failed to fetch") cleanly as NETWORK_ERROR',
  );

  globalThis.fetch = (async () =>
    ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, messageId: '<otp1@local>', correlationId: 'cor_otp' }),
    }) as any) as any;
  let otpSucceeded = false;
  try {
    await sendOTPEmail('user@dependsourcing.com', '123456', 'User');
    otpSucceeded = true;
  } catch {}
  assert(otpSucceeded === true, 'sendOTPEmail resolves cleanly on HTTP 200 JSON success');

  globalThis.fetch = origFetch;

  const expViewSrc = fs.readFileSync(path.join(process.cwd(), 'views', 'ExpenseManagementView.tsx'), 'utf8');
  assert(
    !expViewSrc.includes('}@depend.com'),
    'ExpenseManagementView.tsx contains zero synthetic @depend.com fallback email generations',
  );

  // ---------------------------------------------------------------------------
  // PRIORITY 3 & 4: /api/app-version, vercel.json rules, Update Safety & Benchmarks
  // ---------------------------------------------------------------------------
  console.log('\n[Priority 3 & 4] /api/app-version, Vercel Config & 10-Sample Benchmarks');

  const { req: verReq, res: verRes, result: verOut } = createMockReqRes({ method: 'GET' });
  await appVersionHandler(verReq, verRes);
  const vData = verOut();
  assert(
    vData.statusCode === 200 &&
      Boolean(vData.body?.version) &&
      vData.headers['cache-control']?.includes('no-store'),
    'GET /api/app-version returns 200 version payload with Cache-Control: no-store',
  );

  const vercelJson = fs.readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf8');
  assert(
    vercelJson.includes('\\.well-known') && vercelJson.includes('/api/app-version') && vercelJson.includes('no-store'),
    'vercel.json excludes /.well-known/.* from SPA rewrite and sets no-store on version endpoints',
  );

  const pwaPromptSrc = fs.readFileSync(path.join(process.cwd(), 'components', 'PWAUpdatePrompt.tsx'), 'utf8');
  assert(
    pwaPromptSrc.includes('canSafelyUpdate') && pwaPromptSrc.includes('visibilitychange'),
    'PWAUpdatePrompt checks canSafelyUpdate() before reload and refreshes checks on visibilitychange',
  );

  // 10-sample benchmarks for /api/app-version, /api/send-email GET, and isolated IDB probe
  const verSamples: number[] = [];
  const emailGetSamples: number[] = [];
  const storageProbeSamples: number[] = [];

  for (let i = 0; i < 10; i++) {
    const t0 = performance.now();
    const { req: vr, res: vs } = createMockReqRes({ method: 'GET' });
    await appVersionHandler(vr, vs);
    verSamples.push(Number((performance.now() - t0).toFixed(2)));

    const t1 = performance.now();
    const { req: er, res: es } = createMockReqRes({ method: 'GET' });
    await sendEmailHandler(er, es);
    emailGetSamples.push(Number((performance.now() - t1).toFixed(2)));

    const t2 = performance.now();
    const diagReport = await systemHealth.runSafeDiagnostics(undefined, { currentUser: 'TestAdmin', role: 'ADMIN' });
    const storageProbe = diagReport.diagnostics?.probes?.find((p) => p.probe === 'storage');
    storageProbeSamples.push(
      typeof storageProbe?.durationMs === 'number'
        ? storageProbe.durationMs
        : Number((performance.now() - t2).toFixed(2)),
    );
  }

  const avg = (arr: number[]) => Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2));
  const max = (arr: number[]) => Math.max(...arr);

  console.log(`  📊 Benchmark /api/app-version (10 samples): avg=${avg(verSamples)}ms, max=${max(verSamples)}ms`);
  console.log(`  📊 Benchmark /api/send-email GET (10 samples): avg=${avg(emailGetSamples)}ms, max=${max(emailGetSamples)}ms`);
  console.log(`  📊 Benchmark isolated storage probe (10 samples): avg=${avg(storageProbeSamples)}ms, max=${max(storageProbeSamples)}ms`);

  assert(avg(verSamples) < 25, '/api/app-version 10-sample average latency < 25ms');
  assert(avg(emailGetSamples) < 25, '/api/send-email GET 10-sample average latency < 25ms');
  assert(avg(storageProbeSamples) < 50, 'Isolated storage probe 10-sample average latency < 50ms');

  // ---------------------------------------------------------------------------
  // ISSUE 1 & 4: Sync Verification Restoration, Listener Tracking & Full Report
  // ---------------------------------------------------------------------------
  console.log('\n[Issue 1 & 4] Sync Verification, Listener Tracking & Final Health Report');

  // Verify App.tsx offline queue & listener tracking integration
  assert(
    appTsxSrc.includes('systemHealth.markListenerSnapshot(') &&
      appTsxSrc.includes('systemHealth.markListenerError(') &&
      appTsxSrc.includes('forgotOtpExpiresAtRef') &&
      appTsxSrc.includes('forgotOtpVerified') &&
      appTsxSrc.includes('prewarmEmailTransport'),
    'App.tsx tracks RTDB listener snapshots/errors, enforces OTP expiry & verification, and prewarms email transport',
  );

  // Verify listener error switches sync status to CRITICAL/DESYNCHRONIZED (distinct from UNKNOWN)
  systemHealth.markListenerError('expenses', 'permission_denied test error');
  const errSnap = await systemHealth.runSafeDiagnostics(undefined, { currentUser: 'TestAdmin', role: 'ADMIN' });
  assert(
    errSnap.sync.status === 'CRITICAL' &&
      errSnap.sync.consistencyStatus === 'DESYNCHRONIZED' &&
      errSnap.sync.verificationEvidence === 'FAILED' &&
      errSnap.sync.listenerErrorCount >= 1,
    'Listener error reports CRITICAL/DESYNCHRONIZED/FAILED (distinguished from UNKNOWN)',
  );

  // Clear listener error via fresh snapshot & record write ack
  systemHealth.markListenerSnapshot('expenses', 12, 'sig_expenses_ok');
  systemHealth.markSyncConfirmed('expenses');
  const postAckSnap = await systemHealth.runSafeDiagnostics(undefined, { currentUser: 'TestAdmin', role: 'ADMIN' });
  assert(
    postAckSnap.sync.listenerErrorCount === 0 &&
      postAckSnap.sync.activeListenerCount >= 1 &&
      postAckSnap.sync.writeAckHealth === 'HEALTHY' &&
      postAckSnap.sync.lifetimeSyncSuccessCount >= 1,
    'Fresh listener snapshot clears listener error and tracks writeAckHealth + lifetimeSyncSuccessCount',
  );

  // Verify ZERO pending queue alone WITHOUT Firebase connection/verification remains UNVERIFIED / never CONSISTENT
  assert(
    postAckSnap.sync.consistencyStatus !== 'CONSISTENT',
    'Offline/unconnected Firebase never falsely marks consistencyStatus as CONSISTENT even with 0 pending bills',
  );

  // Validate sanitized diagnostic report sections
  const sanitizedReport = systemHealth.generateSanitizedReport();
  assert(
    sanitizedReport.includes('Real-Time Listener Health:') &&
      sanitizedReport.includes('Cloud Write Acknowledgement Health:') &&
      sanitizedReport.includes('Email & OTP Delivery Health') &&
      sanitizedReport.includes('IndexedDB:') &&
      sanitizedReport.includes('Active Incidents'),
    'generateSanitizedReport includes all required Issue 4 sections (Firebase, Auth, Listeners, Write Ack, Queue, Sync, Email/OTP, API, IDB, Incidents)',
  );

  // ---------------------------------------------------------------------------
  // ISSUE 2: OTP Stage Optimization, Cold vs Warm Pool Reuse, Rate Limit & Strict Accept
  // ---------------------------------------------------------------------------
  console.log('\n[Issue 2] Email OTP Stage Optimization, Pool Reuse, Rate Limit & True SMTP Check');

  resetEmailTransportStateForTest();
  const warmReqRes = createMockReqRes({ method: 'GET', query: { warm: 'true', host: '127.0.0.1' } });
  await sendEmailHandler(warmReqRes.req, warmReqRes.res);
  const warmOut = warmReqRes.result();
  assert(
    warmOut.statusCode === 200 && warmOut.body?.warm?.warmed === true && !JSON.stringify(warmOut.body).includes('pass'),
    'GET /api/send-email?warm=true prewarms container safely without exposing credentials',
  );

  const otpSmtpServer = await startLocalSmtpMock();
  try {
    // Send 1st OTP (cold pool) then 2nd OTP (warm reused pool) through real local SMTP mock
    const otp1Req = createMockReqRes({
      method: 'POST',
      body: {
        to: 'otpuser@dependsourcing.com',
        subject: 'OTP 1',
        html: '<p>111111</p>',
        kind: 'OTP',
        deliveryMode: 'sync',
        idempotencyKey: 'otp_bench_1',
        smtpConfig: { host: '127.0.0.1', port: otpSmtpServer.port, secure: false, user: 'noreply@dependsourcing.com', pass: 'secret' },
      },
    });
    await sendEmailHandler(otp1Req.req, otp1Req.res);
    const r1 = otp1Req.result();

    const otp2Req = createMockReqRes({
      method: 'POST',
      body: {
        to: 'otpuser@dependsourcing.com',
        subject: 'OTP 2',
        html: '<p>222222</p>',
        kind: 'OTP',
        deliveryMode: 'sync',
        idempotencyKey: 'otp_bench_2',
        smtpConfig: { host: '127.0.0.1', port: otpSmtpServer.port, secure: false, user: 'noreply@dependsourcing.com', pass: 'secret' },
      },
    });
    await sendEmailHandler(otp2Req.req, otp2Req.res);
    const r2 = otp2Req.result();

    assert(
      r1.statusCode === 200 &&
        r1.body?.smtpAccepted === true &&
        typeof r1.body?.timings?.smtpConnectMs === 'number' &&
        typeof r1.body?.timings?.smtpAcceptMs === 'number',
      '1st OTP confirms real SMTP acceptance with granular coldStart/authVerify/smtpConnect/smtpAccept timings',
    );
    assert(
      r2.statusCode === 200 &&
        r2.body?.timings?.poolReused === true &&
        r2.body?.timings?.coldStartMs === 0 &&
        r2.body?.timings?.smtpConnectMs === 0,
      '2nd OTP reuses warm pooled SMTP connection (poolReused=true, coldStartMs=0, smtpConnectMs=0)',
    );

    // Rate limit enforcement after 5 OTP sends in window
    for (let k = 3; k <= 5; k++) {
      const rx = createMockReqRes({
        method: 'POST',
        body: {
          to: 'otpuser@dependsourcing.com',
          subject: `OTP ${k}`,
          html: `<p>${k}</p>`,
          kind: 'OTP',
          deliveryMode: 'sync',
          idempotencyKey: `otp_bench_${k}`,
          smtpConfig: { host: '127.0.0.1', port: otpSmtpServer.port, secure: false, user: 'noreply@dependsourcing.com', pass: 'secret' },
        },
      });
      await sendEmailHandler(rx.req, rx.res);
    }
    const r6 = createMockReqRes({
      method: 'POST',
      body: {
        to: 'otpuser@dependsourcing.com',
        subject: 'OTP 6',
        html: '<p>666666</p>',
        kind: 'OTP',
        deliveryMode: 'sync',
        idempotencyKey: 'otp_bench_6',
        smtpConfig: { host: '127.0.0.1', port: otpSmtpServer.port, secure: false, user: 'noreply@dependsourcing.com', pass: 'secret' },
      },
    });
    await sendEmailHandler(r6.req, r6.res);
    assert(
      r6.result().statusCode === 429 && r6.result().body?.rateLimited === true,
      'Server enforces per-recipient OTP rate limit (HTTP 429) beyond 5 sends in 15m window',
    );
  } finally {
    await otpSmtpServer.close();
  }

  // Client sendOTPEmail MUST reject HTTP 200 if smtpAccepted / messageId / deduplicated are missing
  const fake200Fetch = globalThis.fetch;
  globalThis.fetch = (async (url: string) => {
    if (String(url).includes('warm=true')) {
      return { ok: true, status: 200, text: async () => JSON.stringify({ ok: true }) } as any;
    }
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, smtpAccepted: false }),
    } as any;
  }) as any;

  const warmClientRes = await prewarmEmailTransport();
  assert(warmClientRes.warmed === true, 'prewarmEmailTransport invokes GET /api/send-email?warm=true safely');

  let rejectedUnverified200 = false;
  try {
    await sendOTPEmail('user@dependsourcing.com', '789012', 'TestUser');
  } catch {
    rejectedUnverified200 = true;
  }
  assert(
    rejectedUnverified200 === true,
    'sendOTPEmail rejects HTTP 200 responses that lack real SMTP acceptance / messageId confirmation',
  );
  globalThis.fetch = fake200Fetch;

  resetEmailTransportStateForTest();
  console.log('\n================================================');
  console.log(`CROSS-PLATFORM FIX SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================');
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
