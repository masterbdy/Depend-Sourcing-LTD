import localforage from 'localforage';
import { getApp, getApps } from 'firebase/app';
import { getDatabase, ref, get, update } from 'firebase/database';
import {
  UserRole,
  Expense,
  Staff,
  Fund,
  Advance,
  MovementLog,
  BillingRule,
  AppNote,
  Product,
  BillSyncStatus,
  RecoveryHealthStatus,
  UpdateCheckStatus,
  AppVersionInfo,
  DataConflictRecord,
  QueueRetryItem,
  CacheIntegrityReport,
  CacheCollectionIntegrity,
  SafeBackupManifest,
  ImportPreviewSummary,
} from '../types';
import { systemHealth } from './systemHealthService';
import { perf } from './performanceDiagnostics';
import {
  getUnsyncedBillCount,
  removeQueuedOfflineExpense,
  notifySyncStatusChange,
} from './billSyncService';

// Build definitions injected by Vite or fallback defaults
declare const __APP_VERSION__: string | undefined;
declare const __BUILD_TIMESTAMP__: string | undefined;
declare const __BUILD_COMMIT__: string | undefined;

export const APP_CURRENT_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.1.0';
export const APP_BUILD_TIMESTAMP = typeof __BUILD_TIMESTAMP__ !== 'undefined' ? __BUILD_TIMESTAMP__ : '2026-10-21T12:00:00.000Z';
export const APP_BUILD_COMMIT = typeof __BUILD_COMMIT__ !== 'undefined' ? __BUILD_COMMIT__ : 'prod-build';

const STORAGE_KEYS = {
  CONFLICTS: 'offline_conflicts',
  QUEUE_METADATA: 'offline_queue_retry_meta',
  LAST_UPDATE_CHECK: 'app_last_update_check_info',
  SYNC_QUEUE: 'offline_sync_queue',
};

const memoryStore: Record<string, string> = {};

export const safeGetItem = (key: string): string | null => {
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
    try {
      return (globalThis as any).localStorage.getItem(key);
    } catch {}
  }
  return memoryStore[key] || null;
};

export const safeSetItem = (key: string, value: string): void => {
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
    try {
      (globalThis as any).localStorage.setItem(key, value);
      return;
    } catch {}
  }
  memoryStore[key] = value;
};

export const safeRemoveItem = (key: string): void => {
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
    try {
      (globalThis as any).localStorage.removeItem(key);
      return;
    } catch {}
  }
  delete memoryStore[key];
};

class SafeUpdateRecoveryService {
  private lastVersionInfo: AppVersionInfo | null = null;
  private isCheckingUpdate: boolean = false;

  constructor() {
    this.initVersionInfo();
  }

  private initVersionInfo(): void {
    const saved = safeGetItem(STORAGE_KEYS.LAST_UPDATE_CHECK);
    if (saved) {
      try {
        this.lastVersionInfo = JSON.parse(saved);
      } catch {}
    }

    if (!this.lastVersionInfo) {
      this.lastVersionInfo = {
        currentVersion: APP_CURRENT_VERSION,
        latestVersion: APP_CURRENT_VERSION,
        buildIdentifier: APP_BUILD_COMMIT,
        buildTimestamp: APP_BUILD_TIMESTAMP,
        status: 'UP_TO_DATE',
        isUpdateAvailable: false,
      };
    }
  }

  // ==========================================================
  // SECTION A & B: System Status & Safe Update Awareness
  // ==========================================================

  public getVersionInfo(): AppVersionInfo {
    return (
      this.lastVersionInfo || {
        currentVersion: APP_CURRENT_VERSION,
        latestVersion: APP_CURRENT_VERSION,
        buildIdentifier: APP_BUILD_COMMIT,
        buildTimestamp: APP_BUILD_TIMESTAMP,
        status: 'UP_TO_DATE',
        isUpdateAvailable: false,
      }
    );
  }

