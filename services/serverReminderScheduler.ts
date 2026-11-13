import {
  Attendance,
  CustomPopup,
  DailyReminderUserState,
  Expense,
  ReminderActionType,
  Staff,
} from '../types';
import {
  acquireRtdbIdempotencyLock,
  getFirebaseServerConfigStatus,
  rtdbPatch,
  rtdbRead,
  rtdbWrite,
  sendFcmPushMessage,
} from './firebaseServerClient';
import {
  applyReminderActionToState,
  buildReminderIdempotencyKey,
  composeAttendance10Reminder,
  composeAttendance9Reminder,
  composeBill8Reminder,
  composeBillSnoozeFollowUp,
  composePopMessagePush,
  evaluateAttendanceSlot,
  evaluateBillSlot,
  getDhakaTimeParts,
  isStaffEligibleForDailyReminders,
  MAX_DAILY_BILL_REMINDERS,
  normalizeDailyReminderState,
  sanitizeFirebaseKey,
} from './reminderCore';

function toCleanArray<T>(raw: any): T[] {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : Object.values(raw);
  return arr.filter(Boolean) as T[];
}

export async function runScheduledRemindersCycle(nowMs: number = Date.now()): Promise<{
  ok: boolean;
  dhakaTime: ReturnType<typeof getDhakaTimeParts>;
  serverStatus: ReturnType<typeof getFirebaseServerConfigStatus>;
  processedStaff: number;
  sent: Array<{ staffId: string; staffName: string; slot: string; channel: string }>;
  skipped: Array<{ staffId: string; staffName: string; reason: string }>;
  errors: string[];
}> {
  const dhakaTime = getDhakaTimeParts(nowMs);
  const serverStatus = getFirebaseServerConfigStatus();
  const sent: Array<{ staffId: string; staffName: string; slot: string; channel: string }> = [];
  const skipped: Array<{ staffId: string; staffName: string; reason: string }> = [];
  const errors: string[] = [];

  const [staffRes, attRes, expRes, statesRes] = await Promise.all([
    rtdbRead<any>('staffList'),
    rtdbRead<any>('attendanceList'),
    rtdbRead<any>('expenses'),
    rtdbRead<Record<string, DailyReminderUserState>>(`reminderStates/${dhakaTime.dateBn}`),
  ]);

  if (!staffRes.ok) {
    errors.push(`staffList read failed (${staffRes.status}): ${staffRes.error}`);
  }
  if (!attRes.ok) {
    errors.push(`attendanceList read failed (${attRes.status}): ${attRes.error}`);
  }
  if (!expRes.ok) {
    errors.push(`expenses read failed (${expRes.status}): ${expRes.error}`);
  }

  if (!staffRes.ok || !attRes.ok || !expRes.ok) {
    return {
      ok: false,
      dhakaTime,
      serverStatus,
      processedStaff: 0,
      sent,
      skipped,
      errors,
    };
  }

  const staffList = toCleanArray<Staff>(staffRes.data).filter(isStaffEligibleForDailyReminders);
  const attendanceList = toCleanArray<Attendance>(attRes.data);
  const expenses = toCleanArray<Expense>(expRes.data);
  const existingStates = statesRes.data || {};

  for (const staff of staffList) {
    const staffKey = sanitizeFirebaseKey(staff.id);
    let currentState = normalizeDailyReminderState(
      existingStates[staffKey],
      dhakaTime.dateBn,
      { id: staff.id, name: staff.name },
    );

    // 1. Evaluate Attendance Schedule (Strictly 09:00 & 10:00 BDT)
    const attEval = evaluateAttendanceSlot({
      dhakaTime,
      state: currentState,
      staff,
      attendanceList,
    });

    if (attEval.shouldSend && attEval.slot) {
      const lockKey = buildReminderIdempotencyKey(dhakaTime.dateBn, staff.id, attEval.slot);
      const lock = await acquireRtdbIdempotencyLock(
        `reminderIdempotency/${dhakaTime.dateBn}/${lockKey}`,
        {
          slot: attEval.slot,
          staffId: staff.id,
          createdAt: new Date(nowMs).toISOString(),
        },
      );

      if (!lock.acquired) {
        skipped.push({
          staffId: staff.id,
          staffName: staff.name,
          reason: `${attEval.slot}_IDEMPOTENT_LOCKED`,
        });
      } else {
        const msg =
          attEval.slot === 'ATTENDANCE_9AM'
            ? composeAttendance9Reminder(staff.name)
            : composeAttendance10Reminder(staff.name);

        if (!staff.fcmToken) {
          skipped.push({
            staffId: staff.id,
            staffName: staff.name,
            reason: `${attEval.slot}_NO_FCM_TOKEN`,
          });
          currentState = {
            ...currentState,
            ...(attEval.slot === 'ATTENDANCE_9AM'
              ? { attendance9SentAt: new Date(nowMs).toISOString() }
              : { attendance10SentAt: new Date(nowMs).toISOString() }),
            lastDeliveryStatus: 'NO_FCM_TOKEN',
            updatedAt: new Date(nowMs).toISOString(),
          };
          await rtdbWrite(`reminderStates/${dhakaTime.dateBn}/${staffKey}`, currentState);
        } else {
          const pushRes = await sendFcmPushMessage({
            token: staff.fcmToken,
            title: msg.title,
            body: `${msg.body}\nDepend Sourcing Ltd.`,
            link: msg.link,
            url: msg.url,
            tag: msg.tag,
            category: 'attendance',
            actions: msg.actions,
            extraData: {
              slot: attEval.slot,
              staffId: staff.id,
              dateBn: dhakaTime.dateBn,
            },
          });

          if (pushRes.ok) {
            sent.push({
              staffId: staff.id,
              staffName: staff.name,
              slot: attEval.slot,
              channel: 'FCM',
            });
            currentState = {
              ...currentState,
              ...(attEval.slot === 'ATTENDANCE_9AM'
                ? { attendance9SentAt: new Date(nowMs).toISOString() }
                : { attendance10SentAt: new Date(nowMs).toISOString() }),
              lastDeliveryStatus: `SENT_${attEval.slot}`,
              updatedAt: new Date(nowMs).toISOString(),
            };
            await rtdbWrite(`reminderStates/${dhakaTime.dateBn}/${staffKey}`, currentState);
          } else {
            errors.push(`${attEval.slot} push failed for ${staff.name}: ${pushRes.error}`);
          }
        }
      }
    } else if (
      (attEval.skipReason === 'CHECKED_IN_BEFORE_9' || attEval.skipReason === 'CHECKED_IN_TODAY') &&
      currentState.attendanceSuppressedReason !== attEval.skipReason
    ) {
      currentState = {
        ...currentState,
        attendanceSuppressedReason: attEval.skipReason,
        updatedAt: new Date(nowMs).toISOString(),
      };
      await rtdbPatch(`reminderStates/${dhakaTime.dateBn}/${staffKey}`, {
        attendanceSuppressedReason: attEval.skipReason,
        updatedAt: currentState.updatedAt,
      });
    }

    // 2. Evaluate Daily Bill Submission Schedule (20:00 BDT + 10-min Snooze Follow-ups, max 3/day)
    const billEval = evaluateBillSlot({
      dhakaTime,
      state: currentState,
      staff,
      expenses,
    });

    if (billEval.clearSnooze && currentState.billSnoozeUntil) {
      currentState = {
        ...currentState,
        billSnoozeUntil: undefined,
        ...(billEval.skipReason === 'BILL_ALREADY_SUBMITTED'
          ? { billSubmittedTodayAt: currentState.billSubmittedTodayAt || new Date(nowMs).toISOString() }
          : {}),
        updatedAt: new Date(nowMs).toISOString(),
      };
      await rtdbPatch(`reminderStates/${dhakaTime.dateBn}/${staffKey}`, {
        billSnoozeUntil: null,
        ...(currentState.billSubmittedTodayAt ? { billSubmittedTodayAt: currentState.billSubmittedTodayAt } : {}),
        updatedAt: currentState.updatedAt,
      });
    }

    if (billEval.shouldSend && billEval.slot) {
      const lockKey = buildReminderIdempotencyKey(dhakaTime.dateBn, staff.id, billEval.slot);
      const lock = await acquireRtdbIdempotencyLock(
        `reminderIdempotency/${dhakaTime.dateBn}/${lockKey}`,
        {
          slot: billEval.slot,
          staffId: staff.id,
          createdAt: new Date(nowMs).toISOString(),
        },
      );

      if (!lock.acquired) {
        skipped.push({
          staffId: staff.id,
          staffName: staff.name,
          reason: `${billEval.slot}_IDEMPOTENT_LOCKED`,
        });
      } else {
        const msg =
          billEval.slot === 'BILL_8PM'
            ? composeBill8Reminder(staff.name)
            : composeBillSnoozeFollowUp(
                staff.name,
                billEval.slot === 'BILL_FOLLOWUP_1' ? 1 : 2,
              );

        const nextCount = Math.min(MAX_DAILY_BILL_REMINDERS, currentState.billReminderCount + 1);
        const nowIso = new Date(nowMs).toISOString();

        if (!staff.fcmToken) {
          skipped.push({
            staffId: staff.id,
            staffName: staff.name,
            reason: `${billEval.slot}_NO_FCM_TOKEN`,
          });
          currentState = {
            ...currentState,
            billReminderCount: nextCount,
            billLastSentAt: nowIso,
            ...(billEval.slot === 'BILL_8PM' ? { billInitialSentAt: nowIso } : {}),
            ...(billEval.slot === 'BILL_FOLLOWUP_1' ? { billFollowUp1SentAt: nowIso } : {}),
            ...(billEval.slot === 'BILL_FOLLOWUP_2' ? { billFollowUp2SentAt: nowIso } : {}),
            billSnoozeUntil: undefined,
            lastDeliveryStatus: 'NO_FCM_TOKEN',
            updatedAt: nowIso,
          };
          await rtdbWrite(`reminderStates/${dhakaTime.dateBn}/${staffKey}`, currentState);
        } else {
          const pushRes = await sendFcmPushMessage({
            token: staff.fcmToken,
            title: msg.title,
            body: `${msg.body}\nDepend Sourcing Ltd.`,
            link: msg.link,
            url: msg.url,
            tag: msg.tag,
            category: 'expenses',
            actions: msg.actions,
            extraData: {
              slot: billEval.slot,
              staffId: staff.id,
              staffName: staff.name,
              dateBn: dhakaTime.dateBn,
            },
          });

          if (pushRes.ok) {
            sent.push({
              staffId: staff.id,
              staffName: staff.name,
              slot: billEval.slot,
              channel: 'FCM',
            });
            currentState = {
              ...currentState,
              billReminderCount: nextCount,
              billLastSentAt: nowIso,
              ...(billEval.slot === 'BILL_8PM' ? { billInitialSentAt: nowIso } : {}),
              ...(billEval.slot === 'BILL_FOLLOWUP_1' ? { billFollowUp1SentAt: nowIso } : {}),
              ...(billEval.slot === 'BILL_FOLLOWUP_2' ? { billFollowUp2SentAt: nowIso } : {}),
              billSnoozeUntil: undefined,
              lastDeliveryStatus: `SENT_${billEval.slot}`,
              updatedAt: nowIso,
            };
            await rtdbWrite(`reminderStates/${dhakaTime.dateBn}/${staffKey}`, currentState);
          } else {
            errors.push(`${billEval.slot} push failed for ${staff.name}: ${pushRes.error}`);
          }
        }
      }
    }
  }

  return {
    ok: errors.length === 0,
    dhakaTime,
    serverStatus,
    processedStaff: staffList.length,
    sent,
    skipped,
    errors,
  };
}

