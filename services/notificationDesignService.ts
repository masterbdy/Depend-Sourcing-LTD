/**
 * Notification Design, Personalization & Android Web Push Formatting Service
 * Depend Sourcing Ltd.
 *
 * Ensures every notification carries:
 * - Official company branding (Depend Sourcing Ltd. + unmodified /logo.png + monochrome /notification-badge.png)
 * - Verified recipient staff name personalization (never guesses or leaks another staff's name)
 * - Warm, conversational Bangla phrasing free of robotic text or unnecessary emojis
 * - Android collapsed & expanded visual hierarchy within OS truncation limits
 * - Duplicate notification suppression across re-renders, sync updates, and page reloads
 */

export const COMPANY_FULL_NAME = 'Depend Sourcing Ltd.';
export const COMPANY_SHORT_NAME = 'Depend Sourcing';

export const DEPEND_NOTIFICATION_ASSETS = {
  LARGE_ICON: '/logo.png',
  BADGE_ICON: '/notification-badge.png',
} as const;

export function resolveOfficialNotificationAssetUrl(assetPath: string): string {
  try {
    if (
      typeof globalThis !== 'undefined' &&
      'location' in globalThis &&
      globalThis.location?.origin
    ) {
      return new URL(assetPath, globalThis.location.origin).href;
    }
  } catch {}
  return assetPath;
}

export type AppNotifType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface NotificationProfileCandidate {
  id?: string;
  name?: string;
  status?: string;
  isHardDeleted?: boolean;
  deletedAt?: string | null;
}

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

const TAB_LABELS_BN: Record<string, string> = {
  expenses: 'বিল ও খরচ',
  attendance: 'হাজিরা',
  movements: 'মুভমেন্ট',
  chat: 'টিম চ্যাট',
  staff: 'স্টাফ মনিটর',
  funds: 'ফান্ড লেজার',
  notices: 'অফিস নোটিশ',
  complaints: 'অভিযোগ বক্স',
  'bulk-advance': 'বাল্ক অগ্রিম',
  'system-health': 'সিস্টেম হেলথ',
  dashboard: 'ড্যাশবোর্ড',
};

const TAB_ACTION_LABELS_BN: Record<string, string> = {
  attendance: 'Check-in করুন',
  expenses: 'বিল দেখুন',
  chat: 'মেসেজ দেখুন',
  movements: 'মুভমেন্ট দেখুন',
  staff: 'স্টাফ দেখুন',
  funds: 'লেজার দেখুন',
  notices: 'নোটিশ পড়ুন',
};

const INVALID_NAME_TOKENS = new Set([
  'guest',
  'unknown',
  'user',
  'staff',
  'null',
  'undefined',
  'n/a',
  'na',
  'none',
]);

const EMOJI_AND_SYMBOL_PREFIX_REGEX =
  /^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F\u200D\s]+/gu;
const ALL_DECORATIVE_EMOJIS_REGEX =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu;

export function resolveNotificationTab(rawTab?: string | null): string {
  if (!rawTab || typeof rawTab !== 'string') return 'dashboard';
  const normalized = rawTab.trim();
  return VALID_APP_TABS.has(normalized) ? normalized : 'dashboard';
}

/**
 * Resolves the strictly authenticated current staff member's display name.
 * Returns `null` if no verified authenticated name is available — never guesses
 * and never substitutes another staff member's name.
 */
