import {
  type Attendance,
  type CustomPopup,
  type DailyReminderUserState,
  type Expense,
  type ReminderActionType,
  type Staff,
  UserRole,
} from '../types.js';

export const DHAKA_TIME_ZONE = 'Asia/Dhaka';
export const MAX_DAILY_BILL_REMINDERS = 3;
export const BILL_SNOOZE_DURATION_MS = 10 * 60 * 1000;

export interface DhakaTimeParts {
  dateBn: string; // YYYY-MM-DD
  hour: number; // 0..23
  minute: number; // 0..59
  second: number; // 0..59
  nowMs: number;
}

/**
 * Computes exact date & wall-clock time in Bangladesh Standard Time (Asia/Dhaka, UTC+6).
 */
export function getDhakaTimeParts(nowMs: number = Date.now()): DhakaTimeParts {
  const date = new Date(nowMs);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: DHAKA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const partsMap: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') {
      partsMap[part.type] = part.value;
    }
  }

  const rawHour = parseInt(partsMap.hour || '0', 10);
  const hour = rawHour === 24 ? 0 : rawHour;
  const minute = parseInt(partsMap.minute || '0', 10);
  const second = parseInt(partsMap.second || '0', 10);
  const dateBn = `${partsMap.year}-${partsMap.month}-${partsMap.day}`;

  return { dateBn, hour, minute, second, nowMs };
}

/**
 * Converts an ISO timestamp or epoch ms to YYYY-MM-DD in Asia/Dhaka.
 */
export function toDhakaDateString(input?: string | number | null): string | null {
  if (!input) return null;
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
    return input.trim();
  }
  const ms = typeof input === 'number' ? input : Date.parse(String(input));
  if (Number.isNaN(ms)) return null;
  return getDhakaTimeParts(ms).dateBn;
}

