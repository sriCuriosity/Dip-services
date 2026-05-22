# API Documentation

The backend is an Express server primarily used for handling push notifications and serving the application.

## 📡 Endpoints

### 1. Send Push Notification
Used to send targeted or broadcast notifications via FCM.

- **URL**: `/api/notify`
- **Method**: `POST`
- **Auth Required**: Internal (Admin/App)
- **Body**:
```json
{
  "targetUid": "user_123_abc",
  "title": "New Job Request 🛠️",
  "body": "A customer needs a Plumber at T-Nagar.",
  "data": {
    "orderId": "order_789",
    "path": "/worker",
    "type": "booking_request"
  }
}
```
- **Responses**:
  - `200 OK`: `{ "success": true, "messageId": "..." }`
  - `404 Not Found`: `{ "error": "User FCM token not found" }`
  - `500 Error`: `{ "error": "Firebase Admin not initialized" }`

### 2. Service Worker
Serves the dynamic Firebase Messaging Service Worker.

- **URL**: `/firebase-messaging-sw.js`
- **Method**: `GET`
- **Description**: Injects environment-specific Firebase config into the service worker for background notifications.

## 🛡️ Middleware
- **express.json()**: For parsing JSON request bodies.
- **Vite Middleware**: In development mode, handles HMR and TypeScript transpilation.

## 🚦 Status Codes
- `200`: Success.
- `400`: Missing required fields in payload.
- `404`: Target user or FCM token not found.
- `500`: Server configuration error (e.g., Firebase credentials missing).