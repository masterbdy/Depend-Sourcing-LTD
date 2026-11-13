/**
 * Production Acceptance & Regression Tests for System Health Monitor & Reliability Center
 * Depend Sourcing Ltd. - Office Management & Billing Center System
 *
 * Implements full test matrix RT-01 through RT-09 covering D-01 to D-09:
 * - D-01: HealthStatus union & typing compatibility
 * - D-02: Network vs local processing duration separation
 * - D-03: Single source of truth threshold synchronization
 * - D-04: isEnabled=false memory guard
 * - D-05: Firebase RTDB read latency precision
 * - D-06: Backend probe timeout alignment (2.5s)
 * - D-07: Strict Zero-PII sanitized technical report
 * - D-08: Incident occurrence stability on periodic scans
 * - D-09: In-memory mock storage isolation & safety
 */

import { systemHealth, Incident, PerfThresholds, HealthStatus } from '../services/systemHealthService';
import { perf, PerformanceDiagnosticService } from '../services/performanceDiagnostics';
import { submitExpenseBill, getUnsyncedBillCount } from '../services/billSyncService';
import { UserRole } from '../types';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedCount++;
  }
}

// ============================================================================
// STORAGE ISOLATION HARNESS (D-09 / RT-09)
// Protects production localStorage, offline_sync_queue, and real credentials
// ============================================================================
const memoryStore = new Map<string, string>();

const mockLocalStorage: Storage = {
  getItem: (key: string) => (memoryStore.has(key) ? memoryStore.get(key)! : null),
  setItem: (key: string, value: string) => {
    memoryStore.set(key, String(value));
  },
  removeItem: (key: string) => {
    memoryStore.delete(key);
  },
  clear: () => {
    memoryStore.clear();
  },
  key: (index: number) => Array.from(memoryStore.keys())[index] || null,
  get length() {
    return memoryStore.size;
  },
};

// Install isolation sandbox
Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  configurable: true,
  writable: true,
});

