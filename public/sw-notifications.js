/**
 * Shared Notification Presentation & Click Navigation Handler
 * Used by both Workbox SW (vite-plugin-pwa) and firebase-messaging-sw.js
 * Ensures Depend Sourcing Ltd. official branding, clean Bangla hierarchy,
 * unmodified /logo.png Large Icon, monochrome /notification-badge.png Small Icon,
 * and Android Web Push click routing.
 */

self.DEPEND_NOTIF_ASSETS = {
  LARGE_ICON: '/logo.png',
  BADGE_ICON: '/notification-badge.png',
  COMPANY_NAME: 'Depend Sourcing Ltd.',
};

self.resolveDependAssetUrl = function (assetPath) {
  try {
    if (self.location && self.location.origin) {
      return new URL(assetPath, self.location.origin).href;
    }
  } catch (e) {}
  return assetPath;
};

self.stripDependNotificationEmojis = function (text) {
  return String(text || '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
};

self.buildDependNotificationPayload = function (rawPayload) {
  var payload = rawPayload || {};
  var notif = payload.notification || {};
  var data = payload.data || {};

  var rawTitle = notif.title || data.title || self.DEPEND_NOTIF_ASSETS.COMPANY_NAME;
  var cleanTitle =
    self.stripDependNotificationEmojis(rawTitle) || self.DEPEND_NOTIF_ASSETS.COMPANY_NAME;

  var rawBody = notif.body || data.body || data.message || '';
  var cleanBody = String(rawBody || '')
    .split('\n')
    .map(function (line) {
      return self.stripDependNotificationEmojis(line);
    })
    .filter(Boolean)
    .join('\n');

  var timestampMs = Date.now();
  if (data.timestamp) {
    var parsedTs = Date.parse(data.timestamp);
    if (!isNaN(parsedTs)) timestampMs = parsedTs;
  }

  var targetTab = data.tab || data.link || '';
  var explicitUrl = data.url || '';
  var targetUrl = '/';
  if (explicitUrl && typeof explicitUrl === 'string' && explicitUrl.startsWith('/')) {
    targetUrl = explicitUrl;
  } else if (targetTab && typeof targetTab === 'string') {
    targetUrl = '/?tab=' + encodeURIComponent(targetTab);
  }

  var tabLabels = {
    expenses: 'বিল ও খরচ',
    attendance: 'হাজিরা',
    movements: 'মুভমেন্ট',
    chat: 'টিম চ্যাট',
    staff: 'স্টাফ মনিটর',
    funds: 'ফান্ড লেজার',
    notices: 'অফিস নোটিশ',
    complaints: 'অভিযোগ বক্স',
    'bulk-advance': 'বাল্ক অগ্রিম',
    dashboard: 'ড্যাশবোর্ড',
  };
  var sectionLabel = targetTab && tabLabels[targetTab] ? tabLabels[targetTab] : '';

  var timeText = '';
  try {
    timeText = new Date(timestampMs).toLocaleTimeString('bn-BD', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    timeText = '';
  }

  var footerParts = [self.DEPEND_NOTIF_ASSETS.COMPANY_NAME];
  if (sectionLabel) footerParts.push('বিভাগ: ' + sectionLabel);
  if (timeText) footerParts.push('সময়: ' + timeText);
  var compactFooter = footerParts.join(' • ');

  var finalBody = cleanBody
    ? cleanBody.indexOf(self.DEPEND_NOTIF_ASSETS.COMPANY_NAME) !== -1
      ? cleanBody
      : cleanBody + '\n' + compactFooter
    : 'নতুন অফিস আপডেট দেখতে ট্যাপ করুন।\n' + compactFooter;

  var category = String(data.category || data.type || targetTab || 'general').toLowerCase();
  var isActionable =
    category === 'warning' ||
    category === 'error' ||
    category === 'expenses' ||
    category === 'login' ||
    category === 'attendance';

  var officialLargeIcon = self.resolveDependAssetUrl(self.DEPEND_NOTIF_ASSETS.LARGE_ICON);
  var officialBadgeIcon = self.resolveDependAssetUrl(self.DEPEND_NOTIF_ASSETS.BADGE_ICON);
  var optionalPayloadImage = notif.image || data.image;

  var actionLabels = {
    attendance: 'Check-in করুন',
    expenses: 'বিল দেখুন',
    chat: 'মেসেজ দেখুন',
    movements: 'মুভমেন্ট দেখুন',
    staff: 'স্টাফ দেখুন',
    funds: 'লেজার দেখুন',
    notices: 'নোটিশ পড়ুন',
  };
  var actionTitle = (targetTab && actionLabels[targetTab]) || 'অ্যাপে দেখুন';

  var options = {
    body: finalBody,
    icon: officialLargeIcon,
    badge: officialBadgeIcon,
    tag: data.tag || ('depend-sourcing-' + category.replace(/[^a-z0-9_-]/g, '')),
    renotify: false,
    timestamp: timestampMs,
    vibrate: isActionable ? [180, 70, 180] : [120, 50, 120],
    requireInteraction: isActionable,
    silent: false,
    actions: [
      {
        action: 'open',
        title: actionTitle,
      },
    ],
    data: Object.assign({}, data, {
      tab: targetTab || 'dashboard',
      url: targetUrl,
      timestamp: timestampMs,
    }),
  };

  if (optionalPayloadImage) {
    options.image = optionalPayloadImage;
  }

  return { title: cleanTitle, options: options };
};

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  var data = (event.notification && event.notification.data) || {};
  var targetTab = data.tab || data.link || '';
  var rawUrl = data.url || (targetTab ? '/?tab=' + encodeURIComponent(targetTab) : '/');
  var fullTargetUrl;
  try {
    fullTargetUrl = new URL(rawUrl, self.location.origin).href;
  } catch (e) {
    fullTargetUrl = self.location.origin + '/';
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clientList) {
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client && client.url && client.url.indexOf(self.location.origin) === 0) {
            if (typeof client.postMessage === 'function') {
              client.postMessage({
                type: 'NOTIFICATION_NAVIGATE',
                tab: targetTab || 'dashboard',
                url: rawUrl,
              });
            }
            if ('focus' in client) {
              return client.focus();
            }
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(fullTargetUrl);
        }
      })
      .catch(function (err) {
        console.error('[sw-notifications] Click navigation failed:', err);
      })
  );
});
