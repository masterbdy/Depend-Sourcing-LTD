importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

const urlParams = new URLSearchParams(location.search);
const apiKey = urlParams.get('apiKey');
const projectId = urlParams.get('projectId');

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
      
      const notificationTitle = payload.notification?.title || payload.data?.title || 'New Notification';
      const notificationOptions = {
        body: payload.notification?.body || payload.data?.body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        vibrate: [200, 100, 200],
        requireInteraction: true,
        data: payload.data
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  } catch (error) {
    console.error('Error initializing Firebase in SW:', error);
  }
} else {
  console.warn('Firebase config missing in SW URL params');
}