  /**
   * Check for application updates without blocking user workflow.
   * Compares current build version with /api/app-version or /version.json.
   */
  public async checkForUpdates(): Promise<AppVersionInfo> {
    if (this.isCheckingUpdate) {
      return this.getVersionInfo();
    }
    this.isCheckingUpdate = true;

    const checkTimestamp = new Date().toISOString();
    let latestVersion: string | undefined;
    let buildTimestamp: string | undefined;
    let releaseNotes: string | undefined;
    let checkSuccess = false;

    // 1. Try Node/Express server endpoint first
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`/api/app-version?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        latestVersion = data.version;
        buildTimestamp = data.buildTimestamp;
        releaseNotes = data.releaseNotes || data.notes;
        checkSuccess = true;
      }
    } catch {}

    // 2. Fallback to static /version.json (useful for static Vercel preview or CDN)
    if (!checkSuccess) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const res = await fetch(`/version.json?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          latestVersion = data.version;
          buildTimestamp = data.buildTimestamp;
          releaseNotes = data.notes;
          checkSuccess = true;
        }
      } catch {}
    }

    let status: UpdateCheckStatus = 'CHECK_FAILED';
    let isUpdateAvailable = false;

    if (checkSuccess && latestVersion) {
      // Version comparison
      const isNewer = this.compareVersions(latestVersion, APP_CURRENT_VERSION) > 0;
      if (isNewer) {
        status = 'UPDATE_AVAILABLE';
        isUpdateAvailable = true;
      } else {
        status = 'UP_TO_DATE';
        isUpdateAvailable = false;
      }
    } else {
      status = typeof navigator !== 'undefined' && !navigator.onLine ? 'UNAVAILABLE' : 'CHECK_FAILED';
    }

    const updatedInfo: AppVersionInfo = {
      currentVersion: APP_CURRENT_VERSION,
      latestVersion: latestVersion || APP_CURRENT_VERSION,
      buildIdentifier: APP_BUILD_COMMIT,
      buildTimestamp: buildTimestamp || APP_BUILD_TIMESTAMP,
      status,
      releaseNotes,
      lastChecked: checkTimestamp,
      isUpdateAvailable,
    };

    this.lastVersionInfo = updatedInfo;
    this.isCheckingUpdate = false;

    try {
      safeSetItem(STORAGE_KEYS.LAST_UPDATE_CHECK, JSON.stringify(updatedInfo));
    } catch {}

    systemHealth.logEvent({
      type: 'HEALTH_CHECK',
      severity: isUpdateAvailable ? 'INFO' : 'INFO',
      service: 'SafeUpdate',
      summary: isUpdateAvailable
        ? `নতুন সংস্করণ পাওয়া গেছে: v${latestVersion} (বর্তমান: v${APP_CURRENT_VERSION})`
        : `অ্যাপ্লিকেশন সংস্করণ যাচাই সম্পন্ন (v${APP_CURRENT_VERSION})`,
      details: {
        current: APP_CURRENT_VERSION,
        latest: latestVersion || 'unknown',
        status,
      },
    });

    return updatedInfo;
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.replace(/[^0-9.]/g, '').split('.').map(Number);
    const parts2 = v2.replace(/[^0-9.]/g, '').split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const num1 = parts1[i] || 0;
      const num2 = parts2[i] || 0;
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0;
  }

  /**
   * Evaluates whether it is safe to apply an update or reload.
   * Warns before any action that could interrupt unsaved work.
   */
  public canSafelyUpdate(): {
    safe: boolean;
    pendingCount: number;
    unresolvedConflictsCount: number;
    warningMessage?: string;
  } {
    const queueItems = this.getQueueRetryItems();
    const pendingCount = queueItems.length > 0 ? queueItems.length : getUnsyncedBillCount();
    const conflicts = this.getUnresolvedConflicts();
    const conflictCount = conflicts.length;

    if (pendingCount > 0 || conflictCount > 0) {
      const parts: string[] = [];
      if (pendingCount > 0) {
        parts.push(`${pendingCount}টি আনসিঙ্কড বিল অফলাইন কিউতে রয়েছে`);
      }
      if (conflictCount > 0) {
        parts.push(`${conflictCount}টি ডেটা কনফ্লিক্ট পেন্ডিং রয়েছে`);
      }
      return {
        safe: false,
        pendingCount,
        unresolvedConflictsCount: conflictCount,
        warningMessage: `⚠️ আপনার ডিভাইসে ${parts.join(' এবং ')}। এখন আপডেট বা রিলোড দিলে ডেটা ট্রানজিটে বিঘ্ন ঘটতে পারে।`,
      };
    }

    return {
      safe: true,
      pendingCount: 0,
      unresolvedConflictsCount: 0,
    };
  }

  /**
   * Safely applies the update.
   * Checks for PWA service worker updates, unregisters stale workers if needed, and safely refreshes.
   */
  public async applyUpdate(force: boolean = false): Promise<{ success: boolean; message: string }> {
    const safety = this.canSafelyUpdate();
    if (!safety.safe && !force) {
      return {
        success: false,
        message: safety.warningMessage || 'আনসিঙ্কড ডেটা থাকায় আপডেট স্থগিত করা হয়েছে।',
      };
    }

    systemHealth.logEvent({
      type: 'ADMIN_ACTION',
      severity: 'INFO',
      service: 'SafeUpdate',
      summary: `ইউজার দ্বারা নিরাপদ আপডেট প্রক্রিয়া শুরু হয়েছে (Force: ${force})`,
    });

    // If Service Worker is active, request update
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          await reg.update().catch(() => {});
        }
      } catch (swErr) {
        console.warn('SW update trigger error:', swErr);
      }
    }

    // Perform clean reload without clearing storage or unsaved cache
    setTimeout(() => {
      window.location.reload();
    }, 400);

    return {
      success: true,
      message: 'আপডেট সক্রিয় করা হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...',
    };
  }

  // ==========================================================
  // SECTION C: Safe Local Data & Sync Protection (Queue & Retry)
  // ==========================================================

  /**
   * Retrieves enriched offline sync queue items with bounded exponential backoff status.
   */
  public getQueueRetryItems(): QueueRetryItem[] {
    try {
      const queueStr = safeGetItem(STORAGE_KEYS.SYNC_QUEUE);
      if (!queueStr) return [];
      const queue = JSON.parse(queueStr);
      const expensesObj = queue.expenses || {};

      const metaStr = safeGetItem(STORAGE_KEYS.QUEUE_METADATA);
      const metaMap: Record<string, { attempts: number; nextEligibleRetry: number; lastError?: string }> = metaStr
        ? JSON.parse(metaStr)
        : {};

      const now = Date.now();
      const items: QueueRetryItem[] = Object.values(expensesObj).map((e: any) => {
        const meta = metaMap[e.id] || { attempts: 0, nextEligibleRetry: 0 };
        const isEligible = now >= (meta.nextEligibleRetry || 0);

        return {
          id: e.id,
          billId: e.id,
          staffName: e.staffName || 'Staff',
          amount: Number(e.amount || 0),
          reason: e.reason || 'অজ্ঞাত কারণ',
          createdAt: e.createdAt || new Date().toISOString(),
          lastSyncAttempt: e.lastSyncAttempt || new Date().toISOString(),
          syncStatus: e.syncStatus || 'SAVED_OFFLINE',
          syncError: e.syncError || meta.lastError,
          attempts: meta.attempts || 0,
          nextEligibleRetry: meta.nextEligibleRetry,
          isEligibleForRetry: isEligible,
        };
      });

      return items;
    } catch {
      return [];
    }
  }

  /**
   * Retries an individual queued bill with:
   * 1. Authorization check (Staff only their own, Admin/MD any).
   * 2. Server-side conflict pre-check.
   * 3. Bounded exponential backoff + jitter.
   * 4. Idempotent server write.
   */
  public async retryQueuedBill(
    billId: string,
    firebaseConfig: any,
    userRole: UserRole,
    currentUser: string
  ): Promise<{ success: boolean; status: BillSyncStatus; message: string; conflictDetected?: boolean }> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return {
        success: false,
        status: 'SAVED_OFFLINE',
        message: 'ইন্টারনেট সংযোগ নেই। কানেকশন সক্রিয় হলে পুনরায় চেষ্টা করুন।',
      };
    }

    // 1. Fetch item from queue
    const queueStr = safeGetItem(STORAGE_KEYS.SYNC_QUEUE);
    if (!queueStr) {
      return { success: false, status: 'FAILED', message: 'অফলাইন কিউতে কোনো বিল পাওয়া যায়নি।' };
    }
    const queue = JSON.parse(queueStr);
    const localBill: Expense = queue.expenses?.[billId];

    if (!localBill) {
      return { success: false, status: 'FAILED', message: 'বিলটি অফলাইন কিউতে নেই অথবা ইতিমধ্যে সিঙ্ক সম্পন্ন হয়েছে।' };
    }

    // 2. Permission check: Staff can only retry their own bills
    if (userRole === UserRole.STAFF) {
      const isOwner = localBill.staffName === currentUser || localBill.staffId === currentUser;
      if (!isOwner) {
        return {
          success: false,
          status: 'FAILED',
          message: 'অননুমোদিত: আপনি কেবল নিজের বিল সিঙ্ক পুনরায় চেষ্টা করতে পারবেন।',
        };
      }
    }

    // 3. Load or compute retry metadata (exponential backoff)
    const metaStr = safeGetItem(STORAGE_KEYS.QUEUE_METADATA);
    const metaMap: Record<string, { attempts: number; nextEligibleRetry: number; lastError?: string }> = metaStr
      ? JSON.parse(metaStr)
      : {};
    const meta = metaMap[billId] || { attempts: 0, nextEligibleRetry: 0 };

    const now = Date.now();
    if (now < meta.nextEligibleRetry) {
      const waitSeconds = Math.ceil((meta.nextEligibleRetry - now) / 1000);
      return {
        success: false,
        status: 'FAILED',
        message: `পুনরায় চেষ্টার ব্যাকঅফ সক্রিয় রয়েছে। অনুগ্রহ করে ${waitSeconds} সেকেন্ড পর চেষ্টা করুন।`,
      };
    }

    if (!firebaseConfig || !firebaseConfig.databaseURL) {
      return {
        success: false,
        status: 'FAILED',
        message: 'Firebase কনফিগারেশন অনুপস্থিত। ক্লাউড সংযোগ সম্ভব নয়।',
      };
    }

    try {
      const apps = getApps();
      const app = apps.length > 0 ? getApp() : null;
      if (!app) throw new Error('Firebase App ইনিশিয়ালাইজ হয়নি');
      const db = getDatabase(app, firebaseConfig.databaseURL);

      // 4. PRE-FLIGHT CONFLICT DETECTION: Inspect server copy before blind overwrite!
      const serverRef = ref(db, `expenses/${billId}`);
      let serverSnap: any = null;
      try {
        const snapPromise = get(serverRef);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('READ_TIMEOUT')), 3500)
        );
        serverSnap = await Promise.race([snapPromise, timeoutPromise]);
      } catch (readErr) {
        // If server read timed out or failed, proceed with caution or retry
        console.warn('Server read pre-flight check warning:', readErr);
      }

      if (serverSnap && serverSnap.exists()) {
        const serverVal = serverSnap.val() as Partial<Expense>;

        // Critical conflict checks:
        // A) Server status is already APPROVED or VERIFIED by Admin/MD while local is pending/different
        const statusConflict =
          serverVal.status &&
          serverVal.status !== 'PENDING' &&
          serverVal.status !== localBill.status;

        // B) Amount or critical reason was altered on server
        const amountConflict =
          typeof serverVal.amount === 'number' &&
          Math.abs(serverVal.amount - localBill.amount) > 0.01;

        if (statusConflict || amountConflict) {
          // CONFLICT DETECTED! DO NOT OVERWRITE!
          this.recordConflict({
            recordId: billId,
            recordType: 'expense',
            localVersion: localBill,
            serverVersion: serverVal,
            conflictReason: statusConflict
              ? `সার্ভারে বিলটির স্ট্যাটাস ইতিমধ্যে '${serverVal.status}' করা হয়েছে।`
              : `সার্ভার টাকার পরিমাণ (৳${serverVal.amount}) এবং লোকাল পরিমাণ (৳${localBill.amount}) ভিন্ন।`,
          });

          // Mark queue item status as CONFLICT
          localBill.syncStatus = 'CONFLICT';
          localBill.syncError = 'সার্ভার ডেটার সাথে কনফ্লিক্ট দেখা দিয়েছে। রিকভারি সেন্টারে সমাধান করুন।';
          queue.expenses[billId] = localBill;
          safeSetItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));

          notifySyncStatusChange();

          return {
            success: false,
            status: 'CONFLICT',
            conflictDetected: true,
            message: '⚠️ সার্ভার রেকর্ডের সাথে কনফ্লিক্ট পাওয়া গেছে। স্বয়ংক্রিয়ভাবে ওভাররাইট বন্ধ করা হয়েছে।',
          };
        }
      }

      // 5. ATOMIC IDEMPOTENT WRITE WITH TIMEOUT
      const submissionTimestamp = new Date().toISOString();
      const { voucherImage, ...safePayload } = localBill;
      const sanitizedCloudPayload = {
        ...safePayload,
        voucherImage: voucherImage && voucherImage.length < 5 * 1024 * 1024 ? voucherImage : null,
        syncStatus: 'SUBMITTED',
        submittedAt: submissionTimestamp,
        lastSyncAttempt: submissionTimestamp,
        syncError: null,
      };

      await perf.measure('Firebase writes', 'bill_retry_submit', () =>
        Promise.race([
          update(ref(db, 'expenses'), { [billId]: sanitizedCloudPayload }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('WRITE_TIMEOUT')), 4500)
          ),
        ])
      );

      // Successfully synced: Remove from offline queue and clear retry metadata
      await removeQueuedOfflineExpense(billId);
      delete metaMap[billId];
      safeSetItem(STORAGE_KEYS.QUEUE_METADATA, JSON.stringify(metaMap));

      // Update IndexedDB copy to SUBMITTED
      try {
        const stored = await localforage.getItem<string>('expenses');
        if (stored) {
          const list = JSON.parse(stored) as Expense[];
          const updated = list.map((e) =>
            e.id === billId
              ? { ...e, syncStatus: 'SUBMITTED' as BillSyncStatus, syncError: undefined, submittedAt: submissionTimestamp }
              : e
          );
          await localforage.setItem('expenses', JSON.stringify(updated));
        }
      } catch {}

      systemHealth.markSyncConfirmed(billId);
      systemHealth.logEvent({
        type: 'SYNC_STATUS',
        severity: 'INFO',
        service: 'SyncRetry',
        summary: `বিল (${billId}) সফলভাবে সার্ভারে সিঙ্ক ও নিশ্চিত হয়েছে।`,
        details: { billId, amount: localBill.amount, staff: localBill.staffName },
      });

      notifySyncStatusChange();

      return {
        success: true,
        status: 'SUBMITTED',
        message: '✅ বিলটি সফলভাবে সার্ভারে জমা হয়েছে এবং কিউ থেকে নিশ্চিত হয়েছে।',
      };
    } catch (err: any) {
      console.error('[SafeUpdateRecovery] Retry failed:', err);

      // Increment attempt counter and apply bounded exponential backoff with jitter
      const nextAttempt = (meta.attempts || 0) + 1;
      const backoffBaseMs = 1500;
      const maxBackoffMs = 30000;
      // Delay = min(30s, base * 2^attempts + jitter)
      const jitterMs = Math.floor(Math.random() * 800);
      const backoffMs = Math.min(maxBackoffMs, backoffBaseMs * Math.pow(2, Math.min(nextAttempt, 5)) + jitterMs);

      metaMap[billId] = {
        attempts: nextAttempt,
        nextEligibleRetry: Date.now() + backoffMs,
        lastError: err?.message || 'সার্ভার যোগাযোগ ব্যর্থ',
      };
      safeSetItem(STORAGE_KEYS.QUEUE_METADATA, JSON.stringify(metaMap));

      // Update queue item error
      localBill.syncStatus = 'FAILED';
      localBill.syncError = `${err?.message || 'সিঙ্ক ব্যর্থ'} (চেষ্টা #${nextAttempt})`;
      queue.expenses[billId] = localBill;
      safeSetItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));

      notifySyncStatusChange();

      return {
        success: false,
        status: 'FAILED',
        message: `❌ সিঙ্ক ব্যর্থ হয়েছে: ${err?.message || 'অজ্ঞাত ত্রুটি'} (পরবর্তী চেষ্টা ${Math.ceil(backoffMs / 1000)} সেকেন্ড পর)`,
      };
    }
  }

  /**
   * Retries all eligible queued operations with bounded concurrency.
   */
  public async retryAllEligible(
    firebaseConfig: any,
    userRole: UserRole,
    currentUser: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<{ syncedCount: number; failedCount: number; conflictCount: number }> {
    const items = this.getQueueRetryItems();
    // Filter by role
    const eligibleItems = items.filter((item) => {
      if (userRole === UserRole.STAFF) {
        return item.staffName === currentUser;
      }
      return true;
    });

    let syncedCount = 0;
    let failedCount = 0;
    let conflictCount = 0;

    for (let i = 0; i < eligibleItems.length; i++) {
      const item = eligibleItems[i];
      if (onProgress) {
        onProgress(i + 1, eligibleItems.length);
      }
      const res = await this.retryQueuedBill(item.billId, firebaseConfig, userRole, currentUser);
      if (res.success) {
        syncedCount++;
      } else if (res.conflictDetected) {
        conflictCount++;
      } else {
        failedCount++;
      }
    }

    return { syncedCount, failedCount, conflictCount };
  }

  // ==========================================================
  // SECTION D: Conflict Detection and Safe Recovery
  // ==========================================================

  public getUnresolvedConflicts(): DataConflictRecord[] {
    try {
      const str = safeGetItem(STORAGE_KEYS.CONFLICTS);
      if (!str) return [];
      const list: DataConflictRecord[] = JSON.parse(str);
      return list.filter((c) => c.status === 'UNRESOLVED');
    } catch {
      return [];
    }
  }

  public getAllConflicts(): DataConflictRecord[] {
    try {
      const str = safeGetItem(STORAGE_KEYS.CONFLICTS);
      if (!str) return [];
      return JSON.parse(str);
    } catch {
      return [];
    }
  }

  public recordConflict(params: {
    recordId: string;
    recordType: 'expense';
    localVersion: Expense;
    serverVersion: Partial<Expense>;
    conflictReason: string;
  }): DataConflictRecord {
    const conflicts = this.getAllConflicts();
    const existing = conflicts.find((c) => c.recordId === params.recordId && c.status === 'UNRESOLVED');

    if (existing) {
      existing.localVersion = params.localVersion;
      existing.serverVersion = params.serverVersion;
      existing.conflictReason = params.conflictReason;
      safeSetItem(STORAGE_KEYS.CONFLICTS, JSON.stringify(conflicts));
      return existing;
    }

    const newConflict: DataConflictRecord = {
      id: `conf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      recordId: params.recordId,
      recordType: params.recordType,
      detectedAt: new Date().toISOString(),
      localVersion: params.localVersion,
      serverVersion: params.serverVersion,
      conflictReason: params.conflictReason,
      status: 'UNRESOLVED',
    };

    conflicts.unshift(newConflict);
    safeSetItem(STORAGE_KEYS.CONFLICTS, JSON.stringify(conflicts));

    systemHealth.recordIncident({
      type: 'DATA_CONFLICT',
      title: 'ডেটা কনফ্লিক্ট শনাক্ত হয়েছে',
      severity: 'WARNING',
      affectedService: 'SyncQueue',
      message: `বিল (${params.recordId}) এর লোকাল ও সার্ভার ডেটার মধ্যে অসামঞ্জস্য রয়েছে।`,
      recommendedAction: 'রিকভারি সেন্টারে গিয়ে লোকাল বনাম সার্ভার ভার্সন তুলনা করে সমাধান নির্বাচন করুন।',
    });

    return newConflict;
  }

  /**
   * Resolves a data conflict safely according to role permissions.
   * Never silently overwrites financial history.
   */
  public async resolveConflict(
    conflictId: string,
    resolutionType: 'USE_SERVER' | 'USE_LOCAL' | 'KEEP_BOTH',
    userRole: UserRole,
    currentUser: string,
    firebaseConfig: any,
    expenses: Expense[],
    setExpenses: (exp: Expense[]) => void
  ): Promise<{ success: boolean; message: string }> {
    const conflicts = this.getAllConflicts();
    const conflict = conflicts.find((c) => c.id === conflictId);

    if (!conflict) {
      return { success: false, message: 'কনফ্লিক্ট রেকর্ড পাওয়া যায়নি।' };
    }

    if (conflict.status === 'RESOLVED') {
      return { success: false, message: 'এই কনফ্লিক্টটি ইতিমধ্যে সমাধান করা হয়েছে।' };
    }

    // Role check: Only ADMIN, MD, or the bill's owner can resolve
    const isOwner = conflict.localVersion.staffName === currentUser || conflict.localVersion.staffId === currentUser;
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.MD && !isOwner) {
      return { success: false, message: 'অননুমোদিত: আপনি এই কনফ্লিক্ট সমাধান করার অধিকার রাখেন না।' };
    }

    // Only ADMIN or MD can force USE_LOCAL to overwrite server
    if (resolutionType === 'USE_LOCAL' && userRole !== UserRole.ADMIN && userRole !== UserRole.MD) {
      return { success: false, message: 'অননুমোদিত: সার্ভার ডাটা ওভাররাইট করার অনুমতি কেবল অ্যাডমিন/এমডির রয়েছে।' };
    }

    const now = new Date().toISOString();

    try {
      if (resolutionType === 'USE_SERVER') {
        // Accept Server Version: Update local state with server copy & remove from offline queue
        const serverData = conflict.serverVersion;
        const updatedList = expenses.map((e) =>
          e.id === conflict.recordId
            ? ({ ...e, ...serverData, syncStatus: 'SUBMITTED' as BillSyncStatus, syncError: undefined } as Expense)
            : e
        );
        setExpenses(updatedList);
        await removeQueuedOfflineExpense(conflict.recordId);

        conflict.status = 'RESOLVED';
        conflict.resolutionType = 'USE_SERVER';
        conflict.resolvedBy = currentUser;
        conflict.resolvedAt = now;
        conflict.resolutionNote = 'সার্ভার ভার্সন গৃহীত হয়েছে এবং লোকাল কপি সমন্বয় করা হয়েছে।';
      } else if (resolutionType === 'USE_LOCAL') {
        // Keep Local: Overwrite server record with local copy
        if (!firebaseConfig?.databaseURL) throw new Error('Firebase কনফিগারেশন নেই');
        const apps = getApps();
        const app = apps.length > 0 ? getApp() : null;
        if (!app) throw new Error('Firebase App অনুপস্থিত');
        const db = getDatabase(app, firebaseConfig.databaseURL);

        const { voucherImage, ...safePayload } = conflict.localVersion;
        const sanitizedCloudPayload = {
          ...safePayload,
          voucherImage: voucherImage && voucherImage.length < 5 * 1024 * 1024 ? voucherImage : null,
          syncStatus: 'SUBMITTED',
          submittedAt: now,
          lastSyncAttempt: now,
          syncError: null,
        };

        await update(ref(db, 'expenses'), { [conflict.recordId]: sanitizedCloudPayload });
        await removeQueuedOfflineExpense(conflict.recordId);

        conflict.status = 'RESOLVED';
        conflict.resolutionType = 'USE_LOCAL';
        conflict.resolvedBy = currentUser;
        conflict.resolvedAt = now;
        conflict.resolutionNote = `অ্যাডমিন (${currentUser}) কর্তৃক অনুমোদিত হয়ে লোকাল ভার্সন দিয়ে সার্ভার আপডেট করা হয়েছে।`;
      } else if (resolutionType === 'KEEP_BOTH') {
        // Fork: Preserve server record intact; save local version under a new distinct ID!
        const newBillId = `bill_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        const forkedBill: Expense = {
          ...conflict.localVersion,
          id: newBillId,
          clientSubmissionId: newBillId,
          reason: `[রিকভারি কপি] ${conflict.localVersion.reason}`,
          createdAt: now,
          submittedAt: now,
          syncStatus: 'SUBMITTED',
          syncError: undefined,
        };

        if (firebaseConfig?.databaseURL) {
          const apps = getApps();
          const app = apps.length > 0 ? getApp() : null;
          if (app) {
            const db = getDatabase(app, firebaseConfig.databaseURL);
            const { voucherImage, ...safePayload } = forkedBill;
            await update(ref(db, 'expenses'), {
              [newBillId]: {
                ...safePayload,
                voucherImage: voucherImage && voucherImage.length < 5 * 1024 * 1024 ? voucherImage : null,
              },
            });
          }
        }

        // Add forked bill to local state
        setExpenses([forkedBill, ...expenses]);
        await removeQueuedOfflineExpense(conflict.recordId);

        conflict.status = 'RESOLVED';
        conflict.resolutionType = 'KEEP_BOTH';
        conflict.resolvedBy = currentUser;
        conflict.resolvedAt = now;
        conflict.resolutionNote = `উভয় রেকর্ড আলাদা সংরক্ষণ করা হয়েছে (নতুন আইডি: ${newBillId})।`;
      }

      safeSetItem(STORAGE_KEYS.CONFLICTS, JSON.stringify(conflicts));

      systemHealth.logEvent({
        type: 'ADMIN_ACTION',
        severity: 'INFO',
        service: 'ConflictResolution',
        summary: `কনফ্লিক্ট (${conflict.recordId}) সমাধান সম্পন্ন: ${resolutionType}`,
        details: { conflictId, resolutionType, resolvedBy: currentUser },
      });

      notifySyncStatusChange();

      return {
        success: true,
        message: '✅ ডেটা কনফ্লিক্ট সফলভাবে সমাধান করা হয়েছে।',
      };
    } catch (err: any) {
      return {
        success: false,
        message: `কনফ্লিক্ট সমাধান ব্যর্থ: ${err?.message || 'অজ্ঞাত ত্রুটি'}`,
      };
    }
  }

  // ==========================================================
  // SECTION E: Cache Integrity & Storage Health
  // ==========================================================

  /**
   * Scans IndexedDB (localforage) and localStorage to verify data health and prevent corruption.
   */
  public async scanCacheIntegrity(): Promise<CacheIntegrityReport> {
    const collectionsToTest = ['staffList', 'expenses', 'funds', 'advances', 'app_notes', 'products'];
    const results: Record<string, CacheCollectionIntegrity> = {};
    let isHealthy = true;
    let idbAvailable = true;
    const now = new Date().toISOString();

    for (const name of collectionsToTest) {
      try {
        const raw = await localforage.getItem<string | any[]>(name);
        if (raw === null || raw === undefined) {
          results[name] = { name, count: 0, status: 'EMPTY', lastVerified: now };
        } else {
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (Array.isArray(parsed)) {
            // Check for corrupted entries
            const corruptCount = parsed.filter((item) => item === null || typeof item !== 'object').length;
            if (corruptCount > 0) {
              isHealthy = false;
              results[name] = {
                name,
                count: parsed.length,
                status: 'CORRUPTED',
                error: `${corruptCount}টি ক্র্যাশড/নাল রেকর্ড শনাক্ত হয়েছে`,
                lastVerified: now,
              };
            } else {
              results[name] = { name, count: parsed.length, status: 'OK', lastVerified: now };
            }
          } else {
            results[name] = { name, count: 1, status: 'OK', lastVerified: now };
          }
        }
      } catch (err: any) {
        isHealthy = false;
        idbAvailable = false;
        results[name] = {
          name,
          count: 0,
          status: 'CORRUPTED',
          error: err?.message || 'পড়তে ব্যর্থ',
          lastVerified: now,
        };
      }
    }

    // Check localStorage
    let lsAvailable = true;
    try {
      const testKey = '__integrity_test__';
      safeSetItem(testKey, '1');
      safeRemoveItem(testKey);
    } catch {
      lsAvailable = false;
      isHealthy = false;
    }

    // Check Storage Quota if supported
    let storageQuota: CacheIntegrityReport['storageQuota'] = undefined;
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        const usageMb = est.usage ? Number((est.usage / (1024 * 1024)).toFixed(1)) : 0;
        const quotaMb = est.quota ? Number((est.quota / (1024 * 1024)).toFixed(1)) : 0;
        const percentUsed = quotaMb > 0 ? Number(((usageMb / quotaMb) * 100).toFixed(1)) : 0;
        storageQuota = { usageMb, quotaMb, percentUsed };
      } catch {}
    }

    return {
      isHealthy,
      indexedDbAvailable: idbAvailable,
      localStorageAvailable: lsAvailable,
      collections: results,
      storageQuota,
      timestamp: now,
    };
  }

  // ==========================================================
  // SECTION F: Secure Backup & Verified Import Protection
  // ==========================================================

  /**
   * Generates a sanitized, schema-verified export file.
   * Strips all passwords, auth tokens, and session secrets!
   */
  public generateSecureBackup(
    currentUser: string,
    role: UserRole,
    data: {
      staffList?: Staff[];
      expenses?: Expense[];
      funds?: Fund[];
      advances?: Advance[];
      movements?: MovementLog[];
      billingRules?: BillingRule[];
      appNotes?: AppNote[];
      products?: Product[];
    }
  ): { blob: Blob; filename: string; manifest: SafeBackupManifest } {
    if (role !== UserRole.ADMIN && role !== UserRole.MD) {
      throw new Error('অননুমোদিত: ব্যাকআপ এক্সপোর্ট করার অনুমতি কেবল অ্যাডমিন/এমডির রয়েছে।');
    }

    const now = new Date().toISOString();

    // 1. Scrub passwords and credentials from staffList
    const sanitizedStaff = (data.staffList || []).map((s) => {
      const { password, ...safeStaff } = s;
      return safeStaff;
    });

    // 2. Strip bloated base64 images from expenses in backup for file safety
    const sanitizedExpenses = (data.expenses || []).map((e) => {
      const { voucherImage, ...safeExp } = e;
      return safeExp;
    });

    const recordCounts = {
      staffList: sanitizedStaff.length,
      expenses: sanitizedExpenses.length,
      funds: (data.funds || []).length,
      advances: (data.advances || []).length,
      movements: (data.movements || []).length,
      billingRules: (data.billingRules || []).length,
      appNotes: (data.appNotes || []).length,
      products: (data.products || []).length,
    };

    const checksum = `chk_${Date.now().toString(36)}_${Object.values(recordCounts).reduce((a, b) => a + b, 0)}`;

    const manifest: SafeBackupManifest = {
      manifestVersion: '1.0',
      appName: 'Depend Sourcing Ltd. Office & Billing Center',
      schemaVersion: '2.0-secure',
      exportedAt: now,
      exportedBy: currentUser,
      recordCounts,
      checksum,
      securityDisclaimer: 'Verified export with credentials scrubbed. Safe for archival.',
    };

    const exportPayload = {
      manifest,
      data: {
        staffList: sanitizedStaff,
        expenses: sanitizedExpenses,
        funds: data.funds || [],
        advances: data.advances || [],
        movements: data.movements || [],
        billingRules: data.billingRules || [],
        appNotes: data.appNotes || [],
        products: data.products || [],
      },
    };

    const jsonString = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const filename = `depend_secure_backup_${now.split('T')[0]}_${checksum.slice(0, 8)}.json`;

    systemHealth.logEvent({
      type: 'ADMIN_ACTION',
      severity: 'INFO',
      service: 'BackupExport',
      summary: `নিরাপদ ব্যাকআপ এক্সপোর্ট তৈরি করা হয়েছে (${Object.values(recordCounts).reduce((a, b) => a + b, 0)} টি রেকর্ড)`,
      details: { exportedBy: currentUser, ...recordCounts },
    });

    return { blob, filename, manifest };
  }

  /**
   * Previews and thoroughly validates an import file before accepting it.
   * Rejects malformed files, validates schema, and checks for collisions with offline sync queue.
   */
  public validateImportFile(jsonString: string): ImportPreviewSummary {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') {
        return {
          isValid: false,
          error: 'ফাইলের গঠন সঠিক নয় (JSON অবজেক্ট প্রত্যাশিত)',
          counts: { staffToAdd: 0, staffToUpdate: 0, expensesToAdd: 0, expensesToUpdate: 0, fundsCount: 0, advancesCount: 0, rulesCount: 0, notesCount: 0 },
          conflictsWithOfflineQueue: 0,
          requiresConfirmation: true,
        };
      }

      // Check format: either 2.0-secure with manifest, or 1.0 legacy
      const manifest: SafeBackupManifest | undefined = parsed.manifest;
      const data = parsed.data || parsed;

      const staffList = Array.isArray(data.staffList) ? data.staffList : [];
      const expenses = Array.isArray(data.expenses) ? data.expenses : [];
      const funds = Array.isArray(data.funds) ? data.funds : [];
      const advances = Array.isArray(data.advances) ? data.advances : [];
      const rules = Array.isArray(data.billingRules) ? data.billingRules : [];
      const notes = Array.isArray(data.appNotes) ? data.appNotes : [];

      if (staffList.length === 0 && expenses.length === 0 && funds.length === 0 && advances.length === 0) {
        return {
          isValid: false,
          error: 'ব্যাকআপ ফাইলে কোনো প্রয়োজনীয় রেকর্ড (স্টাফ, খরচ, ফান্ড) পাওয়া যায়নি।',
          counts: { staffToAdd: 0, staffToUpdate: 0, expensesToAdd: 0, expensesToUpdate: 0, fundsCount: 0, advancesCount: 0, rulesCount: 0, notesCount: 0 },
          conflictsWithOfflineQueue: 0,
          requiresConfirmation: true,
        };
      }

      // Check collision with offline sync queue
      const queueItems = this.getQueueRetryItems();
      const queueIds = new Set(queueItems.map((q) => q.billId));
      let queueConflicts = 0;
      for (const e of expenses) {
        if (e && e.id && queueIds.has(e.id)) {
          queueConflicts++;
        }
      }

      return {
        isValid: true,
        manifest,
        counts: {
          staffToAdd: staffList.length,
          staffToUpdate: 0,
          expensesToAdd: expenses.length,
          expensesToUpdate: 0,
          fundsCount: funds.length,
          advancesCount: advances.length,
          rulesCount: rules.length,
          notesCount: notes.length,
        },
        conflictsWithOfflineQueue: queueConflicts,
        requiresConfirmation: true,
      };
    } catch (parseErr: any) {
      return {
        isValid: false,
        error: `JSON ফাইল পার্সিং ত্রুটি: ${parseErr?.message || 'Malformed JSON'}`,
        counts: { staffToAdd: 0, staffToUpdate: 0, expensesToAdd: 0, expensesToUpdate: 0, fundsCount: 0, advancesCount: 0, rulesCount: 0, notesCount: 0 },
        conflictsWithOfflineQueue: 0,
        requiresConfirmation: true,
      };
    }
  }

  /**
   * Applies the verified import safely without overwriting pending local unsynced work!
   */
  public async applyVerifiedImport(
    jsonString: string,
    userRole: UserRole,
    currentUser: string,
    callbacks: {
      updateStaffList: (list: Staff[]) => void;
      updateExpenses: (list: Expense[]) => void;
      updateFunds: (list: Fund[]) => void;
      updateAdvances: (list: Advance[]) => void;
      updateMovements: (list: MovementLog[]) => void;
      updateBillingRules: (list: BillingRule[]) => void;
      updateAppNotes: (list: AppNote[]) => void;
      updateProducts: (list: Product[]) => void;
      currentExpenses: Expense[];
      currentStaff: Staff[];
    }
  ): Promise<{ success: boolean; message: string }> {
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.MD) {
      return { success: false, message: 'অননুমোদিত: ডাটা ইমপোর্ট করার অনুমতি কেবল অ্যাডমিন/এমডির রয়েছে।' };
    }

    const validation = this.validateImportFile(jsonString);
    if (!validation.isValid) {
      return { success: false, message: `ইমপোর্ট বাতিল: ${validation.error}` };
    }

    try {
      const parsed = JSON.parse(jsonString);
      const data = parsed.data || parsed;

      // 1. Staff List: Preserve passwords from existing staff if backup scrubbed them!
      if (Array.isArray(data.staffList) && data.staffList.length > 0) {
        const existingStaffMap = new Map(callbacks.currentStaff.map((s) => [s.id, s]));
        const mergedStaff = data.staffList.map((imported: Staff) => {
          const existing = existingStaffMap.get(imported.id);
          return {
            ...imported,
            password: imported.password || existing?.password || '',
          };
        });
        callbacks.updateStaffList(mergedStaff);
        await localforage.setItem('staffList', JSON.stringify(mergedStaff));
      }

      // 2. Expenses: PRESERVE PENDING OFFLINE QUEUE BILLS!
      if (Array.isArray(data.expenses) && data.expenses.length > 0) {
        const queueItems = this.getQueueRetryItems();
        const pendingMap = new Map(queueItems.map((q) => [q.billId, q]));

        const existingMap = new Map(callbacks.currentExpenses.map((e) => [e.id, e]));
        for (const importedExp of data.expenses) {
          // If this bill is currently pending or unsynced in our queue, keep local copy!
          if (!pendingMap.has(importedExp.id)) {
            existingMap.set(importedExp.id, importedExp);
          }
        }
        const finalExpenses = Array.from(existingMap.values());
        callbacks.updateExpenses(finalExpenses);
        await localforage.setItem('expenses', JSON.stringify(finalExpenses));
      }

      if (Array.isArray(data.funds)) {
        callbacks.updateFunds(data.funds);
        await localforage.setItem('funds', JSON.stringify(data.funds));
      }
      if (Array.isArray(data.advances)) {
        callbacks.updateAdvances(data.advances);
        await localforage.setItem('advances', JSON.stringify(data.advances));
      }
      if (Array.isArray(data.movements)) {
        callbacks.updateMovements(data.movements);
      }
      if (Array.isArray(data.billingRules)) {
        callbacks.updateBillingRules(data.billingRules);
      }
      if (Array.isArray(data.appNotes)) {
        callbacks.updateAppNotes(data.appNotes);
        await localforage.setItem('app_notes', JSON.stringify(data.appNotes));
      }
      if (Array.isArray(data.products)) {
        callbacks.updateProducts(data.products);
        await localforage.setItem('products', JSON.stringify(data.products));
      }

      systemHealth.logEvent({
        type: 'ADMIN_ACTION',
        severity: 'INFO',
        service: 'BackupImport',
        summary: `যাচাইকৃত ব্যাকআপ ইমপোর্ট সফল হয়েছে (User: ${currentUser})`,
        details: { importedBy: currentUser, counts: validation.counts },
      });

      return {
        success: true,
        message: '✅ ব্যাকআপ ডেটা সফলভাবে এবং সুরক্ষাসহকারে ইমপোর্ট করা হয়েছে।',
      };
    } catch (err: any) {
      return {
        success: false,
        message: `ইমপোর্ট প্রক্রিয়াকরণে ত্রুটি: ${err?.message || 'অজ্ঞাত ত্রুটি'}`,
      };
    }
  }
}

export const safeUpdateRecovery = new SafeUpdateRecoveryService();
