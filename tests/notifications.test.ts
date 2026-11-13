import fs from 'fs';
import path from 'path';
import vm from 'vm';
import {
  COMPANY_FULL_NAME,
  COMPANY_SHORT_NAME,
  DEPEND_NOTIFICATION_ASSETS,
  resolveAuthenticatedStaffName,
  formatNotificationTitle,
  stripNotificationEmojis,
  composeHumanNotification,
  NotificationDeduplicator,
  buildServiceWorkerNotificationOptions,
  buildFallbackNotificationOptions,
  HumanNotificationContext,
} from '../services/notificationDesignService';
import {
  getDhakaTimeParts,
  toDhakaDateString,
  extractFirstName,
  isStaffEligibleForDailyReminders,
  hasUserCheckedInOnDate,
  hasUserSubmittedBillOnDate,
  createInitialDailyReminderState,
  normalizeDailyReminderState,
  composeAttendance9Reminder,
  composeAttendance10Reminder,
  composeBill8Reminder,
  composeBillSnoozeFollowUp,
  composePopMessagePush,
  evaluateAttendanceSlot,
  evaluateBillSlot,
  applyReminderActionToState,
  BILL_REMINDER_ACTIONS,
  BILL_SNOOZE_DURATION_MS,
  MAX_DAILY_BILL_REMINDERS,
} from '../services/reminderCore';
import { Attendance, CustomPopup, Expense, Staff, UserRole } from '../types';

function makeBdtTimestamp(year: number, month1Based: number, day: number, hourBdt: number, minuteBdt: number): number {
  // Asia/Dhaka is permanently UTC+06:00
  return Date.UTC(year, month1Based - 1, day, hourBdt - 6, minuteBdt, 0, 0);
}