export async function dispatchPopPushNotifications(params: {
  popupId: string;
  targetUserId: string;
  title: string;
  message: string;
  senderName?: string;
}): Promise<{
  ok: boolean;
  serverStatus: ReturnType<typeof getFirebaseServerConfigStatus>;
  targetedCount: number;
  sentCount: number;
  skippedNoToken: string[];
  skippedDuplicate: string[];
  errors: string[];
}> {
  const serverStatus = getFirebaseServerConfigStatus();
  const staffRes = await rtdbRead<any>('staffList');
  if (!staffRes.ok) {
    return {
      ok: false,
      serverStatus,
      targetedCount: 0,
      sentCount: 0,
      skippedNoToken: [],
      skippedDuplicate: [],
      errors: [`Unable to read staffList: ${staffRes.error}`],
    };
  }

  const allStaff = toCleanArray<Staff>(staffRes.data).filter(
    (s) => s && !s.isHardDeleted && !s.deletedAt && s.status !== 'DEACTIVATED',
  );

  // Strictly send ONLY to targeted staff (never leak to unrelated users)
  const recipients =
    params.targetUserId === 'ALL'
      ? allStaff
      : allStaff.filter((s) => s.id === params.targetUserId);

  let sentCount = 0;
  const skippedNoToken: string[] = [];
  const skippedDuplicate: string[] = [];
  const errors: string[] = [];

  const popupObj: CustomPopup = {
    id: params.popupId,
    targetUserId: params.targetUserId,
    title: params.title,
    message: params.message,
    senderName: params.senderName,
    timestamp: new Date().toISOString(),
  };

  for (const recipient of recipients) {
    const safePopupId = sanitizeFirebaseKey(params.popupId);
    const safeStaffId = sanitizeFirebaseKey(recipient.id);

    const lock = await acquireRtdbIdempotencyLock(
      `customPopupDispatches/${safePopupId}/${safeStaffId}`,
      {
        popupId: params.popupId,
        staffId: recipient.id,
        dispatchedAt: new Date().toISOString(),
      },
    );

    if (!lock.acquired) {
      skippedDuplicate.push(recipient.name);
      continue;
    }

    if (!recipient.fcmToken) {
      skippedNoToken.push(recipient.name);
      continue;
    }

    const composed = composePopMessagePush({
      popup: popupObj,
      recipientFullName: recipient.name,
    });

    const pushRes = await sendFcmPushMessage({
      token: recipient.fcmToken,
      title: composed.title,
      body: `${composed.body}\nDepend Sourcing Ltd.`,
      link: composed.link,
      url: composed.url,
      tag: composed.tag,
      category: 'popup',
      actions: composed.actions,
      extraData: {
        popupId: params.popupId,
        targetUserId: params.targetUserId,
        senderName: params.senderName || '',
      },
    });

    if (pushRes.ok) {
      sentCount++;
    } else {
      errors.push(`${recipient.name}: ${pushRes.error}`);
    }
  }

  return {
    ok: errors.length === 0 && serverStatus.canSendFcmPush,
    serverStatus,
    targetedCount: recipients.length,
    sentCount,
    skippedNoToken,
    skippedDuplicate,
    errors,
  };
}

