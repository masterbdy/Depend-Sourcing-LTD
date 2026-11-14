import { Staff } from '../types';

export const OVERSIZED_MEDIA_BYTES = 8 * 1024 * 1024;

export interface StaffDiffResult {
  patch: Record<string, any>;
  changedStaffCount: number;
  changedFieldCount: number;
  fullPayloadBytes: number;
  patchPayloadBytes: number;
}

/**
 * Computes a minimal Firebase RTDB multi-path update payload for `staffList`.
 * - New staff -> full object at `{id}`
 * - Hard-deleted staff -> `{id}: null`
 * - Existing staff -> only changed fields as `{id}/{field}` (avoids re-uploading 40KB+ base64 photos)
 */
export function buildStaffDiffPatch(
  nextList: Staff[],
  prevList: Staff[],
): StaffDiffResult {
  const safeNext = Array.isArray(nextList) ? nextList.filter(Boolean) : [];
  const safePrev = Array.isArray(prevList) ? prevList.filter(Boolean) : [];

  const prevMap = new Map<string, Staff>();
  for (const item of safePrev) {
    if (item && item.id) {
      prevMap.set(item.id, item);
    }
  }

  const patch: Record<string, any> = {};
  let changedStaffCount = 0;
  let changedFieldCount = 0;
  let fullPayloadBytes = 0;

  for (const curr of safeNext) {
    if (!curr) continue;
    const id = curr.id || Math.random().toString(36).substr(2, 9);
    curr.id = id;
    const prev = prevMap.get(id);

    if (!prev) {
      if (curr.isHardDeleted) {
        patch[id] = null;
      } else {
        patch[id] = curr;
        fullPayloadBytes += JSON.stringify(curr).length;
      }
      changedStaffCount++;
      changedFieldCount++;
      continue;
    }

    if (prev === curr) continue;

    if (curr.isHardDeleted && !prev.isHardDeleted) {
      patch[id] = null;
      changedStaffCount++;
      changedFieldCount++;
      continue;
    }

    const prevJson = JSON.stringify(prev);
    const currJson = JSON.stringify(curr);
    if (prevJson === currJson) continue;

    const allKeys = new Set<string>([...Object.keys(prev), ...Object.keys(curr)]);
    let hasFieldDiff = false;

    for (const key of allKeys) {
      const prevVal = (prev as any)[key];
      const currVal = (curr as any)[key];
      if (prevVal === currVal) continue;

      const prevValJson = prevVal === undefined ? undefined : JSON.stringify(prevVal);
      const currValJson = currVal === undefined ? undefined : JSON.stringify(currVal);
      if (prevValJson === currValJson) continue;

      if (currVal === undefined) {
        // Explicit clearing of a previously set optional property (e.g. deletedAt restored from Trash)
        patch[`${id}/${key}`] = null;
        hasFieldDiff = true;
        changedFieldCount++;
      } else {
        patch[`${id}/${key}`] = currVal;
        hasFieldDiff = true;
        changedFieldCount++;
      }
    }

    if (hasFieldDiff) {
      changedStaffCount++;
      fullPayloadBytes += currJson.length;
    }
  }

  const patchPayloadBytes = Object.keys(patch).length > 0 ? JSON.stringify(patch).length : 0;

  return {
    patch,
    changedStaffCount,
    changedFieldCount,
    fullPayloadBytes,
    patchPayloadBytes,
  };
}

/**
 * Strips oversized (>8MB) inline media strings from either whole-record entries or path-level entries.
 */
export function sanitizeOversizedMediaInPatch(patch: Record<string, any>): Record<string, any> {
  Object.keys(patch).forEach((key) => {
    const val = patch[key];
    if (val === null || val === undefined) return;

    if (typeof val === 'string' && (key.endsWith('/photo') || key.endsWith('/imageUrl'))) {
      if (val.length > OVERSIZED_MEDIA_BYTES) {
        patch[key] = null;
      }
      return;
    }

    if (Array.isArray(val) && key.endsWith('/imageUrls')) {
      patch[key] = val
        .map((url) => (typeof url === 'string' && url.length > OVERSIZED_MEDIA_BYTES ? null : url))
        .filter(Boolean);
      return;
    }

    if (typeof val === 'object') {
      if (val.imageUrl && typeof val.imageUrl === 'string' && val.imageUrl.length > OVERSIZED_MEDIA_BYTES) {
        val.imageUrl = null;
      }
      if (val.photo && typeof val.photo === 'string' && val.photo.length > OVERSIZED_MEDIA_BYTES) {
        val.photo = null;
      }
      if (val.imageUrls && Array.isArray(val.imageUrls)) {
        val.imageUrls = val.imageUrls
          .map((url: string) => (url && url.length > OVERSIZED_MEDIA_BYTES ? null : url))
          .filter(Boolean);
      }
    }
  });

  return patch;
}

/**
 * Hardcoded Admin/MD fallback logins synthesize IDs like `mehedi_` or `ispa` when no staffList entry exists.
 */
export function isSyntheticFallbackStaffId(userId: string | null | undefined, staffList?: Staff[]): boolean {
  if (!userId) return true;
  if (Array.isArray(staffList) && staffList.some((s) => s && s.id === userId)) {
    return false;
  }
  return userId === 'mehedi_' || userId === 'ispa';
}

/**
 * Prevents identical duplicate sync payloads within a short window (e.g. React StrictMode double updaters
 * or focus + visibilitychange firing together) without blocking genuine subsequent edits.
 */
export class DuplicateSyncGuard {
  private recentWrites = new Map<string, number>();

  constructor(private readonly dedupeWindowMs: number = 1500) {}

  public shouldSkip(node: string, payload: Record<string, any>, nowMs: number = Date.now()): boolean {
    if (!payload || Object.keys(payload).length === 0) return true;

    // Prune expired entries occasionally
    if (this.recentWrites.size > 60) {
      for (const [k, ts] of this.recentWrites.entries()) {
        if (nowMs - ts > this.dedupeWindowMs * 2) {
          this.recentWrites.delete(k);
        }
      }
    }

    const signature = `${node}:${JSON.stringify(payload)}`;
    const prevTs = this.recentWrites.get(signature);
    if (prevTs !== undefined && nowMs - prevTs < this.dedupeWindowMs) {
      return true;
    }
    this.recentWrites.set(signature, nowMs);
    return false;
  }

  public clear(node?: string, payload?: Record<string, any>): void {
    if (!node) {
      this.recentWrites.clear();
      return;
    }
    if (payload) {
      this.recentWrites.delete(`${node}:${JSON.stringify(payload)}`);
    }
  }
}