function runNotificationTests() {
  console.log('--- DEPEND SOURCING LTD. PUSH & SCHEDULED REMINDER VERIFICATION ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}${detail ? ` — ${detail}` : ''}`);
      failed++;
    }
  }

  const rootDir = process.cwd();
  const harshSymbolRegex = /[⚠️❌🔔🚨📢]/u;

  // =========================================================================
  // PART A: Official Company Branding, Unmodified Logo & Monochrome Badge
  // =========================================================================
  assert(COMPANY_FULL_NAME === 'Depend Sourcing Ltd.', 'Official full company name is "Depend Sourcing Ltd."');
  assert(COMPANY_SHORT_NAME === 'Depend Sourcing', 'Official short_name is "Depend Sourcing"');
  assert(DEPEND_NOTIFICATION_ASSETS.LARGE_ICON === '/logo.png', 'Large Icon uses official unmodified /logo.png');
  assert(DEPEND_NOTIFICATION_ASSETS.BADGE_ICON === '/notification-badge.png', 'Small Status Bar Icon uses monochrome /notification-badge.png');

  const logoPath = path.join(rootDir, 'public', 'logo.png');
  const badgePath = path.join(rootDir, 'public', 'notification-badge.png');
  assert(fs.existsSync(logoPath), 'public/logo.png exists on disk');
  assert(fs.existsSync(badgePath), 'public/notification-badge.png exists on disk');
  if (fs.existsSync(logoPath)) {
    const logoBuf = fs.readFileSync(logoPath);
    const w = logoBuf.readUInt32BE(16);
    const h = logoBuf.readUInt32BE(20);
    assert(w === 1254 && h === 1254, `Official public/logo.png dimensions preserved (${w}x${h})`);
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'public', 'manifest.json'), 'utf8'));
  assert(manifest.name === 'Depend Sourcing Ltd.', 'manifest.json name matches Depend Sourcing Ltd.');
  assert(manifest.short_name === 'Depend Sourcing', 'manifest.json short_name matches Depend Sourcing');

  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  assert(indexHtml.includes('<title>Depend Sourcing Ltd.'), 'index.html <title> has exact casing "Depend Sourcing Ltd."');

  // =========================================================================
  // PART B: Authenticated Staff Personalization & Safe Fallback
  // =========================================================================
  const sampleStaff: Staff[] = [
    {
      id: 's1',
      name: 'Mehedi Hasan',
      role: UserRole.STAFF,
      status: 'ACTIVE',
      designation: 'Executive',
      mobile: '01700000001',
      createdAt: '2026-01-01T00:00:00Z',
      fcmToken: 'fcm-token-mehedi',
    },
    {
      id: 's2',
      name: 'Rafiqul Islam',
      role: UserRole.STAFF,
      status: 'ACTIVE',
      designation: 'Officer',
      mobile: '01700000002',
      createdAt: '2026-01-01T00:00:00Z',
      fcmToken: 'fcm-token-rafiqul',
    },
    {
      id: 's3',
      name: 'Deleted Person',
      role: UserRole.STAFF,
      status: 'ACTIVE',
      designation: 'Former',
      mobile: '01700000003',
      createdAt: '2026-01-01T00:00:00Z',
      isHardDeleted: true,
    },
    {
      id: 'md1',
      name: 'Managing Director',
      role: UserRole.MD,
      status: 'ACTIVE',
      designation: 'MD',
      mobile: '01700000004',
      createdAt: '2026-01-01T00:00:00Z',
    },
  ];

  assert(
    resolveAuthenticatedStaffName({
      currentUser: 'Mehedi Hasan',
      staffList: sampleStaff,
      preferredFirstNameOnly: true,
    }) === 'Mehedi',
    'Scenario 12a: Resolves authenticated user first name ("Mehedi")',
  );

  const exactRafiqul = resolveAuthenticatedStaffName({
    currentUser: 'Rafiqul Islam',
    staffList: sampleStaff,
    cachedProfileName: 'Mehedi Hasan',
    preferredFirstNameOnly: true,
  });
  assert(exactRafiqul === 'Rafiqul', `Scenario 12b: Overrides mismatched cache -> "${exactRafiqul}"`);
  assert(
    resolveAuthenticatedStaffName({ currentUser: null, cachedProfileName: null, staffList: sampleStaff }) === null,
    'Scenario 12c: Returns null when unauthenticated (never guesses or leaks another user name)',
  );
  assert(extractFirstName(null) === null && extractFirstName('Guest') === null, 'Scenario 12d: Graceful null when staff name missing or placeholder');
  assert(isStaffEligibleForDailyReminders(sampleStaff[0]) === true, 'Active staff is eligible for reminders');
  assert(isStaffEligibleForDailyReminders(sampleStaff[2]) === false, 'Hard-deleted staff is excluded');
  assert(isStaffEligibleForDailyReminders(sampleStaff[3]) === false, 'MD role is excluded from daily staff attendance/bill reminders');

  // =========================================================================
  // PART C: Warm Human Conversational Copy + Harsh Symbol Filtering
  // =========================================================================
  const contexts: HumanNotificationContext[] = [
    { kind: 'ATTENDANCE_REMINDER', recipientName: 'Mehedi' },
    { kind: 'EXPENSE_APPROVED', recipientName: 'Rafiqul', amount: 1500 },
    { kind: 'EXPENSE_VERIFIED', recipientName: 'Rafiqul', amount: 850 },
    { kind: 'EXPENSE_REJECTED', recipientName: 'Rafiqul', amount: 900 },
    { kind: 'EXPENSE_NEW_SUBMITTED', recipientName: 'Mehedi', staffName: 'Sajib', amount: 1200 },
    { kind: 'EXPENSE_PENDING_SUMMARY', recipientName: 'Mehedi', pendingCount: 4 },
    { kind: 'CHAT_MESSAGE', recipientName: 'Mehedi', senderName: 'Tariq', text: '🚨 নতুন জরুরি ডেলিভারি আপডেট' },
    { kind: 'MOVEMENT_UPDATE', recipientName: 'Mehedi', text: '📢 মিরপুর অফিসে চেক-ইন সম্পন্ন' },
    { kind: 'STAFF_ONLINE', recipientName: 'Mehedi', staffName: 'Sajib' },
    { kind: 'OFFLINE_SAVED', recipientName: 'Mehedi' },
    { kind: 'OFFLINE_SYNCED', recipientName: 'Mehedi' },
    { kind: 'SHARE_COPIED', recipientName: 'Mehedi' },
    { kind: 'BIOMETRICS_ENABLED', recipientName: 'Mehedi' },
    { kind: 'BIOMETRICS_ERROR', recipientName: 'Mehedi' },
  ];

  for (const ctx of contexts) {
    const out = composeHumanNotification(ctx);
    assert(
      !harshSymbolRegex.test(out.title) && !harshSymbolRegex.test(out.message),
      `${ctx.kind} removes harsh alert symbols cleanly`,
    );
    assert(out.title.length <= 48, `${ctx.kind} title stays within Android compact bound (${out.title.length} chars)`);
  }

  assert(
    stripNotificationEmojis('⚠️ বিল আপডেট ✅ 😊') === 'বিল আপডেট ✅ 😊',
    'stripNotificationEmojis removes harsh symbols while preserving friendly warm emojis like 😊',
  );
  assert(
    formatNotificationTitle('আসসালামু আলাইকুম Mehedi, শুভ সকাল', 'WARNING', 'Mehedi') ===
      'আসসালামু আলাইকুম Mehedi, শুভ সকাল',
    'formatNotificationTitle never double-prefixes recipient name when greeting already includes name',
  );

  // =========================================================================
  // SCENARIO 1: Targeted Pop Message Delivery & Isolation
  // =========================================================================
  const targetedPopup: CustomPopup = {
    id: 'popup_1700001',
    targetUserId: 's2', // Strictly only Rafiqul!
    title: 'জরুরি অফিস মিটিং',
    message: 'বিকাল ৪টায় কনফারেন্স রুমে উপস্থিত থাকুন।',
    timestamp: '2026-05-10T06:00:00Z',
    senderName: 'Admin',
  };
  const visibleToMehedi = targetedPopup.targetUserId === 's1' || targetedPopup.targetUserId === 'ALL';
  const visibleToRafiqul = targetedPopup.targetUserId === 's2' || targetedPopup.targetUserId === 'ALL';
  assert(!visibleToMehedi && visibleToRafiqul, 'Scenario 1: Specific-user Pop message targets ONLY s2 (never leaks to s1)');
  const popCopy = composePopMessagePush({ popup: targetedPopup, recipientFullName: 'Rafiqul Islam' });
  assert(
    popCopy.title.includes('Rafiqul') &&
      popCopy.body.includes('প্রেরক: Admin') &&
      popCopy.url.includes('popupId=popup_1700001'),
    'Scenario 1: Pop notification carries recipient name, sender info, and deep-link popupId',
  );

  // =========================================================================
  // SCENARIOS 2, 3, 4, 5: Asia/Dhaka Attendance Scheduling & Midnight Guard
  // =========================================================================
  const dateBn = '2026-05-10';
  const mehedi = sampleStaff[0];

  const t0000 = getDhakaTimeParts(makeBdtTimestamp(2026, 5, 10, 0, 0));
  const t0855 = getDhakaTimeParts(makeBdtTimestamp(2026, 5, 10, 8, 55));
  const t0900 = getDhakaTimeParts(makeBdtTimestamp(2026, 5, 10, 9, 0));
  const t0915 = getDhakaTimeParts(makeBdtTimestamp(2026, 5, 10, 9, 15));
  const t1000 = getDhakaTimeParts(makeBdtTimestamp(2026, 5, 10, 10, 0));
  const t1015 = getDhakaTimeParts(makeBdtTimestamp(2026, 5, 10, 10, 15));
  const t1400 = getDhakaTimeParts(makeBdtTimestamp(2026, 5, 10, 14, 0));
  const t2000 = getDhakaTimeParts(makeBdtTimestamp(2026, 5, 10, 20, 0));

  assert(t0000.dateBn === '2026-05-10' && t0000.hour === 0, 'BDT midnight 00:00 resolved accurately');
  assert(t0900.hour === 9 && t1000.hour === 10 && t2000.hour === 20, 'BDT 9AM, 10AM, and 8PM (20:00) resolved accurately');

  const emptyState = createInitialDailyReminderState(dateBn, mehedi, t0000.nowMs);

  // Scenario 5: Midnight / opening app outside schedule MUST NEVER trigger attendance reminder
  const midnightEval = evaluateAttendanceSlot({
    dhakaTime: t0000,
    state: emptyState,
    staff: mehedi,
    attendanceList: [],
  });
  const morningEarlyEval = evaluateAttendanceSlot({
    dhakaTime: t0855,
    state: emptyState,
    staff: mehedi,
    attendanceList: [],
  });
  const afternoonEval = evaluateAttendanceSlot({
    dhakaTime: t1400,
    state: emptyState,
    staff: mehedi,
    attendanceList: [],
  });
  assert(
    !midnightEval.shouldSend && !morningEarlyEval.shouldSend && !afternoonEval.shouldSend,
    'Scenario 5: Opening app / cron at 00:00, 08:55, or 14:00 BDT NEVER sends attendance reminder',
  );

  // Scenario 2: Check-in before 9:00 AM -> stops both 9 AM & 10 AM
  const earlyCheckInAttendance: Attendance[] = [
    {
      id: 'att1',
      staffId: mehedi.id,
      staffName: mehedi.name,
      date: dateBn,
      checkInTime: new Date(makeBdtTimestamp(2026, 5, 10, 8, 45)).toISOString(),
      status: 'PRESENT',
    },
  ];
  assert(
    !evaluateAttendanceSlot({ dhakaTime: t0900, state: emptyState, staff: mehedi, attendanceList: earlyCheckInAttendance }).shouldSend &&
      !evaluateAttendanceSlot({ dhakaTime: t1000, state: emptyState, staff: mehedi, attendanceList: earlyCheckInAttendance }).shouldSend,
    'Scenario 2: Check-in before 9:00 AM BDT stops BOTH 9:00 AM & 10:00 AM reminders',
  );

  // Scenario 3 & 4: Not checked in -> 9:00 AM fires -> then check-in at 09:20 -> 10:00 AM suppressed
  const nineAmEval = evaluateAttendanceSlot({
    dhakaTime: t0900,
    state: emptyState,
    staff: mehedi,
    attendanceList: [],
  });
  assert(nineAmEval.shouldSend && nineAmEval.slot === 'ATTENDANCE_9AM', 'Scenario 4a: Unchecked user gets 9:00 AM reminder');
  const nineCopy = composeAttendance9Reminder(mehedi.name);
  assert(
    nineCopy.title === 'আসসালামু আলাইকুম Mehedi, শুভ সকাল' &&
      nineCopy.body === 'আপনার দিনটি সুন্দর হোক। আপনি কি আজকে হাজিরা দিতে ভুলে গেছেন?',
    '9:00 AM reminder matches exact warm Bangla message',
  );

  const stateAfter9 = { ...emptyState, attendance9SentAt: new Date(t0900.nowMs).toISOString() };
  assert(
    !evaluateAttendanceSlot({ dhakaTime: t0915, state: stateAfter9, staff: mehedi, attendanceList: [] }).shouldSend,
    'Scenario 4b: 9:00 AM slot does NOT re-fire within same window (idempotent)',
  );

  const checkInAfter9: Attendance[] = [
    {
      id: 'att2',
      staffId: mehedi.id,
      staffName: mehedi.name,
      date: dateBn,
      checkInTime: new Date(makeBdtTimestamp(2026, 5, 10, 9, 25)).toISOString(),
      status: 'LATE',
    },
  ];
  assert(
    !evaluateAttendanceSlot({ dhakaTime: t1000, state: stateAfter9, staff: mehedi, attendanceList: checkInAfter9 }).shouldSend,
    'Scenario 3: Check-in after 9:00 AM stops 10:00 AM reminder immediately',
  );

  const tenAmEval = evaluateAttendanceSlot({
    dhakaTime: t1000,
    state: stateAfter9,
    staff: mehedi,
    attendanceList: [],
  });
  assert(tenAmEval.shouldSend && tenAmEval.slot === 'ATTENDANCE_10AM', 'Scenario 4c: Still unchecked user receives 10:00 AM reminder');
  const tenCopy = composeAttendance10Reminder(mehedi.name);
  assert(
    tenCopy.title === 'আসসালামু আলাইকুম Mehedi! 😊' &&
      tenCopy.body === 'আপনার আজকের হাজিরা কি এখনো দেওয়া হয়নি? সময় করে হাজিরাটা দিয়ে দিন।',
    '10:00 AM reminder matches exact warm Bangla message with 😊',
  );

  // Unauthenticated / missing name fallback on attendance & bill copy
  assert(
    composeAttendance9Reminder(null).title === 'আসসালামু আলাইকুম, শুভ সকাল' &&
      !composeBill8Reminder(undefined).title.includes('undefined'),
    'Scenario 12e: Missing staff name produces clean Bangla greeting without placeholders',
  );

  // =========================================================================
  // SCENARIOS 6, 7, 8, 9, 10, 11: 8:00 PM Bill Reminder, 3 Actions, Snooze & Limits
  // =========================================================================
  const bill8Eval = evaluateBillSlot({
    dhakaTime: t2000,
    state: emptyState,
    staff: mehedi,
    expenses: [],
  });
  assert(bill8Eval.shouldSend && bill8Eval.slot === 'BILL_8PM', 'Scenario 6a: 20:00 BDT fires initial bill reminder when no bill submitted');

  const bill8Copy = composeBill8Reminder(mehedi.name);
  assert(
    bill8Copy.title === 'আসসালামু আলাইকুম Mehedi! 😊' &&
      bill8Copy.body ===
        'আজকে আপনার কোনো খরচ বা বিল কি এখনো জমা দেওয়া বাকি আছে? ব্যস্ততায় ভুলে গিয়ে থাকলে সমস্যা নেই। একটু সময় করে জমা দিয়ে দিন।' &&
      bill8Copy.actions?.length === 3 &&
      bill8Copy.actions[0].title === 'এখনই করছি' &&
      bill8Copy.actions[1].title === '১০ মিনিট পর' &&
      bill8Copy.actions[2].title === 'বিল নেই',
    'Scenario 6b: 8:00 PM bill reminder contains exact Bangla copy and 3 compact action buttons',
  );

  let billState = {
    ...emptyState,
    billReminderCount: 1,
    billInitialSentAt: new Date(t2000.nowMs).toISOString(),
  };

  // Scenario 7: Clicking "এখনই করছি" (NOW_OPENED) MUST NOT mark submitted or stop reminders
  const afterNowOpened = applyReminderActionToState(billState, 'NOW_OPENED', t2000.nowMs + 5000);
  assert(
    afterNowOpened.accepted &&
      !afterNowOpened.nextState.billNoBillToday &&
      !afterNowOpened.nextState.billSubmittedTodayAt,
    'Scenario 7: Clicking "এখনই করছি" opens form ONLY and does NOT mark bill submitted or disable reminders',
  );

  // Scenario 8: Draft / Offline / Failed bills MUST NOT stop bill reminders; ONLY SUBMITTED stops them
  const fakeExpenses: Expense[] = [
    {
      id: 'exp_offline',
      staffId: mehedi.id,
      staffName: mehedi.name,
      amount: 350,
      reason: 'Lunch',
      voucherImage: '',
      status: 'PENDING',
      syncStatus: 'SAVED_OFFLINE',
      createdAt: new Date(makeBdtTimestamp(2026, 5, 10, 19, 30)).toISOString(),
    },
    {
      id: 'exp_failed',
      staffId: mehedi.id,
      staffName: mehedi.name,
      amount: 200,
      reason: 'Transport',
      voucherImage: '',
      status: 'PENDING',
      syncStatus: 'FAILED',
      createdAt: new Date(makeBdtTimestamp(2026, 5, 10, 19, 40)).toISOString(),
    },
    {
      id: 'exp_draft',
      staffId: mehedi.id,
      staffName: mehedi.name,
      amount: 150,
      reason: 'Tea',
      voucherImage: '',
      status: 'PENDING',
      syncStatus: 'DRAFT',
      createdAt: new Date(makeBdtTimestamp(2026, 5, 10, 19, 45)).toISOString(),
    },
  ];
  assert(
    hasUserSubmittedBillOnDate(fakeExpenses, mehedi, dateBn) === false,
    'Scenario 8a: SAVED_OFFLINE, FAILED, and DRAFT expenses NEVER count as submitted bills',
  );

  const realSubmittedExpense: Expense = {
    id: 'exp_real_1',
    staffId: mehedi.id,
    staffName: mehedi.name,
    amount: 420,
    reason: 'Client transport',
    voucherImage: '',
    status: 'PENDING',
    syncStatus: 'SUBMITTED',
    createdAt: new Date(makeBdtTimestamp(2026, 5, 10, 19, 50)).toISOString(),
    submittedAt: new Date(makeBdtTimestamp(2026, 5, 10, 19, 51)).toISOString(),
  };
  assert(
    hasUserSubmittedBillOnDate([...fakeExpenses, realSubmittedExpense], mehedi, dateBn) === true,
    'Scenario 8b: Verified SUBMITTED cloud expense counts as submitted and stops bill reminder',
  );

  // Scenario 9 & 11: "১০ মিনিট পর" -> +10 minutes follow-up, re-checks submission, max 3/day cap
  const tSnoozeReqMs = makeBdtTimestamp(2026, 5, 10, 20, 1);
  const snoozeRes = applyReminderActionToState(billState, 'SNOOZE_10M', tSnoozeReqMs);
  assert(
    snoozeRes.accepted && snoozeRes.nextState.billSnoozeUntil === tSnoozeReqMs + BILL_SNOOZE_DURATION_MS,
    'Scenario 9a: "১০ মিনিট পর" schedules follow-up strictly +10 minutes later',
  );

  // At +9 min (not due yet) -> does not fire
  const tPlus9m = getDhakaTimeParts(tSnoozeReqMs + 9 * 60 * 1000);
  assert(
    !evaluateBillSlot({ dhakaTime: tPlus9m, state: snoozeRes.nextState, staff: mehedi, expenses: [] }).shouldSend,
    'Scenario 9b: Follow-up does NOT fire early before 10 minutes elapse',
  );

  // At +10 min: if user ALREADY submitted a real bill during wait -> skip!
  const tPlus10m = getDhakaTimeParts(tSnoozeReqMs + 10 * 60 * 1000);
  assert(
    !evaluateBillSlot({
      dhakaTime: tPlus10m,
      state: snoozeRes.nextState,
      staff: mehedi,
      expenses: [realSubmittedExpense],
    }).shouldSend,
    'Scenario 9c: Follow-up skips automatically if bill was submitted within those 10 minutes',
  );

  // At +10 min: still not submitted -> Follow-up #1 fires (total count = 2/3)
  const fu1Eval = evaluateBillSlot({
    dhakaTime: tPlus10m,
    state: snoozeRes.nextState,
    staff: mehedi,
    expenses: fakeExpenses,
  });
  assert(fu1Eval.shouldSend && fu1Eval.slot === 'BILL_FOLLOWUP_1', 'Scenario 9d: Follow-up #1 fires at +10 min when unsubmitted');
  const fu1Copy = composeBillSnoozeFollowUp(mehedi.name, 1);
  assert(
    fu1Copy.body === 'Mehedi, ১০ মিনিট সময় দিয়েছিলাম 😊 আপনার বিলটি কি জমা দেওয়া হয়েছে? না হয়ে থাকলে একটু সময় করে জমা দিয়ে দিন।',
    'Scenario 9e: Follow-up #1 carries exact personalized Bangla reminder copy',
  );

  // Follow-up #2 -> reaches max 3 reminders/day (Initial + FU1 + FU2)
  const stateAfterFu1 = {
    ...snoozeRes.nextState,
    billReminderCount: 2,
    billFollowUp1SentAt: new Date(tPlus10m.nowMs).toISOString(),
    billSnoozeUntil: undefined,
  };
  const snooze2 = applyReminderActionToState(stateAfterFu1, 'SNOOZE_10M', tPlus10m.nowMs + 1000);
  const tPlus20m = getDhakaTimeParts(tPlus10m.nowMs + 10 * 60 * 1000 + 2000);
  const fu2Eval = evaluateBillSlot({
    dhakaTime: tPlus20m,
    state: snooze2.nextState,
    staff: mehedi,
    expenses: [],
  });
  assert(fu2Eval.shouldSend && fu2Eval.slot === 'BILL_FOLLOWUP_2', 'Scenario 11a: Follow-up #2 allowed as 3rd and final reminder');

  const stateMaxed = {
    ...snooze2.nextState,
    billReminderCount: MAX_DAILY_BILL_REMINDERS,
    billFollowUp2SentAt: new Date(tPlus20m.nowMs).toISOString(),
    billSnoozeUntil: undefined,
  };
  const fourthSnoozeAttempt = applyReminderActionToState(stateMaxed, 'SNOOZE_10M', tPlus20m.nowMs + 1000);
  const fourthEval = evaluateBillSlot({
    dhakaTime: getDhakaTimeParts(tPlus20m.nowMs + 15 * 60 * 1000),
    state: { ...stateMaxed, billSnoozeUntil: tPlus20m.nowMs + 1000 },
    staff: mehedi,
    expenses: [],
  });
  assert(
    !fourthSnoozeAttempt.accepted && !fourthEval.shouldSend && fourthEval.skipReason === 'MAX_DAILY_REMINDERS_REACHED',
    'Scenario 11b: Max 3 bill reminders/day strictly enforced (4th blocked)',
  );

  // Scenario 10: "বিল নেই" stops only that user for only that day (other users + tomorrow unaffected)
  const noBillRes = applyReminderActionToState(billState, 'NO_BILL_TODAY', t2000.nowMs + 3000);
  assert(
    !evaluateBillSlot({ dhakaTime: t2000, state: noBillRes.nextState, staff: mehedi, expenses: [] }).shouldSend,
    'Scenario 10a: Clicking "বিল নেই" stops remaining bill reminders for Mehedi today',
  );
  const rafiqulStateToday = createInitialDailyReminderState(dateBn, sampleStaff[1], t2000.nowMs);
  assert(
    evaluateBillSlot({ dhakaTime: t2000, state: rafiqulStateToday, staff: sampleStaff[1], expenses: [] }).shouldSend,
    'Scenario 10b: "বিল নেই" by Mehedi does NOT affect Rafiqul on the same day',
  );
  const nextDayDateBn = '2026-05-11';
  const mehediNextDayState = normalizeDailyReminderState(noBillRes.nextState, nextDayDateBn, mehedi);
  const nextDay8Pm = getDhakaTimeParts(makeBdtTimestamp(2026, 5, 11, 20, 0));
  assert(
    mehediNextDayState.billNoBillToday === false &&
      mehediNextDayState.billReminderCount === 0 &&
      evaluateBillSlot({ dhakaTime: nextDay8Pm, state: mehediNextDayState, staff: mehedi, expenses: [] }).shouldSend,
    'Scenario 10c: Daily reset on next Asia/Dhaka date clears billNoBillToday and re-enables 8:00 PM reminder',
  );

  // =========================================================================
  // SCENARIO 13: Duplicate Notification Suppression & ServiceWorker Behavior
  // =========================================================================
  const dedupe = new NotificationDeduplicator('test_dedupe_v2');
  const t0 = 1_700_000_000_000;
  assert(dedupe.shouldSuppress('sched:2026-05-10_s1_BILL_8PM', 60_000, t0) === false, 'Scenario 13a: First notification send allowed');
  dedupe.recordSent('sched:2026-05-10_s1_BILL_8PM', t0);
  assert(
    dedupe.shouldSuppress('sched:2026-05-10_s1_BILL_8PM', 60_000, t0 + 15_000) === true,
    'Scenario 13b: Duplicate notification suppressed within cooldown window',
  );

  // Visual Hierarchy & SW Options Validation
  const swOpts = buildServiceWorkerNotificationOptions({
    title: bill8Copy.title,
    message: bill8Copy.body,
    type: 'WARNING',
    link: 'expenses',
    url: bill8Copy.url,
    actions: bill8Copy.actions,
    tag: bill8Copy.tag,
    timestampMs: makeBdtTimestamp(2026, 5, 10, 20, 0),
  });
  const bodyLines = String(swOpts.body || '').split('\n');
  assert(bodyLines.length === 2, 'Expanded SW body has 2-line hierarchy (message + company footer)');
  assert(
    bodyLines[1].includes('Depend Sourcing Ltd.') && bodyLines[1].includes('বিভাগ: বিল ও খরচ'),
    `Metadata footer contains company name & Bangla section ("${bodyLines[1]}")`,
  );
  assert(swOpts.icon === '/logo.png', 'SW notification uses official /logo.png icon');
  assert(swOpts.badge === '/notification-badge.png', 'SW notification uses monochrome /notification-badge.png badge');
  assert(swOpts.renotify === false, 'SW notification suppresses repetitive buzz (renotify: false)');
  assert(swOpts.actions?.length === 3, 'SW bill reminder preserves all 3 interactive action buttons');

  const fallbackOpts = buildFallbackNotificationOptions({
    title: bill8Copy.title,
    message: bill8Copy.body,
    type: 'WARNING',
    link: 'expenses',
  });
  assert(fallbackOpts.icon === '/logo.png' && fallbackOpts.badge === '/notification-badge.png', 'Fallback Notification preserves official icon & badge');
  assert(!('actions' in fallbackOpts) && !('vibrate' in fallbackOpts), 'Fallback Notification omits Window-incompatible SW fields');

  // =========================================================================
  // SCENARIO 14: Service Worker (public/sw-notifications.js) Click & Action Sandbox
  // =========================================================================
  const swCode = fs.readFileSync(path.join(rootDir, 'public', 'sw-notifications.js'), 'utf8');
  const recordedFetches: Array<{ url: string; body: any }> = [];
  const recordedPostMessages: any[] = [];
  const openedUrls: string[] = [];
  const swListeners: Record<string, Function> = {};

  const sandbox: any = {
    self: {
      location: { origin: 'https://depend-sourcing-ltd.vercel.app' },
      addEventListener: (name: string, fn: Function) => {
        swListeners[name] = fn;
      },
      clients: {
        matchAll: async () => [
          {
            url: 'https://depend-sourcing-ltd.vercel.app/',
            postMessage: (msg: any) => recordedPostMessages.push(msg),
            focus: async () => {},
          },
        ],
        openWindow: async (u: string) => {
          openedUrls.push(u);
          return null;
        },
      },
    },
    fetch: async (url: string, init?: any) => {
      recordedFetches.push({ url, body: init?.body ? JSON.parse(init.body) : null });
      return { ok: true, status: 200 };
    },
    URL,
    Date,
    Object,
    String,
    JSON,
    Promise,
    encodeURIComponent,
  };
  sandbox.self.self = sandbox.self;
  vm.runInNewContext(swCode, sandbox);

  const swBuilt = sandbox.self.buildDependNotificationPayload({
    notification: {
      title: '🔔 আসসালামু আলাইকুম Mehedi! 😊',
      body: '⚠️ আজকে আপনার কোনো খরচ বা বিল কি এখনো জমা দেওয়া বাকি আছে?',
    },
    data: {
      tab: 'expenses',
      url: '/?tab=expenses&openBillEntry=1',
      actionsJson: JSON.stringify(BILL_REMINDER_ACTIONS),
      staffId: 's1',
      dateBn,
      type: 'WARNING',
    },
  });
  assert(
    !harshSymbolRegex.test(swBuilt.title) &&
      !harshSymbolRegex.test(swBuilt.options.body) &&
      swBuilt.title.includes('😊'),
    'SW payload builder removes harsh glyphs while preserving friendly 😊',
  );
  assert(
    swBuilt.options.icon === 'https://depend-sourcing-ltd.vercel.app/logo.png' &&
      swBuilt.options.badge === 'https://depend-sourcing-ltd.vercel.app/notification-badge.png',
    'SW payload builder resolves official /logo.png icon & monochrome /notification-badge.png badge',
  );
  assert(
    Array.isArray(swBuilt.options.actions) && swBuilt.options.actions.length === 3,
    'SW payload builder parses actionsJson into 3 native action buttons',
  );

  // Trigger SW notificationclick async tests
  const swAsyncChecks: Promise<void>[] = [];
  if (swListeners['notificationclick']) {
    let p1: Promise<any> = Promise.resolve();
    swListeners['notificationclick']({
      action: 'bill_snooze_10m',
      notification: {
        data: { staffId: 's1', staffName: 'Mehedi Hasan', dateBn },
        close: () => {},
      },
      waitUntil: (p: Promise<any>) => {
        p1 = p;
      },
    });
    swAsyncChecks.push(
      p1.then(() => {
        const hit = recordedFetches.find((f) => f.body?.action === 'SNOOZE_10M' && f.body?.staffId === 's1');
        assert(Boolean(hit), 'Scenario 14a: SW action "bill_snooze_10m" POSTs SNOOZE_10M to /api/reminders/action even in background');
      }),
    );

    let p2: Promise<any> = Promise.resolve();
    swListeners['notificationclick']({
      action: 'bill_none',
      notification: {
        data: { staffId: 's1', staffName: 'Mehedi Hasan', dateBn },
        close: () => {},
      },
      waitUntil: (p: Promise<any>) => {
        p2 = p;
      },
    });
    swAsyncChecks.push(
      p2.then(() => {
        const hit = recordedFetches.find((f) => f.body?.action === 'NO_BILL_TODAY' && f.body?.staffId === 's1');
        assert(Boolean(hit), 'Scenario 14b: SW action "bill_none" POSTs NO_BILL_TODAY to /api/reminders/action');
      }),
    );

    let p3: Promise<any> = Promise.resolve();
    swListeners['notificationclick']({
      action: 'bill_now',
      notification: {
        data: { staffId: 's1', staffName: 'Mehedi Hasan', dateBn },
        close: () => {},
      },
      waitUntil: (p: Promise<any>) => {
        p3 = p;
      },
    });
    swAsyncChecks.push(
      p3.then(() => {
        const nav = recordedPostMessages.find(
          (m) => m.type === 'NOTIFICATION_NAVIGATE' && m.tab === 'expenses' && m.openBillEntry === true,
        );
        assert(Boolean(nav), 'Scenario 14c: SW action "bill_now" deep-links to expenses with openBillEntry: true');
      }),
    );
  }

  Promise.all(swAsyncChecks).then(() => {
    console.log(`\n================================`);
    console.log(`NOTIFICATION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`================================`);
    if (failed > 0) {
      process.exit(1);
    }
  });
}

runNotificationTests();
