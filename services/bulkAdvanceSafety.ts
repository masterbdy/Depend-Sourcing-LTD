import { AdvanceLog } from '../types';

const COMMITTED_KEYS_STORAGE_KEY = 'depend_bulk_advance_committed_keys';
const MAX_STORED_COMMITTED_KEYS = 30;

/**
 * Generates a unique idempotency key for a single bulk advance batch draft.
 */
export function createSubmissionKey(): string {
  const rand = Math.random().toString(36).substring(2, 10);
  return `sub_${Date.now()}_${rand}`;
}

/**
 * Tracks committed submission keys both in memory and sessionStorage
 * to prevent accidental duplicate batch submissions within the same session.
 */
export class CommittedBatchGuard {
  private committedKeys: Set<string>;
  private storageKey: string;

  constructor(storageKey: string = COMMITTED_KEYS_STORAGE_KEY) {
    this.storageKey = storageKey;
    this.committedKeys = new Set<string>(this.readFromSession());
  }

  private readFromSession(): string[] {
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) return [];
      const raw = window.sessionStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((k) => typeof k === 'string') : [];
    } catch {
      return [];
    }
  }

  private writeToSession(): void {
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) return;
      const arr = Array.from(this.committedKeys).slice(-MAX_STORED_COMMITTED_KEYS);
      window.sessionStorage.setItem(this.storageKey, JSON.stringify(arr));
    } catch {
      // Ignore storage quota/access errors cleanly
    }
  }

  hasKey(key: string): boolean {
    if (!key) return false;
    return this.committedKeys.has(key);
  }

  markCommitted(key: string): void {
    if (!key) return;
    this.committedKeys.add(key);
    this.writeToSession();
  }
}

/**
 * Appends new AdvanceLog entries to state while guaranteeing idempotency:
 * any entry whose id, transactionId, or batchId+staffId+date already exists
 * in previous logs will never be duplicated.
 */
export function appendUniqueAdvanceLogs(
  prevLogs: AdvanceLog[] | undefined,
  newLogs: AdvanceLog[]
): AdvanceLog[] {
  const existing = Array.isArray(prevLogs) ? prevLogs : [];
  if (!Array.isArray(newLogs) || newLogs.length === 0) return existing;

  const existingIds = new Set<string>();
  const existingTxnIds = new Set<string>();
  const existingBatchStaffPairs = new Set<string>();

  for (const log of existing) {
    if (log.id) existingIds.add(log.id);
    if (log.transactionId) existingTxnIds.add(log.transactionId);
    if (log.batchId && log.staffId) {
      existingBatchStaffPairs.add(`${log.batchId}::${log.staffId}`);
    }
  }

  const uniqueAdditions: AdvanceLog[] = [];
  for (const candidate of newLogs) {
    const pairKey =
      candidate.batchId && candidate.staffId
        ? `${candidate.batchId}::${candidate.staffId}`
        : '';

    if (
      (candidate.id && existingIds.has(candidate.id)) ||
      (candidate.transactionId && existingTxnIds.has(candidate.transactionId)) ||
      (pairKey && existingBatchStaffPairs.has(pairKey))
    ) {
      continue;
    }

    if (candidate.id) existingIds.add(candidate.id);
    if (candidate.transactionId) existingTxnIds.add(candidate.transactionId);
    if (pairKey) existingBatchStaffPairs.add(pairKey);
    uniqueAdditions.push(candidate);
  }

  if (uniqueAdditions.length === 0) return existing;
  return [...existing, ...uniqueAdditions];
}

/**
 * Resolves the appropriate previous in-app screen tab when navigating back
 * from a sub-screen such as 'bulk-advance'.
 */
export function resolvePreviousAppTab(
  historyStack: readonly string[],
  currentTab: string,
  fallbackTab: string = 'dashboard'
): string {
  if (Array.isArray(historyStack) && historyStack.length > 0) {
    for (let i = historyStack.length - 1; i >= 0; i--) {
      const candidate = historyStack[i];
      if (candidate && candidate !== currentTab) {
        return candidate;
      }
    }
  }
  return fallbackTab;
}
