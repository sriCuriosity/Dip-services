import { PushNotifications, Token } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { auth, db, messaging } from '@/src/lib/firebase';
import { ref, update } from 'firebase/database';
import { FCMService } from './fcmService';

export const initializePushNotifications = async (user: any, role: string) => {
  if (!user) return;

  if (Capacitor.isNativePlatform()) {
    return setupNativePush(user, role);
  } else {
    return setupWebPush(user, role);
  }
};

const setupNativePush = async (user: any, role: string) => {
  try {
    // Request permission to use push notifications
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('User denied native push permissions');
      return;
    }

    // 1. Add listeners BEFORE registering
    PushNotifications.addListener('registration', (token: Token) => {
      console.log('Native Push Token:', token.value);
      saveTokenToDB(user.uid, role, token.value);
    });

    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error on native registration:', error);
    });

    // 2. Create the notification channel (Android only)
    if (Capacitor.getPlatform() === 'android') {
      await PushNotifications.createChannel({
        id: 'default',
        name: 'Default Channel',
        description: 'General notifications',
        sound: 'default',
        importance: 5,
        visibility: 1,
        vibration: true,
      });
      console.log('Push notification channel created: default');
    }

    // 3. Register with FCM
    await PushNotifications.register();

    // 4. Handle Notification Clicks
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push notification action performed:', notification);
      // Let FCMService handle the actual redirection logic
      (FCMService as any).pendingPath = notification.notification.data?.path || '/';
      FCMService.checkAndRedirect();
    });

  } catch (err) {
    console.error('Error in setupNativePush:', err);
  }
};

const setupWebPush = async (user: any, role: string) => {
  if (!messaging) return;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        // vapidKey: 'YOUR_VAPID_KEY'
      });

      if (token) {
        console.log('Web FCM Token:', token);
        saveTokenToDB(user.uid, role, token);
      }

      onMessage(messaging, (payload) => {
        console.log('Web foreground message:', payload);
        if (Notification.permission === 'granted') {
            new Notification(payload.notification?.title || 'Notification', {
                body: payload.notification?.body,
                data: payload.data
            });
        }
      });
    }
  } catch (err) {
    console.error('Error in setupWebPush:', err);
  }
};

const saveTokenToDB = async (uid: string, role: string, token: string) => {
  try {
    const updates: any = {};
    updates[`users/${uid}/fcmToken`] = token;
    
    // Support all service provider roles
    if (['worker', 'shop', 'outdoor'].includes(role)) {
      updates[`workers/${uid}/fcmToken`] = token;
      if (role === 'shop') updates[`shops/${uid}/fcmToken`] = token;
      if (role === 'outdoor') updates[`outdoor_profiles/${uid}/fcmToken`] = token;
    }
    
    await update(ref(db), updates);
    console.log(`FCM Token successfully saved for ${uid} (Role: ${role})`);
  } catch (err) {
    console.error('Error saving token to DB:', err);
  }
};