export function sanitizeFirebaseKey(rawKey: string): string {
  return String(rawKey || 'unknown')
    .trim()
    .replace(/[.#$\[\]/\s]+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 120) || 'unknown';
}

export function extractFirstName(fullName?: string | null): string | null {
  if (!fullName || typeof fullName !== 'string') return null;
  const cleaned = fullName.replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  const invalid = new Set(['guest', 'unknown', 'user', 'staff', 'null', 'undefined', 'n/a', 'na', 'none']);
  if (invalid.has(cleaned.toLowerCase())) return null;
  const first = cleaned.split(' ')[0]?.trim();
  if (!first || first.length < 2 || invalid.has(first.toLowerCase())) return null;
  return first;
}

export function isStaffEligibleForDailyReminders(staff?: Staff | null): boolean {
  if (!staff) return false;
  if (staff.status === 'DEACTIVATED') return false;
  if (staff.isHardDeleted || staff.deletedAt) return false;
  if (
    staff.role === UserRole.MD ||
    staff.role === UserRole.GUEST ||
    staff.role === UserRole.KIOSK
  ) {
    return false;
  }
  return Boolean(staff.id && staff.name);
}

export function doesRecordMatchStaff(
  recordStaffId?: string | null,
  recordStaffName?: string | null,
  staff?: { id?: string | null; name?: string | null } | null,
): boolean {
  if (!staff) return false;
  const targetId = typeof staff.id === 'string' ? staff.id.trim() : '';
  const targetName = typeof staff.name === 'string' ? staff.name.trim().toLowerCase() : '';

  if (targetId && recordStaffId && recordStaffId.trim() === targetId) {
    return true;
  }
  if (targetName && recordStaffName && recordStaffName.trim().toLowerCase() === targetName) {
    return true;
  }
  return false;
}

/**
 * Checks if a user has checked in (or has recorded present/late/leave) on the given Asia/Dhaka date.
 */
export function hasUserCheckedInOnDate(
  attendanceList: Attendance[],
  staff: { id?: string | null; name?: string | null },
  dateBn: string,
): boolean {
  if (!Array.isArray(attendanceList) || !dateBn) return false;
  return attendanceList.some((a) => {
    if (!a) return false;
    if (!doesRecordMatchStaff(a.staffId, a.staffName, staff)) return false;

    const recordDateBn =
      toDhakaDateString(a.checkInTime) || toDhakaDateString(a.date);
    if (recordDateBn !== dateBn) return false;

    if (a.status === 'ABSENT') return false;
    return (
      a.status === 'PRESENT' ||
      a.status === 'LATE' ||
      a.status === 'LEAVE' ||
      Boolean(a.checkInTime)
    );
  });
}

/**
 * Strictly determines whether a staff member has a REAL, successfully submitted bill
 * for the given Asia/Dhaka date.
 * Rejects drafts, local offline queued bills, failed/conflicted syncs, deleted bills,
 * and zero/invalid amounts.
 */
export function hasUserSubmittedBillOnDate(
  expenses: Expense[],
  staff: { id?: string | null; name?: string | null },
  dateBn: string,
): boolean {
  if (!Array.isArray(expenses) || !dateBn) return false;
  return expenses.some((e) => {
    if (!e || e.isDeleted || e.isHardDeleted) return false;
    if (!doesRecordMatchStaff(e.staffId, e.staffName, staff)) return false;
    if (!(Number(e.amount) > 0)) return false;

    // Exclude unsent / draft / failed / local pending sync states
    if (
      e.syncStatus &&
      e.syncStatus !== 'SUBMITTED'
    ) {
      return false;
    }

    const billDateBn =
      toDhakaDateString(e.submittedAt) || toDhakaDateString(e.createdAt);
    return billDateBn === dateBn;
  });
}

export function createInitialDailyReminderState(
  dateBn: string,
  staff: { id: string; name: string },
  nowMs: number = Date.now(),
): DailyReminderUserState {
  return {
    date: dateBn,
    staffId: staff.id,
    staffName: staff.name,
    billReminderCount: 0,
    billNoBillToday: false,
    updatedAt: new Date(nowMs).toISOString(),
  };
}

export function normalizeDailyReminderState(
  raw: Partial<DailyReminderUserState> | null | undefined,
  dateBn: string,
  staff: { id: string; name: string },
): DailyReminderUserState {
  // Strict daily isolation: if stored state belongs to a previous date, start completely fresh
  if (!raw || raw.date !== dateBn) {
    return createInitialDailyReminderState(dateBn, staff);
  }
  return {
    date: dateBn,
    staffId: raw.staffId || staff.id,
    staffName: raw.staffName || staff.name,
    attendance9SentAt: raw.attendance9SentAt,
    attendance10SentAt: raw.attendance10SentAt,
    attendanceSuppressedReason: raw.attendanceSuppressedReason,
    billReminderCount:
      typeof raw.billReminderCount === 'number' && raw.billReminderCount >= 0
        ? raw.billReminderCount
        : 0,
    billInitialSentAt: raw.billInitialSentAt,
    billLastSentAt: raw.billLastSentAt,
    billFollowUp1SentAt: raw.billFollowUp1SentAt,
    billFollowUp2SentAt: raw.billFollowUp2SentAt,
    billNoBillToday: Boolean(raw.billNoBillToday),
    billNoBillAt: raw.billNoBillAt,
    billSnoozeUntil:
      typeof raw.billSnoozeUntil === 'number' ? raw.billSnoozeUntil : undefined,
    billSnoozeSequence:
      typeof raw.billSnoozeSequence === 'number' ? raw.billSnoozeSequence : undefined,
    billSubmittedTodayAt: raw.billSubmittedTodayAt,
    updatedAt: raw.updatedAt || new Date().toISOString(),
    lastDeliveryStatus: raw.lastDeliveryStatus,
  };
}

export function buildReminderIdempotencyKey(
  dateBn: string,
  staffId: string,
  slot:
    | 'ATTENDANCE_9AM'
    | 'ATTENDANCE_10AM'
    | 'BILL_8PM'
    | 'BILL_FOLLOWUP_1'
    | 'BILL_FOLLOWUP_2',
): string {
  return `${dateBn}_${sanitizeFirebaseKey(staffId)}_${slot}`;
}

export interface ComposedReminderMessage {
  slot:
    | 'ATTENDANCE_9AM'
    | 'ATTENDANCE_10AM'
    | 'BILL_8PM'
    | 'BILL_FOLLOWUP_1'
    | 'BILL_FOLLOWUP_2'
    | 'POP_MESSAGE';
  title: string;
  body: string;
  link: string;
  url: string;
  tag: string;
  actions?: Array<{ action: string; title: string }>;
}

export function composeAttendance9Reminder(
  recipientFullName?: string | null,
): ComposedReminderMessage {
  const firstName = extractFirstName(recipientFullName);
  const title = firstName
    ? `আসসালামু আলাইকুম ${firstName}, শুভ সকাল`
    : 'আসসালামু আলাইকুম, শুভ সকাল';
  const body =
    'আপনার দিনটি সুন্দর হোক। আপনি কি আজকে হাজিরা দিতে ভুলে গেছেন?';

  return {
    slot: 'ATTENDANCE_9AM',
    title,
    body,
    link: 'attendance',
    url: '/?tab=attendance',
    tag: 'depend-attendance-9am',
    actions: [{ action: 'open', title: 'Check-in করুন' }],
  };
}

export function composeAttendance10Reminder(
  recipientFullName?: string | null,
): ComposedReminderMessage {
  const firstName = extractFirstName(recipientFullName);
  const title = firstName
    ? `আসসালামু আলাইকুম ${firstName}! 😊`
    : 'আসসালামু আলাইকুম! 😊';
  const body =
    'আপনার আজকের হাজিরা কি এখনো দেওয়া হয়নি? সময় করে হাজিরাটা দিয়ে দিন।';

  return {
    slot: 'ATTENDANCE_10AM',
    title,
    body,
    link: 'attendance',
    url: '/?tab=attendance',
    tag: 'depend-attendance-10am',
    actions: [{ action: 'open', title: 'Check-in করুন' }],
  };
}

export const BILL_REMINDER_ACTIONS: Array<{ action: string; title: string }> = [
  { action: 'bill_now', title: 'এখনই করছি' },
  { action: 'bill_snooze_10m', title: '১০ মিনিট পর' },
  { action: 'bill_none', title: 'বিল নেই' },
];

export function composeBill8Reminder(
  recipientFullName?: string | null,
): ComposedReminderMessage {
  const firstName = extractFirstName(recipientFullName);
  const greeting = firstName
    ? `আসসালামু আলাইকুম ${firstName}! 😊`
    : 'আসসালামু আলাইকুম! 😊';
  const body =
    'আজকে আপনার কোনো খরচ বা বিল কি এখনো জমা দেওয়া বাকি আছে? ব্যস্ততায় ভুলে গিয়ে থাকলে সমস্যা নেই। একটু সময় করে জমা দিয়ে দিন।';

  return {
    slot: 'BILL_8PM',
    title: greeting,
    body,
    link: 'expenses',
    url: '/?tab=expenses&openBillEntry=1',
    tag: 'depend-bill-reminder',
    actions: BILL_REMINDER_ACTIONS,
  };
}

export function composeBillSnoozeFollowUp(
  recipientFullName?: string | null,
  followUpNumber: 1 | 2 = 1,
): ComposedReminderMessage {
  const firstName = extractFirstName(recipientFullName);
  const title = firstName
    ? `${firstName}, মনে করিয়ে দিচ্ছি 😊`
    : 'বিল জমার কথা মনে করিয়ে দিচ্ছি 😊';
  const body = firstName
    ? `${firstName}, ১০ মিনিট সময় দিয়েছিলাম 😊 আপনার বিলটি কি জমা দেওয়া হয়েছে? না হয়ে থাকলে একটু সময় করে জমা দিয়ে দিন।`
    : '১০ মিনিট সময় দিয়েছিলাম 😊 আপনার বিলটি কি জমা দেওয়া হয়েছে? না হয়ে থাকলে একটু সময় করে জমা দিয়ে দিন।';

  const canOfferSnoozeAgain = followUpNumber < 2; // Max 3 total (Initial + FU1 + FU2)
  const actions = canOfferSnoozeAgain
    ? BILL_REMINDER_ACTIONS
    : [
        { action: 'bill_now', title: 'এখনই করছি' },
        { action: 'bill_none', title: 'বিল নেই' },
      ];

  return {
    slot: followUpNumber === 1 ? 'BILL_FOLLOWUP_1' : 'BILL_FOLLOWUP_2',
    title,
    body,
    link: 'expenses',
    url: '/?tab=expenses&openBillEntry=1',
    tag: 'depend-bill-reminder',
    actions,
  };
}

export function composePopMessagePush(params: {
  popup: CustomPopup;
  recipientFullName?: string | null;
}): ComposedReminderMessage {
  const firstName = extractFirstName(params.recipientFullName);
  const rawTitle = String(params.popup.title || 'অফিস বার্তা').trim();
  const rawBody = String(params.popup.message || '').trim();
  const sender = params.popup.senderName?.trim();

  const title =
    firstName && !rawTitle.toLowerCase().startsWith(firstName.toLowerCase())
      ? `${firstName}, ${rawTitle}`
      : rawTitle;
  const senderLine = sender ? `প্রেরক: ${sender}\n` : '';

  return {
    slot: 'POP_MESSAGE',
    title,
    body: `${senderLine}${rawBody}`.trim(),
    link: 'dashboard',
    url: `/?tab=dashboard&popupId=${encodeURIComponent(params.popup.id)}`,
    tag: `popup-${params.popup.id}`,
    actions: [{ action: 'open', title: 'মেসেজ দেখুন' }],
  };
}

/**
 * Evaluates whether an attendance reminder should fire RIGHT NOW for a staff member.
 * Strictly ONLY allows 09:00 AM window [09:00..09:44] and 10:00 AM window [10:00..10:44]
 * in Asia/Dhaka. Never triggers at 00:00 (midnight) or on app open outside those windows.
 */
export function evaluateAttendanceSlot(params: {
  dhakaTime: DhakaTimeParts;
  state: DailyReminderUserState;
  staff: Staff;
  attendanceList: Attendance[];
}): {
  shouldSend: boolean;
  slot?: 'ATTENDANCE_9AM' | 'ATTENDANCE_10AM';
  skipReason?: string;
} {
  const { dhakaTime, state, staff, attendanceList } = params;

  const isNineWindow = dhakaTime.hour === 9 && dhakaTime.minute >= 0 && dhakaTime.minute <= 44;
  const isTenWindow = dhakaTime.hour === 10 && dhakaTime.minute >= 0 && dhakaTime.minute <= 44;

  if (!isNineWindow && !isTenWindow) {
    return { shouldSend: false, skipReason: 'OUTSIDE_SCHEDULE_WINDOW' };
  }

  const checkedIn = hasUserCheckedInOnDate(attendanceList, staff, dhakaTime.dateBn);
  if (checkedIn) {
    return {
      shouldSend: false,
      skipReason: isNineWindow ? 'CHECKED_IN_BEFORE_9' : 'CHECKED_IN_TODAY',
    };
  }

  if (isNineWindow) {
    if (state.attendance9SentAt) {
      return { shouldSend: false, skipReason: 'ALREADY_SENT_9AM' };
    }
    return { shouldSend: true, slot: 'ATTENDANCE_9AM' };
  }

  // 10 AM window
  if (state.attendance10SentAt) {
    return { shouldSend: false, skipReason: 'ALREADY_SENT_10AM' };
  }
  return { shouldSend: true, slot: 'ATTENDANCE_10AM' };
}

/**
 * Evaluates whether an 8:00 PM initial bill reminder OR a due 10-minute snooze follow-up
 * should fire RIGHT NOW for a specific staff member.
 */
export function evaluateBillSlot(params: {
  dhakaTime: DhakaTimeParts;
  state: DailyReminderUserState;
  staff: Staff;
  expenses: Expense[];
}): {
  shouldSend: boolean;
  slot?: 'BILL_8PM' | 'BILL_FOLLOWUP_1' | 'BILL_FOLLOWUP_2';
  skipReason?: string;
  clearSnooze?: boolean;
} {
  const { dhakaTime, state, staff, expenses } = params;

  if (state.billNoBillToday) {
    return {
      shouldSend: false,
      skipReason: 'NO_BILL_SELECTED',
      clearSnooze: Boolean(state.billSnoozeUntil),
    };
  }

  if (state.billReminderCount >= MAX_DAILY_BILL_REMINDERS) {
    return {
      shouldSend: false,
      skipReason: 'MAX_DAILY_REMINDERS_REACHED',
      clearSnooze: Boolean(state.billSnoozeUntil),
    };
  }

  const submittedToday = hasUserSubmittedBillOnDate(
    expenses,
    staff,
    dhakaTime.dateBn,
  );
  if (submittedToday) {
    return {
      shouldSend: false,
      skipReason: 'BILL_ALREADY_SUBMITTED',
      clearSnooze: Boolean(state.billSnoozeUntil),
    };
  }

  // 1. Check due 10-minute snooze follow-up first (after 20:00 BDT on same day)
  if (
    typeof state.billSnoozeUntil === 'number' &&
    state.billSnoozeUntil > 0 &&
    dhakaTime.nowMs >= state.billSnoozeUntil
  ) {
    // Only follow up if on the same night (20:00..23:59 BDT) and initial was sent
    if (dhakaTime.hour >= 20 && state.billReminderCount >= 1 && state.billReminderCount < MAX_DAILY_BILL_REMINDERS) {
      const slot =
        state.billReminderCount === 1 ? 'BILL_FOLLOWUP_1' : 'BILL_FOLLOWUP_2';
      if (
        (slot === 'BILL_FOLLOWUP_1' && state.billFollowUp1SentAt) ||
        (slot === 'BILL_FOLLOWUP_2' && state.billFollowUp2SentAt)
      ) {
        return { shouldSend: false, skipReason: 'FOLLOWUP_ALREADY_SENT', clearSnooze: true };
      }
      return { shouldSend: true, slot };
    }
    // Expired from another period -> clean up snooze
    return { shouldSend: false, skipReason: 'SNOOZE_OUTSIDE_NIGHT_WINDOW', clearSnooze: true };
  }

  // 2. Check initial 8:00 PM BDT bill reminder window [20:00..20:44]
  const isBillWindow = dhakaTime.hour === 20 && dhakaTime.minute >= 0 && dhakaTime.minute <= 44;
  if (isBillWindow && state.billReminderCount === 0 && !state.billInitialSentAt) {
    return { shouldSend: true, slot: 'BILL_8PM' };
  }

  return { shouldSend: false, skipReason: 'NO_DUE_BILL_REMINDER' };
}

/**
 * Pure per-user daily state transition handler for notification actions & verified submissions.
 */
export function applyReminderActionToState(
  prevState: DailyReminderUserState,
  action: ReminderActionType,
  nowMs: number = Date.now(),
): {
  nextState: DailyReminderUserState;
  accepted: boolean;
  reason?: string;
} {
  const nowIso = new Date(nowMs).toISOString();

  switch (action) {
    case 'NOW_OPENED': {
      // Strictly does NOT stop reminders or mark bill submitted!
      return {
        nextState: {
          ...prevState,
          updatedAt: nowIso,
        },
        accepted: true,
        reason: 'OPENED_ENTRY_FORM_ONLY',
      };
    }

    case 'SNOOZE_10M': {
      if (prevState.billNoBillToday) {
        return { nextState: prevState, accepted: false, reason: 'NO_BILL_SELECTED' };
      }
      if (prevState.billSubmittedTodayAt) {
        return { nextState: prevState, accepted: false, reason: 'BILL_ALREADY_SUBMITTED' };
      }
      if (prevState.billReminderCount >= MAX_DAILY_BILL_REMINDERS) {
        return { nextState: prevState, accepted: false, reason: 'MAX_DAILY_LIMIT_3_REACHED' };
      }
      return {
        nextState: {
          ...prevState,
          billSnoozeUntil: nowMs + BILL_SNOOZE_DURATION_MS,
          billSnoozeSequence: (prevState.billSnoozeSequence || 0) + 1,
          updatedAt: nowIso,
        },
        accepted: true,
      };
    }

    case 'NO_BILL_TODAY': {
      return {
        nextState: {
          ...prevState,
          billNoBillToday: true,
          billNoBillAt: nowIso,
          billSnoozeUntil: undefined,
          updatedAt: nowIso,
        },
        accepted: true,
      };
    }

    case 'BILL_SUBMITTED_CONFIRMED': {
      return {
        nextState: {
          ...prevState,
          billSubmittedTodayAt: nowIso,
          billSnoozeUntil: undefined,
          updatedAt: nowIso,
        },
        accepted: true,
      };
    }
  }
}
