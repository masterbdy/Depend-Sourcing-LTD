import { Expense, BillSyncStatus } from '../types';
import localforage from 'localforage';
import { getApp, getApps } from 'firebase/app';
import { getDatabase, ref, update } from 'firebase/database';

export interface SubmissionResult {
  success: boolean;
  status: BillSyncStatus;
  billId: string;
  submittedAt: string;
  message: string;
  error?: string;
}

// Generate stable deterministic ID
export function generateSubmissionId(): string {
  const ts = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `bill_${ts}_${randomPart}`;
}

const SYNC_QUEUE_KEY = 'offline_sync_queue';

/**
 * Submit or retry an expense bill with definitive transport status tracking.
 * Strictly distinguishes server-acknowledged write (SUBMITTED) from local store (SAVED_OFFLINE).
 */
export async function submitExpenseBill(
  expenseData: Omit<Expense, 'syncStatus' | 'lastSyncAttempt' | 'clientSubmissionId'>,
  existingSubmissionId?: string,
  firebaseConfig?: any
): Promise<{ result: SubmissionResult; updatedExpense: Expense }> {
  const billId = existingSubmissionId || expenseData.id || generateSubmissionId();
  const submissionTimestamp = new Date().toISOString();

  // Create baseline expense object with initial status
  const expenseToPersist: Expense = {
    ...expenseData,
    id: billId,
    clientSubmissionId: billId,
    lastSyncAttempt: submissionTimestamp,
  };

  // If completely offline according to browser, store locally immediately as SAVED_OFFLINE
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    expenseToPersist.syncStatus = 'SAVED_OFFLINE';
    expenseToPersist.syncError = 'ইন্টারনেট সংযোগ নেই। ডিভাইসে সংরক্ষিত হয়েছে।';

    // Save to offline queue
    await queueOfflineExpense(expenseToPersist);

    notifySyncStatusChange();

    return {
      result: {
        success: false,
        status: 'SAVED_OFFLINE',
        billId,
        submittedAt: submissionTimestamp,
        message: '⚠️ বিলটি এই ডিভাইসে সংরক্ষিত হয়েছে। সার্ভারে পাঠানো এখনো বাকি।',
        error: 'Offline',
      },
      updatedExpense: expenseToPersist,
    };
  }

  // If online, attempt definitive Firebase Realtime Database server write
  if (firebaseConfig && firebaseConfig.databaseURL) {
    try {
      const apps = getApps();
      const app = apps.length > 0 ? getApp() : null;
      if (!app) {
        throw new Error('Firebase app is not initialized');
      }
      const db = getDatabase(app, firebaseConfig.databaseURL);

      // Strip large media for cloud safety if any (keep in local DB)
      const { voucherImage, ...cloudPayload } = expenseToPersist;
      const sanitizedPayload = {
        ...cloudPayload,
        voucherImage: voucherImage && voucherImage.length < 5 * 1024 * 1024 ? voucherImage : null,
        syncStatus: 'SUBMITTED',
        submittedAt: submissionTimestamp,
        lastSyncAttempt: submissionTimestamp,
        syncError: null,
      };

      // Perform atomic server write with timeout
      await Promise.race([
        update(ref(db, 'expenses'), { [billId]: sanitizedPayload }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('SERVER_TIMEOUT')), 12000)
        ),
      ]);

      // Server write was resolved by Firebase Realtime Database
      expenseToPersist.syncStatus = 'SUBMITTED';
      expenseToPersist.submittedAt = submissionTimestamp;
      expenseToPersist.syncError = undefined;

      // Remove from offline queue if it was queued previously
      await removeQueuedOfflineExpense(billId);

      notifySyncStatusChange();

      return {
        result: {
          success: true,
          status: 'SUBMITTED',
          billId,
          submittedAt: submissionTimestamp,
          message: '✅ বিল সফলভাবে সার্ভারে জমা হয়েছে।',
        },
        updatedExpense: expenseToPersist,
      };
    } catch (err: any) {
      console.warn('[BillSyncService] Server write failed or timed out:', err);

      // Distinguish timeout / network from permission or other failure
      const isTimeout = err?.message === 'SERVER_TIMEOUT';
      const isOfflineErr = typeof navigator !== 'undefined' && !navigator.onLine;
      const finalStatus: BillSyncStatus = isOfflineErr ? 'SAVED_OFFLINE' : (isTimeout ? 'SAVED_OFFLINE' : 'FAILED');

      expenseToPersist.syncStatus = finalStatus;
      expenseToPersist.syncError = isTimeout
        ? 'সার্ভার রেসপন্স টাইমআউট (১২ সেকেন্ড)'
        : (err?.message || 'সার্ভার সংযোগ বিচ্ছিন্ন');

      // Queue for background retry
      await queueOfflineExpense(expenseToPersist);

      notifySyncStatusChange();

      return {
        result: {
          success: false,
          status: finalStatus,
          billId,
          submittedAt: submissionTimestamp,
          message: isOfflineErr || isTimeout
            ? '⚠️ বিলটি এই ডিভাইসে সংরক্ষিত হয়েছে। সার্ভারে পাঠানো এখনো বাকি।'
            : `❌ সার্ভারে জমা হতে সমস্যা হয়েছে: ${err?.message || 'অজ্ঞাত ত্রুটি'}`,
          error: expenseToPersist.syncError,
        },
        updatedExpense: expenseToPersist,
      };
    }
  }

  // Fallback if no firebaseConfig is provided
  expenseToPersist.syncStatus = 'SAVED_OFFLINE';
  expenseToPersist.syncError = 'সার্ভার কনফিগারেশন অনুপস্থিত';
  await queueOfflineExpense(expenseToPersist);
  notifySyncStatusChange();

  return {
    result: {
      success: false,
      status: 'SAVED_OFFLINE',
      billId,
      submittedAt: submissionTimestamp,
      message: '⚠️ বিলটি এই ডিভাইসে সংরক্ষিত হয়েছে। সার্ভারে পাঠানো এখনো বাকি।',
      error: 'No Firebase Config',
    },
    updatedExpense: expenseToPersist,
  };
}

