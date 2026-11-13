importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');
importScripts('/sw-notifications.js');

const urlParams = new URLSearchParams(location.search);
const apiKey = urlParams.get('apiKey');
const projectId = urlParams.get('projectId');

const NOTIF_ASSET_CACHE = 'depend-notif-assets-v1';
const NOTIF_ASSETS = ['/logo.png', '/notification-badge.png'];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(NOTIF_ASSET_CACHE).then(function(cache) {
      return cache.addAll(NOTIF_ASSETS).catch(function() {});
    })
  );
});

if (apiKey && projectId) {
  const firebaseConfig = {
    apiKey: apiKey,
    authDomain: urlParams.get('authDomain') || `${projectId}.firebaseapp.com`,
    projectId: projectId,
    storageBucket: urlParams.get('storageBucket') || `${projectId}.appspot.com`,
    messagingSenderId: urlParams.get('messagingSenderId'),
    appId: urlParams.get('appId')
  };

  try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage(function(payload) {
      console.log('[firebase-messaging-sw.js] Received background message ', payload);

      if (typeof self.buildDependNotificationPayload === 'function') {
        const built = self.buildDependNotificationPayload(payload);
        return self.registration.showNotification(built.title, built.options);
      }

      const rawTitle = String(payload.notification?.title || payload.data?.title || 'Depend Sourcing Ltd.').trim();
      const rawBody = String(payload.notification?.body || payload.data?.body || '').trim();
      const bodyWithFooter = rawBody
        ? (rawBody.includes('Depend Sourcing Ltd.') ? rawBody : `${rawBody}\nDepend Sourcing Ltd.`)
        : 'Depend Sourcing Ltd.';
      const notificationOptions = {
        body: bodyWithFooter,
        icon: new URL('/logo.png', self.location.origin).href,
        badge: new URL('/notification-badge.png', self.location.origin).href,
        tag: payload.data?.tag || 'depend-sourcing-push',
        renotify: false,
        timestamp: Date.now(),
        vibrate: [140, 60, 140],
        requireInteraction: true,
        data: {
          ...(payload.data || {}),
          url: payload.data?.url || (payload.data?.tab ? `/?tab=${encodeURIComponent(payload.data.tab)}` : '/'),
        },
      };

      if (payload.notification?.image || payload.data?.image) {
        notificationOptions.image = payload.notification?.image || payload.data?.image;
      }

      return self.registration.showNotification(rawTitle, notificationOptions);
    });
  } catch (error) {
    console.error('Error initializing Firebase in SW:', error);
  }
} else {
  console.warn('Firebase config missing in SW URL params');
}
