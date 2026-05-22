# Backend Structure - DIP Services

The backend is a Node.js Express server (`server.ts`) that complements the Firebase client-side SDK.

## 📂 Core Responsibilities

### 1. HTTP Server & SPA Serving
- Serves the compiled React SPA from the `dist` directory.
- Implements fallback routing to `index.html` for client-side navigation.
- Integrates **Vite Middleware** in development mode for HMR.

### 2. Push Notification Gateway (`/api/notify`)
- Acts as a secure bridge to **Firebase Cloud Messaging (FCM)**.
- Uses **Firebase Admin SDK** for server-side notification dispatch.
- Supports both targeted (UID-based) and broadcast notifications.

### 3. Database Listeners
The server runs background listeners using the Admin SDK:
- **Order Listener**: Monitors the `orders` node for new pending jobs.
- **Auto-Notifications**: Automatically notifies workers when a job is assigned to them.

## 🛠️ Tech Stack
- **Express**: Web framework.
- **Firebase Admin SDK**: For secure DB and Messaging access.
- **tsx**: To run TypeScript code directly without a separate build step in development.
- **dotenv**: For managing environment variables.

## 🚦 Request Lifecycle

1. **Client Action**: A worker marks a job as "Accepted".
2. **Database Update**: The client SDK updates `orders/{id}/status`.
3. **API Call**: The client calls `POST /api/notify` to inform the customer.
4. **Server Processing**:
   - Resolves the Customer's FCM token from `users/{targetUid}/fcmToken`.
   - Sends the notification via `admin.messaging().send()`.
5. **Client Feedback**: The customer receives a push notification on their device.

## 📦 Middleware & Utilities
- **JSON Parsing**: `express.json()` for payload handling.
- **Service Worker Provider**: Dynamically serves `firebase-messaging-sw.js` with environment-injected config.
