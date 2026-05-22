import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyAtbm1Ii0CL3Iij1oNKwnrMnVKkB_khuEY",
  authDomain: "siva-41d12.firebaseapp.com",
  databaseURL: "https://siva-41d12-default-rtdb.firebaseio.com",
  projectId: "siva-41d12",
  storageBucket: "siva-41d12.firebasestorage.app",
  messagingSenderId: "170450822577",
  appId: "1:170450822577:web:53756e812f03f0b62cc990",
  measurementId: "G-4LD7V9XRMR",
};

export const isFirebaseConfigured = true;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);
// Initialize Analytics safely
export let analytics: any = null;
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.warn('Firebase Analytics failed to initialize:', error);
  }
}

// Initialize Messaging conditionally (only works in supported browsers)
export let messaging: any = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
    }
  });
}

export default app;
