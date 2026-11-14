/**
 * Regression & Root-Cause Tests for System Health Diagnostic 49-Second Latency Fix
 * Depend Sourcing Ltd. - Office Management & Billing Center System
 *
 * Verifies:
 * 1. Concurrent runSafeDiagnostics() calls deduplicate cleanly on a single in-flight promise.
 * 2. Independent probes (storage, backend API, auth, firebase) run in parallel rather than sequentially.
 * 3. Missing timeouts (OPTIONS /api/send-email fallback & IndexedDB probe) abort cleanly instead of stalling.
 * 4. Timed-out / failed probes are recorded with start/end/duration/timeout metadata and never silently reported as 0 failures.
 * 5. Sanitized report includes per-probe timing breakdown with zero PII leaks.
 * 6. App.tsx separates 'System Health View' render telemetry from diagnostic probes and guards rAF against hidden/backgrounded tabs.
 */

import fs from 'fs';
import path from 'path';
import localforage from 'localforage';
import { systemHealth } from '../services/systemHealthService';
import { perf } from '../services/performanceDiagnostics';

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`  ✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    failed++;
  }
}

// Isolated in-memory localStorage sandbox
const memoryStore = new Map<string, string>();
const mockLocalStorage: Storage = {
  getItem: (k: string) => (memoryStore.has(k) ? memoryStore.get(k)! : null),
  setItem: (k: string, v: string) => {
    memoryStore.set(k, String(v));
  },
  removeItem: (k: string) => {
    memoryStore.delete(k);
  },
  clear: () => {
    memoryStore.clear();
  },
  key: (idx: number) => Array.from(memoryStore.keys())[idx] || null,
  get length() {
    return memoryStore.size;
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  configurable: true,
  writable: true,
});

if (typeof globalThis.navigator === 'undefined') {
  Object.defineProperty(globalThis, 'navigator', {
    value: { onLine: true },
    configurable: true,
    writable: true,
  });
}

async function runTests() {
  console.log('===================================================================');
  console.log('   SYSTEM HEALTH DIAGNOSTIC 49s LATENCY & PROBE REGRESSION TESTS   ');
  console.log('===================================================================');

  const origFetch = globalThis.fetch;
  const origSetItem = localforage.setItem.bind(localforage);
  const origRemoveItem = localforage.removeItem.bind(localforage);

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Deduplication + Parallel Execution of Independent Probes
    // -------------------------------------------------------------------------
    console.log('\n--- Test 1: In-Flight Deduplication & Parallel Probe Execution ---');
    perf.clear();
    let healthFetchCount = 0;

    (localforage as any).setItem = async () => {
      await new Promise((r) => setTimeout(r, 120));
      return { ping: true };
    };
    (localforage as any).removeItem = async () => {
      return undefined;
    };

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/health')) {
        healthFetchCount++;
      }
      await new Promise((r) => setTimeout(r, 120));
      return new Response(JSON.stringify({ status: 'ok', runtime: 'Node.js', uptime: 100 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    const parStart = performance.now();
    const [snap1, snap2] = await Promise.all([
      systemHealth.runSafeDiagnostics({}, { currentUser: 'Admin Mehedi', role: 'ADMIN' }),
      systemHealth.runSafeDiagnostics({}, { currentUser: 'Admin Mehedi', role: 'ADMIN' }),
    ]);
    const parElapsed = performance.now() - parStart;

    assert(healthFetchCount === 1, `Concurrent diagnostic calls executed /api/health exactly once (Actual: ${healthFetchCount})`);
    assert(
      snap1.diagnostics?.runId !== undefined && snap1.diagnostics?.runId === snap2.diagnostics?.runId,
      `Concurrent callers received identical deduplicated snapshot (runId: ${snap1.diagnostics?.runId})`
    );
    assert(snap1.diagnostics?.deduplicatedInFlight === true, 'Snapshot flagged deduplicatedInFlight === true');
    assert(snap1.diagnostics?.parallelized === true, 'Snapshot flagged parallelized === true');
    const storageProbe = snap1.diagnostics?.probes.find((p) => p.probe === 'storage');
    const backendProbe = snap1.diagnostics?.probes.find((p) => p.probe === 'backendApi');
    const sequentialSumMs = (storageProbe?.durationMs || 0) + (backendProbe?.durationMs || 0);
    const totalRunMs = snap1.diagnostics?.totalDurationMs ?? parElapsed;
    assert(
      Boolean(storageProbe && backendProbe) && totalRunMs < sequentialSumMs - 20,
      `Probes overlapped in parallel (${totalRunMs.toFixed(1)}ms total vs ${sequentialSumMs.toFixed(1)}ms sequential sum)`
    );
    assert(Boolean(storageProbe && storageProbe.durationMs >= 100), `Storage probe trace captured (${storageProbe?.durationMs}ms)`);
    assert(Boolean(backendProbe && backendProbe.durationMs >= 100), `Backend API probe trace captured (${backendProbe?.durationMs}ms)`);

    // -------------------------------------------------------------------------
    // TEST 2: Missing Timeout Fixed on OPTIONS /api/send-email & Honesty Check
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: OPTIONS /api/send-email Timeout Guard & Failure Reporting ---');
    perf.clear();
    (localforage as any).setItem = async () => ({ ping: true });

    globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(_input);
      if (url.includes('/api/send-email') && init?.method === 'OPTIONS') {
        // Simulate hung socket that respects AbortSignal
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const abortErr: any = new Error('The operation was aborted');
            abortErr.name = 'AbortError';
            reject(abortErr);
          });
        });
      }
      // Return 404 on health routes to trigger OPTIONS fallback
      return Promise.resolve(new Response('Not Found', { status: 404 }));
    }) as typeof fetch;

    const optTimeoutStart = performance.now();
    const optSnap = await systemHealth.runSafeDiagnostics({}, { currentUser: 'Admin Mehedi', role: 'ADMIN' });
    const optElapsed = performance.now() - optTimeoutStart;

    const optBackendProbe = optSnap.diagnostics?.probes.find((p) => p.probe === 'backendApi');
    const optSummary = perf.getOverallSummary();
    const diagMetric = optSummary.byAction['System Health Diagnostic Run'];

    assert(optElapsed < 2500, `Stalled OPTIONS /api/send-email aborted bounded in ${optElapsed.toFixed(1)}ms (did NOT hang 49s)`);
    assert(optBackendProbe?.timedOut === true, 'Backend probe explicitly marked timedOut === true on stalled OPTIONS fallback');
    assert((optSnap.diagnostics?.timedOutProbesCount || 0) >= 1, 'timedOutProbesCount incremented when OPTIONS probe timed out');
    assert(optSnap.server.failureCategory === 'TIMEOUT', `server.failureCategory recorded TIMEOUT (Actual: ${optSnap.server.failureCategory})`);
    assert(diagMetric?.failedCount >= 1, `System Health Diagnostic Run recorded failedCount >= 1 (not silently 0)`);

    // -------------------------------------------------------------------------
    // TEST 3: IndexedDB Hang Timeout Guard
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: IndexedDB Timeout Guard Prevents Unbounded Hang ---');
    perf.clear();
    (localforage as any).setItem = () => new Promise(() => {}); // Never resolves (hung IDB)
    globalThis.fetch = (() =>
      Promise.resolve(
        new Response(JSON.stringify({ status: 'ok', runtime: 'Express' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )) as typeof fetch;

    const idbStart = performance.now();
    const idbSnap = await systemHealth.runSafeDiagnostics({}, { currentUser: 'Admin Mehedi', role: 'ADMIN' });
    const idbElapsed = performance.now() - idbStart;
    const idbProbe = idbSnap.diagnostics?.probes.find((p) => p.probe === 'storage');

    assert(idbElapsed < 2300, `Hung IndexedDB probe aborted in ${idbElapsed.toFixed(1)}ms instead of stalling`);
    assert(idbProbe?.timedOut === true, 'Storage probe explicitly recorded timedOut === true');
    assert(idbSnap.storage.status === 'CRITICAL', 'Timed-out storage probe reports CRITICAL status instead of HEALTHY');
    assert((idbSnap.diagnostics?.failedProbesCount || 0) >= 1, 'failedProbesCount reflects timed-out storage probe');

    // -------------------------------------------------------------------------
    // TEST 4: Sanitized Report Probe Trace + Zero-PII Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: Sanitized Report Probe Breakdown & Zero-PII ---');
    const report = systemHealth.generateSanitizedReport();
    assert(report.includes('### Last Diagnostic Run & Probe Breakdown'), 'Sanitized report contains per-probe timing section');
    assert(report.includes('Total Diagnostic Duration:'), 'Report shows total diagnostic duration');
    assert(report.includes('TimedOut=YES'), 'Report explicitly discloses timed-out probe status');
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    assert(!emailRegex.test(report), 'Report remains strictly Zero-PII');

    // -------------------------------------------------------------------------
    // TEST 5: App.tsx Attribution & Visibility Guard Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Test 5: App.tsx Frame Instrumentation & Label Separation ---');
    const appSource = fs.readFileSync(path.resolve(process.cwd(), 'App.tsx'), 'utf8');
    assert(
      appSource.includes("'system-health': { name: 'System Health View', category: 'dashboard' }"),
      "App.tsx labels UI navigation timing cleanly as 'System Health View'"
    );
    assert(
      appSource.includes("document.visibilityState !== 'visible'") && appSource.includes('handleVisibilityAbort'),
      'App.tsx aborts/skips rAF UI timing when page becomes backgrounded/hidden'
    );

    // -------------------------------------------------------------------------
    // TEST 6: Live Firebase .info/connected + .info/serverTimeOffset Read Probe
    // -------------------------------------------------------------------------
    console.log('\n--- Test 6: Live Firebase RTDB .info/serverTimeOffset Read Probe ---');
    // Restore healthy storage mock after Test 3 hung-IDB test
    (localforage as any).setItem = async () => ({ ping: true });
    (localforage as any).removeItem = async () => undefined;
    const { initializeApp, getApps, deleteApp } = await import('firebase/app');
    const { getDatabase } = await import('firebase/database');
    const liveFbConfig = {
      apiKey: 'AIzaSyDummyKeyForRtdbTestOnly12345',
      projectId: 'depend-with-mehedi',
      databaseURL: 'https://depend-with-mehedi-default-rtdb.firebaseio.com',
    };
    const fbApp = getApps().length > 0 ? getApps()[0] : initializeApp(liveFbConfig);
    try {
      perf.clear();
      const liveSnap = await systemHealth.runSafeDiagnostics(liveFbConfig, {
        currentUser: 'Admin Mehedi',
        role: 'ADMIN',
      });
      const fbConnProbe = liveSnap.diagnostics?.probes.find((p) => p.probe === 'firebaseConnect');
      const fbReadProbe = liveSnap.diagnostics?.probes.find((p) => p.probe === 'firebaseRead');
      const liveDiagStat = perf.getOverallSummary().byAction['System Health Diagnostic Run'];

      console.log(
        `  ℹ Live RTDB: connect=${fbConnProbe?.status} (${fbConnProbe?.durationMs}ms), read=${fbReadProbe?.status} (${fbReadProbe?.durationMs}ms, err=${fbReadProbe?.error || 'none'})`
      );

      assert(fbConnProbe?.status === 'HEALTHY', 'Live Firebase .info/connected probe is HEALTHY');
      assert(fbReadProbe?.status === 'HEALTHY', 'Live Firebase Read (.info/serverTimeOffset) is HEALTHY (no Invalid token in path)');
      assert(!fbReadProbe?.error, `Live Firebase Read probe has zero errors (Actual: ${fbReadProbe?.error})`);
      assert(liveSnap.firebase.status === 'HEALTHY', 'Firebase status is HEALTHY when both connect and read succeed');
      assert((liveSnap.diagnostics?.failedProbesCount || 0) === 0, 'failedProbesCount is 0 on clean live run');
      assert(
        liveDiagStat?.successCount === 1 && liveDiagStat?.failedCount === 0,
        `System Health Diagnostic Run accurately counted 1 success / 0 failed (Actual: ${liveDiagStat?.successCount}/${liveDiagStat?.failedCount})`
      );

      // -----------------------------------------------------------------------
      // TEST 7: Invalid Reference Does Not Hide Error Behind .info/connected
      // -----------------------------------------------------------------------
      console.log('\n--- Test 7: Invalid Firebase Read Reference Surfaces Real Error & DEGRADED ---');
      perf.clear();
      const badRefSnap = await systemHealth.runSafeDiagnostics(
        { ...liveFbConfig, __probeReadPath: 'expenses/invalid.token' },
        { currentUser: 'Admin Mehedi', role: 'ADMIN' }
      );
      const badConnProbe = badRefSnap.diagnostics?.probes.find((p) => p.probe === 'firebaseConnect');
      const badReadProbe = badRefSnap.diagnostics?.probes.find((p) => p.probe === 'firebaseRead');
      const badDiagStat = perf.getOverallSummary().byAction['System Health Diagnostic Run'];
      const badReport = systemHealth.generateSanitizedReport();

      assert(badConnProbe?.status === 'HEALTHY', '.info/connected still reports HEALTHY independently');
      assert(badReadProbe?.status === 'DEGRADED', 'Invalid Read reference probe reports DEGRADED (not masked by .info/connected)');
      assert(Boolean(badReadProbe?.error), `Real Firebase path error preserved (${badReadProbe?.error})`);
      assert(badRefSnap.firebase.status === 'DEGRADED', 'Firebase overall status downgraded to DEGRADED when Read fails');
      assert((badRefSnap.diagnostics?.failedProbesCount || 0) >= 1, 'failedProbesCount >= 1 when Read probe fails');
      assert(
        Boolean(badRefSnap.diagnostics?.failureSummary?.includes('firebaseRead')),
        'diagnostics.failureSummary identifies firebaseRead as failing probe'
      );
      assert(
        badDiagStat?.failedCount === 1 && badDiagStat?.successCount === 0,
        'Diagnostic Run marks run FAILED when Read probe errors'
      );
      assert(
        badReport.includes('Firebase Diagnosis:') && badReport.includes('Failed Probe Cause:'),
        'Sanitized report clearly explains both Firebase Diagnosis and exact Failed Probe Cause'
      );

      // -----------------------------------------------------------------------
      // TEST 8: Firebase Read Timeout Honesty
      // -----------------------------------------------------------------------
      console.log('\n--- Test 8: Firebase Read Timeout Guard Records Exact Timeout ---');
      const db = getDatabase(fbApp, liveFbConfig.databaseURL);
      const timeoutRes = await systemHealth.probeFirebaseInfoRead(db, '.info/nonExistentSilentInfoNode', 150);
      assert(timeoutRes.ok === false, 'Silent non-populating .info node does not falsely succeed');
      assert(timeoutRes.timedOut === true, 'Timeout flag is strictly true when Read probe exceeds timeout');
      assert(
        Boolean(timeoutRes.error && timeoutRes.error.includes('OFFSET_TIMEOUT')),
        `Timeout error preserved accurately (${timeoutRes.error})`
      );

      // -----------------------------------------------------------------------
      // TEST 9: Clean System Has Zero STORAGE_FAILURE Incidents
      // -----------------------------------------------------------------------
      console.log('\n--- Test 9: Healthy IndexedDB Produces Zero STORAGE_FAILURE Incidents ---');
      systemHealth.resetDiagnostics('Test Runner');
      systemHealth.clearResolvedIncidents();
      systemHealth.markSyncConfirmed('test_clean_sync');
      perf.clear();
      (localforage as any).setItem = async () => ({ ping: true });
      (localforage as any).removeItem = async () => undefined;

      const cleanSnap = await systemHealth.runSafeDiagnostics(liveFbConfig, {
        currentUser: 'Admin Mehedi',
        role: 'ADMIN',
      });
      const cleanStorageInc = cleanSnap.incidents.list.filter((i) => i.type === 'STORAGE_FAILURE');
      assert(cleanStorageInc.length === 0, 'Healthy IndexedDB creates zero STORAGE_FAILURE incidents');
      assert(cleanSnap.storage.status === 'HEALTHY', 'Storage probe status is HEALTHY');
      assert(cleanSnap.overallStatus === 'HEALTHY', `Overall status is HEALTHY when storage & all probes succeed (Actual: ${cleanSnap.overallStatus})`);

      // -----------------------------------------------------------------------
      // TEST 10: Real Storage Failure Creates CRITICAL Incident & CRITICAL Status
      // -----------------------------------------------------------------------
      console.log('\n--- Test 10: Real IndexedDB Failure Raises CRITICAL STORAGE_FAILURE Incident ---');
      perf.clear();
      (localforage as any).setItem = async () => {
        throw new Error('QuotaExceededError: IndexedDB write blocked');
      };

      const failSnap = await systemHealth.runSafeDiagnostics(liveFbConfig, {
        currentUser: 'Admin Mehedi',
        role: 'ADMIN',
      });
      const openedStorageInc = failSnap.incidents.list.find(
        (i) => i.type === 'STORAGE_FAILURE' && i.status !== 'RESOLVED'
      );
      assert(Boolean(openedStorageInc), 'IndexedDB failure opens a STORAGE_FAILURE incident');
      assert(openedStorageInc?.severity === 'CRITICAL', 'STORAGE_FAILURE incident severity is CRITICAL');
      assert(openedStorageInc?.affectedService === 'IndexedDB', 'STORAGE_FAILURE affectedService is IndexedDB');
      assert(failSnap.storage.status === 'CRITICAL', 'Storage status reports CRITICAL on real IndexedDB failure');
      assert(failSnap.overallStatus === 'CRITICAL', `Overall status becomes CRITICAL on storage failure (Actual: ${failSnap.overallStatus})`);
      assert(failSnap.incidents.criticalCount >= 1, 'criticalCount reflects open STORAGE_FAILURE incident');

      // -----------------------------------------------------------------------
      // TEST 11: Automatic Incident Resolution When IndexedDB Recovers
      // -----------------------------------------------------------------------
      console.log('\n--- Test 11: IndexedDB Recovery Auto-Resolves STORAGE_FAILURE & Restores HEALTHY ---');
      perf.clear();
      (localforage as any).setItem = async () => {
        await new Promise((r) => setTimeout(r, 15));
        return { ping: true };
      };
      (localforage as any).removeItem = async () => undefined;

      const recoveredSnap = await systemHealth.runSafeDiagnostics(liveFbConfig, {
        currentUser: 'Admin Mehedi',
        role: 'ADMIN',
      });
      const resolvedStorageInc = recoveredSnap.incidents.list.find((i) => i.id === openedStorageInc?.id);
      const recoveredReport = systemHealth.generateSanitizedReport();

      assert(resolvedStorageInc?.status === 'RESOLVED', `Recovered STORAGE_FAILURE transitioned to RESOLVED (Actual: ${resolvedStorageInc?.status})`);
      assert(
        resolvedStorageInc?.resolvedBy === 'System Auto-Recovery',
        `Incident resolvedBy recorded cleanly (Actual: ${resolvedStorageInc?.resolvedBy})`
      );
      assert(Boolean(resolvedStorageInc?.resolvedAt), 'Incident resolvedAt timestamp populated on auto-recovery');
      assert(recoveredSnap.storage.status === 'HEALTHY', 'Storage status recovered to HEALTHY');
      assert(recoveredSnap.incidents.openCount === 0, `Open incident count dropped to 0 (Actual: ${recoveredSnap.incidents.openCount})`);
      assert(recoveredSnap.incidents.criticalCount === 0, `Critical incident count dropped to 0 (Actual: ${recoveredSnap.incidents.criticalCount})`);
      assert(recoveredSnap.overallStatus === 'HEALTHY', `Overall status recovered cleanly to HEALTHY (Actual: ${recoveredSnap.overallStatus})`);
      assert(
        recoveredReport.includes('## 5. Active Incidents (0 Open)') &&
          recoveredReport.includes('No open incidents. All services operating normally.'),
        'Sanitized report displays 0 Open incidents after auto-recovery'
      );

      // -----------------------------------------------------------------------
      // TEST 12: Stale Persisted STORAGE_FAILURE in localStorage Auto-Recovers on Reload
      // -----------------------------------------------------------------------
      console.log('\n--- Test 12: Stale Persisted STORAGE_FAILURE in localStorage Recovers Cleanly ---');
      (globalThis as any).window = globalThis;
      try {
        const staleIncident = {
          id: 'inc_stale_idb_001',
          title: 'লোকাল স্টোরেজ ব্যর্থতা (Storage Failure)',
          type: 'STORAGE_FAILURE',
          severity: 'CRITICAL',
          affectedService: 'IndexedDB',
          firstOccurrence: '2026-01-01T00:00:00.000Z',
          lastOccurrence: '2026-01-01T00:00:00.000Z',
          occurrenceCount: 1,
          status: 'OPEN',
          message: 'লোকাল IndexedDB/LocalStorage রিড-রাইট ব্যর্থ হয়েছে: INDEXEDDB_PROBE_TIMEOUT',
          recommendedAction: 'ব্রাউজার প্রাইভেট মোড অথবা স্টোরেজ পারমিশন পরীক্ষা করুন।',
          notes: [],
        };
        mockLocalStorage.setItem('ais_health_incidents_v2', JSON.stringify([staleIncident]));
        mockLocalStorage.setItem('ais_last_confirmed_sync', new Date().toISOString());
        mockLocalStorage.setItem('ais_sync_lifetime_success', '1');
        (systemHealth as any).loadPersistedState();

        const preRecoveryStale = systemHealth.getIncidents().find((i) => i.id === 'inc_stale_idb_001');
        assert(preRecoveryStale?.status === 'OPEN', 'Simulated stale persisted STORAGE_FAILURE loaded as OPEN');

        perf.clear();
        const postHydrateSnap = await systemHealth.runSafeDiagnostics(liveFbConfig, {
          currentUser: 'Admin Mehedi',
          role: 'ADMIN',
        });

        const persistedAfterRaw = mockLocalStorage.getItem('ais_health_incidents_v2');
        const persistedAfterList = persistedAfterRaw ? JSON.parse(persistedAfterRaw) : [];
        const persistedResolved = persistedAfterList.find((i: any) => i.id === 'inc_stale_idb_001');

        assert(persistedResolved?.status === 'RESOLVED', `Persisted stale incident updated to RESOLVED in localStorage (Actual: ${persistedResolved?.status})`);
        assert(persistedResolved?.resolvedBy === 'System Auto-Recovery', 'Persisted incident records resolvedBy: System Auto-Recovery');
        assert(postHydrateSnap.incidents.openCount === 0, 'Active incidents count is 0 after verifying healthy IndexedDB');
        assert(postHydrateSnap.overallStatus === 'HEALTHY', `Overall status no longer stuck CRITICAL on healthy IndexedDB (Actual: ${postHydrateSnap.overallStatus})`);
      } finally {
        delete (globalThis as any).window;
      }
    } finally {
      await deleteApp(fbApp).catch(() => {});
    }
  } finally {
    globalThis.fetch = origFetch;
    (localforage as any).setItem = origSetItem;
    (localforage as any).removeItem = origRemoveItem;
    memoryStore.clear();
  }

  console.log('\n===================================================================');
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('===================================================================');
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Fatal test failure:', err);
  process.exit(1);
});