export async function processReminderUserAction(params: {
  action: ReminderActionType;
  staffId: string;
  staffName?: string;
  dateBn?: string;
  nowMs?: number;
}): Promise<{
  ok: boolean;
  accepted: boolean;
  state: DailyReminderUserState;
  reason?: string;
  error?: string;
}> {
  const nowMs = params.nowMs || Date.now();
  const dateBn = params.dateBn || getDhakaTimeParts(nowMs).dateBn;
  const staffKey = sanitizeFirebaseKey(params.staffId);
  const path = `reminderStates/${dateBn}/${staffKey}`;

  const existingRes = await rtdbRead<DailyReminderUserState>(path);
  const currentState = normalizeDailyReminderState(
    existingRes.ok ? existingRes.data : null,
    dateBn,
    { id: params.staffId, name: params.staffName || params.staffId },
  );

  const transition = applyReminderActionToState(currentState, params.action, nowMs);
  if (!transition.accepted) {
    return {
      ok: true,
      accepted: false,
      state: transition.nextState,
      reason: transition.reason,
    };
  }

  // Convert undefined billSnoozeUntil to null when writing so RTDB clears the field cleanly
  const writePayload: any = {
    ...transition.nextState,
    billSnoozeUntil:
      transition.nextState.billSnoozeUntil !== undefined
        ? transition.nextState.billSnoozeUntil
        : null,
  };

  const writeRes = await rtdbWrite(path, writePayload);
  if (!writeRes.ok) {
    return {
      ok: false,
      accepted: false,
      state: transition.nextState,
      error: writeRes.error,
    };
  }

  return {
    ok: true,
    accepted: true,
    state: transition.nextState,
    reason: transition.reason,
  };
}