export function resolveAuthenticatedStaffName(params: {
  currentUser?: string | null;
  staffList?: NotificationProfileCandidate[];
  cachedProfileName?: string | null;
  preferredFirstNameOnly?: boolean;
}): string | null {
  const rawCurrent = typeof params.currentUser === 'string' ? params.currentUser.trim() : '';
  const rawCached =
    typeof params.cachedProfileName === 'string' ? params.cachedProfileName.trim() : '';

  // Never trust unauthenticated placeholders or mismatched cached profile names
  if (!rawCurrent && !rawCached) return null;
  if (rawCurrent && rawCached && rawCurrent.toLowerCase() !== rawCached.toLowerCase()) {
    // Active currentUser strictly takes precedence over any stale cached profile
  }

  const verifiedSourceName = rawCurrent || rawCached;
  if (!verifiedSourceName) return null;
  if (INVALID_NAME_TOKENS.has(verifiedSourceName.toLowerCase())) return null;

  // Match against active authenticated user's own staff profile if loaded
  let canonicalName = verifiedSourceName;
  if (Array.isArray(params.staffList) && params.staffList.length > 0) {
    const exactMatch = params.staffList.find(
      (s) =>
        s &&
        !s.isHardDeleted &&
        !s.deletedAt &&
        typeof s.name === 'string' &&
        s.name.trim().toLowerCase() === verifiedSourceName.toLowerCase(),
    );
    if (exactMatch?.name) {
      canonicalName = exactMatch.name.trim();
    }
  }

  // Strip stray characters/whitespace cleanly
  const cleaned = canonicalName.replace(/\s+/g, ' ').trim();
  if (!cleaned || INVALID_NAME_TOKENS.has(cleaned.toLowerCase())) return null;

  if (params.preferredFirstNameOnly !== false) {
    const firstToken = cleaned.split(' ')[0]?.trim();
    if (firstToken && firstToken.length >= 2 && !INVALID_NAME_TOKENS.has(firstToken.toLowerCase())) {
      return firstToken;
    }
  }

  return cleaned;
}

