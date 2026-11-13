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

const ENV_VAPID_KEY =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY) || "";
const VAPID_KEY = ENV_VAPID_KEY || "YOUR_VAPID_KEY_HERE";

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

    if (!VAPID_KEY || VAPID_KEY === 'YOUR_VAPID_KEY_HERE') {
      console.warn('[FCM] VITE_FIREBASE_VAPID_KEY is not configured; foreground push fallback remains active while FCM registration awaits VAPID key.');
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      console.log('FCM Token retrieved:', token);

      // Listen for foreground messages
      onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);

        // Emit custom event so in-app interactive glass UI / popup viewer can react cleanly
        try {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('depend-fcm-foreground', { detail: payload }));
          }
        } catch {}

        if (Notification.permission === 'granted') {
          const rawTitle = payload.notification?.title || payload.data?.title || 'Depend Sourcing Ltd.';
          const rawBody = stripNotificationEmojis(payload.notification?.body || payload.data?.body || '');
          const link = payload.data?.tab || payload.data?.link;
          const rawType = (payload.data?.type as 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR') || 'INFO';
          const title = formatNotificationTitle(rawTitle, rawType);
          const dedupeKey = payload.messageId || `fcm:${payload.data?.tag || ''}:${title}:${rawBody.slice(0, 48)}`;
          if (fcmForegroundDedupe.shouldSuppress(dedupeKey, 60 * 1000)) {
            return;
          }
          fcmForegroundDedupe.recordSent(dedupeKey);

          let parsedActions: Array<{ action: string; title: string }> | undefined;
          if (typeof payload.data?.actionsJson === 'string') {
            try {
              const cand = JSON.parse(payload.data.actionsJson);
              if (Array.isArray(cand) && cand.length > 0) parsedActions = cand;
            } catch {}
          }

          const swOptions = buildServiceWorkerNotificationOptions({
            title,
            message: rawBody,
            type: rawType,
            link,
            url: payload.data?.url,
            tag: payload.data?.tag,
            image: payload.notification?.image || payload.data?.image,
            actions: parsedActions,
            extraData: {
              staffId: payload.data?.staffId,
              staffName: payload.data?.staffName,
              dateBn: payload.data?.dateBn,
              popupId: payload.data?.popupId,
              slot: payload.data?.slot,
            },
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
