/**
 * Shared Notification Presentation & Click Navigation Handler
 * Used by both Workbox SW (vite-plugin-pwa) and firebase-messaging-sw.js
 * Ensures consistent Depend Sourcing Ltd. branding and Android Web Push behavior.
 */

self.DEPEND_NOTIF_ASSETS = {
  LARGE_ICON: '/logo.png',
  BADGE_ICON: '/notification-badge.png',
};

self.resolveDependAssetUrl = function (assetPath) {
  try {
    if (self.location && self.location.origin) {
      return new URL(assetPath, self.location.origin).href;
    }
  } catch (e) {}
  return assetPath;
};

self.buildDependNotificationPayload = function (rawPayload) {
  var payload = rawPayload || {};
  var notif = payload.notification || {};
  var data = payload.data || {};

  var rawTitle = notif.title || data.title || 'Depend Sourcing Ltd.';
  var cleanTitle = String(rawTitle).replace(/^[\u26A0\uFE0F\u2705\u274C\s]+/, '').trim() || 'Depend Sourcing Ltd.';

  var rawBody = notif.body || data.body || data.message || '';
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

  var options = {
    body: String(rawBody || 'নতুন অফিস আপডেট দেখতে ট্যাপ করুন।'),
    icon: officialLargeIcon,
    badge: officialBadgeIcon,
    tag: data.tag || ('depend-sourcing-' + category.replace(/[^a-z0-9_-]/g, '')),
    renotify: true,
    timestamp: timestampMs,
    vibrate: isActionable ? [220, 90, 220] : [140, 60, 140],
    requireInteraction: isActionable,
    silent: false,
    actions: [
      {
        action: 'open',
        title: 'অ্যাপে দেখুন',
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
