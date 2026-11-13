import fs from 'fs';
import path from 'path';
import vm from 'vm';
import {
  COMPANY_FULL_NAME,
  COMPANY_SHORT_NAME,
  DEPEND_NOTIFICATION_ASSETS,
  resolveAuthenticatedStaffName,
  formatNotificationTitle,
  formatNotificationBody,
  stripNotificationEmojis,
  composeHumanNotification,
  NotificationDeduplicator,
  buildServiceWorkerNotificationOptions,
  buildFallbackNotificationOptions,
  HumanNotificationContext,
} from '../services/notificationDesignService';

function runNotificationTests() {
  console.log('--- DEPEND SOURCING LTD. HUMAN-LIKE NOTIFICATION VERIFICATION ---');
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
  const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

  // 1. Official Company Branding & Logo Asset Integrity
  assert(COMPANY_FULL_NAME === 'Depend Sourcing Ltd.', 'Official full company name is "Depend Sourcing Ltd."');
  assert(COMPANY_SHORT_NAME === 'Depend Sourcing', 'Official short_name is "Depend Sourcing"');
  assert(
    DEPEND_NOTIFICATION_ASSETS.LARGE_ICON === '/logo.png',
    'Large Icon uses official unmodified /logo.png',
  );
  assert(
    DEPEND_NOTIFICATION_ASSETS.BADGE_ICON === '/notification-badge.png',
    'Small Status Bar Icon uses monochrome /notification-badge.png',
  );

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

  // 2. Authenticated Staff Name Personalization (Strict Security & Accuracy)
  const sampleStaff = [
    { id: 's1', name: 'Mehedi Hasan', status: 'ACTIVE' },
    { id: 's2', name: 'Rafiqul Islam', status: 'ACTIVE' },
    { id: 's3', name: 'Deleted Person', status: 'ACTIVE', isHardDeleted: true },
  ];

  assert(
    resolveAuthenticatedStaffName({
      currentUser: 'Mehedi Hasan',
      staffList: sampleStaff,
      preferredFirstNameOnly: true,
    }) === 'Mehedi',
    'Resolves authenticated user first name ("Mehedi") from matched staff profile',
  );

  const exactRafiqul = resolveAuthenticatedStaffName({
    currentUser: 'Rafiqul Islam',
    staffList: sampleStaff,
    cachedProfileName: 'Mehedi Hasan', // stale cache MUST NOT override currentUser!
    preferredFirstNameOnly: true,
  });
  assert(
    exactRafiqul === 'Rafiqul',
    `Current user ("Rafiqul Islam") overrides mismatched cachedProfileName ("Mehedi Hasan") -> "${exactRafiqul}"`,
  );

  assert(
    resolveAuthenticatedStaffName({ currentUser: null, cachedProfileName: null, staffList: sampleStaff }) === null,
    'Returns null when unauthenticated (never picks another staff member from staffList)',
  );
  assert(
    resolveAuthenticatedStaffName({ currentUser: 'Guest', staffList: sampleStaff }) === null,
    'Returns null for placeholder name "Guest"',
  );
  assert(
    resolveAuthenticatedStaffName({ currentUser: 'Unknown', staffList: sampleStaff }) === null,
    'Returns null for placeholder name "Unknown"',
  );

  // 3. Human Conversational Bangla Copy & Emoji Stripping Across All Contexts
  const contexts: HumanNotificationContext[] = [
    { kind: 'ATTENDANCE_REMINDER', recipientName: 'Mehedi' },
    { kind: 'EXPENSE_APPROVED', recipientName: 'Rafiqul', amount: 1500 },
    { kind: 'EXPENSE_VERIFIED', recipientName: 'Rafiqul', amount: 850 },
    { kind: 'EXPENSE_REJECTED', recipientName: 'Rafiqul', amount: 900 },
    { kind: 'EXPENSE_NEW_SUBMITTED', recipientName: 'Mehedi', staffName: 'Sajib', amount: 1200 },
    { kind: 'EXPENSE_PENDING_SUMMARY', recipientName: 'Mehedi', pendingCount: 4 },
    { kind: 'CHAT_MESSAGE', recipientName: 'Mehedi', senderName: 'Tariq', text: '🚨 নতুন জরুরি ডেলিভারি আপডেট' },
    { kind: 'MOVEMENT_UPDATE', recipientName: 'Mehedi', text: '📍 মিরপুর অফিসে চেক-ইন সম্পন্ন' },
    { kind: 'STAFF_ONLINE', recipientName: 'Mehedi', staffName: 'Sajib' },
    {
      kind: 'STAFF_LOGIN_ALERT',
      recipientName: 'Mehedi',
      staffName: 'Sajib',
      deviceInfo: 'Android Mobile',
      batteryLevel: '84%',
      location: '23.8103, 90.4125',
    },
    { kind: 'OFFLINE_SAVED', recipientName: 'Mehedi' },
    { kind: 'OFFLINE_SYNCED', recipientName: 'Mehedi' },
    { kind: 'SHARE_COPIED', recipientName: 'Mehedi' },
    { kind: 'BIOMETRICS_ENABLED', recipientName: 'Mehedi' },
    { kind: 'BIOMETRICS_ERROR', recipientName: 'Mehedi' },
  ];

  for (const ctx of contexts) {
    const out = composeHumanNotification(ctx);
    assert(
      !emojiRegex.test(out.title) && !emojiRegex.test(out.message),
      `${ctx.kind} copy has zero emojis`,
    );
    assert(out.title.length <= 48, `${ctx.kind} title stays within Android single-line bound (${out.title.length} chars)`);
    assert(
      ctx.recipientName ? out.title.startsWith(ctx.recipientName) : true,
      `${ctx.kind} addresses verified staff by name ("${out.title}")`,
    );
  }

  const unauthAttendance = composeHumanNotification({
    kind: 'ATTENDANCE_REMINDER',
    recipientName: null,
  });
  assert(
    unauthAttendance.title === 'আজকের হাজিরার কথা মনে করিয়ে দিই!' &&
      !unauthAttendance.title.includes('null') &&
      !unauthAttendance.title.includes('Mehedi'),
    'Unauthenticated attendance reminder omits name gracefully without placeholders or leakage',
  );

  // Double-prefix guard in formatNotificationTitle
  assert(
    formatNotificationTitle('Mehedi, একটা কথা মনে করিয়ে দিই!', 'WARNING', 'Mehedi') ===
      'Mehedi, একটা কথা মনে করিয়ে দিই!',
    'formatNotificationTitle never double-prefixes recipient name',
  );

  assert(
    stripNotificationEmojis('⚠️ বিল আপডেট ✅') === 'বিল আপডেট',
    'stripNotificationEmojis removes decorative emojis cleanly',
  );

  // 4. Visual Hierarchy & ServiceWorker Options Validation
  const att = composeHumanNotification({ kind: 'ATTENDANCE_REMINDER', recipientName: 'Mehedi' });
  const swOpts = buildServiceWorkerNotificationOptions({
    title: att.title,
    message: att.message,
    type: att.type,
    link: att.link,
    timestampMs: Date.UTC(2026, 4, 10, 9, 30),
  });
  const bodyLines = String(swOpts.body || '').split('\n');
  assert(bodyLines.length === 2, 'Expanded body has clean 2-line hierarchy (message + metadata footer)');
  assert(bodyLines[0] === att.message, 'Collapsed line 1 shows immediate message without truncation clutter');
  assert(
    bodyLines[1].includes('Depend Sourcing Ltd.') &&
      bodyLines[1].includes('বিভাগ: হাজিরা') &&
      bodyLines[1].includes('সময়:'),
    `Metadata footer contains full company name, Bangla section & time ("${bodyLines[1]}")`,
  );
  assert(swOpts.icon === '/logo.png', 'SW notification uses official /logo.png icon');
  assert(swOpts.badge === '/notification-badge.png', 'SW notification uses monochrome /notification-badge.png badge');
  assert(swOpts.renotify === false, 'SW notification suppresses repetitive buzz (renotify: false)');
  assert(swOpts.actions?.[0]?.title === 'Check-in করুন', 'Attendance action button uses contextual Bangla label');

  const fallbackOpts = buildFallbackNotificationOptions({
    title: att.title,
    message: att.message,
    type: att.type,
    link: att.link,
  });
  assert(fallbackOpts.icon === '/logo.png' && fallbackOpts.badge === '/notification-badge.png', 'Fallback Notification preserves official icon and badge');
  assert(!('actions' in fallbackOpts) && !('vibrate' in fallbackOpts), 'Fallback Notification omits Window-incompatible SW fields');

  // 5. Duplicate Notification Suppression Guard
  const dedupe = new NotificationDeduplicator('test_dedupe_v1');
  const t0 = 1_700_000_000_000;
  assert(dedupe.shouldSuppress(att.dedupeKey, att.cooldownMs, t0) === false, 'First send is allowed');
  dedupe.recordSent(att.dedupeKey, t0);
  assert(
    dedupe.shouldSuppress(att.dedupeKey, att.cooldownMs, t0 + 15_000) === true,
    'Duplicate within cooldown (15s later) is suppressed',
  );
  assert(
    dedupe.shouldSuppress(att.dedupeKey, att.cooldownMs, t0 + att.cooldownMs + 1000) === false,
    'Allows reminder again after cooldown expires',
  );

  // 6. Service Worker script (public/sw-notifications.js) runtime sandbox check
  const swCode = fs.readFileSync(path.join(rootDir, 'public', 'sw-notifications.js'), 'utf8');
  const sandbox: any = {
    self: {
      location: { origin: 'https://depend-sourcing-ltd.vercel.app' },
      addEventListener: () => {},
    },
    URL,
    Date,
    Object,
    String,
    encodeURIComponent,
  };
  sandbox.self.self = sandbox.self;
  vm.runInNewContext(swCode, sandbox);
  const swBuilt = sandbox.self.buildDependNotificationPayload({
    notification: {
      title: '🔔 Mehedi, একটা কথা মনে করিয়ে দিই!',
      body: '⚠️ আজ এখনো আপনার হাজিরা দেওয়া হয়নি।',
    },
    data: {
      tab: 'attendance',
      type: 'WARNING',
    },
  });
  assert(
    !emojiRegex.test(swBuilt.title) && !emojiRegex.test(swBuilt.options.body),
    'SW payload builder strips emojis from push payloads',
  );
  assert(
    swBuilt.options.icon === 'https://depend-sourcing-ltd.vercel.app/logo.png',
    'SW payload builder resolves official /logo.png icon URL',
  );
  assert(
    swBuilt.options.badge === 'https://depend-sourcing-ltd.vercel.app/notification-badge.png',
    'SW payload builder resolves monochrome /notification-badge.png badge URL',
  );
  assert(
    swBuilt.options.body.includes('Depend Sourcing Ltd.') &&
      swBuilt.options.body.includes('বিভাগ: হাজিরা'),
    'SW payload builder appends Depend Sourcing Ltd. & department footer',
  );
  assert(swBuilt.options.renotify === false, 'SW payload sets renotify: false to avoid buzz spam');

  console.log(`\n================================`);
  console.log(`NOTIFICATION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runNotificationTests();
