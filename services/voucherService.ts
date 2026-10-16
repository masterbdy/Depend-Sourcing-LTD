import QRCode from 'qrcode';
import { Expense, Staff, AdvanceLog, UserRole } from '../types';
import { numberToWordsEnglish, numberToWordsBengali } from './numberToWords';

export interface StaffVoucherStats {
  staffTodayAdvances: number;
  staffTodaySalaryAdvance: number;
  staffTodayExpensesSubmitted: number;
  staffTodayExpensesApproved: number;
  totalRegularAdvance: number;
  totalApprovedExpenses: number;
  balance: number; // positive: Cash in hand / Advance excess, negative: Payable to staff
}

/**
 * Formats a Date or date string to 'YYYY-MM-DD' strictly in Bangladesh (Asia/Dhaka) timezone.
 */
export function getDhakaDateStr(d: Date | string = new Date()): string {
  try {
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dateObj.getTime())) {
      if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.trim())) {
        return d.trim();
      }
      return '';
    }
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(dateObj);
  } catch {
    return '';
  }
}

/**
 * Checks if a given date string corresponds to today in the Bangladesh (Asia/Dhaka) timezone.
 */
export function isDhakaToday(dateStr?: string, todayDhaka?: string): boolean {
  if (!dateStr) return false;
  const currentToday = todayDhaka || getDhakaDateStr(new Date());
  if (dateStr.length === 10 && dateStr === currentToday) {
    return true;
  }
  const entryDhaka = getDhakaDateStr(dateStr);
  return entryDhaka === currentToday;
}

/**
 * Checks if a given date string matches a target YYYY-MM-DD day in the Bangladesh (Asia/Dhaka) timezone.
 */
export function isDhakaSameDay(dateStr?: string, targetDayStr?: string): boolean {
  if (!dateStr || !targetDayStr) return false;
  if (dateStr.length === 10 && dateStr === targetDayStr) {
    return true;
  }
  const entryDhaka = getDhakaDateStr(dateStr);
  return entryDhaka === targetDayStr;
}

/**
 * Formats a raw Bangladeshi or international phone number into a verified international format for WhatsApp.
 * Removes non-digits, strips leading zeros if needed, and prefixes Bangladesh country code '88'.
 */
export function formatToInternationalPhone(rawPhone?: string): {
  valid: boolean;
  international: string;
  display: string;
  error?: string;
} {
  if (!rawPhone || !rawPhone.trim()) {
    return {
      valid: false,
      international: '',
      display: '',
      error: 'স্টাফ প্রোফাইলে কোনো মোবাইল/হোয়াটসঅ্যাপ নম্বর সংরক্ষিত নেই।',
    };
  }

  // Remove non-digit characters
  const clean = rawPhone.replace(/\D/g, '');
  if (!clean) {
    return {
      valid: false,
      international: '',
      display: rawPhone,
      error: 'প্রদত্ত মোবাইল নম্বরে কোনো বৈধ ডিজিট পাওয়া যায়নি।',
    };
  }

  // Bangladesh standard 11 digits: e.g. 01712345678 -> 8801712345678
  if (clean.length === 11 && clean.startsWith('01')) {
    const intl = `88${clean}`;
    const display = `+88 ${clean.slice(0, 5)}-${clean.slice(5)}`;
    return { valid: true, international: intl, display };
  }

  // Bangladesh standard 13 digits: e.g. 8801712345678 -> 8801712345678
  if (clean.length === 13 && clean.startsWith('8801')) {
    const display = `+88 ${clean.slice(2, 7)}-${clean.slice(7)}`;
    return { valid: true, international: clean, display };
  }

  // Bangladesh 10 digits without leading 0: e.g. 1712345678 -> 8801712345678
  if (clean.length === 10 && clean.startsWith('1')) {
    const full = `0${clean}`;
    const intl = `88${full}`;
    const display = `+88 ${full.slice(0, 5)}-${full.slice(5)}`;
    return { valid: true, international: intl, display };
  }

  // Generic international number (10 to 15 digits)
  if (clean.length >= 10 && clean.length <= 15) {
    return {
      valid: true,
      international: clean,
      display: `+${clean}`,
    };
  }

  return {
    valid: false,
    international: clean,
    display: rawPhone,
    error: `নম্বরটি (${rawPhone}) সঠিক বাংলাদেশি বা আন্তর্জাতিক ফরম্যাটে নেই (কমপক্ষে ১০-১১ ডিজিট হতে হবে)।`,
  };
}

export interface StaffDateSummaryResult {
  targetDateStr: string; // YYYY-MM-DD
  targetDateFormatted: string; // e.g. "16 Oct 2026"
  isToday: boolean;

  // Selected date figures
  dateRegularAdvance: number;
  dateSalaryAdvance: number;
  dateRegularAdvancesList: AdvanceLog[];
  dateSalaryAdvancesList: AdvanceLog[];

  // Expenses on selected date
  dateSubmittedExpenses: Expense[];

  // Bill linkage & reminder status
  hasUnsubmittedBillReminder: boolean;
  unsubmittedAdvanceAmount: number;
  billStatusType: 'NONE' | 'ALL_SUBMITTED' | 'UNSUBMITTED_REMINDER' | 'LINKAGE_NEEDS_VERIFICATION';
  billStatusDescription: string;

  // All-time figures (strictly preserving accounting rules)
  allTimeRegularAdvance: number;
  allTimeApprovedExpenses: number;
  allTimeBalance: number; // positive: Cash in hand, negative: Payable to staff
}

/**
 * Calculates date-wise transactions and all-time ledger positions for a staff member.
 * Strictly adheres to Rules A, B, and C:
 * - Date-wise regular advances are isolated strictly to targetDateStr.
 * - Salary advance on selected date is isolated; all-time salary advance is NOT shown.
 * - Advance vs Bill linkage is verified:
 *    - If an explicit link is found and bill is submitted (PENDING, VERIFIED, APPROVED) -> NO reminder.
 *    - If no bill at all was submitted for this date -> Reminder with amount.
 *    - If bills exist on that date without explicit link -> "Bill linkage যাচাই প্রয়োজন".
 * - All-time outstanding balance is calculated using standard ledger rules without double-counting.
 */
