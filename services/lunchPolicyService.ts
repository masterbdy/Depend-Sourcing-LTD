import { UserRole, BillingRule, Expense } from '../types';

export interface LunchDetectionResult {
  isLunch: boolean;
  confidence: 'NONE' | 'AMBIGUOUS' | 'STRONG' | 'EXACT';
  matchedPattern?: string;
  detectedTerm?: string;
  reason?: string;
  requiresClarification: boolean;
  isCategoryMismatch?: boolean;
}

export interface LunchAuditRecord {
  action: 'POLICY_CHECK' | 'CATEGORY_CLARIFICATION' | 'POLICY_REJECTION' | 'POLICY_OVERRIDE';
  details: string;
  timestamp: string;
  actor: string;
}

export interface LunchPolicyValidation {
  allowed: boolean;
  lunchDetected: boolean;
  category: string;
  limit: number;
  amount: number;
  requiresClarification: boolean;
  clarificationMessage?: string;
  policyError?: string;
  auditRecord?: LunchAuditRecord;
}

// ----------------------------------------------------------------------
// PRECOMPILED PATTERNS & CURATED ALIASES (0ms overhead, zero keystroke lag)
// ----------------------------------------------------------------------

// Exact curated lowercase tokens for English / Banglish
const CURATED_EXACT_TOKENS = new Set([
  'lunch',
  'lanch',
  'launch',
  'lunsh',
  'lonch',
  'lunc',
  'linch',
  'luns',
  'lansh',
  'luncher',
  'lancher',
  'lanser',
  'লাঞ্চ',
  'লান্স',
  'লান্চ',
  'লাঞ্ছ',
  'লানচ',
  'লানস',
  'লাঞ্চের',
  'লান্সের',
  'লান্চের',
  'লাঞ্চে',
  'লান্সে',
]);

// Multi-word exact phrase patterns
const STRONG_PHRASE_REGEX = new RegExp(
  '\\b(lunch\\s*bill|lanch\\s*bill|launch\\s*bill|lunch\\s*khoroch|lanch\\s*khoroch|' +
  'lunch\\s*expense|lanch\\s*expense|lunch\\s*er\\s*bill|lanch\\s*er\\s*bill|' +
  'luncher\\s*bill|lancher\\s*bill|lunch\\s*allowance|lanch\\s*allowance)\\b|' +
  '(লাঞ্চ\\s*বিল|লান্স\\s*বিল|লান্চ\\s*বিল|লাঞ্ছ\\s*বিল|লাঞ্চের\\s*বিল|লান্সের\\s*বিল|লান্চের\\s*বিল|' +
  'লাঞ্চ\\s*খরচ|লান্স\\s*খরচ|লান্চ\\s*খরচ|লাঞ্চের\\s*খরচ|লান্সের\\s*খরচ|' +
  'দুপুরের\\s*খাবার|দুপুরের\\s*লাঞ্চ|দুপুরের\\s*খাওয়ার|দুপুরের\\s*মিল)',
  'i'
);

// High-priority negative exclusion contexts (False-Positive Prevention)
// Unrelated words that sound or look similar but are NOT lunch
const NEGATIVE_CONTEXT_REGEX = new RegExp(
  '\\b(rocket\\s*launch|product\\s*launch|app\\s*launch|system\\s*launch|' +
  'website\\s*launch|grand\\s*launch|launch\\s*pad|launching|launched|launch\\s*ceremony|' +
  'punch|bench|branch|pinch|bunch|crunch|munch|ranch|trench|linchpin|paunch)\\b|' +
  '(সদরঘাট\\s*লঞ্চ|বরিশাল\\s*লঞ্চ|লঞ্চ\\s*ঘাট|লঞ্চের\\s*টিকিট|লঞ্চ\\s*ভাড়া|লঞ্চ\\s*ভারা|নৌকা|জাহাজ)',
  'i'
);

// Specific false-friend single words
const EXCLUDED_WORDS = new Set([
  'punch', 'bench', 'branch', 'pinch', 'bunch', 'crunch', 'munch', 'ranch',
  'trench', 'linchpin', 'paunch', 'launchpad', 'launching', 'launched',
  'rickshaw', 'ricksa', 'riksa', 'bus', 'cng', 'taxi', 'bike', 'uber', 'pathao',
  'diesel', 'octane', 'petrol', 'fare', 'vara', 'bhara',
  'nasta', 'nashta', 'breakfast', 'dinner', 'night', 'hotel', 'coffee', 'tea', 'cha', 'biskut',
  'rent', 'salary', 'stationery', 'courier', 'print', 'xerox',
  'রিকশা', 'রিকসা', 'রিস্কা', 'ভাড়া', 'ভারা', 'বাস', 'সিএনজি', 'ডিজেল', 'অকটেন',
  'নাস্তা', 'নাসতা', 'চা', 'বিস্কুট', 'ডিনার', 'রাতের খাবার'
]);

