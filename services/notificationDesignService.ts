/**
 * Notification Design & Android Web Push Formatting Service
 * Depend Sourcing Ltd.
 *
 * Standardizes notification titles, structured multi-line messages,
 * Android-compatible branding icons (Large Logo + Monochrome Transparent Badge + Expanded Banner),
 * and safe deep-link routing metadata without altering existing delivery logic.
 */

export const DEPEND_NOTIFICATION_ASSETS = {
  LARGE_ICON: '/logo.png',
  BADGE_ICON: '/notification-badge.png',
} as const;

export function resolveOfficialNotificationAssetUrl(assetPath: string): string {
  try {
    if (typeof globalThis !== 'undefined' && 'location' in globalThis && globalThis.location?.origin) {
      return new URL(assetPath, globalThis.location.origin).href;
    }
  } catch {}
  return assetPath;
}

export type AppNotifType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

const VALID_APP_TABS = new Set([
  'dashboard',
  'staff',
  'attendance',
  'funds',
  'expenses',
  'products',
  'bulk-advance',
  'movements',
  'chat',
  'complaints',
  'notices',
  'live-location',
  'english-academy',
  'system-health',
]);

export function resolveNotificationTab(rawTab?: string | null): string {
  if (!rawTab || typeof rawTab !== 'string') return 'dashboard';
  const normalized = rawTab.trim();
  return VALID_APP_TABS.has(normalized) ? normalized : 'dashboard';
}

export function formatNotificationTitle(rawTitle: string, type: AppNotifType = 'INFO'): string {
  const cleaned = String(rawTitle || '')
    .replace(/^[\u26A0\uFE0F\u2705\u274C\s]+/, '')
    .trim();

  if (!cleaned) {
    return type === 'WARNING' || type === 'ERROR'
      ? 'Depend Sourcing Alert'
      : 'Depend Sourcing Ltd.';
  }

  return cleaned;
}

export function formatNotificationBody(
  rawMessage: string,
  options?: {
    type?: AppNotifType;
    tab?: string;
    timestampMs?: number;
  }
): string {
  const message = String(rawMessage || '').trim();
  const lines = message
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const tabLabels: Record<string, string> = {
    expenses: 'বিল ও খরচ ম্যানেজমেন্ট',
    attendance: 'হাজিরা ও চেক-ইন',
    movements: 'স্টাফ মুভমেন্ট',
    chat: 'টিম চ্যাট',
    staff: 'স্টাফ ও অ্যাক্সেস মনিটর',
    funds: 'ফান্ড লেজার',
    notices: 'অফিস নোটিশ',
    complaints: 'অভিযোগ বক্স',
    'system-health': 'সিস্টেম হেলথ',
    dashboard: 'ড্যাশবোর্ড',
  };

  const tab = options?.tab ? resolveNotificationTab(options.tab) : undefined;
  const sectionLabel = tab && tabLabels[tab] ? tabLabels[tab] : undefined;

  const ts = options?.timestampMs ? new Date(options.timestampMs) : new Date();
  const timeText = ts.toLocaleTimeString('bn-BD', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const footerParts: string[] = [];
  if (sectionLabel) footerParts.push(`বিভাগ: ${sectionLabel}`);
  footerParts.push(`সময়: ${timeText}`);

  if (lines.length === 0) {
    return `Depend Sourcing Ltd. • ${footerParts.join(' | ')}`;
  }

  // Keep message concise in collapsed mode while providing structured detail when expanded
  return `${lines.join('\n')}\n${footerParts.join(' • ')}`;
}

export interface BuildNotifOptionsParams {
  title: string;
  message: string;
  type?: AppNotifType;
  link?: string;
  tag?: string;
  image?: string;
  timestampMs?: number;
  requireInteraction?: boolean;
}

export interface ServiceWorkerNotificationOptions extends NotificationOptions {
  image?: string;
  renotify?: boolean;
  timestamp?: number;
  vibrate?: number[];
  actions?: Array<{ action: string; title: string }>;
}

/**
 * Builds Android Chrome / PWABuilder APK compatible NotificationOptions
 * for ServiceWorkerRegistration.showNotification().
 */
export function buildServiceWorkerNotificationOptions(
  params: BuildNotifOptionsParams
): ServiceWorkerNotificationOptions {
  const type = params.type || 'INFO';
  const tab = resolveNotificationTab(params.link);
  const timestampMs = params.timestampMs || Date.now();
  const isUrgent =
    params.requireInteraction !== undefined
      ? params.requireInteraction
      : type === 'WARNING' || type === 'ERROR' || tab === 'expenses' || tab === 'attendance';

  const safeTag =
    params.tag ||
    `depend-sourcing-${tab || type.toLowerCase()}`;

  return {
    body: formatNotificationBody(params.message, {
      type,
      tab: params.link ? tab : undefined,
      timestampMs,
    }),
    icon: resolveOfficialNotificationAssetUrl(DEPEND_NOTIFICATION_ASSETS.LARGE_ICON),
    badge: resolveOfficialNotificationAssetUrl(DEPEND_NOTIFICATION_ASSETS.BADGE_ICON),
    ...(params.image ? { image: params.image } : {}),
    tag: safeTag,
    renotify: true,
    timestamp: timestampMs,
    vibrate: isUrgent ? [220, 90, 220] : [140, 60, 140],
    requireInteraction: isUrgent,
    silent: false,
    actions: [
      {
        action: 'open',
        title: 'অ্যাপে দেখুন',
      },
    ],
    data: {
      tab,
      link: tab,
      url: `/?tab=${encodeURIComponent(tab)}`,
      type,
      timestamp: timestampMs,
    },
  };
}

/**
 * Fallback NotificationOptions safe for `new Notification(...)` constructor
 * (strips SW-only fields like `actions`, `renotify`, and `vibrate` that throw in Window context).
 */
export function buildFallbackNotificationOptions(
  params: BuildNotifOptionsParams
): NotificationOptions {
  const type = params.type || 'INFO';
  const tab = resolveNotificationTab(params.link);
  const timestampMs = params.timestampMs || Date.now();

  return {
    body: formatNotificationBody(params.message, {
      type,
      tab: params.link ? tab : undefined,
      timestampMs,
    }),
    icon: resolveOfficialNotificationAssetUrl(DEPEND_NOTIFICATION_ASSETS.LARGE_ICON),
    badge: resolveOfficialNotificationAssetUrl(DEPEND_NOTIFICATION_ASSETS.BADGE_ICON),
    tag: params.tag || `depend-sourcing-${tab || type.toLowerCase()}`,
    data: {
      tab,
      url: `/?tab=${encodeURIComponent(tab)}`,
      type,
      timestamp: timestampMs,
    },
  };
}
