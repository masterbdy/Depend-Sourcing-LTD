import { DEFAULT_FIREBASE_CONFIG } from '../constants.js';

export interface SyncQueueMap {
  [node: string]: {
    [recordId: string]: any;
  };
}

/**
 * Normalizes stored `fb_config` so AI Studio Browser and PWABuilder Android APK
 * always point to the single production Firebase project & RTDB URL.
 */
export function normalizeFirebaseConfig(savedConfigRaw: unknown): typeof DEFAULT_FIREBASE_CONFIG & Record<string, any> {
  let parsed: any = null;
  if (typeof savedConfigRaw === 'string' && savedConfigRaw.trim() && savedConfigRaw !== 'null') {
    try {
      parsed = JSON.parse(savedConfigRaw);
    } catch {
      parsed = null;
    }
  } else if (savedConfigRaw && typeof savedConfigRaw === 'object') {
    parsed = { ...(savedConfigRaw as any) };
  }

  // Always enforce the single production project if missing, broken, or pointing elsewhere
  if (
    !parsed ||
    !parsed.apiKey ||
    !parsed.projectId ||
    parsed.projectId !== DEFAULT_FIREBASE_CONFIG.projectId
  ) {
    return { ...DEFAULT_FIREBASE_CONFIG };
  }

  const normalizedDbUrl =
    parsed.databaseURL &&
    typeof parsed.databaseURL === 'string' &&
    !parsed.databaseURL.includes('undefined') &&
    parsed.databaseURL.startsWith('https://')
      ? parsed.databaseURL
      : DEFAULT_FIREBASE_CONFIG.databaseURL;

  return {
    ...DEFAULT_FIREBASE_CONFIG,
    ...parsed,
    databaseURL: normalizedDbUrl,
  };
}

/**
 * Cleanly converts a Firebase snapshot value (object map or array) into a deduplicated array.
 */
export function normalizeCollectionSnapshot<T = any>(rawVal: any): T[] {
  if (!rawVal) return [];
  const rawArr = Array.isArray(rawVal)
    ? rawVal
    : typeof rawVal === 'object'
    ? Object.values(rawVal)
    : [];
  const filtered = rawArr.filter(Boolean) as T[];

  if (
    filtered.length > 0 &&
    typeof filtered[0] === 'object' &&
    filtered[0] !== null &&
    'id' in (filtered[0] as any)
  ) {
    const map = new Map<string, T>();
    for (const item of filtered as any[]) {
      if (item && item.id) {
        map.set(item.id, item as T);
      }
    }
    return Array.from(map.values());
  }

  return filtered;
}

/**
 * Reconciles an incoming Firebase RTDB snapshot (including `snapshot.exists() === false`
 * when the last item in a collection was hard-deleted on another device) with local pending
 * offline mutations in `offline_sync_queue`.
 */
export function reconcileSnapshotWithOfflineQueue<T extends Record<string, any>>(
  node: string,
  snapshotExists: boolean,
  rawSnapshotVal: any,
  offlineQueue: SyncQueueMap | null | undefined,
): T[] {
  let arrayData: T[] = snapshotExists ? normalizeCollectionSnapshot<T>(rawSnapshotVal) : [];

  const offlineItems = offlineQueue && typeof offlineQueue === 'object' ? offlineQueue[node] : undefined;
  if (offlineItems && typeof offlineItems === 'object' && Object.keys(offlineItems).length > 0) {
    const dataMap = new Map<string, any>(
      arrayData
        .filter((item) => item && item.id)
        .map((item) => [String(item.id), item]),
    );

    for (const [id, item] of Object.entries(offlineItems)) {
      if (item === null || item?.isHardDeleted) {
        dataMap.delete(id);
      } else if (typeof item === 'object') {
        const recordId = String(item.id || id);
        dataMap.set(recordId, { ...item, id: recordId });
      }
    }

    arrayData = Array.from(dataMap.values()) as T[];
  }

  return arrayData;
}

/**
 * Computes a fast deterministic signature for an array/object payload so
 * multi-megabyte IndexedDB persistence (`products`, `app_notes`) only writes
 * when data actually changed, preventing APK IndexedDB lock contention.
 */
export function computeSyncPayloadSignature(data: any): string {
  try {
    const serialized = typeof data === 'string' ? data : JSON.stringify(data);
    if (!serialized) return '0:0';
    let hash = 2166136261;
    const step = Math.max(1, Math.floor(serialized.length / 2048));
    for (let i = 0; i < serialized.length; i += step) {
      hash ^= serialized.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    hash ^= serialized.length;
    return `${serialized.length}:${(hash >>> 0).toString(36)}`;
  } catch {
    return String(Date.now());
  }
}

/**
 * Applies a soft or hard delete to a record safely through the standard updater pipeline.
 */
export function markRecordDeleted<T extends { id: string }>(
  list: T[],
  recordId: string,
  mode: 'soft' | 'hard',
): T[] {
  if (!Array.isArray(list)) return [];
  return list.map((item) => {
    if (!item || item.id !== recordId) return item;
    if (mode === 'hard') {
      return { ...item, isHardDeleted: true };
    }
    return { ...item, isDeleted: true, updatedAt: new Date().toISOString() };
  });
}