export function stripNotificationEmojis(text: string): string {
  return String(text || '')
    .replace(EMOJI_AND_SYMBOL_PREFIX_REGEX, '')
    .replace(ALL_DECORATIVE_EMOJIS_REGEX, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export function formatNotificationTitle(
  rawTitle: string,
  type: AppNotifType = 'INFO',
  recipientName?: string | null,
): string {
  const cleaned = stripNotificationEmojis(rawTitle);

  if (!cleaned) {
    if (recipientName) {
      return type === 'WARNING' || type === 'ERROR'
        ? `${recipientName}, একটি জরুরি তথ্য`
        : `${recipientName}, নতুন আপডেট`;
    }
    return type === 'WARNING' || type === 'ERROR'
      ? `${COMPANY_FULL_NAME} — জরুরি তথ্য`
      : COMPANY_FULL_NAME;
  }

  // If caller already personalized title with recipientName, preserve cleanly without double prefixing
  if (recipientName && !cleaned.toLowerCase().startsWith(recipientName.toLowerCase())) {
    // Keep concise within Android single-line title limit (~42 chars)
    const candidate = `${recipientName}, ${cleaned}`;
    if (candidate.length <= 48) {
      return candidate;
    }
  }

  return cleaned;
}

export function formatNotificationBody(
  rawMessage: string,
  options?: {
    type?: AppNotifType;
    tab?: string;
    timestampMs?: number;
    includeCompanyFooter?: boolean;
  },
): string {
  const cleanMsg = String(rawMessage || '')
    .split('\n')
    .map((line) => stripNotificationEmojis(line))
    .filter(Boolean)
    .join('\n');

  const tab = options?.tab ? resolveNotificationTab(options.tab) : undefined;
  const sectionLabel = tab && TAB_LABELS_BN[tab] ? TAB_LABELS_BN[tab] : undefined;

  const ts = options?.timestampMs ? new Date(options.timestampMs) : new Date();
  const timeText = ts.toLocaleTimeString('bn-BD', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const footerParts: string[] = [];
  if (options?.includeCompanyFooter !== false) {
    footerParts.push(COMPANY_FULL_NAME);
  }
  if (sectionLabel) {
    footerParts.push(`বিভাগ: ${sectionLabel}`);
  }
  footerParts.push(`সময়: ${timeText}`);

  const compactFooter = footerParts.join(' • ');

  if (!cleanMsg) {
    return compactFooter;
  }

  // Single compact newline creates clean visual hierarchy in expanded view
  // while keeping line 1 completely visible in Android's collapsed preview
  return `${cleanMsg}\n${compactFooter}`;
}

/**
 * Generates warm, natural, conversational Bangla notification copy per scenario
 * tailored strictly to the authenticated recipient (when known).
 */
export type HumanNotificationContext =
  | { kind: 'ATTENDANCE_REMINDER'; recipientName?: string | null }
  | { kind: 'EXPENSE_APPROVED'; recipientName?: string | null; amount: number }
  | { kind: 'EXPENSE_VERIFIED'; recipientName?: string | null; amount: number }
  | { kind: 'EXPENSE_REJECTED'; recipientName?: string | null; amount: number }
  | { kind: 'EXPENSE_NEW_SUBMITTED'; recipientName?: string | null; staffName: string; amount: number }
  | { kind: 'EXPENSE_PENDING_SUMMARY'; recipientName?: string | null; pendingCount: number }
  | { kind: 'CHAT_MESSAGE'; recipientName?: string | null; senderName: string; text: string }
  | { kind: 'MOVEMENT_UPDATE'; recipientName?: string | null; text: string }
  | { kind: 'STAFF_ONLINE'; recipientName?: string | null; staffName: string }
  | { kind: 'STAFF_LOGIN_ALERT'; recipientName?: string | null; staffName: string; deviceInfo: string; batteryLevel: string; location: string }
  | { kind: 'OFFLINE_SAVED'; recipientName?: string | null }
  | { kind: 'OFFLINE_SYNCED'; recipientName?: string | null }
  | { kind: 'SHARE_COPIED'; recipientName?: string | null }
  | { kind: 'BIOMETRICS_ENABLED'; recipientName?: string | null }
  | { kind: 'BIOMETRICS_ERROR'; recipientName?: string | null; errorDetail?: string };

export function composeHumanNotification(ctx: HumanNotificationContext): {
  title: string;
  message: string;
  type: AppNotifType;
  link?: string;
  dedupeKey: string;
  cooldownMs: number;
} {
  const name = ctx.recipientName ? ctx.recipientName.trim() : null;
  const addr = (textWithName: string, textWithoutName: string) =>
    name ? textWithName : textWithoutName;

  switch (ctx.kind) {
    case 'ATTENDANCE_REMINDER': {
      const todayKey = new Date().toISOString().split('T')[0];
      return {
        title: addr(`${name}, একটা কথা মনে করিয়ে দিই!`, 'আজকের হাজিরার কথা মনে করিয়ে দিই!'),
        message: 'আজ এখনো আপনার হাজিরা দেওয়া হয়নি। সময় থাকতেই Check-in করে নিন।',
        type: 'WARNING',
        link: 'attendance',
        dedupeKey: `attendance-reminder:${todayKey}:${name || 'self'}`,
        cooldownMs: 3 * 60 * 60 * 1000, // 3 hours per device/session
      };
    }

    case 'EXPENSE_APPROVED':
      return {
        title: addr(`${name}, আপনার বিল অনুমোদিত হয়েছে`, 'আপনার বিল অনুমোদিত হয়েছে'),
        message: `আপনার ৳${ctx.amount.toLocaleString('en-IN')} টাকার বিলটি অনুমোদন করা হয়েছে। চাইলে এখনই বিস্তারিত দেখে নিতে পারেন।`,
        type: 'SUCCESS',
        link: 'expenses',
        dedupeKey: `expense-approved:${ctx.amount}:${name || 'self'}`,
        cooldownMs: 60 * 1000,
      };

    case 'EXPENSE_VERIFIED':
      return {
        title: addr(`${name}, আপনার বিলের আপডেট`, 'বিল যাচাই সম্পন্ন হয়েছে'),
        message: `আপনার ৳${ctx.amount.toLocaleString('en-IN')} টাকার বিলটি যাচাই হয়ে গেছে এবং চূড়ান্ত অনুমোদনের জন্য পাঠানো হয়েছে।`,
        type: 'INFO',
        link: 'expenses',
        dedupeKey: `expense-verified:${ctx.amount}:${name || 'self'}`,
        cooldownMs: 60 * 1000,
      };

    case 'EXPENSE_REJECTED':
      return {
        title: addr(`${name}, বিলটি একটু দেখে নিন`, 'বিলটি পুনরায় দেখা প্রয়োজন'),
        message: `আপনার ৳${ctx.amount.toLocaleString('en-IN')} টাকার বিলটি অনুমোদিত হয়নি। কারণ দেখে প্রয়োজনে সংশোধন করে নিন।`,
        type: 'ERROR',
        link: 'expenses',
        dedupeKey: `expense-rejected:${ctx.amount}:${name || 'self'}`,
        cooldownMs: 60 * 1000,
      };

    case 'EXPENSE_NEW_SUBMITTED':
      return {
        title: addr(`${name}, নতুন একটি বিল এসেছে`, 'নতুন বিল জমা পড়েছে'),
        message: `${ctx.staffName} ৳${ctx.amount.toLocaleString('en-IN')} টাকার একটি বিল জমা দিয়েছেন। সুবিধামতো সময়ে দেখে নিতে পারেন।`,
        type: 'INFO',
        link: 'expenses',
        dedupeKey: `expense-new:${ctx.staffName}:${ctx.amount}`,
        cooldownMs: 60 * 1000,
      };

    case 'EXPENSE_PENDING_SUMMARY': {
      const todayKey = new Date().toISOString().split('T')[0];
      return {
        title: addr(`${name}, কিছু বিল অপেক্ষায় আছে`, 'অপেক্ষমাণ বিলের তথ্য'),
        message: `বর্তমানে ${ctx.pendingCount}টি বিল অনুমোদনের অপেক্ষায় রয়েছে। সময় পেলে যাচাই করে নিতে পারেন।`,
        type: 'WARNING',
        link: 'expenses',
        dedupeKey: `expense-pending:${todayKey}:${ctx.pendingCount}`,
        cooldownMs: 30 * 60 * 1000,
      };
    }

    case 'CHAT_MESSAGE':
      return {
        title: addr(
          `${name}, ${ctx.senderName} মেসেজ দিয়েছেন`,
          `${ctx.senderName} নতুন মেসেজ দিয়েছেন`,
        ),
        message: stripNotificationEmojis(ctx.text) || 'টিম চ্যাটে একটি নতুন বার্তা এসেছে।',
        type: 'INFO',
        link: 'chat',
        dedupeKey: `chat:${ctx.senderName}:${ctx.text.slice(0, 40)}`,
        cooldownMs: 15 * 1000,
      };

    case 'MOVEMENT_UPDATE':
      return {
        title: addr(`${name}, মুভমেন্টের নতুন তথ্য`, 'স্টাফ মুভমেন্টের নতুন তথ্য'),
        message: stripNotificationEmojis(ctx.text),
        type: 'INFO',
        link: 'movements',
        dedupeKey: `movement:${ctx.text.slice(0, 48)}`,
        cooldownMs: 30 * 1000,
      };

    case 'STAFF_ONLINE':
      return {
        title: addr(`${name}, ${ctx.staffName} এখন অনলাইনে`, `${ctx.staffName} এখন অনলাইনে`),
        message: `${ctx.staffName} মাত্রই অ্যাপে যুক্ত হয়েছেন। প্রয়োজনে স্টাফ তালিকা থেকে অবস্থা দেখে নিন।`,
        type: 'INFO',
        link: 'staff',
        dedupeKey: `online:${ctx.staffName}`,
        cooldownMs: 5 * 60 * 1000,
      };

    case 'STAFF_LOGIN_ALERT':
      return {
        title: addr(
          `${name}, ${ctx.staffName} লগইন করেছেন`,
          `${ctx.staffName} সিস্টেমে লগইন করেছেন`,
        ),
        message: `${ctx.staffName} এইমাত্র অ্যাপে প্রবেশ করেছেন।\nডিভাইস: ${ctx.deviceInfo} • ব্যাটারি: ${ctx.batteryLevel}\nলোকেশন: ${ctx.location}`,
        type: 'WARNING',
        link: 'staff',
        dedupeKey: `login:${ctx.staffName}`,
        cooldownMs: 60 * 1000,
      };

    case 'OFFLINE_SAVED':
      return {
        title: addr(`${name}, ইন্টারনেট সংযোগ নেই`, 'ইন্টারনেট সংযোগ বিচ্ছিন্ন রয়েছে'),
        message: 'আপনার তথ্য নিরাপদে অফলাইনে রাখা হয়েছে। নেটওয়ার্ক ফিরে এলেই নিজ থেকেই সার্ভারে পৌঁছে যাবে।',
        type: 'WARNING',
        link: 'dashboard',
        dedupeKey: 'offline-warning',
        cooldownMs: 2 * 60 * 1000,
      };

    case 'OFFLINE_SYNCED':
      return {
        title: addr(`${name}, সব তথ্য পৌঁছে গেছে`, 'অফলাইন ডাটা সিঙ্ক সম্পন্ন হয়েছে'),
        message: 'আপনার অফলাইনে সংরক্ষিত তথ্যগুলো সফলভাবে সার্ভারে পাঠানো হয়েছে।',
        type: 'SUCCESS',
        link: 'dashboard',
        dedupeKey: 'offline-synced',
        cooldownMs: 60 * 1000,
      };

    case 'SHARE_COPIED':
      return {
        title: addr(`${name}, লিংক কপি হয়েছে`, 'অ্যাপের লিংক কপি হয়েছে'),
        message: 'অ্যাপ লিংক ক্লিপবোর্ডে কপি করা হয়েছে। এখন সহজেই শেয়ার করতে পারবেন।',
        type: 'SUCCESS',
        link: 'dashboard',
        dedupeKey: 'share-copied',
        cooldownMs: 10 * 1000,
      };

    case 'BIOMETRICS_ENABLED':
      return {
        title: addr(`${name}, বায়োমেট্রিক লগইন চালু হয়েছে`, 'বায়োমেট্রিক লগইন চালু হয়েছে'),
        message: 'এখন থেকে ফিঙ্গারপ্রিন্ট বা ফেস আনলকের মাধ্যমে দ্রুত অ্যাপে প্রবেশ করতে পারবেন।',
        type: 'SUCCESS',
        link: 'staff',
        dedupeKey: 'biometrics-enabled',
        cooldownMs: 60 * 1000,
      };

    case 'BIOMETRICS_ERROR':
      return {
        title: addr(`${name}, বায়োমেট্রিক সেটআপ হয়নি`, 'বায়োমেট্রিক সেটআপে সমস্যা হয়েছে'),
        message:
          stripNotificationEmojis(ctx.errorDetail || '') ||
          'এই মুহূর্তে বায়োমেট্রিক সেটআপ সম্পন্ন করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।',
        type: 'ERROR',
        link: 'staff',
        dedupeKey: 'biometrics-error',
        cooldownMs: 10 * 1000,
      };
  }
}

/**
 * Duplicate notification suppression guard with optional persistent cooldowns
 * so re-renders, Realtime syncs, or page reloads never annoy staff with repeats.
 */
export class NotificationDeduplicator {
  private memoryTimestamps = new Map<string, number>();
  private storageKey: string;

  constructor(storageKey: string = 'depend_notif_dedupe_v1') {
    this.storageKey = storageKey;
  }

  private readPersisted(): Record<string, number> {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return {};
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private writePersisted(data: Record<string, number>): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const entries = Object.entries(data)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 60);
      window.localStorage.setItem(this.storageKey, JSON.stringify(Object.fromEntries(entries)));
    } catch {}
  }

  shouldSuppress(
    key: string,
    cooldownMs: number = 90 * 1000,
    nowMs: number = Date.now(),
  ): boolean {
    if (!key || cooldownMs <= 0) return false;
    const memLast = this.memoryTimestamps.get(key);
    if (memLast !== undefined && nowMs - memLast < cooldownMs) {
      return true;
    }
    const persisted = this.readPersisted();
    const persistedLast = persisted[key];
    if (typeof persistedLast === 'number' && nowMs - persistedLast < cooldownMs) {
      this.memoryTimestamps.set(key, persistedLast);
      return true;
    }
    return false;
  }

  recordSent(key: string, nowMs: number = Date.now()): void {
    if (!key) return;
    this.memoryTimestamps.set(key, nowMs);
    const persisted = this.readPersisted();
    persisted[key] = nowMs;
    this.writePersisted(persisted);
  }
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
  renotify?: boolean;
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
  params: BuildNotifOptionsParams,
): ServiceWorkerNotificationOptions {
  const type = params.type || 'INFO';
  const tab = resolveNotificationTab(params.link);
  const timestampMs = params.timestampMs || Date.now();
  const isUrgent =
    params.requireInteraction !== undefined
      ? params.requireInteraction
      : type === 'WARNING' || type === 'ERROR' || tab === 'expenses' || tab === 'attendance';

  const safeTag = params.tag || `depend-sourcing-${tab || type.toLowerCase()}`;
  const actionTitle = TAB_ACTION_LABELS_BN[tab] || 'অ্যাপে দেখুন';

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
    renotify: params.renotify !== undefined ? params.renotify : false,
    timestamp: timestampMs,
    vibrate: isUrgent ? [180, 70, 180] : [120, 50, 120],
    requireInteraction: isUrgent,
    silent: false,
    actions: [
      {
        action: 'open',
        title: actionTitle,
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
  params: BuildNotifOptionsParams,
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
