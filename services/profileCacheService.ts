import localforage from 'localforage';
import { Staff, UserRole } from '../types';

export const CACHE_SCHEMA_VERSION = 2;
export const ACTIVE_PROFILE_KEY = 'active_profile_v2';
export const STAFF_SUMMARIES_KEY = 'staff_summaries_v2';

export interface CachedUserProfile {
  id: string; // Stable Unique ID (e.g., ggxltwqzj)
  staffId: string; // Display ID (e.g., Dsl-002)
  name: string; // Display name
  designation: string;
  role: UserRole;
  mobile?: string;
  email?: string;
  photo?: string; // Compressed thumbnail or photo URL
  workLocation?: 'HEAD_OFFICE' | 'FACTORY' | 'FIELD' | 'CUSTOM';
  status: 'ACTIVE' | 'DEACTIVATED';
  updatedAt?: string;
  lastSyncTimestamp: string;
  cacheVersion: number;
  syncStatus?: 'CACHED' | 'UPDATING' | 'UP_TO_DATE' | 'OFFLINE';
}

export interface StaffSummary {
  id: string;
  staffId: string;
  name: string;
  designation: string;
  role?: UserRole;
  status: 'ACTIVE' | 'DEACTIVATED';
  mobile?: string;
  photo?: string; // Tiny thumbnail
  workLocation?: 'HEAD_OFFICE' | 'FACTORY' | 'FIELD' | 'CUSTOM';
  points?: number;
  updatedAt?: string;
}

/**
 * Creates an ultra-compact JPEG thumbnail from a base64 or image URL.
 * Produces ~3-10 KB images for instant avatars and list thumbnails.
 */
export async function createThumbnail(
  source: string,
  maxDim: number = 120,
  quality: number = 0.7
): Promise<string> {
  if (!source || typeof source !== 'string') return '';
  if (!source.startsWith('data:image/')) {
    // If it's already an external HTTP/HTTPS URL, return as is
    return source;
  }
  // If it's already small (< 5KB), no need to compress further
  if (source.length < 5000) return source;

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width || maxDim;
          let height = img.height || maxDim;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const thumb = canvas.toDataURL('image/jpeg', quality);
            resolve(thumb);
            return;
          }
        } catch {
          // Canvas failure fallback
        }
        resolve(source);
      };
      img.onerror = () => resolve(source);
      img.src = source;
    } catch {
      resolve(source);
    }
  });
}

/**
 * Synchronously reads the active user's cached profile from localStorage.
 * Used for instant, zero-delay rendering of the user's identity on Frame 0.
 */
export function getSynchronousCachedProfile(): CachedUserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ACTIVE_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.id && parsed.cacheVersion === CACHE_SCHEMA_VERSION) {
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to read synchronous cached profile', e);
  }
  return null;
}

/**
 * Asynchronously reads the cached profile from IndexedDB (localforage) for full details.
 */
