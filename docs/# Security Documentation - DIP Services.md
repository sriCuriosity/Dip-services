# Security Documentation - DIP Services

## 🔐 Authentication Security
- **Firebase Auth**: Industry-standard secure authentication.
- **Role Protection**: `AuthGuard` component enforces role-based access on the frontend.
- **Server-Side Validation**: `server.ts` uses Firebase Admin SDK to verify tokens if expanded for sensitive operations.

## 📍 Location Security
- **GPS Verification**: Mobile app uses native GPS sensors via Capacitor, making location spoofing more difficult than browser-based overrides.
- **Tamil Nadu Fencing**: `SearchService` includes a bounding box check (`TN_BBOX`) to ensure services remain within the targeted region.

## 🛡️ API & Data Security
- **Input Sanitization**: Request bodies are validated for required fields in `/api/notify`.
- **Firebase Security Rules**: (Recommended) Rules should be configured to allow users to only read/write their own data and orders.
- **Environment Variables**: Sensitive credentials (FCM keys, DB URLs) are stored in `.env` and never committed to source control.

## 🚫 Prevention Measures
- **SQL Injection**: Not applicable (using NoSQL Realtime DB and `better-sqlite3` is not active).
- **XSS**: React's automatic escaping prevents most XSS attacks.
- **CSRF**: Firebase Auth tokens are passed via secure headers or managed internally by the SDK.