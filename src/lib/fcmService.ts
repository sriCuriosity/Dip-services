import { PushNotifications, PushNotificationSchema, Token, ActionPerformed } from '@capacitor/push-notifications';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { ref, update } from 'firebase/database';
import { db } from './firebase';

export class FCMService {
  private static navigateHandler: ((path: string) => void) | null = null;
  private static initialized = false;
  private static currentUid: string | null = null;
  private static currentIsWorker = false;
  private static STORAGE_KEY = 'dip_pending_notif_target';
  private static retryTimer: ReturnType<typeof setInterval> | null = null;

  static setNavigateHandler(handler: (path: string) => void) {
    if (!handler) return;
    this.navigateHandler = handler;
    // Immediately check for any pending path from a cold start
    this.checkAndRedirect();
  }

  // Attempt to navigate to the pending path.
  // Keeps retrying until navigation is confirmed by URL match.
  static checkAndRedirect() {
    const target = localStorage.getItem(this.STORAGE_KEY);
    if (!target || !this.navigateHandler) return;

    // Stop any previous retry timer
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }

    const tryNavigate = () => {
      if (!this.navigateHandler) return;
      console.log('FCMService: Attempting navigation to', target);
      this.navigateHandler(target);
    };

    // Attempt immediately
    tryNavigate();

    // Then retry every 400ms for up to 8 seconds in case React Router isn't ready yet
    let attempts = 0;
    this.retryTimer = setInterval(() => {
      attempts++;
      // Check if we've arrived at the target
      if (window.location.pathname === target || window.location.hash.includes(target)) {
        console.log('FCMService: Navigation confirmed, clearing pending path.');
        localStorage.removeItem(this.STORAGE_KEY);
        clearInterval(this.retryTimer!);
        this.retryTimer = null;
        return;
      }
      if (attempts >= 20) {
        // Give up after ~8 seconds but still clear to avoid infinite loop
        console.warn('FCMService: Navigation timed out, clearing pending path.');
        localStorage.removeItem(this.STORAGE_KEY);
        clearInterval(this.retryTimer!);
        this.retryTimer = null;
        return;
      }
      tryNavigate();
    }, 400);
  }

  static async createNotificationChannel() {
    try {
      await PushNotifications.createChannel({
        id: 'default',
        name: 'Urgent Alerts',
        description: 'New service bookings and messages',
        importance: 5,
        visibility: 1,
        vibration: true,
      });

      await PushNotifications.createChannel({
        id: 'fcm_default_channel',
        name: 'Booking Notifications',
        description: 'Updates about your service requests',
        importance: 5,
        visibility: 1,
        vibration: true,
      });
    } catch (err) {
      console.warn("Could not create notification channel:", err);
    }
  }

  static async registerPushNotifications(uid: string, isWorker: boolean) {
    try {
      await this.createNotificationChannel();

      this.currentUid = uid;
      this.currentIsWorker = isWorker;

      if (this.initialized) {
        await PushNotifications.register();
        return;
      }

      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') return;

      await PushNotifications.register();

      PushNotifications.addListener('registration', (token: Token) => {
        if (this.currentUid) {
          this.updateTokenInFirebase(this.currentUid, token.value, this.currentIsWorker);
        }
      });

      this.initialized = true;
    } catch (err) {
      console.error("FCM registration error:", err);
    }
  }

  // Called once at app startup (in main.tsx) — BEFORE React renders.
  // This ensures cold-start notification taps are captured immediately.
  static initGlobalListeners() {
    if (!Capacitor.isNativePlatform()) return;

    if (!PushNotifications) {
      console.warn('FCMService: PushNotifications plugin not found.');
      return;
    }

    console.log('FCMService: Initializing global notification listeners');

    // Handle notification tap (works for both foreground and background/killed)
    PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      const data = notification.notification.data || {};
      const title = notification.notification.title || '';

      let targetPath = (data.path || data.url) ? String(data.path || data.url) : '';

      // Fallback: infer path from notification type / title content
      if (!targetPath) {
        const lower = title.toLowerCase();
        if (data.type === 'booking_status') {
          targetPath = '/orders';
        } else if (data.type === 'booking_request' || data.type === 'job_taken') {
          targetPath = '/worker';
        } else if (
          lower.includes('accepted') ||
          lower.includes('completed') ||
          lower.includes('booking')
        ) {
          targetPath = '/orders';
        } else if (lower.includes('request') || lower.includes('🛺') || lower.includes('🛠️')) {
          targetPath = '/worker';
        } else {
          targetPath = '/';
        }
      }

      console.log('FCMService: Notification tapped! Target path:', targetPath);

      // Persist path in localStorage — survives cold start / app being killed
      localStorage.setItem(this.STORAGE_KEY, targetPath);

      // If navigate handler is already registered (app was backgrounded), go now
      this.checkAndRedirect();
    });

    // When app comes to foreground after being killed or sent to background,
    // re-attempt navigation to the pending path
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        const pending = localStorage.getItem(this.STORAGE_KEY);
        if (pending) {
          console.log('FCMService: App foregrounded with pending path:', pending);
          // Small delay to let React Router initialize
          setTimeout(() => this.checkAndRedirect(), 300);
        }
      }
    });
  }

  private static async updateTokenInFirebase(uid: string, fcmToken: string, isWorker: boolean) {
    const table = isWorker ? 'workers' : 'users';
    try {
      const updates: any = {};
      updates[`${table}/${uid}/fcmToken`] = fcmToken;
      updates[`${table}/${uid}/lastTokenUpdate`] = Date.now();
      // Always also save to users table so users receive booking status notifications
      updates[`users/${uid}/fcmToken`] = fcmToken;
      await update(ref(db), updates);
    } catch (err) {
      console.error("Error storing FCM token:", err);
    }
  }

  static async sendPushNotification(targetToken: string, title: string, body: string, data: any = {}) {
    if (!targetToken) return;

    const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzBalbTrXBCKBG54rbwi09kVcPHTbzT7OgDeS6inIGYcXSwz0SjhuW3vTM2Zy8-LXnJuw/exec";
    
    const enhancedData = {
      ...data,
      click_action: "OPEN_APP",
      notification_priority: "high",
      channel_id: "default"
    };

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        body: JSON.stringify({
          token: targetToken,
          title: title,
          body: body,
          data: enhancedData
        }),
      });

      const result = await response.json();
      console.log('Google Script Relay result:', result);
      return result;
    } catch (err) {
      console.error('Error sending through Google Relay:', err);
    }
  }

  static async clearTokenOnLogout(uid: string, isWorker: boolean) {
    const table = isWorker ? 'workers' : 'users';
    try {
      const updates: any = {};
      updates[`${table}/${uid}/fcmToken`] = null;
      updates[`users/${uid}/fcmToken`] = null;
      await update(ref(db), updates);
      // Clear any pending notification navigation
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (err) {
      console.error("Error clearing token:", err);
    }
  }
}