export async function getIdbCachedProfile(userId?: string): Promise<CachedUserProfile | null> {
  try {
    const key = userId ? `profile_${userId}` : ACTIVE_PROFILE_KEY;
    const raw = await localforage.getItem<string | CachedUserProfile>(key);
    if (!raw) return null;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (parsed && parsed.id) {
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to read IDB cached profile', e);
  }
  return null;
}

/**
 * Persists the current user's profile to both localStorage (for instant Frame-0 boot)
 * and IndexedDB (for rich offline capability).
 */
export async function persistUserProfile(
  staff: Partial<Staff> & { id: string; name: string },
  syncStatus: CachedUserProfile['syncStatus'] = 'UP_TO_DATE'
): Promise<CachedUserProfile> {
  let thumb = staff.photo;
  if (thumb && thumb.startsWith('data:image/') && thumb.length > 20000) {
    thumb = await createThumbnail(thumb, 140, 0.72);
  }

  const profileData: CachedUserProfile = {
    id: staff.id,
    staffId: staff.staffId || staff.id,
    name: staff.name,
    designation: staff.designation || 'স্টাফ মেম্বার',
    role: staff.role || UserRole.STAFF,
    mobile: staff.mobile,
    email: staff.email,
    photo: thumb,
    workLocation: staff.workLocation,
    status: staff.status || 'ACTIVE',
    updatedAt: staff.updatedAt || new Date().toISOString(),
    lastSyncTimestamp: new Date().toISOString(),
    cacheVersion: CACHE_SCHEMA_VERSION,
    syncStatus,
  };

  try {
    // Save to localStorage for instant synchronous startup
    localStorage.setItem(ACTIVE_PROFILE_KEY, JSON.stringify(profileData));
    localStorage.setItem(`profile_${profileData.id}`, JSON.stringify(profileData));
  } catch (e) {
    console.warn('LocalStorage save for profile exceeded, storing in IDB only', e);
  }

  try {
    // Save full record to IndexedDB
    await localforage.setItem(ACTIVE_PROFILE_KEY, profileData);
    await localforage.setItem(`profile_${profileData.id}`, profileData);
  } catch (e) {
    console.error('IDB save error for profile', e);
  }

  return profileData;
}

/**
 * Clears the active profile on logout so next login does not show stale user.
 */
export async function clearActiveProfile(): Promise<void> {
  try {
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
  } catch {}
  try {
    await localforage.removeItem(ACTIVE_PROFILE_KEY);
  } catch {}
}

/**
 * Synchronously retrieves cached staff summaries for instant dropdown and list population.
 */
export function getSynchronousStaffSummaries(): StaffSummary[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STAFF_SUMMARIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to read staff summaries', e);
  }
  return [];
}

/**
 * Saves staff data cleanly:
 * 1) Full list (including heavy details and photos) saved to IndexedDB (localforage).
 * 2) Lightweight summaries (with tiny thumbnails) saved to localStorage for 0ms startup.
 */
export async function persistStaffData(staffList: Staff[]): Promise<StaffSummary[]> {
  if (!Array.isArray(staffList) || staffList.length === 0) return [];

  // Generate lightweight summaries for localStorage
  const summaries: StaffSummary[] = staffList
    .filter((s) => s && !s.deletedAt && !s.isHardDeleted)
    .map((s) => ({
      id: s.id,
      staffId: s.staffId || s.id,
      name: s.name,
      designation: s.designation || '',
      role: s.role,
      status: s.status,
      mobile: s.mobile,
      // Keep only small photos or URLs in summaries; strip massive base64 in local summary to stay under quota
      photo: s.photo && s.photo.length < 8000 ? s.photo : undefined,
      workLocation: s.workLocation,
      points: s.points,
      updatedAt: s.updatedAt,
    }));

  try {
    const summaryStr = JSON.stringify(summaries);
    // Only save to localStorage if within safe size (< 300KB)
    if (summaryStr.length < 300 * 1024) {
      localStorage.setItem(STAFF_SUMMARIES_KEY, summaryStr);
    }
  } catch (e) {
    console.warn('Failed to store staff summaries in localStorage', e);
  }

  try {
    // Store complete staffList with all fields in localforage (IndexedDB has generous quotas)
    await localforage.setItem('staffList', JSON.stringify(staffList));
    await localforage.setItem(STAFF_SUMMARIES_KEY, summaries);
  } catch (e) {
    console.error('Failed to store staffList in IndexedDB', e);
  }

  return summaries;
}

/**
 * Fetches a single staff profile directly from Firebase RTDB by ID.
 * This avoids needing to download the entire staffList tree if only one profile is needed!
 */
export async function fetchSingleStaffProfile(
  userId: string,
  firebaseConfig: any
): Promise<Staff | null> {
  if (!userId || !firebaseConfig || !firebaseConfig.databaseURL) return null;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null;

  try {
    const { getApp } = await import('firebase/app');
    const { getDatabase, ref, get } = await import('firebase/database');
    const app = getApp();
    const db = getDatabase(app, firebaseConfig.databaseURL);
    const snap = await get(ref(db, `staffList/${userId}`));
    if (snap.exists()) {
      const val = snap.val();
      return { ...val, id: userId };
    }
  } catch (err) {
    console.warn(`Failed direct fetch for staff member ${userId}`, err);
  }
  return null;
}
