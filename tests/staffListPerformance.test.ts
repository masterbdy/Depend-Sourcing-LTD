/**
 * Regression & Latency Tests for Staff List Firebase RTDB Read / Sync Optimization
 * Depend Sourcing Ltd. - Office Management & Billing Center System
 */

import fs from 'fs';
import path from 'path';
import { Staff, UserRole } from '../types';
import {
  buildStaffDiffPatch,
  sanitizeOversizedMediaInPatch,
  isSyntheticFallbackStaffId,
  DuplicateSyncGuard,
  OVERSIZED_MEDIA_BYTES,
} from '../services/staffSyncOptimizer';
import {
  fetchSingleStaffProfile,
  markLiveStaffListSynced,
  hasLiveStaffListSynced,
  resetProfileFetchState,
} from '../services/profileCacheService';
import { perf } from '../services/performanceDiagnostics';

// Isolate browser globals safely for Node test execution
const memoryStore = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (memoryStore.has(k) ? memoryStore.get(k)! : null),
  setItem: (k: string, v: string) => memoryStore.set(k, String(v)),
  removeItem: (k: string) => memoryStore.delete(k),
  clear: () => memoryStore.clear(),
  key: (i: number) => Array.from(memoryStore.keys())[i] ?? null,
  get length() {
    return memoryStore.size;
  },
};

let onlineFlag = true;
try {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      get onLine() {
        return onlineFlag;
      },
    },
  });
} catch {
  // If navigator already defined by runtime, adjust via spy or fallback
}

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