export function calculateStaffDateSummary(
  staffId: string,
  targetDateStr: string,
  expenses: Expense[] = [],
  advances: AdvanceLog[] = []
): StaffDateSummaryResult {
  const currentTodayDhaka = getDhakaDateStr(new Date());
  const isToday = targetDateStr === currentTodayDhaka;

  let targetDateFormatted = targetDateStr;
  try {
    const [y, m, d] = targetDateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    targetDateFormatted = dateObj.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {}

  // 1. All-time ledger calculations (Rule B.8)
  let allTimeRegularAdvance = 0;
  let allTimeApprovedExpenses = 0;

  for (let i = 0; i < advances.length; i++) {
    const a = advances[i];
    if (a.isDeleted || a.isHardDeleted || a.staffId !== staffId) continue;
    if (a.type === 'SALARY') continue; // Salary advance is payroll, not expense ledger
    allTimeRegularAdvance += Number(a.amount || 0);
  }

  for (let i = 0; i < expenses.length; i++) {
    const e = expenses[i];
    if (e.isDeleted || e.isHardDeleted || e.staffId !== staffId) continue;
    if (e.status === 'APPROVED') {
      allTimeApprovedExpenses += Number(e.amount || 0);
    }
  }

  const allTimeBalance = allTimeRegularAdvance - allTimeApprovedExpenses;

  // 2. Selected date calculations (Rule B.3 & B.9)
  let dateRegularAdvance = 0;
  let dateSalaryAdvance = 0;
  const dateRegularAdvancesList: AdvanceLog[] = [];
  const dateSalaryAdvancesList: AdvanceLog[] = [];

  for (let i = 0; i < advances.length; i++) {
    const a = advances[i];
    if (a.isDeleted || a.isHardDeleted || a.staffId !== staffId) continue;
    const isMatchingDate = isDhakaSameDay(a.date, targetDateStr);
    if (!isMatchingDate) continue;

    const amt = Number(a.amount || 0);
    if (a.type === 'SALARY') {
      if (amt > 0) {
        dateSalaryAdvance += amt;
        dateSalaryAdvancesList.push(a);
      }
    } else {
      if (amt > 0) {
        dateRegularAdvance += amt;
        dateRegularAdvancesList.push(a);
      }
    }
  }

  // 3. Find expenses of this staff submitted for/on targetDateStr
  const staffExpenses = expenses.filter(
    (e) => !e.isDeleted && !e.isHardDeleted && e.staffId === staffId
  );

  const dateSubmittedExpenses = staffExpenses.filter((e) => {
    const checkDate = e.date || e.createdAt || e.submittedAt;
    return isDhakaSameDay(checkDate, targetDateStr);
  });

  // 4. Verify Advance vs Bill linkage (Rule B.4, B.5, B.6, B.7)
  let hasUnsubmittedBillReminder = false;
  let unsubmittedAdvanceAmount = 0;
  let billStatusType: StaffDateSummaryResult['billStatusType'] = 'NONE';
  let billStatusDescription = '';

  if (dateRegularAdvancesList.length === 0) {
    billStatusType = 'NONE';
    hasUnsubmittedBillReminder = false;
    billStatusDescription = 'নির্বাচিত তারিখে কোনো সাধারণ অগ্রিম গ্রহণ করা হয়নি।';
  } else {
    // Check for explicit linkage between advances and expenses
    let explicitLinkedSubmitted = 0;
    let explicitLinkedRejectedOrMissing = 0;
    let unlinkedAdvances: AdvanceLog[] = [];

    for (const adv of dateRegularAdvancesList) {
      // Check explicit link in database
      const linkedExpense = staffExpenses.find((e) => {
        if ((e as any).advanceId && (e as any).advanceId === adv.id) return true;
        if ((e as any).linkedAdvanceId && (e as any).linkedAdvanceId === adv.id) return true;
        if ((adv as any).billId && (adv as any).billId === e.id) return true;
        if ((adv as any).expenseId && (adv as any).expenseId === e.id) return true;
        if (adv.note && (adv.note.includes(e.id) || (e.clientSubmissionId && adv.note.includes(e.clientSubmissionId)))) return true;
        if (e.reason && e.reason.includes(adv.id)) return true;
        return false;
      });

      if (linkedExpense) {
        // Rule B.5: If bill is submitted (PENDING, VERIFIED, APPROVED), do not show reminder
        if (linkedExpense.status === 'PENDING' || linkedExpense.status === 'VERIFIED' || linkedExpense.status === 'APPROVED') {
          explicitLinkedSubmitted++;
        } else {
          explicitLinkedRejectedOrMissing++;
        }
      } else {
        unlinkedAdvances.push(adv);
      }
    }

    if (explicitLinkedSubmitted === dateRegularAdvancesList.length) {
      billStatusType = 'ALL_SUBMITTED';
      hasUnsubmittedBillReminder = false;
      billStatusDescription = 'উক্ত অগ্রিমের বিপরীতে বিল ইতিমধ্যে জমা দেওয়া হয়েছে।';
    } else if (unlinkedAdvances.length > 0) {
      // Rule B.7: If no explicit database linkage exists, DO NOT blindly assume matching date means linked!
      if (dateSubmittedExpenses.length === 0) {
        // Zero bills exist for that date
        hasUnsubmittedBillReminder = true;
        unsubmittedAdvanceAmount = dateRegularAdvance;
        billStatusType = 'UNSUBMITTED_REMINDER';
        billStatusDescription = `উক্ত তারিখে গৃহীত অগ্রিম (৳ ${formatBDT(dateRegularAdvance)}) এর বিপরীতে কোনো বিল জমা দেওয়া হয়নি।`;
      } else {
        // Bills exist on that date, but without explicit ID linkage
        // Rule B.7: "কোনো advance-এর সঙ্গে নির্দিষ্ট bill-এর সম্পর্ক ডেটাবেসে না থাকলে শুধু তারিখ মিলে গেছে বলে অনুমান করে bill-কে ওই advance-এর সঙ্গে যুক্ত করবে না। প্রয়োজনে “Bill linkage যাচাই প্রয়োজন” দেখাবে।"
        hasUnsubmittedBillReminder = false;
        billStatusType = 'LINKAGE_NEEDS_VERIFICATION';
        billStatusDescription = `উক্ত তারিখে ${dateSubmittedExpenses.length}টি বিল জমা রয়েছে, তবে নির্দিষ্ট অগ্রিমের সাথে সরাসরি আইডি লিংক ডেটাবেসে নেই (যাচাই প্রয়োজন)।`;
      }
    } else if (explicitLinkedRejectedOrMissing > 0) {
      hasUnsubmittedBillReminder = true;
      unsubmittedAdvanceAmount = dateRegularAdvance;
      billStatusType = 'UNSUBMITTED_REMINDER';
      billStatusDescription = `উক্ত অগ্রিমের বিল বাতিলকৃত বা অনুপস্থিত, পুনরায় জমা দেওয়া প্রয়োজন।`;
    }
  }

  return {
    targetDateStr,
    targetDateFormatted,
    isToday,
    dateRegularAdvance,
    dateSalaryAdvance,
    dateRegularAdvancesList,
    dateSalaryAdvancesList,
    dateSubmittedExpenses,
    hasUnsubmittedBillReminder,
    unsubmittedAdvanceAmount,
    billStatusType,
    billStatusDescription,
    allTimeRegularAdvance,
    allTimeApprovedExpenses,
    allTimeBalance,
  };
}

export interface StaffProfileWhatsAppOptions {
  staff: Staff;
  summary: StaffDateSummaryResult;
  currentUser?: string | null;
}

/**
 * Formats the complete official WhatsApp financial summary text for a staff member.
 * Strictly adheres to Rules A.4, B.3, B.4, B.5, B.7, B.8, B.9.
 */
export function formatStaffProfileWhatsAppMessage(opts: StaffProfileWhatsAppOptions): string {
  const { staff, summary } = opts;
  const staffName = staff.name || 'Staff Member';
  const staffId = staff.staffId || 'N/A';

  // 1. Date-wise regular advance
  const regularAdvLine = `• সাধারণ অগ্রিম (Regular Advance): ৳ ${formatBDT(summary.dateRegularAdvance)} BDT`;

  // 2. Salary advance on selected date (Rule B.9: only if given on that date; all-time total is never shown)
  let salaryAdvLine = '';
  if (summary.dateSalaryAdvance > 0) {
    salaryAdvLine = `\n• বেতন অগ্রিম (Salary Advance): ৳ ${formatBDT(summary.dateSalaryAdvance)} BDT`;
  } else if (summary.isToday) {
    salaryAdvLine = `\n• আজকের বেতন অগ্রিম: আজ বেতন অগ্রিম দেওয়া হয়নি`;
  }

  // 3. Bill status / Reminder section (Rule B.4, B.5, B.7)
  let billSection = '';
  if (summary.hasUnsubmittedBillReminder) {
    billSection = `
━━━━━━━━━━━━━━━━━━━━
🔔 *বিল সাবমিট রিমাইন্ডার (Bill Submit Reminder):*
${summary.targetDateFormatted} তারিখে আপনার গৃহীত সাধারণ অগ্রিম ৳ ${formatBDT(summary.unsubmittedAdvanceAmount || summary.dateRegularAdvance)} BDT এর বিপরীতে এখনও কোনো বিল জমা পাওয়া যায়নি। অনুগ্রহ করে দ্রুত ভাউচার ছবিসহ বিল সাবমিট করুন।`;
  } else if (summary.billStatusType === 'ALL_SUBMITTED') {
    billSection = `
━━━━━━━━━━━━━━━━━━━━
✅ *বিল জমাদান স্থিতি (Bill Status):*
উক্ত অগ্রিমের বিপরীতে বিল ইতিমধ্যে সিস্টেমে জমা দেওয়া হয়েছে।`;
  } else if (summary.billStatusType === 'LINKAGE_NEEDS_VERIFICATION') {
    billSection = `
━━━━━━━━━━━━━━━━━━━━
ℹ️ *বিল লিংকেজ স্থিতি (Bill Linkage):*
উক্ত তারিখে বিলের এন্ট্রি রয়েছে, তবে এই নির্দিষ্ট অগ্রিমের সাথে সরাসরি আইডি লিংক ডেটাবেসে নেই (অ্যাকাউন্টস যাচাই প্রয়োজন)।`;
  }

  // 4. All-time ledger balance (Rule B.8: separated and not confused with date's advance)
  const balanceText = summary.allTimeBalance < 0
    ? `• কোম্পানির কাছে স্টাফের পাওনা (Payable): ৳ ${formatBDT(Math.abs(summary.allTimeBalance))} BDT`
    : `• অতিরিক্ত ক্যাশ অগ্রিম (Cash in Hand): ৳ ${formatBDT(summary.allTimeBalance)} BDT`;

  return `*DEPEND SOURCING LTD.*
*OFFICIAL STAFF FINANCIAL SUMMARY*
━━━━━━━━━━━━━━━━━━━━
👤 *স্টাফের নাম (Staff):* ${staffName} (ID: ${staffId})
📅 *লেনদেনের তারিখ (Date):* ${summary.targetDateFormatted}${summary.isToday ? ' (আজ / Today)' : ''}
━━━━━━━━━━━━━━━━━━━━
💰 *তারিখ অনুযায়ী হিসাব (Date-wise Activity):*
${regularAdvLine}${salaryAdvLine}${billSection}
━━━━━━━━━━━━━━━━━━━━
⚖️ *সর্বমোট হিসাব স্থিতি (All-Time Ledger Balance):*
${balanceText}
(মোট সাধারণ অগ্রিম: ৳ ${formatBDT(summary.allTimeRegularAdvance)} | অনুমোদিত খরচ: ৳ ${formatBDT(summary.allTimeApprovedExpenses)})
━━━━━━━━━━━━━━━━━━━━
⚠️ *অনুস্মারক:*
দয়া করে আপনার হিসাব মিলিয়ে নিন। কোনো অমিল বা অসঙ্গতি থাকলে দ্রুত হিসাব শাখায় যোগাযোগ করার অনুরোধ রইল।

*System:* Depend Sourcing Office Management & Billing Center`;
}

export interface SameDayUnsubmittedAdvanceItem {
  staffId: string;
  staffName: string;
  staffMobile?: string;
  advanceId: string;
  amount: number;
  date: string;
  note?: string;
}

/**
 * Identifies same-day regular advances that have not yet had a bill submitted.
 */
export function getEligibleSameDayUnsubmittedAdvances(
  expenses: Expense[] = [],
  advances: AdvanceLog[] = [],
  staffList: Staff[] = [],
  targetDateStr: string = getDhakaDateStr(new Date())
): SameDayUnsubmittedAdvanceItem[] {
  const list: SameDayUnsubmittedAdvanceItem[] = [];

  for (const adv of advances) {
    if (adv.isDeleted || adv.isHardDeleted || adv.type === 'SALARY') continue;
    if (Number(adv.amount || 0) <= 0) continue;
    if (!isDhakaSameDay(adv.date, targetDateStr)) continue;

    const staffExpenses = expenses.filter(
      (e) => !e.isDeleted && !e.isHardDeleted && e.staffId === adv.staffId
    );

    const hasExplicit = staffExpenses.some((e) => {
      if ((e as any).advanceId === adv.id || (e as any).linkedAdvanceId === adv.id) return true;
      if ((adv as any).billId === e.id || (adv as any).expenseId === e.id) return true;
      if (adv.note && (adv.note.includes(e.id) || (e.clientSubmissionId && adv.note.includes(e.clientSubmissionId)))) return true;
      if (e.reason && e.reason.includes(adv.id)) return true;
      return false;
    });

    if (hasExplicit) continue;

    const sameDayExpenses = staffExpenses.filter((e) => {
      const checkDate = e.date || e.createdAt || e.submittedAt;
      return isDhakaSameDay(checkDate, targetDateStr);
    });

    if (sameDayExpenses.length === 0) {
      const staffObj = staffList.find((s) => s.id === adv.staffId);
      list.push({
        staffId: adv.staffId,
        staffName: adv.staffName || staffObj?.name || 'Staff',
        staffMobile: staffObj?.mobile,
        advanceId: adv.id,
        amount: Number(adv.amount),
        date: adv.date,
        note: adv.note,
      });
    }
  }

  return list;
}

export function getStaffVoucherStats(
  staffId: string,
  expenses: Expense[] = [],
  advances: AdvanceLog[] = []
): StaffVoucherStats {
  const todayDhakaStr = getDhakaDateStr(new Date());

  let staffTodayAdvances = 0;
  let staffTodaySalaryAdvance = 0;
  let totalRegularAdvance = 0;

  for (let i = 0; i < advances.length; i++) {
    const a = advances[i];
    if (a.isDeleted || a.isHardDeleted || a.staffId !== staffId) continue;
    const amt = Number(a.amount || 0);

    // Rule 1, 2, 3: Salary Advance display
    // Only today's salary advance is counted for today's summary (strictly Asia/Dhaka time).
    // All-time salary advances or previous days' salary advances are excluded from this summary.
    if (a.type === 'SALARY') {
      if (amt > 0 && isDhakaToday(a.date, todayDhakaStr)) {
        staffTodaySalaryAdvance += amt;
      }
      // Rule 4 & 5: Salary advance is NEVER added to totalRegularAdvance or balance to prevent double counting.
      continue;
    }

    // Regular advances (Rule 4 & 5: preserve regular advance calculations)
    totalRegularAdvance += amt;
    if (isDhakaToday(a.date, todayDhakaStr)) {
      staffTodayAdvances += amt;
    }
  }

  let staffTodayExpensesSubmitted = 0;
  let staffTodayExpensesApproved = 0;
  let totalApprovedExpenses = 0;
  for (let i = 0; i < expenses.length; i++) {
    const e = expenses[i];
    if (e.isDeleted || e.isHardDeleted || e.staffId !== staffId) continue;
    const amt = Number(e.amount || 0);
    const dateToCheck = e.createdAt || e.submittedAt || e.date;
    const isToday = isDhakaToday(dateToCheck, todayDhakaStr);
    if (isToday) {
      staffTodayExpensesSubmitted += amt;
      if (e.status === 'APPROVED') {
        staffTodayExpensesApproved += amt;
      }
    }
    if (e.status === 'APPROVED') {
      totalApprovedExpenses += amt;
    }
  }

  // Rule 4 & 5: All-Time Outstanding Balance is calculated strictly using regular advance minus approved expenses.
  const balance = totalRegularAdvance - totalApprovedExpenses;

  return {
    staffTodayAdvances,
    staffTodaySalaryAdvance,
    staffTodayExpensesSubmitted,
    staffTodayExpensesApproved,
    totalRegularAdvance,
    totalApprovedExpenses,
    balance,
  };
}

/**
 * Generates an SVG or PNG QR Code data URL containing verifiable voucher metadata.
 */
export async function generateVoucherQRCode(
  voucherId: string,
  staffName: string,
  amount: number,
  date: string,
  status: string
): Promise<string> {
  try {
    const qrPayload = JSON.stringify({
      vch: `DS-VCH-${voucherId.toUpperCase()}`,
      payee: staffName,
      amt: `BDT ${amount}`,
      date: date.split('T')[0],
      st: status,
      issuer: 'Depend Sourcing Ltd.',
      sec: Math.abs(hashCode(voucherId + amount)).toString(36).toUpperCase(),
    });

    return await QRCode.toDataURL(qrPayload, {
      width: 140,
      margin: 1,
      color: {
        dark: '#142B4A',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.warn('QR Code generation fallback:', err);
    return '';
  }
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export function formatBDT(num: number): string {
  const parts = Math.abs(num).toFixed(2).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (num < 0 ? '-' : '') + integerPart + '.' + parts[1];
}

/**
 * Returns corporate status configuration.
 */
export function getVoucherStatusBadge(status: Expense['status']) {
  switch (status) {
    case 'APPROVED':
      return {
        labelEn: 'APPROVED',
        labelBn: 'অনুমোদিত',
        bg: '#DCFCE7',
        border: '#86EFAC',
        text: '#15803D',
        watermark: 'APPROVED',
        desc: 'APPROVED BY AUTHORIZED SIGNATORY — ELIGIBLE FOR DISBURSEMENT',
      };
    case 'VERIFIED':
      return {
        labelEn: 'VERIFIED',
        labelBn: 'যাচাইকৃত (MD রিভিউ)',
        bg: '#EFF6FF',
        border: '#93C5FD',
        text: '#1D4ED8',
        watermark: 'VERIFIED',
        desc: 'ACCOUNTS VERIFIED — PENDING MANAGING DIRECTOR FINAL AUTHORIZATION',
      };
    case 'REJECTED':
      return {
        labelEn: 'REJECTED',
        labelBn: 'বাতিলকৃত',
        bg: '#FEE2E2',
        border: '#FCA5A5',
        text: '#B91C1C',
        watermark: 'REJECTED',
        desc: 'BILL PROPOSAL REJECTED — CONTACT ACCOUNTS ADMINISTRATION',
      };
    case 'PENDING':
    default:
      return {
        labelEn: 'PENDING VERIFICATION',
        labelBn: 'যাচাই অপেক্ষমান',
        bg: '#FEF3C7',
        border: '#FCD34D',
        text: '#B45309',
        watermark: 'PENDING',
        desc: 'SUBMITTED BY BENEFICIARY — PAYMENT NOT DISBURSED',
      };
  }
}

export interface GenerateVoucherOptions {
  expense: Expense;
  staff?: Staff;
  staffList?: Staff[];
  expenses?: Expense[];
  advances?: AdvanceLog[];
  companyLogo?: string;
  signatoryId?: string;
  qrCodeUrl?: string;
}

/**
 * Generates an enterprise-grade corporate payment voucher HTML string.
 * Strictly adheres to corporate colors:
 * Primary: #142B4A (Deep Navy)
 * Secondary: #2457A7 (Royal Blue)
 * Accent: #C6A45A (Muted Gold)
 * Surface: #F3F6FA (Soft Blue-Gray)
 * Body: #273244 (Dark Charcoal)
 */
export function generatePremiumVoucherHTML(opts: GenerateVoucherOptions): string {
  const {
    expense,
    staff,
    expenses = [],
    advances = [],
    companyLogo = '',
    qrCodeUrl = '',
  } = opts;

  const stats = getStaffVoucherStats(expense.staffId, expenses, advances);
  const statusInfo = getVoucherStatusBadge(expense.status);

  // Formatting dates
  const createdDate = new Date(expense.createdAt || new Date());
  const dateFormattedEn = createdDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const dateFormattedBn = createdDate.toLocaleDateString('bn-BD', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeFormatted = createdDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const staffName = staff?.name || expense.staffName || 'Staff Member';
  const staffId = staff?.staffId || expense.staffId || 'N/A';
  const designation = staff?.designation || 'Staff Member';
  const workLocation = staff?.workLocation || 'HEAD_OFFICE';
  const mobile = staff?.mobile || 'N/A';
  const voucherNo = `DS-VCH-${expense.id.slice(0, 8).toUpperCase()}`;

  // Signatory selection
  let signatoryName = 'Shariful Islam';
  let signatoryTitle = 'Managing Director';
  let signatoryOrg = 'Depend Sourcing Ltd.';
  try {
    const savedSignatoryId = localStorage.getItem('authorized_signatory_id');
    if (savedSignatoryId === 'chairman') {
      signatoryName = 'Moyna Islam';
      signatoryTitle = 'Chairman';
    }
  } catch {}

  // Words
  const amountWordsEn = numberToWordsEnglish(Number(expense.amount || 0));
  const amountWordsBn = numberToWordsBengali(Number(expense.amount || 0));

  const fontStyle = `font-family: 'Noto Sans Bengali', 'Hind Siliguri', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;`;

  // Parse location or purpose from reason if available
  const cleanReason = (expense.reason || '').trim();

  // Logo rendering
  const logoHTML = companyLogo
    ? `<img src="${companyLogo}" alt="Depend Sourcing" style="max-height: 48px; max-width: 140px; object-fit: contain; display: block;" crossorigin="anonymous" />`
    : `<div style="display: flex; align-items: center; gap: 8px;">
         <div style="width: 40px; height: 40px; border-radius: 8px; background: #142B4A; color: #C6A45A; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 20px; border: 1.5px solid #C6A45A;">DS</div>
         <div>
           <div style="font-size: 18px; font-weight: 900; color: #142B4A; letter-spacing: -0.3px; line-height: 1.1;">DEPEND SOURCING</div>
           <div style="font-size: 8.5px; font-weight: 700; color: #C6A45A; letter-spacing: 1.8px; text-transform: uppercase;">Promise Beyond Business</div>
         </div>
       </div>`;

  // Staff photo
  const staffPhotoHTML = staff?.photo
    ? `<img src="${staff.photo}" style="width: 52px; height: 52px; border-radius: 8px; object-fit: cover; border: 1.5px solid #CBD5E1;" crossorigin="anonymous" />`
    : `<div style="width: 52px; height: 52px; border-radius: 8px; background: #F3F6FA; border: 1.5px solid #CBD5E1; display: flex; align-items: center; justify-content: center; font-weight: 800; color: #2457A7; font-size: 22px;">${staffName.charAt(0)}</div>`;

  // QR Code HTML
  const qrHTML = qrCodeUrl
    ? `<img src="${qrCodeUrl}" style="width: 78px; height: 78px; display: block; border: 1px solid #E2E8F0; padding: 2px; border-radius: 4px; background: #ffffff;" />`
    : '';

  return `
    <div id="corporate-voucher-${expense.id}" style="width: 760px; max-width: 760px; margin: 0 auto; background: #FFFFFF; color: #273244; ${fontStyle} box-sizing: border-box; padding: 36px 42px; border: 1px solid #CBD5E1; box-shadow: 0 10px 30px rgba(20, 43, 74, 0.08); position: relative; font-size: 12px; line-height: 1.45;">
      
      <!-- TOP NAVY HEADER WITH GOLD ACCENT -->
      <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px; border-bottom: 3px solid #C6A45A; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          ${logoHTML}
          <div style="border-left: 1.5px solid #E2E8F0; padding-left: 14px; margin-left: 4px;">
            <div style="font-size: 15px; font-weight: 900; color: #142B4A; letter-spacing: 0.5px;">DEPEND SOURCING LTD.</div>
            <div style="font-size: 9.5px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 1.2px; margin-top: 1px;">Office Management & Billing Center</div>
            <div style="font-size: 9px; color: #94A3B8; margin-top: 2px;">Official Financial Instrument</div>
          </div>
        </div>

        <div style="text-align: right;">
          <div style="display: inline-block; background: #142B4A; color: #FFFFFF; padding: 5px 14px; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; border-radius: 4px; border: 1px solid #C6A45A;">
            Payment / Bill Voucher
          </div>
          <div style="font-size: 11px; font-weight: 800; color: #142B4A; margin-top: 5px; font-family: monospace; letter-spacing: 0.5px;">${voucherNo}</div>
          <div style="font-size: 9.5px; color: #64748B; margin-top: 2px;">Date: ${dateFormattedEn} • ${timeFormatted}</div>
        </div>
      </div>

      <!-- WORKFLOW STATUS NOTICE BANNER -->
      <div style="display: flex; justify-content: space-between; align-items: center; background: ${statusInfo.bg}; border: 1px solid ${statusInfo.border}; padding: 10px 16px; border-radius: 6px; margin-bottom: 22px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="background: ${statusInfo.text}; color: #FFFFFF; font-size: 9px; font-weight: 900; padding: 3px 8px; border-radius: 4px; letter-spacing: 0.8px; text-transform: uppercase;">
            ${statusInfo.labelEn}
          </div>
          <div style="font-size: 11px; font-weight: 700; color: ${statusInfo.text};">
            ${statusInfo.labelBn} — <span style="font-weight: 600; font-size: 10px;">${statusInfo.desc}</span>
          </div>
        </div>
        <div style="font-size: 9.5px; font-weight: 700; color: ${statusInfo.text}; text-transform: uppercase; letter-spacing: 0.5px;">
          Doc Ref: #${expense.id.slice(0, 6).toUpperCase()}
        </div>
      </div>

      <!-- BENEFICIARY & AUDIT INFORMATION GRID -->
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 22px;">
        
        <!-- Beneficiary Card -->
        <div style="background: #F3F6FA; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 9px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Beneficiary / Staff Information (প্রাপক)</div>
            <div style="font-size: 16px; font-weight: 800; color: #142B4A; line-height: 1.2;">${staffName}</div>
            <div style="font-size: 11.5px; color: #475569; font-weight: 600; margin-top: 3px;">
              ${designation} • <span style="font-family: monospace; color: #2457A7; font-weight: 700;">ID: ${staffId}</span>
            </div>
            <div style="font-size: 10px; color: #64748B; margin-top: 4px;">
              Location: <strong>${workLocation}</strong> • Mobile: <strong>${mobile}</strong>
            </div>
          </div>
          <div style="margin-left: 14px; flex-shrink: 0;">
            ${staffPhotoHTML}
          </div>
        </div>

        <!-- Audit & Verification Card -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 16px; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="font-size: 9px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Audit & Submission Details</div>
            <div style="font-size: 10.5px; color: #273244; font-weight: 600;">
              Submitted: <strong>${dateFormattedBn}</strong>
            </div>
            <div style="font-size: 10px; color: #64748B; margin-top: 2px;">
              Server Sync: <strong>${expense.syncStatus || 'SUBMITTED'}</strong>
            </div>
          </div>
          <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #E2E8F0; font-size: 9.5px; color: #475569;">
            Authorized: <strong>${signatoryName}</strong> (${signatoryTitle})
          </div>
        </div>

      </div>

      <!-- MAIN FINANCIAL HIGHLIGHT BOX (Deep Navy Banner) -->
      <div style="background: #142B4A; color: #FFFFFF; border-radius: 8px; padding: 20px 24px; margin-bottom: 24px; position: relative; overflow: hidden; border-top: 3px solid #C6A45A;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-size: 10px; font-weight: 800; color: #C6A45A; text-transform: uppercase; letter-spacing: 1.5px;">Voucher Principal Amount (বিল টাকার পরিমাণ)</div>
            <div style="font-size: 38px; font-weight: 900; color: #FFFFFF; line-height: 1.1; margin-top: 4px; letter-spacing: -0.5px;">
              ৳ ${formatBDT(Number(expense.amount || 0))}
            </div>
            <div style="font-size: 11px; color: #E2E8F0; margin-top: 4px; font-weight: 600;">
              Bangladeshi Taka (BDT)
            </div>
          </div>

          <div style="text-align: right; background: rgba(255, 255, 255, 0.08); padding: 10px 14px; border-radius: 6px; border: 1px solid rgba(198, 164, 90, 0.3);">
            <div style="font-size: 9px; font-weight: 800; color: #C6A45A; text-transform: uppercase; letter-spacing: 1px;">Workflow Settlement</div>
            <div style="font-size: 12px; font-weight: 800; color: #FFFFFF; margin-top: 2px;">
              ${expense.status === 'APPROVED' ? 'Approved & Ready for Cash/Adj' : expense.status === 'REJECTED' ? 'Bill Disallowed' : 'Under Review'}
            </div>
            <div style="font-size: 9.5px; color: #CBD5E1; margin-top: 2px;">
              Ref: #${expense.id.slice(0, 8)}
            </div>
          </div>
        </div>

        <!-- Amount In Words (English & Bengali) -->
        <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.15); display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          <div>
            <div style="font-size: 8.5px; font-weight: 800; color: #C6A45A; text-transform: uppercase; letter-spacing: 1px;">Amount in Words (English)</div>
            <div style="font-size: 11.5px; font-weight: 700; color: #FFFFFF; margin-top: 2px; line-height: 1.3;">${amountWordsEn}</div>
          </div>
          <div>
            <div style="font-size: 8.5px; font-weight: 800; color: #C6A45A; text-transform: uppercase; letter-spacing: 1px;">কথায় (বাংলা)</div>
            <div style="font-size: 11.5px; font-weight: 700; color: #FFFFFF; margin-top: 2px; line-height: 1.3;">${amountWordsBn}</div>
          </div>
        </div>
      </div>

      <!-- FINANCIAL SUMMARY METRICS (RESTRICTED TO STAFF ACCOUNT / NO COMPANY-WIDE LEAKAGE) -->
      <div style="margin-bottom: 24px;">
        <div style="font-size: 10px; font-weight: 800; color: #142B4A; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
          <span>Individual Staff Financial Position (ব্যক্তিগত হিসাব স্থিতি)</span>
          <span style="font-size: 9px; font-weight: 600; color: #64748B;">Staff ID: ${staffId} • Scope: Employee Ledger</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
          
          <!-- Card 1: Today's Advance -->
          <div style="background: #F3F6FA; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 12px;">
            <div style="font-size: 8.5px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">Today's Received Adv</div>
            <div style="font-size: 14px; font-weight: 800; color: #142B4A; margin-top: 4px;">
              ৳ ${formatBDT(stats.staffTodayAdvances)}
            </div>
            <div style="font-size: 8.5px; color: #94A3B8; margin-top: 2px;">Regular advance today</div>
          </div>

          <!-- Card 2: Total Regular Advance -->
          <div style="background: #F3F6FA; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 12px;">
            <div style="font-size: 8.5px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">All-Time Advance</div>
            <div style="font-size: 14px; font-weight: 800; color: #142B4A; margin-top: 4px;">
              ৳ ${formatBDT(stats.totalRegularAdvance)}
            </div>
            <div style="font-size: 8.5px; color: #94A3B8; margin-top: 2px;">Total regular drawn</div>
          </div>

          <!-- Card 3: Total Approved Expenses -->
          <div style="background: #F3F6FA; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 12px;">
            <div style="font-size: 8.5px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">Total Approved Bills</div>
            <div style="font-size: 14px; font-weight: 800; color: #15803D; margin-top: 4px;">
              ৳ ${formatBDT(stats.totalApprovedExpenses)}
            </div>
            <div style="font-size: 8.5px; color: #94A3B8; margin-top: 2px;">Total adjusted expenses</div>
          </div>

          <!-- Card 4: Current Net Balance -->
          <div style="background: ${stats.balance < 0 ? '#FEF2F2' : '#F0FDF4'}; border: 1.5px solid ${stats.balance < 0 ? '#FCA5A5' : '#86EFAC'}; border-radius: 6px; padding: 10px 12px;">
            <div style="font-size: 8.5px; font-weight: 800; color: ${stats.balance < 0 ? '#991B1B' : '#166534'}; text-transform: uppercase; letter-spacing: 0.5px;">
              ${stats.balance < 0 ? 'Payable to Staff' : 'Cash in Hand (অতিরিক্ত)'}
            </div>
            <div style="font-size: 14px; font-weight: 900; color: ${stats.balance < 0 ? '#B91C1C' : '#15803D'}; margin-top: 4px;">
              ৳ ${formatBDT(Math.abs(stats.balance))}
            </div>
            <div style="font-size: 8.5px; color: ${stats.balance < 0 ? '#991B1B' : '#166534'}; margin-top: 2px;">
              ${stats.balance < 0 ? 'Due reimbursement' : 'Advance in hand'}
            </div>
          </div>

        </div>

        <!-- Today's Salary Advance Indicator (Follows Final Rule: Salary Advance Display) -->
        <div style="margin-top: 8px; padding: 6px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 10px;">
          <span style="font-weight: 700; color: #475569;">আজকের বেতন অগ্রিম (Today's Salary Advance):</span>
          <span style="font-weight: 800; color: ${stats.staffTodaySalaryAdvance > 0 ? '#6D28D9' : '#64748B'};">
            ${stats.staffTodaySalaryAdvance > 0 ? `৳ ${formatBDT(stats.staffTodaySalaryAdvance)} BDT` : 'আজ বেতন অগ্রিম দেওয়া হয়নি'}
          </span>
        </div>
      </div>

      <!-- ITEMIZED EXPENSE DETAILS TABLE -->
      <div style="margin-bottom: 24px;">
        <div style="font-size: 10px; font-weight: 800; color: #142B4A; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
          Itemized Particulars / Bill Description (খরচের বিবরণ)
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #CBD5E1; border-radius: 6px; overflow: hidden;">
          <thead>
            <tr style="background: #142B4A; color: #FFFFFF;">
              <th style="padding: 10px 12px; text-align: center; width: 40px; font-weight: 800; font-size: 9.5px; letter-spacing: 0.5px; border-right: 1px solid rgba(255,255,255,0.15);">SL</th>
              <th style="padding: 10px 12px; text-align: left; width: 95px; font-weight: 800; font-size: 9.5px; letter-spacing: 0.5px; border-right: 1px solid rgba(255,255,255,0.15);">Date</th>
              <th style="padding: 10px 14px; text-align: left; font-weight: 800; font-size: 9.5px; letter-spacing: 0.5px; border-right: 1px solid rgba(255,255,255,0.15);">Particulars / Purpose / Description</th>
              <th style="padding: 10px 12px; text-align: center; width: 85px; font-weight: 800; font-size: 9.5px; letter-spacing: 0.5px; border-right: 1px solid rgba(255,255,255,0.15);">Scope / Qty</th>
              <th style="padding: 10px 14px; text-align: right; width: 115px; font-weight: 800; font-size: 9.5px; letter-spacing: 0.5px;">Amount (BDT)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background: #FFFFFF;">
              <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #64748B; border-bottom: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0; vertical-align: top;">
                01
              </td>
              <td style="padding: 14px 12px; text-align: left; font-weight: 600; color: #273244; border-bottom: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0; vertical-align: top;">
                ${dateFormattedEn}
                <div style="font-size: 9px; color: #64748B; margin-top: 2px;">${timeFormatted}</div>
              </td>
              <td style="padding: 14px 14px; text-align: left; border-bottom: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0; vertical-align: top;">
                <div style="font-size: 13px; font-weight: 700; color: #142B4A; line-height: 1.45; word-break: break-word;">
                  ${cleanReason}
                </div>
                <div style="font-size: 9.5px; color: #64748B; margin-top: 4px; display: flex; gap: 10px;">
                  <span>Beneficiary: <strong>${staffName}</strong></span>
                  <span>Branch / Location: <strong>${workLocation}</strong></span>
                </div>
              </td>
              <td style="padding: 14px 12px; text-align: center; font-weight: 600; color: #64748B; border-bottom: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0; vertical-align: top;">
                1 Entry
              </td>
              <td style="padding: 14px 14px; text-align: right; font-weight: 800; color: #142B4A; font-size: 13px; border-bottom: 1px solid #E2E8F0; vertical-align: top;">
                ৳ ${formatBDT(Number(expense.amount || 0))}
              </td>
            </tr>

            <!-- Table Subtotal -->
            <tr style="background: #F3F6FA; font-weight: 700;">
              <td colspan="4" style="padding: 10px 14px; text-align: right; color: #475569; border-bottom: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0; font-size: 10px; text-transform: uppercase;">
                Subtotal (মোট বিল পরিমাণ):
              </td>
              <td style="padding: 10px 14px; text-align: right; color: #142B4A; border-bottom: 1px solid #E2E8F0; font-weight: 800; font-size: 12px;">
                ৳ ${formatBDT(Number(expense.amount || 0))}
              </td>
            </tr>

            <!-- Table Approved Net -->
            <tr style="background: #FFFFFF; font-weight: 800;">
              <td colspan="4" style="padding: 10px 14px; text-align: right; color: #142B4A; border-bottom: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0; font-size: 10px; text-transform: uppercase;">
                Authorized Net Payable / Settlement:
              </td>
              <td style="padding: 10px 14px; text-align: right; color: ${expense.status === 'APPROVED' ? '#15803D' : '#B45309'}; border-bottom: 1px solid #E2E8F0; font-size: 13px;">
                ৳ ${expense.status === 'APPROVED' ? formatBDT(Number(expense.amount || 0)) : '0.00 (Pending)'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ATTACHED SUPPORTING RECEIPT (IF PRESENT) -->
      ${
        expense.voucherImage
          ? `
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 14px; margin-bottom: 20px; page-break-inside: avoid;">
            <div style="font-size: 9px; font-weight: 800; color: #142B4A; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">
              Attached Physical Receipt / সংযুক্ত মূল রসিদের কপি (Audit Supporting Document):
            </div>
            <div style="text-align: center; max-height: 180px; overflow: hidden; background: #FFFFFF; padding: 6px; border: 1px dashed #CBD5E1; border-radius: 4px;">
              <img src="${expense.voucherImage}" alt="Receipt attachment" style="max-height: 165px; max-width: 100%; object-fit: contain; display: inline-block;" crossorigin="anonymous" />
            </div>
          </div>
        `
          : ''
      }

      <!-- REJECTION REASON (IF REJECTED) -->
      ${
        expense.status === 'REJECTED'
          ? `
          <div style="background: #FEF2F2; border: 1.5px solid #FCA5A5; border-radius: 6px; padding: 12px 16px; margin-bottom: 22px;">
            <div style="font-size: 9px; font-weight: 800; color: #991B1B; text-transform: uppercase; letter-spacing: 0.8px;">Reason for Rejection / বাতিলের কারণ:</div>
            <div style="font-size: 12px; font-weight: 700; color: #B91C1C; margin-top: 3px;">
              কর্তৃপক্ষ কর্তৃক এই বিলটি বাতিল করা হয়েছে। বিস্তারিত জানতে অ্যাডমিন বা ম্যানেজমেন্টের সাথে যোগাযোগ করুন।
            </div>
          </div>
        `
          : ''
      }

      <!-- DOCUMENT VERIFICATION & QR CODE SECTION -->
      <div style="display: flex; justify-content: space-between; align-items: center; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 18px; margin-bottom: 28px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          ${qrHTML}
          <div>
            <div style="font-size: 9.5px; font-weight: 800; color: #142B4A; text-transform: uppercase; letter-spacing: 0.5px;">Document Security & Verification</div>
            <div style="font-size: 11px; font-weight: 700; color: #273244; margin-top: 2px;">
              Digital Verification Token: <span style="font-family: monospace; color: #2457A7;">#AUTH-${expense.id.toUpperCase()}</span>
            </div>
            <div style="font-size: 9.5px; color: #64748B; margin-top: 3px; max-width: 440px;">
              Scan the QR code to verify original audit integrity. This record is synchronized with Depend Sourcing Cloud & Local Realtime ledger.
            </div>
          </div>
        </div>

        <div style="text-align: right;">
          <div style="font-size: 9px; font-weight: 800; color: #64748B; text-transform: uppercase;">Doc Class</div>
          <div style="font-size: 10px; font-weight: 800; color: #142B4A; margin-top: 1px;">FIN-VCH-DS</div>
          <div style="font-size: 9px; color: #94A3B8; margin-top: 2px;">Confidential</div>
        </div>
      </div>

      <!-- AUTHORIZED SIGNATORY BLOCKS -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 36px; padding-top: 10px;">
        
        <!-- Block 1: Prepared By -->
        <div style="text-align: center;">
          <div style="border-top: 1.5px solid #CBD5E1; margin-bottom: 6px; width: 85%; margin-left: auto; margin-right: auto;"></div>
          <div style="font-size: 11.5px; font-weight: 800; color: #142B4A;">${staffName}</div>
          <div style="font-size: 9.5px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">Beneficiary / Receiver</div>
          <div style="font-size: 8.5px; color: #94A3B8; margin-top: 1px;">Submitted via App</div>
        </div>

        <!-- Block 2: Checked By -->
        <div style="text-align: center;">
          <div style="border-top: 1.5px solid #CBD5E1; margin-bottom: 6px; width: 85%; margin-left: auto; margin-right: auto;"></div>
          <div style="font-size: 11.5px; font-weight: 800; color: #142B4A;">Accounts & Audit</div>
          <div style="font-size: 9.5px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">Checked & Verified By</div>
          <div style="font-size: 8.5px; color: #94A3B8; margin-top: 1px;">Office Administration</div>
        </div>

        <!-- Block 3: Authorized Signatory -->
        <div style="text-align: center;">
          <div style="border-top: 1.5px solid #C6A45A; margin-bottom: 6px; width: 85%; margin-left: auto; margin-right: auto;"></div>
          <div style="font-size: 11.5px; font-weight: 800; color: #142B4A;">${signatoryName}</div>
          <div style="font-size: 9.5px; font-weight: 700; color: #C6A45A; text-transform: uppercase; letter-spacing: 0.5px;">${signatoryTitle}</div>
          <div style="font-size: 8.5px; color: #64748B; margin-top: 1px;">${signatoryOrg}</div>
        </div>

      </div>

      <!-- ELECTRONIC GENERATION LEGAL FOOTER -->
      <div style="margin-top: 32px; padding-top: 12px; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; font-size: 8.5px; color: #94A3B8;">
        <div>
          This document was electronically generated by Depend Sourcing Office Management & Billing Center System.
        </div>
        <div style="font-family: monospace;">
          Page 1 of 1 • System Generated: ${new Date().toISOString()}
        </div>
      </div>

    </div>
  `;
}

/**
 * Native Print and PDF Generator with high-resolution vector styles.
 */
export async function printCorporateVoucher(opts: GenerateVoucherOptions) {
  const qrCodeUrl = await generateVoucherQRCode(
    opts.expense.id,
    opts.expense.staffName,
    opts.expense.amount,
    opts.expense.createdAt,
    opts.expense.status
  );

  const htmlContent = generatePremiumVoucherHTML({
    ...opts,
    qrCodeUrl,
  });

  const printWindow = window.open('', '_blank', 'width=940,height=900');
  if (!printWindow) {
    alert('পপআপ উইন্ডো ব্লক করা হয়েছে। দয়া করে ব্রাউজারে পপআপ অ্যালাউ করুন।');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(`<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <title>Payment Voucher - ${opts.expense.staffName} (#${opts.expense.id.slice(0, 8)})</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      background-color: #F1F5F9;
      margin: 0;
      padding: 30px 10px;
      display: flex;
      justify-content: center;
      font-family: 'Noto Sans Bengali', 'Hind Siliguri', sans-serif;
    }
    @media print {
      body {
        background-color: #FFFFFF !important;
        padding: 0 !important;
        margin: 0 !important;
        display: block !important;
      }
      .no-print {
        display: none !important;
      }
      [id^="corporate-voucher-"] {
        border: none !important;
        box-shadow: none !important;
        width: 100% !important;
        max-width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      tr, table, div {
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  ${htmlContent}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 700);
    };
  </script>
</body>
</html>`);
  printWindow.document.close();
}

/**
 * High-res PNG Voucher Downloader using html2canvas.
 */
export async function downloadCorporateVoucherPNG(opts: GenerateVoucherOptions) {
  // Ensure fonts ready
  if (document.fonts) {
    await document.fonts.ready;
  }

  const qrCodeUrl = await generateVoucherQRCode(
    opts.expense.id,
    opts.expense.staffName,
    opts.expense.amount,
    opts.expense.createdAt,
    opts.expense.status
  );

  const htmlContent = generatePremiumVoucherHTML({
    ...opts,
    qrCodeUrl,
  });

  const container = document.createElement('div');
  container.innerHTML = htmlContent;
  container.style.position = 'fixed';
  container.style.left = '-12000px';
  container.style.top = '0';
  container.style.width = '780px';
  container.style.zIndex = '-9999';
  container.style.backgroundColor = '#FFFFFF';

  document.body.appendChild(container);

  // Wait for images
  const images = container.querySelectorAll('img');
  const imagePromises = Array.from(images).map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise((res) => {
      img.onload = res;
      img.onerror = res;
    });
  });
  if (imagePromises.length > 0) {
    await Promise.all(imagePromises);
  }

  await new Promise((r) => setTimeout(r, 600));

  // @ts-ignore
  if (window.html2canvas) {
    // @ts-ignore
    const canvas = await window.html2canvas(container.firstElementChild as HTMLElement, {
      scale: 2.5,
      useCORS: true,
      backgroundColor: '#FFFFFF',
      logging: false,
      windowWidth: 1200,
    });

    const link = document.createElement('a');
    link.download = `Voucher_${opts.expense.staffName.replace(/\s+/g, '_')}_${opts.expense.id.slice(0, 8)}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    alert('html2canvas লাইব্রেরি লোড হয়নি। দয়া করে পেজটি রিফ্রেশ করুন।');
  }

  document.body.removeChild(container);
}

/**
 * Formats a clean corporate WhatsApp message for direct dispatch.
 * Strictly adheres to Final Rule: Salary Advance Display:
 * 1. Today's Salary Advance: Shows today's total given to this staff (Asia/Dhaka time).
 * 2. If not given today: Shows "আজ বেতন অগ্রিম দেওয়া হয়নি".
 * 3. Never shows All-Time Total or old/previous days' salary advance in this WhatsApp summary.
 * 4. Preserves regular advance calculations and All-Time Outstanding Balance.
 * 5. Prevents double-counting by never re-adding today's salary advance to Outstanding Balance.
 * 6. "Today" is determined strictly according to Asia/Dhaka time.
 */
export function formatVoucherWhatsAppText(opts: GenerateVoucherOptions): string {
  const { expense, staff, expenses = [], advances = [] } = opts;
  const staffName = staff?.name || expense.staffName;
  const staffId = staff?.staffId || expense.staffId;
  const dateStr = new Date(expense.createdAt || new Date()).toLocaleDateString('en-GB', {
    timeZone: 'Asia/Dhaka',
  });

  const stats = getStaffVoucherStats(expense.staffId, expenses, advances);
  const todaySalaryAdv = stats.staffTodaySalaryAdvance;

  // Rule 1 & 2: Today's salary advance display
  // If given today, show total given today. If not given today, show "আজ বেতন অগ্রিম দেওয়া হয়নি".
  const salaryAdvanceLine = todaySalaryAdv > 0
    ? `💵 *আজকের বেতন অগ্রিম:* ৳ ${formatBDT(todaySalaryAdv)} BDT`
    : `💵 *আজকের বেতন অগ্রিম:* আজ বেতন অগ্রিম দেওয়া হয়নি`;

  // Rule 4 & 5: Regular advance and All-Time Outstanding balance strictly preserved
  const balanceLine = stats.balance < 0
    ? `⚖️ *কোম্পানির কাছে পাওনা (Payable):* ৳ ${formatBDT(Math.abs(stats.balance))} BDT`
    : `⚖️ *অতিরিক্ত অগ্রিম (In Hand):* ৳ ${formatBDT(stats.balance)} BDT`;

  return encodeURIComponent(
`*DEPEND SOURCING LTD.*
*PAYMENT / BILL VOUCHER SUMMARY*
━━━━━━━━━━━━━━━━━━━━
📄 *Voucher No:* #DS-VCH-${expense.id.slice(0, 8).toUpperCase()}
👤 *Payee / Staff:* ${staffName} (ID: ${staffId})
📅 *Date:* ${dateStr}
💰 *Bill Amount:* ৳ ${formatBDT(expense.amount)} BDT
📝 *Particulars:* ${expense.reason}
📊 *Status:* ${expense.status}
━━━━━━━━━━━━━━━━━━━━
💳 *আজকের সাধারণ অগ্রিম:* ৳ ${formatBDT(stats.staffTodayAdvances)} BDT
${salaryAdvanceLine}
${balanceLine}
━━━━━━━━━━━━━━━━━━━━
*System:* Depend Sourcing Office Management & Billing Center`
  );
}