/**
 * Retries syncing an individual expense that is SAVED_OFFLINE or FAILED
 */
export async function retryExpenseBillSync(
  expense: Expense,
  firebaseConfig?: any
): Promise<{ success: boolean; status: BillSyncStatus; updatedExpense: Expense; message: string }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      success: false,
      status: 'SAVED_OFFLINE',
      updatedExpense: {
        ...expense,
        syncStatus: 'SAVED_OFFLINE',
        lastSyncAttempt: new Date().toISOString(),
        syncError: 'ইন্টারনেট সংযোগ নেই',
      },
      message: '⚠️ ইন্টারনেট সংযোগ নেই। কানেকশন আসলে পুনরায় চেষ্টা করুন।',
    };
  }

  const { result, updatedExpense } = await submitExpenseBill(
    expense,
    expense.id,
    firebaseConfig
  );

  return {
    success: result.success,
    status: result.status,
    updatedExpense,
    message: result.message,
  };
}

/**
 * Sync all pending or failed expense bills in batch
 */
export async function syncAllPendingBills(
  expenses: Expense[],
  firebaseConfig?: any,
  onProgress?: (synced: number, total: number) => void
): Promise<{ updatedExpenses: Expense[]; syncedCount: number; failedCount: number }> {
  const pendingBills = expenses.filter(
    (e) => !e.isDeleted && (e.syncStatus === 'SAVED_OFFLINE' || e.syncStatus === 'FAILED' || e.syncStatus === 'SYNCING')
  );

  if (pendingBills.length === 0) {
    return { updatedExpenses: expenses, syncedCount: 0, failedCount: 0 };
  }

  const updatedMap = new Map<string, Expense>(expenses.map((e) => [e.id, e]));
  let syncedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < pendingBills.length; i++) {
    const bill = pendingBills[i];
    try {
      const res = await retryExpenseBillSync(bill, firebaseConfig);
      updatedMap.set(res.updatedExpense.id, res.updatedExpense);
      if (res.success) {
        syncedCount++;
      } else {
        failedCount++;
      }
    } catch {
      failedCount++;
    }

    if (onProgress) {
      onProgress(i + 1, pendingBills.length);
    }
  }

  const finalExpenses = Array.from(updatedMap.values());

  // Also update local storage / IndexedDB
  try {
    const safeForStorage = finalExpenses.map(({ voucherImage, ...rest }) => rest);
    localStorage.setItem('expenses', JSON.stringify(safeForStorage));
    await localforage.setItem('expenses', JSON.stringify(finalExpenses));
  } catch (e) {
    console.warn('Failed to update local store after batch sync', e);
  }

  notifySyncStatusChange();

  return {
    updatedExpenses: finalExpenses,
    syncedCount,
    failedCount,
  };
}

/**
 * Queue an expense into the persistent offline sync queue
 */
export async function queueOfflineExpense(expense: Expense): Promise<void> {
  try {
    const queueStr = localStorage.getItem(SYNC_QUEUE_KEY) || '{}';
    const queue = JSON.parse(queueStr);
    if (!queue.expenses) queue.expenses = {};

    const { voucherImage, ...safePayload } = expense;
    queue.expenses[expense.id] = {
      ...safePayload,
      voucherImage: voucherImage && voucherImage.length < 5 * 1024 * 1024 ? voucherImage : null,
      syncStatus: expense.syncStatus || 'SAVED_OFFLINE',
      lastSyncAttempt: new Date().toISOString(),
      syncError: expense.syncError || null,
    };

    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));

    // Also update IndexedDB expenses collection with local copy
    const stored = await localforage.getItem<string>('expenses');
    if (stored) {
      try {
        const list = JSON.parse(stored) as Expense[];
        const updated = [expense, ...list.filter((e) => e.id !== expense.id)];
        await localforage.setItem('expenses', JSON.stringify(updated));
      } catch (e) {}
    }
  } catch (e) {
    console.error('[BillSyncService] Failed to queue offline expense', e);
  }
}

/**
 * Remove an expense from the offline sync queue
 */
export async function removeQueuedOfflineExpense(billId: string): Promise<void> {
  try {
    const queueStr = localStorage.getItem(SYNC_QUEUE_KEY);
    if (queueStr) {
      const queue = JSON.parse(queueStr);
      if (queue.expenses && queue.expenses[billId]) {
        delete queue.expenses[billId];
        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
      }
    }
  } catch (e) {
    console.error('[BillSyncService] Failed to remove expense from queue', e);
  }
}

/**
 * Get count of unsynced expenses
 */
export function getUnsyncedBillCount(): number {
  try {
    const queueStr = localStorage.getItem(SYNC_QUEUE_KEY);
    if (!queueStr) return 0;
    const queue = JSON.parse(queueStr);
    return queue.expenses ? Object.keys(queue.expenses).length : 0;
  } catch {
    return 0;
  }
}

/**
 * Dispatches a custom window event to notify other UI components of sync updates
 */
export function notifySyncStatusChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offline-sync-warning'));
    window.dispatchEvent(new CustomEvent('bill-sync-updated'));
  }
}