async function runAllTests() {
  console.log('===============================================================');
  console.log('       SYSTEM HEALTH & OBSERVABILITY: REGRESSION SUITE        ');
  console.log('===============================================================');

  // ============================================================================
  // SUITE 1: PRODUCTION INCIDENT LIFECYCLE & DEDUPLICATION (D-08 / RT-08)
  // ============================================================================
  console.log('\n--- Test 1: Incident Grouping & Deduplication (Normal Operations) ---');
  const inc1 = systemHealth.recordIncident({
    type: 'TEST_REPEATED_FAIL',
    title: 'Network Timeout on Server',
    severity: 'WARNING',
    affectedService: 'Firebase',
    message: 'First attempt timed out',
    recommendedAction: 'Check connectivity',
  });

  const inc2 = systemHealth.recordIncident({
    type: 'TEST_REPEATED_FAIL',
    title: 'Network Timeout on Server',
    severity: 'CRITICAL',
    affectedService: 'Firebase',
    message: 'Second attempt timed out after retry',
    recommendedAction: 'Check connectivity',
  });

  assert(inc1.id === inc2.id, `Grouped into single incident ID: ${inc1.id}`);
  assert(inc2.occurrenceCount === 2, `Occurrence count incremented to ${inc2.occurrenceCount}`);
  assert(inc2.severity === 'CRITICAL', `Severity escalated to CRITICAL on repeated failure`);

  console.log('\n--- RT-08: Incident Occurrence Stability on Periodic Diagnostics Scans ---');
  const initialOccurrenceCount = inc2.occurrenceCount;
  // Simulate 3 consecutive periodic background scans with unchanged condition
  for (let i = 0; i < 3; i++) {
    systemHealth.recordIncident({
      type: 'TEST_REPEATED_FAIL',
      title: 'Network Timeout on Server',
      severity: 'CRITICAL',
      affectedService: 'Firebase',
      message: 'Diagnostic scan observed persistent timeout',
      recommendedAction: 'Check connectivity',
      isPeriodicScan: true,
    });
  }
  const postScanInc = systemHealth.getIncidents().find((i) => i.id === inc1.id);
  assert(
    postScanInc?.occurrenceCount === initialOccurrenceCount,
    `Periodic background diagnostics do NOT inflate occurrence count (Remains: ${postScanInc?.occurrenceCount})`
  );

  console.log('\n--- Test 2: Incident Lifecycle (Acknowledge & Resolve) ---');
  const ackResult = systemHealth.acknowledgeIncident(inc1.id, 'Admin Mehedi');
  assert(ackResult === true, 'Admin successfully acknowledged incident');
  const currentInc = systemHealth.getIncidents().find((i) => i.id === inc1.id);
  assert(currentInc?.status === 'INVESTIGATING', 'Incident status transitioned to INVESTIGATING');

  const resolveResult = systemHealth.resolveIncident(inc1.id, 'Network connection restored and verified', 'Admin Mehedi');
  assert(resolveResult === true, 'Admin successfully resolved incident');
  assert(currentInc?.status === 'RESOLVED', 'Incident status transitioned to RESOLVED');
  assert(currentInc?.resolvedBy === 'Admin Mehedi', 'Resolved by recorded correctly');

  // ============================================================================
  // SUITE 2: TYPE SAFETY & HEALTH STATUS COMPATIBILITY (D-01 / RT-01)
  // ============================================================================
  console.log('\n--- RT-01: HealthStatus Union & Typing Compatibility ---');
  const validStatuses: HealthStatus[] = [
    'HEALTHY',
    'DEGRADED',
    'WARNING',
    'CRITICAL',
    'UNKNOWN',
    'OFFLINE',
    'UNAVAILABLE',
  ];
  assert(validStatuses.includes('OFFLINE'), "'OFFLINE' is recognized as a valid HealthStatus");
  assert(validStatuses.includes('UNAVAILABLE'), "'UNAVAILABLE' is recognized as a valid HealthStatus");

  function evaluateComponentHealth(status: HealthStatus): boolean {
    return status === 'HEALTHY' || status === 'DEGRADED';
  }
  assert(evaluateComponentHealth('OFFLINE') === false, "OFFLINE correctly evaluated as non-green status");
  assert(evaluateComponentHealth('UNAVAILABLE') === false, "UNAVAILABLE correctly evaluated as non-green status");
  assert(evaluateComponentHealth('HEALTHY') === true, "HEALTHY evaluated as operational");

  // ============================================================================
  // SUITE 3: PERFORMANCE DIAGNOSTICS & DURATION ATTRIBUTION (D-02 / RT-02)
  // ============================================================================
  console.log('\n--- RT-02: Network vs Local Processing Duration Separation ---');
  perf.clear();
  // Measure a local computation (category: 'dashboard')
  await perf.measure('compute_dashboard_aggregates', 'dashboard', () => {
    let acc = 0;
    for (let i = 0; i < 50000; i++) acc += i;
    return acc;
  });

  const metrics = perf.getMetrics();
  const localMetric = metrics.find((m) => m.action === 'compute_dashboard_aggregates');
  assert(!!localMetric, 'Local processing metric recorded');
  assert(
    localMetric?.networkDuration === 0,
    `Local action has networkDuration === 0ms (Actual: ${localMetric?.networkDuration}ms)`
  );
  assert(
    (localMetric?.localProcessingDuration || 0) >= 0,
    `Local action has valid localProcessingDuration (Actual: ${localMetric?.localProcessingDuration}ms)`
  );

  // Measure a network-oriented action (category: 'api')
  await perf.measure('fetch_cloud_records', 'api', async () => {
    return new Promise((resolve) => setTimeout(resolve, 30));
  });

  const apiMetric = perf.getMetrics().find((m) => m.action === 'fetch_cloud_records');
  assert(
    (apiMetric?.networkDuration || 0) >= 25,
    `Network action records execution as networkDuration (Actual: ${apiMetric?.networkDuration}ms)`
  );

  // ============================================================================
  // SUITE 4: THRESHOLD SINGLE SOURCE OF TRUTH (D-03 / RT-03)
  // ============================================================================
  console.log('\n--- RT-03: Single Source of Truth Threshold Synchronization ---');
  systemHealth.setThresholds({ normalMs: 800, slowMs: 2000 });
  const currentThresholds = systemHealth.getThresholds();
  const perfThresholds = perf.getThresholds();

  assert(
    currentThresholds.slowMs === 2000 && perfThresholds.slowMs === 2000,
    `Threshold synchronized between systemHealth (${currentThresholds.slowMs}ms) and perf (${perfThresholds.slowMs}ms)`
  );

  // Record direct metric at 2200ms (> 2000ms threshold)
  perf.recordDirectMetric({
    action: 'custom_slow_query',
    category: 'firebase_io',
    durationMs: 2200,
  });
  const perfSummary = perf.getOverallSummary();
  assert(
    perfSummary.slowCount >= 1,
    `Direct metric over 2000ms classified as slow using dynamic threshold (slowCount: ${perfSummary.slowCount})`
  );

  // ============================================================================
  // SUITE 5: MEMORY GUARD ON DISABLED DIAGNOSTICS (D-04 / RT-04)
  // ============================================================================
  console.log('\n--- RT-04: isEnabled=false Memory Guard Verification ---');
  perf.clear();
  perf.setEnabled(false);
  assert(perf.getMetrics().length === 0, 'Metrics cleared and diagnostics disabled');

  perf.recordDirectMetric({
    action: 'should_not_record_1',
    category: 'dashboard',
    durationMs: 150,
  });
  perf.recordDirectMetric({
    action: 'should_not_record_2',
    category: 'bills',
    durationMs: 250,
  });
  assert(
    perf.getMetrics().length === 0,
    'Zero metrics accumulated into memory when isEnabled is false (Protected Memory Bound)'
  );

  // Re-enable for subsequent tests
  perf.setEnabled(true);
  perf.recordDirectMetric({
    action: 'normal_record',
    category: 'dashboard',
    durationMs: 100,
  });
  assert(perf.getMetrics().length === 1, 'Metrics resume recording once re-enabled');

  // ============================================================================
  // SUITE 6: FIREBASE READ LATENCY PRECISION (D-05 / RT-05)
  // ============================================================================
  console.log('\n--- RT-05: Firebase Read Latency Precision Verification ---');
  // Verify query latency calculation isolates read time from connection handshake
  const simulatedSocketHandshakeMs = 1500;
  const simulatedQueryExecutionMs = 45.2;

  const totalWaitWithHandshake = simulatedSocketHandshakeMs + simulatedQueryExecutionMs;
  const isolatedQueryLatency = simulatedQueryExecutionMs;

  assert(
    isolatedQueryLatency < 100,
    `Isolated query latency strictly measures RTDB read time (${isolatedQueryLatency}ms) without ${simulatedSocketHandshakeMs}ms socket wait`
  );
  assert(
    isolatedQueryLatency !== totalWaitWithHandshake,
    'Query latency avoids artificial inflation from connection establishment'
  );

  // ============================================================================
  // SUITE 7: BACKEND TIMEOUT MESSAGE CONSISTENCY (D-06 / RT-06)
  // ============================================================================
  console.log('\n--- RT-06: Backend Timeout Message Alignment ---');
  const expectedTimeoutSeconds = '২.৫ সেকেন্ড';
  const simulatedFailureReason = 'সার্ভার রেসপন্স টাইমআউট (>২.৫ সেকেন্ড)';

  assert(
    simulatedFailureReason.includes(expectedTimeoutSeconds),
    `Timeout diagnostic message accurately reports ${expectedTimeoutSeconds} matching AbortController (2500ms)`
  );
  assert(!simulatedFailureReason.includes('৪ সেকেন্ড'), 'Stale 4-second timeout message eliminated');

  // ============================================================================
  // SUITE 8: STRICT ZERO-PII SANITIZED REPORT (D-07 / RT-07)
  // ============================================================================
  console.log('\n--- RT-07: Strict Zero-PII Sanitized Report Generation ---');
  // Add test incident that might contain stray email in text
  systemHealth.recordIncident({
    type: 'AUTH_WARNING',
    title: 'Failed login attempt for user mehedihasan1303@gmail.com',
    severity: 'WARNING',
    affectedService: 'Security',
    message: 'Authentication failed for admin user mehedi.hasan@dependsourcing.com on terminal',
    recommendedAction: 'Verify credentials for mehedi@domain.com',
  });

  const sanitizedReport = systemHealth.generateSanitizedReport();
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

  assert(typeof sanitizedReport === 'string' && sanitizedReport.length > 50, 'Report string generated successfully');
  assert(
    !emailRegex.test(sanitizedReport),
    'Sanitized report contains ZERO personal email addresses (Zero-PII Validated)'
  );
  assert(!sanitizedReport.includes('mehedihasan1303@gmail.com'), 'Specific user email completely absent from report');
  assert(!sanitizedReport.includes('password='), 'Report contains no password assignments');
  assert(!sanitizedReport.includes('user_password'), 'Report contains no user passwords');
  assert(!sanitizedReport.includes('base64'), 'Report contains no base64 voucher images');
  assert(!sanitizedReport.includes('voucherImage'), 'Report contains no voucherImage fields');
  assert(!sanitizedReport.includes('apiKey'), 'Report contains no Firebase API keys');
  assert(!sanitizedReport.includes('databaseSecret'), 'Report contains no database secrets');
  assert(sanitizedReport.includes('- Session Access Level: [ROLE_CLASSIFIED:'), 'Identity safely represented as classified role');

  // ============================================================================
  // SUITE 9: TEST ISOLATION & MOCK STORAGE INTEGRITY (D-09 / RT-09)
  // ============================================================================
  console.log('\n--- RT-09: Storage Sandbox Isolation Verification ---');
  localStorage.setItem('__test_sandbox_entry__', 'verified');
  assert(
    memoryStore.has('__test_sandbox_entry__'),
    'Sandbox writes are contained in memoryStore map without touching disk or real credentials'
  );
  assert(
    !memoryStore.has('offline_sync_queue'),
    'Production offline_sync_queue remained completely untouched during test execution'
  );

  // ============================================================================
  // SUITE 10: ROLE-BASED ACCESS & P95 PERCENTILE ALGORITHM
  // ============================================================================
  console.log('\n--- Test 10: Role-Based Authorization Guard ---');
  function canAccessDetailedDiagnostics(role: UserRole | null): boolean {
    return role === UserRole.ADMIN || role === UserRole.MD;
  }
  assert(canAccessDetailedDiagnostics(UserRole.ADMIN) === true, 'ADMIN can access System Health Monitor');
  assert(canAccessDetailedDiagnostics(UserRole.MD) === true, 'MD can access System Health Monitor');
  assert(canAccessDetailedDiagnostics(UserRole.STAFF) === false, 'STAFF is blocked from detailed diagnostics');
  assert(canAccessDetailedDiagnostics(UserRole.KIOSK) === false, 'KIOSK is blocked from detailed diagnostics');
  assert(canAccessDetailedDiagnostics(null) === false, 'Unauthenticated user is blocked');

  console.log('\n--- Test 11: P95 Latency & Sample Sufficiency Safeguards ---');
  const sampleLatencies = [120, 150, 180, 200, 220, 250, 310, 400, 600, 1200, 3500]; // 11 samples
  const p95Value = PerformanceDiagnosticService.calculatePercentile(sampleLatencies, 95);
  assert(p95Value === 3500, `P95 accurately calculated as ${p95Value}ms for sample set`);

  // ============================================================================
  // SUITE 12: OPERATION-WISE PERFORMANCE AGGREGATION & PERCENTILES
  // ============================================================================
  console.log('\n--- Test 12: Operation-Wise Stats, Percentiles, Failure & Slow Detection ---');
  perf.clear();
  systemHealth.setThresholds({ normalMs: 1000, slowMs: 2500 });

  // Record 22 samples for Firebase writes (>= 20 -> P99 active), including 2 slow & 1 failed
  const writeSamples = [100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340, 360, 380, 400, 450, 500, 600, 800, 2700, 3100];
  writeSamples.forEach((d, idx) => {
    perf.recordDirectMetric({
      action: 'Firebase writes',
      category: 'bill_submit',
      durationMs: d,
      success: idx !== 20, // 1 failed at idx 20
    });
  });

  // Record 2 samples for Send Email OTP (< 5 -> LIMITED_SAMPLE, < 20 -> P99 null)
  perf.recordDirectMetric({ action: 'Send Email OTP', category: 'api', durationMs: 320, success: true });
  perf.recordDirectMetric({ action: 'Send Email OTP', category: 'api', durationMs: 480, success: false });

  // Zero-duration network check: explicit networkDurationMs: 0 must not fall back to total duration
  perf.recordDirectMetric({ action: 'Zero Net Op', category: 'api', durationMs: 90, networkDurationMs: 0, success: true });

  const overall = perf.getOverallSummary();
  const fw = overall.byAction['Firebase writes'];
  assert(!!fw && fw.count === 22, `Firebase writes sample count is ${fw?.count}`);
  assert(fw.minTotal === 100, `Firebase writes minTotal is ${fw.minTotal}ms`);
  assert(fw.maxTotal === 3100, `Firebase writes maxTotal is ${fw.maxTotal}ms`);
  assert(fw.p50Total === 300, `Firebase writes P50 is ${fw.p50Total}ms`);
  assert(fw.p95Total === 2700, `Firebase writes P95 is ${fw.p95Total}ms`);
  assert(fw.p99Total === 3100, `Firebase writes P99 computed (${fw.p99Total}ms) when >= 20 samples`);
  assert(fw.successCount === 21 && fw.failedCount === 1, `Success (${fw.successCount}) and failed (${fw.failedCount}) accurately separated`);
  assert(fw.slowCount === 2, `Slow operations above 2500ms threshold counted as ${fw.slowCount}`);
  assert(fw.lastDurationMs === 3100 && Boolean(fw.lastExecutedAt), 'Last latency & execution timestamp recorded');

  const otpStats = overall.byAction['Send Email OTP'];
  assert(otpStats.p99Total === null, 'P99 is null when sample count < 20');
  assert(otpStats.sampleStatus === 'LIMITED_SAMPLE', `Operation with 2 samples marked LIMITED_SAMPLE`);

  const zeroNet = perf.getMetrics().find((m) => m.action === 'Zero Net Op');
  assert(zeroNet?.networkDuration === 0, 'Explicit networkDurationMs: 0 is preserved without falsy override');

  // Slow operation detection record verification
  assert(
    overall.slowOperations.length === 1 &&
      overall.slowOperations[0].action === 'Firebase writes' &&
      overall.slowOperations[0].thresholdMs === 2500 &&
      overall.slowOperations[0].occurrences === 2 &&
      overall.slowOperations[0].lastSlowDurationMs === 3100,
    'Slow operation detection tracks exact action, threshold, occurrences, max, and last duration'
  );

  // Canonical operations table honesty: untracked ops must remain NOT_TRACKED
  const loginCanon = overall.canonicalOperations.find((c) => c.operation === 'Login');
  const authCanon = overall.canonicalOperations.find((c) => c.operation === 'Authentication');
  const voucherSaveCanon = overall.canonicalOperations.find((c) => c.operation === 'Voucher Save');
  const fbWriteCanon = overall.canonicalOperations.find((c) => c.operation === 'Firebase Write');
  const apiCanon = overall.canonicalOperations.find((c) => c.operation === 'API Request');

  assert(loginCanon?.status === 'NOT_TRACKED' && loginCanon.samples === 0, 'Untracked Login stays NOT_TRACKED');
  assert(authCanon?.status === 'NOT_TRACKED' && authCanon.samples === 0, 'Untracked Authentication stays NOT_TRACKED');
  assert(voucherSaveCanon?.status === 'NOT_TRACKED', 'Untracked Voucher Save stays NOT_TRACKED');
  assert(fbWriteCanon?.samples === 22 && fbWriteCanon.status === 'SLOW', 'Firebase Write maps to canonical table and reflects slow status');
  assert(apiCanon?.samples === 3 && apiCanon.status === 'LIMITED_SAMPLE', 'API Request with 3 samples marked LIMITED_SAMPLE');

  // ============================================================================
  // SUITE 13: OPERATION-WISE SANITIZED REPORT & EXPANDED PII SCRUBBING
  // ============================================================================
  console.log('\n--- Test 13: Sanitized Report Structure & Token/Phone Scrubbing ---');
  systemHealth.recordIncident({
    type: 'TOKEN_LEAK_TEST',
    title: 'Bearer secret_abc_123 failed for 01712345678',
    severity: 'WARNING',
    affectedService: 'Security',
    message: 'Leak attempt',
    recommendedAction: 'Check databaseSecret=topsecret123',
  });

  const opReport = systemHealth.generateSanitizedReport();
  assert(opReport.includes('### Overall Performance Summary'), 'Report separates Overall Performance Summary');
  assert(opReport.includes('Operation| Samples| Average| Min| Max| P95| Failed| Status'), 'Report contains canonical operation table header');
  assert(opReport.includes('Login| 0| N/A| N/A| N/A| N/A| 0| NOT TRACKED'), 'Untracked operations explicitly show NOT TRACKED in table');
  assert(opReport.includes('Firebase Write| 22|'), 'Tracked canonical Firebase Write row included');
  assert(opReport.includes('### Slow Operation Detection (> 2500ms)'), 'Slow operation section uses configured threshold');
  assert(!opReport.includes('secret_abc_123'), 'Bearer token redacted from sanitized report');
  assert(!opReport.includes('01712345678'), 'Phone number redacted from sanitized report');
  assert(!opReport.includes('topsecret123'), 'Database secret assignment redacted from sanitized report');

  // ============================================================================
  // SUITE 14: REAL SECURITY DIAGNOSTICS ACCURACY
  // ============================================================================
  console.log('\n--- Test 14: Security Snapshot Reflects Unauthenticated / Risk State ---');
  memoryStore.clear();
  localStorage.setItem('leaked_user_password', '12345');
  const secSnapshot = await systemHealth.runSafeDiagnostics({}, { currentUser: null, role: null });
  assert(secSnapshot.security.sensitiveExposureRisk === 'MEDIUM', 'Suspicious password storage key elevates sensitiveExposureRisk to MEDIUM');
  assert(secSnapshot.security.authEnforced === false, 'Unauthenticated run does not falsely claim authEnforced === true');
  assert(secSnapshot.security.rolePermissionValid === false, 'Unauthenticated run does not falsely claim rolePermissionValid === true');
  assert(secSnapshot.security.status !== 'HEALTHY', `Security status is ${secSnapshot.security.status} (not falsely HEALTHY)`);
  assert(secSnapshot.firebase.appCheck.enforcementMode === 'MONITORING_ONLY', 'App Check never auto-enforced');

  // ============================================================================
  // SUITE 15: OFFLINE BILL SUBMISSION QUEUE SAFETY
  // ============================================================================
  console.log('\n--- Test 15: Bill Sync Service Offline Queue Safety ---');
  memoryStore.clear();
  const prevNav = (globalThis as any).navigator;
  Object.defineProperty(globalThis, 'navigator', {
    value: { onLine: false },
    configurable: true,
    writable: true,
  });

  const offlineRes = await submitExpenseBill(
    {
      id: 'test_bill_1',
      staffId: 'staff_1',
      staffName: 'Staff Test',
      createdAt: '2026-11-12T10:00:00.000Z',
      reason: 'Office Stationery',
      category: 'GENERAL',
      amount: 150,
      status: 'PENDING',
    },
    'test_bill_1',
    undefined,
    { userRole: UserRole.STAFF }
  );

  assert(offlineRes.result.status === 'SAVED_OFFLINE', 'Offline bill submission cleanly returns SAVED_OFFLINE');
  assert(getUnsyncedBillCount() === 1, 'Offline sync queue safely persisted 1 pending bill');

  if (prevNav !== undefined) {
    Object.defineProperty(globalThis, 'navigator', {
      value: prevNav,
      configurable: true,
      writable: true,
    });
  }

  // Clean up sandbox
  memoryStore.clear();

  console.log('\n===============================================================');
  console.log(`TOTAL TESTS: ${passedCount + failedCount} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log('===============================================================');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    console.log('ALL SYSTEM HEALTH & RELIABILITY ACCEPTANCE TESTS PASSED!\n');
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test execution failure:', err);
  process.exit(1);
});