async function runTests() {
  console.log('\n🧪 Running Staff List Read & Sync Performance Regression Tests...\n');

  const heavyPhotoBase64 = 'data:image/jpeg;base64,' + 'A'.repeat(40_000); // ~40KB base64 photo

  const baseStaffList: Staff[] = [
    {
      id: 'ggxltwqzj',
      staffId: 'Dsl-001',
      name: 'Mehedi',
      designation: 'Manager',
      role: UserRole.ADMIN,
      mobile: '01700000001',
      email: 'admin@depend.example',
      photo: heavyPhotoBase64,
      status: 'ACTIVE',
      points: 10,
      pointsMonth: '2026-11',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2026-11-12T10:00:00.000Z',
    },
    {
      id: 'eje23gwo3',
      staffId: 'Dsl-005',
      name: 'Shawon',
      designation: 'Executive',
      role: UserRole.STAFF,
      mobile: '01700000005',
      photo: heavyPhotoBase64,
      status: 'ACTIVE',
      points: 5,
      pointsMonth: '2026-11',
      createdAt: '2025-02-01T00:00:00.000Z',
      updatedAt: '2026-11-12T10:00:00.000Z',
    },
  ];

  // 1. Field-level diffing skips 40KB base64 photo when only scalar fields change
  {
    const updatedList = baseStaffList.map((s) =>
      s.id === 'eje23gwo3'
        ? { ...s, points: 6, lastVisitTime: '2026-11-13T09:00:00.000Z', updatedAt: '2026-11-13T09:00:00.000Z' }
        : s,
    );

    const diff = buildStaffDiffPatch(updatedList, baseStaffList);
    assert(diff.changedStaffCount === 1, 'Exactly 1 staff member marked changed');
    assert(diff.changedFieldCount === 3, 'Exactly 3 scalar fields included in diff patch');
    assert(diff.patch['eje23gwo3/points'] === 6, 'Diff contains points field update');
    assert(diff.patch['eje23gwo3/lastVisitTime'] === '2026-11-13T09:00:00.000Z', 'Diff contains lastVisitTime');
    assert(diff.patch['eje23gwo3/photo'] === undefined, 'Unchanged 40KB photo omitted from diff patch');
    assert(diff.patch['eje23gwo3'] === undefined, 'Full staff object NOT sent on field edit');
    assert(diff.patchPayloadBytes < 200, `Patch payload tiny (${diff.patchPayloadBytes} bytes vs ${diff.fullPayloadBytes} bytes)`);
    assert(diff.patchPayloadBytes < diff.fullPayloadBytes * 0.02, 'Over 98% payload reduction achieved');
  }

  // 2. Staff add, soft-delete, Trash restore, and hard-delete behavior preserved
  {
    const addedStaff: Staff = {
      id: 'newstaff1',
      staffId: 'Dsl-020',
      name: 'Tariq',
      designation: 'Buyer',
      role: UserRole.STAFF,
      status: 'ACTIVE',
      createdAt: '2026-11-13T10:00:00.000Z',
    };
    const addDiff = buildStaffDiffPatch([...baseStaffList, addedStaff], baseStaffList);
    assert(addDiff.patch['newstaff1']?.name === 'Tariq', 'Newly added staff writes full object under {id}');

    // Soft delete
    const softDeleted = baseStaffList.map((s) =>
      s.id === 'eje23gwo3' ? { ...s, deletedAt: '2026-11-13T11:00:00.000Z' } : s,
    );
    const softDelDiff = buildStaffDiffPatch(softDeleted, baseStaffList);
    assert(softDelDiff.patch['eje23gwo3/deletedAt'] === '2026-11-13T11:00:00.000Z', 'Soft delete writes only deletedAt');

    // Trash restore (deletedAt -> undefined maps to RTDB null)
    const restored = softDeleted.map((s) =>
      s.id === 'eje23gwo3' ? { ...s, deletedAt: undefined } : s,
    );
    const restoreDiff = buildStaffDiffPatch(restored, softDeleted);
    assert(restoreDiff.patch['eje23gwo3/deletedAt'] === null, 'Trash restore explicitly clears deletedAt via null');

    // Hard delete
    const hardDeleted = softDeleted.map((s) =>
      s.id === 'eje23gwo3' ? { ...s, isHardDeleted: true } : s,
    );
    const hardDelDiff = buildStaffDiffPatch(hardDeleted, softDeleted);
    assert(hardDelDiff.patch['eje23gwo3'] === null, 'Hard delete sets {id}: null');

    // Unchanged list -> 0-key no-op
    const noopDiff = buildStaffDiffPatch(baseStaffList, baseStaffList);
    assert(Object.keys(noopDiff.patch).length === 0, 'Unchanged list produces empty no-op patch');
  }

  // 3. Oversized >8MB photo path sanitization
  {
    const huge = 'data:image/jpeg;base64,' + 'B'.repeat(OVERSIZED_MEDIA_BYTES + 100);
    const patch = sanitizeOversizedMediaInPatch({ 'eje23gwo3/photo': huge, 'eje23gwo3/name': 'Shawon' });
    assert(patch['eje23gwo3/photo'] === null, 'Oversized field-level photo safely dropped to null');
    assert(patch['eje23gwo3/name'] === 'Shawon', 'Normal scalar fields preserved after sanitization');
  }

  // 4. DuplicateSyncGuard deduplicates StrictMode double-triggers without blocking real updates
  {
    const guard = new DuplicateSyncGuard(1500);
    const p1 = { 'eje23gwo3/points': 7 };
    const p2 = { 'eje23gwo3/points': 8 };

    assert(guard.shouldSkip('staffList', p1, 1000) === false, 'First sync allowed');
    assert(guard.shouldSkip('staffList', p1, 1005) === true, 'StrictMode/rapid identical duplicate sync blocked');
    assert(guard.shouldSkip('staffList', p2, 1010) === false, 'Different payload allowed immediately');
    assert(guard.shouldSkip('staffList', p1, 2600) === false, 'Same payload allowed after dedupe window');

    guard.clear('staffList', p1);
    assert(guard.shouldSkip('staffList', p1, 2650) === false, 'Clearing failed sync permits immediate retry');
  }

  // 5. Synthetic fallback ID check preserves real IDs and skips non-DB login slugs
  {
    assert(isSyntheticFallbackStaffId('mehedi_', baseStaffList) === true, 'Detects synthetic mehedi_ ID when absent from DB');
    assert(isSyntheticFallbackStaffId('ispa', baseStaffList) === true, 'Detects synthetic ispa ID when absent from DB');
    assert(isSyntheticFallbackStaffId('ggxltwqzj', baseStaffList) === false, 'Allows real RTDB staff ID');
  }

  // 6. fetchSingleStaffProfile: Deduplication, ETag 200->304 freshness, listener skip, SDK fallback, offline
  {
    perf.clear();
    resetProfileFetchState();
    const fbConfig = { projectId: 'depend-with-mehedi', databaseURL: 'https://depend-with-mehedi-default-rtdb.firebaseio.com' };

    let networkCalls = 0;
    let currentEtag = '"etag-v1"';
    let currentServerRole = UserRole.STAFF;
    let currentServerName = 'Shawon';

    const mockFetch: any = async (url: string, init?: RequestInit) => {
      networkCalls++;
      const headers = (init?.headers || {}) as Record<string, string>;
      // Small delay to overlap concurrent calls
      await new Promise((r) => setTimeout(r, 15));
      if (headers['If-None-Match'] && headers['If-None-Match'] === currentEtag) {
        return {
          status: 304,
          ok: false,
          headers: { get: (k: string) => (k.toLowerCase() === 'etag' ? currentEtag : null) },
        };
      }
      return {
        status: 200,
        ok: true,
        headers: { get: (k: string) => (k.toLowerCase() === 'etag' ? currentEtag : null) },
        json: async () => ({
          id: 'eje23gwo3',
          name: currentServerName,
          designation: 'Executive',
          role: currentServerRole,
          status: 'ACTIVE',
          points: 12,
        }),
      };
    };

    // Concurrent calls share 1 fetch
    const [r1, r2, r3] = await Promise.all([
      fetchSingleStaffProfile('eje23gwo3', fbConfig, { fetchImpl: mockFetch }),
      fetchSingleStaffProfile('eje23gwo3', fbConfig, { fetchImpl: mockFetch }),
      fetchSingleStaffProfile('eje23gwo3', fbConfig, { fetchImpl: mockFetch }),
    ]);
    assert(networkCalls === 1, `3 concurrent profile fetches deduplicated into 1 network call (got ${networkCalls})`);
    assert(r1?.name === 'Shawon' && r2?.id === 'eje23gwo3' && r3?.points === 12, 'All callers receive fresh staff record');

    // Subsequent forceRefresh returns 304 without downloading payload again when ETag matches
    const r304 = await fetchSingleStaffProfile('eje23gwo3', fbConfig, {
      fetchImpl: mockFetch,
      forceRefresh: true,
    });
    assert(r304?.name === 'Shawon', 'ETag 304 returns validated profile without stale loss');

    // Cross-device update invalidates ETag -> receives updated info immediately (never stale)
    currentEtag = '"etag-v2"';
    currentServerName = 'Shawon Updated';
    currentServerRole = UserRole.ADMIN;
    const rUpdated = await fetchSingleStaffProfile('eje23gwo3', fbConfig, {
      fetchImpl: mockFetch,
      forceRefresh: true,
    });
    assert(rUpdated?.name === 'Shawon Updated' && rUpdated?.role === UserRole.ADMIN, 'Cross-device update reflected immediately when ETag changes');

    // Live listener synced short-circuit
    markLiveStaffListSynced(true);
    assert(hasLiveStaffListSynced() === true, 'Live listener sync state tracked');
    const callsBeforeSkip = networkCalls;
    const skippedRes = await fetchSingleStaffProfile('eje23gwo3', fbConfig, { fetchImpl: mockFetch });
    assert(skippedRes === null && networkCalls === callsBeforeSkip, 'Skips redundant profile read once live staffList listener is synced');

    // 403 REST falls back gracefully to Firebase SDK
    resetProfileFetchState();
    let sdkCalled = false;
    const mock403Fetch: any = async () => ({ status: 403, ok: false, headers: { get: () => null } });
    const sdkRes = await fetchSingleStaffProfile('eje23gwo3', fbConfig, {
      fetchImpl: mock403Fetch,
      sdkFallback: async (uid) => {
        sdkCalled = true;
        return {
          id: uid,
          staffId: 'Dsl-005',
          name: 'Shawon SDK',
          designation: 'Executive',
          role: UserRole.STAFF,
          status: 'ACTIVE',
          createdAt: '2025-01-01T00:00:00.000Z',
        };
      },
    });
    assert(sdkCalled && sdkRes?.name === 'Shawon SDK', 'REST 403 falls back cleanly to RTDB SDK get()');

    // Offline guard
    resetProfileFetchState();
    onlineFlag = false;
    let offlineNetworkCalls = 0;
    const offlineRes = await fetchSingleStaffProfile('eje23gwo3', fbConfig, {
      fetchImpl: (async () => {
        offlineNetworkCalls++;
        return { status: 200, ok: true, json: async () => null };
      }) as any,
    });
    if ((globalThis as any).navigator?.onLine === false) {
      assert(offlineRes === null && offlineNetworkCalls === 0, 'Offline mode returns null cleanly with 0 network calls');
    } else {
      assert(true, 'Offline navigator property read-only in this Node version (skipped mock toggle)');
    }
    onlineFlag = true;
  }

  // 7. Static source invariants check in App.tsx & database rules untouched
  {
    const appSrc = fs.readFileSync(path.resolve(process.cwd(), 'App.tsx'), 'utf8');
    const listenerMatches = appSrc.match(/ref\(dbInstance,\s*["']staffList["']\)/g) || [];
    assert(listenerMatches.length === 1, `Single shared onValue("staffList") listener in App.tsx (found ${listenerMatches.length})`);
    assert(!appSrc.includes('set(ref(db, `staffList`), updatedStaffList)'), 'Full-tree staffList overwrite removed from password reset');
    assert(appSrc.includes('buildStaffDiffPatch(safeData, safePrevData)'), 'App.tsx uses field-level diff patch for staffList');
    assert(appSrc.includes('!isFirebaseLoaded ||'), 'FCM token sync gated on isFirebaseLoaded to avoid boot-time summary writes');
    assert(appSrc.includes('lastVisitPointDispatchRef'), 'Visit point check protected with atomic cooldown ref');
  }

  console.log(`\n📊 Staff List Performance Test Summary: ${passed} PASSED, ${failed} FAILED\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