// Fast bounded Levenshtein distance with zero heap allocation
function fastBoundedDistance(a: string, b: string, maxDist: number = 1): number {
  if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1;
  if (a === b) return 0;
  
  let diff = 0;
  if (a.length === b.length) {
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        diff++;
        if (diff > maxDist) return maxDist + 1;
      }
    }
    return diff;
  }
  
  // Single insertion/deletion check
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < longer.length && j < shorter.length) {
    if (longer[i] !== shorter[j]) {
      edits++;
      if (edits > maxDist) return maxDist + 1;
      i++;
    } else {
      i++;
      j++;
    }
  }
  return edits + (longer.length - i);
}

/**
 * Standardize text: lowercase English, strip extraneous punctuation, collapse spaces.
 */
export function normalizeExpenseText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[\-_,.:;!?'"/\\()\[\]{}|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detect Lunch from Category or Description with Typo Tolerance.
 * Priority 1: Structured Category
 * Priority 2: Curated phrase/token matching
 * Priority 3: Bounded typo matching (distance <= 1)
 * Safe Negative: Exclusions for unrelated words (punch, bench, rocket launch, etc.)
 */
export function detectLunchExpense(
  description: string,
  category?: string
): LunchDetectionResult {
  const normCategory = (category || '').trim().toUpperCase();
  const isCategoryLunch = normCategory === 'LUNCH' || normCategory === 'লাঞ্চ';

  // PRIORITY 1: Structured Category has the highest priority
  if (isCategoryLunch) {
    return {
      isLunch: true,
      confidence: 'EXACT',
      matchedPattern: 'CATEGORY_LUNCH',
      detectedTerm: category,
      reason: 'Structured Category indicates Lunch',
      requiresClarification: false,
      isCategoryMismatch: false,
    };
  }

  const raw = description || '';
  const normalized = normalizeExpenseText(raw);
  if (!normalized) {
    return {
      isLunch: false,
      confidence: 'NONE',
      requiresClarification: false,
    };
  }

  // Check negative exclusion context first (e.g., "rocket launch", "punch", "লঞ্চ ভাড়া")
  if (NEGATIVE_CONTEXT_REGEX.test(raw)) {
    return {
      isLunch: false,
      confidence: 'NONE',
      reason: 'Negative context or false-friend matched (e.g., product launch, water ferry, punch)',
      requiresClarification: false,
    };
  }

  // PRIORITY 2: Check strong multi-word phrases (e.g. "লাঞ্চ বিল", "lanch bill", "lunch khoroch")
  const phraseMatch = raw.match(STRONG_PHRASE_REGEX);
  if (phraseMatch) {
    const matchedTerm = phraseMatch[0];
    const isMismatch = Boolean(category && !isCategoryLunch && category !== 'OTHER' && category !== 'GENERAL');
    return {
      isLunch: true,
      confidence: 'STRONG',
      matchedPattern: 'STRONG_PHRASE',
      detectedTerm: matchedTerm,
      reason: `Strong lunch phrase found: "${matchedTerm}"`,
      requiresClarification: isMismatch,
      isCategoryMismatch: isMismatch,
    };
  }

  // Tokenize normalized text into distinct words
  const tokens = normalized.split(/\s+/).filter(Boolean);

  for (const token of tokens) {
    // If token is explicitly excluded (e.g. 'punch', 'bench', 'rickshaw', etc.)
    if (EXCLUDED_WORDS.has(token)) {
      continue;
    }

    // Exact match in curated set (e.g., 'lunch', 'lanch', 'লাঞ্চ', 'লান্স', 'লান্চ')
    if (CURATED_EXACT_TOKENS.has(token)) {
      // Special note on "launch": if it's solely "launch" with no other words or just an amount,
      // it might be ambiguous unless accompanied by bill/meal context.
      const isAmbiguousLaunch = token === 'launch' && tokens.length === 1;
      const confidence = isAmbiguousLaunch ? 'AMBIGUOUS' : 'STRONG';
      const isMismatch = Boolean(category && !isCategoryLunch && category !== 'OTHER' && category !== 'GENERAL');

      return {
        isLunch: true,
        confidence,
        matchedPattern: 'CURATED_TOKEN',
        detectedTerm: token,
        reason: `Lunch keyword detected: "${token}"`,
        requiresClarification: isAmbiguousLaunch || isMismatch,
        isCategoryMismatch: isMismatch,
      };
    }

    // Bounded Typo Matching (Distance <= 1 against 'lunch', 'lanch', 'লাঞ্চ', 'লান্স')
    // Token length must be within 4 to 6 chars to prevent over-matching short words
    if (token.length >= 4 && token.length <= 6) {
      const distLunch = fastBoundedDistance(token, 'lunch', 1);
      const distLanch = fastBoundedDistance(token, 'lanch', 1);

      if (distLunch <= 1 || distLanch <= 1) {
        // Double-check not excluded
        if (!EXCLUDED_WORDS.has(token)) {
          const isMismatch = Boolean(category && !isCategoryLunch && category !== 'OTHER' && category !== 'GENERAL');
          return {
            isLunch: true,
            confidence: 'AMBIGUOUS',
            matchedPattern: 'BOUNDED_TYPO',
            detectedTerm: token,
            reason: `Typo variant detected: "${token}" (approx. lunch/lanch)`,
            requiresClarification: true, // Typos should be clarified
            isCategoryMismatch: isMismatch,
          };
        }
      }
    }

    // Bengali Bounded Typo Matching (e.g. 'লাঞ্ছ' vs 'লাঞ্চ', 'লানচ' vs 'লান্স')
    if (token.length >= 3 && token.length <= 6) {
      const distBanglaLunch = fastBoundedDistance(token, 'লাঞ্চ', 1);
      const distBanglaLans = fastBoundedDistance(token, 'লান্স', 1);

      if (distBanglaLunch <= 1 || distBanglaLans <= 1) {
        if (!EXCLUDED_WORDS.has(token)) {
          const isMismatch = Boolean(category && !isCategoryLunch && category !== 'OTHER' && category !== 'GENERAL');
          return {
            isLunch: true,
            confidence: 'STRONG',
            matchedPattern: 'BANGLA_TYPO',
            detectedTerm: token,
            reason: `Bengali typo variant detected: "${token}"`,
            requiresClarification: isMismatch,
            isCategoryMismatch: isMismatch,
          };
        }
      }
    }
  }

  return {
    isLunch: false,
    confidence: 'NONE',
    requiresClarification: false,
  };
}

/**
 * Get active Lunch Limit from Billing Rules (default 150 BDT)
 */
export function getLunchLimitAmount(billingRules?: BillingRule[]): number {
  if (Array.isArray(billingRules)) {
    const lunchRule = billingRules.find((r) => r.type === 'LUNCH');
    if (lunchRule && typeof lunchRule.amount === 'number' && lunchRule.amount > 0) {
      return lunchRule.amount;
    }
  }
  return 150; // Standard company default policy limit
}

/**
 * Validate Lunch Policy & User-Based Authorization.
 * 
 * Rules:
 * - If detected as Lunch (via Category or Description):
 *   - Check User Role:
 *     - ADMIN / MD: Authorized to submit and override higher amounts.
 *     - STAFF: Unauthorized to exceed Lunch Limit (amount <= lunchLimit).
 * - If Category Mismatch:
 *   - Flag mismatch and request user clarification before proceeding.
 * - If Ambiguous:
 *   - Prompt confirmation instead of silently bypassing.
 * - Generate immutable Audit Log Record.
 */
export function validateLunchPolicy(params: {
  amount: number;
  reason: string;
  category?: string;
  role: UserRole;
  actorName: string;
  billingRules?: BillingRule[];
  userConfirmedCategoryAsLunch?: boolean;
  userClarifiedNotLunch?: boolean;
}): LunchPolicyValidation {
  const {
    amount,
    reason,
    category,
    role,
    actorName,
    billingRules,
    userConfirmedCategoryAsLunch,
    userClarifiedNotLunch,
  } = params;

  const lunchLimit = getLunchLimitAmount(billingRules);
  const now = new Date().toISOString();

  // If user explicitly clarified this is NOT lunch
  if (userClarifiedNotLunch) {
    return {
      allowed: true,
      lunchDetected: false,
      category: category || 'GENERAL',
      limit: lunchLimit,
      amount,
      requiresClarification: false,
      auditRecord: {
        action: 'CATEGORY_CLARIFICATION',
        details: `User clarified description "${reason}" is NOT Lunch. Retained category "${category || 'GENERAL'}".`,
        timestamp: now,
        actor: actorName,
      },
    };
  }

  // Detect lunch
  const detection = detectLunchExpense(reason, userConfirmedCategoryAsLunch ? 'LUNCH' : category);
  const isLunch = detection.isLunch || Boolean(userConfirmedCategoryAsLunch);
  const effectiveCategory = isLunch ? 'LUNCH' : (category || 'GENERAL');

  // Handle Category Mismatch or Ambiguity requiring clarification
  if (detection.requiresClarification && !userConfirmedCategoryAsLunch) {
    if (detection.isCategoryMismatch) {
      return {
        allowed: false,
        lunchDetected: true,
        category: effectiveCategory,
        limit: lunchLimit,
        amount,
        requiresClarification: true,
        clarificationMessage: `বিবরণে "${detection.detectedTerm || 'লাঞ্চ'}" উল্লেখ রয়েছে কিন্তু ক্যাটাগরি "${category}" নির্বাচিত। এটি কি লাঞ্চ বিল?`,
        auditRecord: {
          action: 'CATEGORY_CLARIFICATION',
          details: `Category mismatch detected: Category "${category}" vs description "${reason}". Clarification required.`,
          timestamp: now,
          actor: actorName,
        },
      };
    }

    if (detection.confidence === 'AMBIGUOUS') {
      return {
        allowed: false,
        lunchDetected: true,
        category: effectiveCategory,
        limit: lunchLimit,
        amount,
        requiresClarification: true,
        clarificationMessage: `খরচের বিবরণীতে "${detection.detectedTerm}" চিহ্নিত হয়েছে। এটি কি দুপুরের লাঞ্চ বিল? নিশ্চিত করুন।`,
        auditRecord: {
          action: 'CATEGORY_CLARIFICATION',
          details: `Ambiguous lunch variant "${detection.detectedTerm}" detected in "${reason}". User confirmation required.`,
          timestamp: now,
          actor: actorName,
        },
      };
    }
  }

  // If not lunch, check passes normally
  if (!isLunch) {
    return {
      allowed: true,
      lunchDetected: false,
      category: effectiveCategory,
      limit: lunchLimit,
      amount,
      requiresClarification: false,
    };
  }

  // Lunch is detected: ENFORCE LIMIT & USER-BASED AUTHORIZATION POLICY
  const isStaff = role === UserRole.STAFF;
  const isExecutive = role === UserRole.ADMIN || role === UserRole.MD;

  if (amount > lunchLimit) {
    if (isStaff) {
      // Standard staff is strictly unauthorized to exceed lunch bill limit
      const policyError = `লাঞ্চ বিলের সর্বোচ্চ অনুমোদিত সীমা ৳${lunchLimit}। আপনার দাবিকৃত পরিমাণ ৳${amount} স্টাফ পলিসি অনুযায়ী অনুমোদিত নয়।`;
      return {
        allowed: false,
        lunchDetected: true,
        category: 'LUNCH',
        limit: lunchLimit,
        amount,
        requiresClarification: false,
        policyError,
        auditRecord: {
          action: 'POLICY_REJECTION',
          details: `Lunch policy violation rejected for staff "${actorName}": Amount ৳${amount} exceeds authorized limit ৳${lunchLimit}. Reason: "${reason}"`,
          timestamp: now,
          actor: actorName,
        },
      };
    } else if (isExecutive) {
      // Admin / MD authorized override
      return {
        allowed: true,
        lunchDetected: true,
        category: 'LUNCH',
        limit: lunchLimit,
        amount,
        requiresClarification: false,
        auditRecord: {
          action: 'POLICY_OVERRIDE',
          details: `Executive authorization (${role} "${actorName}"): Lunch bill ৳${amount} exceeds standard limit ৳${lunchLimit}. Reason: "${reason}"`,
          timestamp: now,
          actor: actorName,
        },
      };
    }
  }

  // Amount within limit
  return {
    allowed: true,
    lunchDetected: true,
    category: 'LUNCH',
    limit: lunchLimit,
    amount,
    requiresClarification: false,
    auditRecord: {
      action: 'POLICY_CHECK',
      details: `Lunch bill verified within limit: ৳${amount} <= ৳${lunchLimit}. Category: LUNCH.`,
      timestamp: now,
      actor: actorName,
    },
  };
}
