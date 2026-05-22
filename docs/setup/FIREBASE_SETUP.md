# Firebase Setup Guide - DIP Services

This guide provides step-by-step instructions to configure Firebase for the DIP Services platform.

## 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and name it `DIP Services`.
3. Disable or Enable Google Analytics as per your preference.

## 2. Authentication Setup
1. In the Firebase Sidebar, go to **Build > Authentication**.
2. Click **Get Started**.
3. Enable **Email/Password** provider.

## 3. Realtime Database Setup
1. Go to **Build > Realtime Database**.
2. Click **Create Database**.
3. Select a location (e.g., `us-central1`).
4. Start in **test mode** for development, but switch to **locked mode** with proper rules for production.
5. Copy your database URL (e.g., `https://your-project-id.firebaseio.com`).

## 4. Storage Setup
1. Go to **Build > Storage**.
2. Click **Get Started**.
3. Select default bucket settings and location.

## 5. Firebase Cloud Messaging (FCM)
1. Go to **Project Settings > Cloud Messaging**.
2. Enable **Firebase Cloud Messaging API (V1)**.
3. Generate a **Web Push certificate (VAPID key)** in the Web configuration section.

## 6. Client Configuration (Web App)
1. In Project Settings, under **General**, scroll to **Your apps**.
2. Click the **Web icon (</>)** to register a new web app.
3. Copy the `firebaseConfig` object and paste the values into your `.env` file:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_DATABASE_URL`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

## 7. Admin SDK Setup (for Push Notifications)
To allow the Express server to send notifications:
1. Go to **Project Settings > Service accounts**.
2. Click **Generate new private key**.
3. Save the JSON file as `firebase-service-account.json` in the project root.
   - **OR** configure `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` in your `.env` file.

## 8. Security Rules
Deploy the following rules to the Realtime Database:
```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null && (auth.uid == $uid || root.child('users').child(auth.uid).child('role').val() == 'admin')",
        ".write": "auth != null && auth.uid == $uid"
      }
    },
    "workers": {
      "$uid": {
        ".read": "true",
        ".write": "auth != null && auth.uid == $uid"
      }
    },
    "orders": {
      ".read": "auth != null",
      ".write": "auth != null",
      "$orderId": {
        ".indexOn": ["userId", "workerId"]
      }
    }
  }
}
```
