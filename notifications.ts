import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getApp } from "firebase/app";
import {
  formatNotificationTitle,
  stripNotificationEmojis,
  buildServiceWorkerNotificationOptions,
  buildFallbackNotificationOptions,
  NotificationDeduplicator,
} from "./services/notificationDesignService";

const fcmForegroundDedupe = new NotificationDeduplicator("depend_fcm_fg_dedupe_v1");

// Replace this with your actual VAPID key from Firebase Console -> Project Settings -> Cloud Messaging -> Web configuration
const VAPID_KEY = "YOUR_VAPID_KEY_HERE";

export const registerServiceWorkerAndGetToken = async (firebaseConfig: any): Promise<string | null> => {
  try {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service workers are not supported in this browser.');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied.');
      return null;
    }

    // Pass config to service worker via URL params
    const configParams = new URLSearchParams({
      apiKey: firebaseConfig.apiKey || '',
      projectId: firebaseConfig.projectId || '',
      authDomain: firebaseConfig.authDomain || '',
      storageBucket: firebaseConfig.storageBucket || '',
      messagingSenderId: firebaseConfig.messagingSenderId || '',
      appId: firebaseConfig.appId || ''
    }).toString();

    const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${configParams}`);
    await navigator.serviceWorker.ready;

    const app = getApp();
    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      console.log('FCM Token retrieved:', token);
      
      // Listen for foreground messages
      onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);
        // Show a branded heads-up notification even when app is open
        if (Notification.permission === 'granted') {
          const rawTitle = payload.notification?.title || payload.data?.title || 'Depend Sourcing Ltd.';
          const rawBody = stripNotificationEmojis(payload.notification?.body || payload.data?.body || '');
          const link = payload.data?.tab || payload.data?.link;
          const rawType = (payload.data?.type as 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR') || 'INFO';
          const title = formatNotificationTitle(rawTitle, rawType);
          const dedupeKey = payload.messageId || `fcm:${title}:${rawBody.slice(0, 48)}`;
          if (fcmForegroundDedupe.shouldSuppress(dedupeKey, 60 * 1000)) {
            return;
          }
          fcmForegroundDedupe.recordSent(dedupeKey);

          const swOptions = buildServiceWorkerNotificationOptions({
            title,
            message: rawBody,
            type: rawType,
            link,
            tag: payload.data?.tag,
            image: payload.notification?.image || payload.data?.image,
          });
          const fallbackOptions = buildFallbackNotificationOptions({
            title,
            message: rawBody,
            type: rawType,
            link,
            tag: payload.data?.tag,
          });

          try {
            if (registration && registration.showNotification) {
              registration.showNotification(title, swOptions).catch((e) => {
                 console.error("SW notification error", e);
                 try { new Notification(title, fallbackOptions); } catch(ex){}
              });
            } else {
              new Notification(title, fallbackOptions);
            }
          } catch (e) {
            console.error("Notification display error", e);
          }
        }
      });

      return token;
    } else {
      console.warn('No registration token available. Request permission to generate one.');
      return null;
    }
  } catch (error) {
    console.error('An error occurred while retrieving token:', error);
    return null;
  }
};

export const getUserFCMToken = async (firebaseConfig: any): Promise<string | null> => {
  return await registerServiceWorkerAndGetToken(firebaseConfig);
};

export const sendPush = async (
  token: string,
  title: string,
  body: string,
  extraData?: { link?: string; image?: string; tag?: string; type?: string }
) => {
  try {
    // Replace this URL with your actual backend endpoint that sends FCM messages
    const response = await fetch('/api/send-push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        title,
        body,
        ...(extraData ? { data: extraData } : {}),
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send push: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
};
