import express from 'express';
import { createServer as createViteServer } from 'vite';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Firebase Admin
let adminInitialized = false;

try {
  const serviceAccountPath = path.resolve('./firebase-service-account.json');
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.VITE_FIREBASE_DATABASE_URL || "https://siva-41d12-default-rtdb.firebaseio.com"
    });
    adminInitialized = true;
    console.log("Firebase Admin initialized successfully using service account file.");
  } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY && process.env.VITE_FIREBASE_PROJECT_ID) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      databaseURL: process.env.VITE_FIREBASE_DATABASE_URL || "https://siva-41d12-default-rtdb.firebaseio.com"
    });
    adminInitialized = true;
    console.log("Firebase Admin initialized successfully using environment variables.");
  } else {
    console.warn("Firebase Admin credentials missing. Push notifications will not work.");
  }
} catch (err) {
  console.error("Firebase Admin initialization error:", err);
}

// API endpoint to send push notifications
app.post('/api/notify', async (req, res) => {
  if (!adminInitialized) {
    console.warn("Notification request failed: Firebase Admin not initialized.");
    return res.status(500).json({ error: 'Firebase Admin not initialized' });
  }

  const { targetUid, title, body, data } = req.body;
  console.log(`Notification request for UID: ${targetUid}, User: ${title}`);

  if (!targetUid || !title || !body) {
    console.warn("Invalid notification payload received");
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const db = admin.database();
    
    // Check if target is a user
    let tokenSnapshot = await db.ref(`users/${targetUid}/fcmToken`).once('value');
    let token = tokenSnapshot.val();

    // If not found in users, check workers
    if (!token) {
      tokenSnapshot = await db.ref(`workers/${targetUid}/fcmToken`).once('value');
      token = tokenSnapshot.val();
      if (token) console.log(`Found token in workers node for ${targetUid}`);
    } else {
      console.log(`Found token in users node for ${targetUid}`);
    }

    if (!token) {
      console.warn(`No FCM token found for UID: ${targetUid}`);
      return res.status(404).json({ error: 'User FCM token not found' });
    }

    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      token: token,
      android: {
        priority: 'high' as any,
        notification: {
          channelId: 'default',
          sound: 'default',
          priority: 'max' as any,
          visibility: 'public' as any,
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log(`Successfully sent message to ${targetUid}: ${response}`);
    res.json({ success: true, messageId: response });
  } catch (error) {
    console.error('Error sending push notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Serve the Firebase Messaging Service Worker dynamically
app.get('/firebase-messaging-sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
    importScripts('https://www.gstatic.com/firebasejs/10.10.0/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/10.10.0/firebase-messaging-compat.js');

    // Basic app shell caching for PWA offline support
    const CACHE_NAME = 'dip-services-cache-v1';
    const APP_SHELL = [
      '/',
      '/index.html',
      '/manifest.json',
      '/icon.png',
      '/icons/icon-192.png',
      '/icons/icon-512.png',
      '/splash.png'
    ];

    self.addEventListener('install', (event) => {
      event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
          return cache.addAll(APP_SHELL);
        }).catch((err) => {
          console.warn('SW install cache error', err);
        })
      );
      self.skipWaiting();
    });

    self.addEventListener('activate', (event) => {
      event.waitUntil(
        caches.keys().then((keys) =>
          Promise.all(
            keys.map((key) => {
              if (key !== CACHE_NAME) {
                return caches.delete(key);
              }
            })
          )
        )
      );
      self.clients.claim();
    });

    self.addEventListener('fetch', (event) => {
      const request = event.request;

      // Only handle GET requests
      if (request.method !== 'GET') return;

      // Navigation requests: try network first, fall back to cache/offline shell
      if (request.mode === 'navigate') {
        event.respondWith(
          fetch(request).catch(() =>
            caches.match('/index.html').then((resp) => resp || Response.error())
          )
        );
        return;
      }

      // Static assets: cache-first strategy
      event.respondWith(
        caches.match(request).then((cached) => {
          if (cached) {
            return cached;
          }
          return fetch(request)
            .then((response) => {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
              return response;
            })
            .catch(() => cached || Response.error());
        })
      );
    });

    firebase.initializeApp({
      apiKey: "${process.env.VITE_FIREBASE_API_KEY || "AIzaSyAtbm1Ii0CL3Iij1oNKwnrMnVKkB_khuEY"}",
      authDomain: "${process.env.VITE_FIREBASE_AUTH_DOMAIN || "siva-41d12.firebaseapp.com"}",
      projectId: "${process.env.VITE_FIREBASE_PROJECT_ID || "siva-41d12"}",
      storageBucket: "${process.env.VITE_FIREBASE_STORAGE_BUCKET || "siva-41d12.firebasestorage.app"}",
      messagingSenderId: "${process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "170450822577"}",
      appId: "${process.env.VITE_FIREBASE_APP_ID || "1:170450822577:web:53756e812f03f0b62cc990"}"
    });

    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Received background message ', payload);
      const notificationTitle = payload.notification.title;
      const notificationOptions = {
        body: payload.notification.body,
        icon: '/icons/icon-192.png',
        data: payload.data // Pass data to notification
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });

    self.addEventListener('notificationclick', (event) => {
      event.notification.close();
      event.waitUntil(
        (async () => {
          const targetPath = (event.notification && event.notification.data && event.notification.data.path) || '/';
          const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });

          // Focus an existing client if it's already open on any path
          for (const client of allClients) {
            if ('focus' in client) {
              const url = new URL(client.url);
              if (url.pathname === targetPath || targetPath === '/') {
                return client.focus();
              }
            }
          }

          // Otherwise open a new window at the desired path
          if (clients.openWindow) {
            return clients.openWindow(targetPath);
          }
        })()
      );
    });
  `);
});

// Automated Database Listeners for Push Notifications
if (adminInitialized) {
  const db = admin.database();

  // 1. Listen for New Orders (Jobs)
  db.ref('orders').on('child_added', async (snapshot) => {
    const order = snapshot.val();
    if (order && order.status === 'pending' && order.workerId) {
      console.log(`[Server] New job detected for worker: ${order.workerId}`);
      try {
        // Find worker token
        const tokenSnap = await db.ref(`workers/${order.workerId}/fcmToken`).once('value');
        const token = tokenSnap.val();
        
        if (token) {
          const message = {
            notification: {
              title: 'New Job Request 🛠️',
              body: `You have a new booking request from ${order.userName || 'a customer'}.`,
            },
            data: { path: '/worker', orderId: snapshot.key || '' },
            token: token,
            android: { priority: 'high' as any, notification: { channelId: 'default', sound: 'default' } }
          };
          await admin.messaging().send(message);
          console.log(`[Server] Sent job push to ${order.workerId}`);
        }
      } catch (err) {
        console.error("[Server] Error sending job push:", err);
      }
    }
  });

  // 2. Listen for New Messages
  db.ref('messages').on('child_added', (snapshot) => {
    const userMessagesRef = snapshot.ref;
    // We need to listen for children inside each user's message node
    userMessagesRef.on('child_added', async (msgSnap) => {
      const msg = msgSnap.val();
      const recipientId = snapshot.key;

      // Only notify if it's unread and not sent by the admin (or sent by admin to user)
      if (msg && !msg.read && msg.senderId !== recipientId) {
        // Debounce or check timestamp to avoid old message floods
        if (msg.timestamp && Date.now() - msg.timestamp > 30000) return; 

        console.log(`[Server] New message for: ${recipientId}`);
        try {
          let tokenSnap = await db.ref(`users/${recipientId}/fcmToken`).once('value');
          let token = tokenSnap.val();

          if (!token) {
            tokenSnap = await db.ref(`workers/${recipientId}/fcmToken`).once('value');
            token = tokenSnap.val();
          }

          if (token) {
            const message = {
              notification: {
                title: 'New Message 💬',
                body: msg.text || 'You received a new message.',
              },
              data: { path: '#messages', senderId: msg.senderId },
              token: token,
              android: { priority: 'high' as any, notification: { channelId: 'default', sound: 'default' } }
            };
            await admin.messaging().send(message);
            console.log(`[Server] Sent message push to ${recipientId}`);
          }
        } catch (err) {
          console.error("[Server] Error sending message push:", err);
        }
      }
    });
  });
}

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    console.log('Starting server in DEVELOPMENT mode with Vite middleware');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Starting server in PRODUCTION mode');
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.use(express.static(path.join(process.cwd(), 'public')));
    app.get('*', (req, res) => {
      console.log(`Serving index.html for path: ${req.path}`);
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
