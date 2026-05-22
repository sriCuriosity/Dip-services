## Project Overview

DIP Services is a **doorstep services marketplace** that connects customers with local workers (tradespeople and outdoor-service providers) and provides an admin console for managing workers, orders, and platform commissions. The app is built as a **React + Vite single-page application (SPA)** backed by **Firebase (Auth, Realtime Database, Storage, Messaging)** and served via an **Express + Vite dev/production server**, with mobile-first UI tailored to a phone-sized viewport.

## Project Structure

- **Root**
  - `package.json` / `tsconfig.json` / `vite.config.ts`: Tooling, TypeScript, and bundler configuration.
  - `server.ts`: Express server that initializes Firebase Admin and serves the React SPA (with Vite middleware in dev, static build in production).
  - `index.html`: SPA HTML shell that mounts the React app into `#root`.
  - `.env.example`: Example environment variables for Gemini and Firebase configuration.
  - `firebase-service-account.json` (local only): Service account credentials for Firebase Admin (not for source control).
  - `metadata.json`: High-level app metadata for hosting/runtime.
  - `public/`: PWA assets (icons, `manifest.json`, splash image).
- **`src/`**
  - `main.tsx`: React entry point; creates the root and renders `App`.
  - `App.tsx`: Top-level router and providers (Auth, localization, splash screen, guarded routes).
  - `index.css`: Tailwind v4-based global styles and shared utility classes (`mobile-container`, `btn-primary`, etc.).
  - `types.ts`: Shared TypeScript types (`UserProfile`, `WorkerProfile`, `Order`, etc.).
  - `contexts/`
    - `AuthContext.tsx`: Auth and profile context (Firebase Auth + Realtime DB, foreground push setup).
    - `LanguageContext.tsx`: i18n context with English and Tamil translations.
  - `lib/`
    - `firebase.ts`: Client-side Firebase initialization (App, Auth, DB, Storage, Analytics, Messaging).
    - `utils.ts`: UI utilities (class name merging, currency/date formatting, WhatsApp link generator).
    - `notifications.ts`: Helper for requesting notification permission and listening to FCM messages.
    - `imageUtils.ts`: Image compression helper for profile photos.
  - `components/`
    - `Auth/` (`Login.tsx`, `AuthGuard.tsx`): Login/registration flow and route guarding with role checks.
    - `Layout/` (`MobileLayout.tsx`): Mobile shell with bottom navigation that adapts to the current user role.
    - `Common/` (`SplashScreen.tsx`, `ConfigRequired.tsx`): Splash animation and Firebase-configuration warning view.
    - `Profile/` (`Profile.tsx`): User profile page, avatar upload, language switcher, and worker-specific navigation.
    - `User/` (`UserDashboard.tsx`, `OrderHistory.tsx`, `WorkerDetail.tsx`): Customer-facing worker discovery, booking, and order tracking.
    - `Worker/` (`WorkerDashboard.tsx`, `WorkerProfileSetup.tsx`, `OutdoorProfileSetup.tsx`, `Earnings.tsx`): Worker job management, service profile configuration, outdoor-service configuration, and commission/earnings management.
    - `Admin/` (`AdminDashboard.tsx`): Admin console for platform stats, orders, workers, users, and broadcast notifications.

## Technologies Used

- **Frontend**
  - **React 19** with **TypeScript** and **React Router DOM 7** for SPA routing.
  - **Vite 6** as the bundler/dev server (plus `@vitejs/plugin-react`).
  - **Tailwind CSS v4** (via `@tailwindcss/vite`) for utility-first styling.
  - **Framer Motion** and `motion` for animations and splash screen transitions.
  - **Lucide React** for iconography.
  - **browser-image-compression** for client-side image optimization.
- **Backend / Runtime**
  - **Node.js / Express 4** in `server.ts` as the HTTP server.
  - **Vite middleware** in development and static `dist` serving in production.
  - **Firebase Admin SDK** for server-side FCM notifications and Realtime Database access.
  - **dotenv** for environment variable loading.
  - **better-sqlite3** is listed as a dependency but not currently used in this codebase.
- **Firebase (client-side)**
  - **Auth** for email/password authentication.
  - **Realtime Database** for users, workers, orders, outdoor profiles, and FCM tokens.
  - **Storage** for user profile images.
  - **Analytics** (optional, only when `window` is available).
  - **Messaging (FCM)** for push notifications (with `firebase-messaging-sw.js` served by Express).
- **Tooling**
  - **tsx** for running TypeScript (`server.ts`) via `npm run dev` / `npm run start`.
  - **TypeScript** compiler for type-checking (`npm run lint`).
  - **tailwind-merge + clsx** for conditional class name composition.

## Architecture Explanation

- **High-level design**
  - The app is a **multi-sided marketplace** with three primary personas:
    - **Customer (user)**: searches and books workers for home and outdoor services.
    - **Worker**: configures service profiles, receives and manages job requests, and pays platform commissions.
    - **Admin**: monitors platform metrics, manages orders/workers/users, and sends targeted or broadcast notifications.
  - Client UI is a **single-page React app** rendered into `index.html` using Vite; the UI is designed for a **single mobile viewport** via the `mobile-container` class.
  - Data and auth are handled almost entirely via **Firebase client SDKs** talking directly to the Realtime Database and Auth.
  - **Server responsibilities (Express)**:
    - Initialize Firebase Admin using either a local service-account JSON or environment variables.
    - Provide a single REST endpoint `/api/notify` to send server-signed FCM notifications to users/workers.
    - Serve a dynamic `firebase-messaging-sw.js` service worker script with Firebase configuration from environment variables (or defaults).
    - Act as the hosting surface for the Vite dev middleware in development and static assets in production.

- **Routing & layout**
  - `App.tsx` wraps the entire app in:
    - `AuthProvider`: exposes `user`, `profile`, and `refreshProfile`, and sets up foreground FCM messaging.
    - `LanguageProvider`: handles language selection and translation (`t(key)`) for English and Tamil.
  - `BrowserRouter` defines:
    - `/login`: public login/register screen.
    - Authenticated routes nested under `MobileLayout` wrapped by `AuthGuard`:
      - Customer routes: `/` (user dashboard), `/orders`, `/profile`.
      - Worker routes: `/worker`, `/worker/profile`, `/worker/outdoor-profile`, `/worker/earnings` (role-guarded to `worker`).
      - Admin routes: `/admin`, `/admin/orders`, `/admin/workers` (role-guarded to `admin`).
    - Fallback wildcard route redirects to `/`.
  - `MobileLayout` renders an `Outlet` and bottom navigation, with items tailored to the current `profile.role` and live badges (e.g., pending worker jobs).

- **State & data flow**
  - **AuthContext**
    - Subscribes to `onAuthStateChanged` from Firebase Auth.
    - For authenticated users, fetches `users/{uid}` from Realtime DB into `profile`, then:
      - Sets up push notifications (requesting browser permission, retrieving FCM token via client SDK, saving token to `users/{uid}/fcmToken` and `workers/{uid}/fcmToken` where applicable).
    - Exposes `refreshProfile` for views that update profile data.
  - **LanguageContext**
    - Stores the selected language in `localStorage` and exposes `t(key)` to map UI strings based on the current language.
  - **Feature components** read from and write to Firebase Realtime Database using references rooted at:
    - `users/` (user profiles).
    - `workers/` (worker profiles and stats).
    - `outdoor_profiles/` (outdoor-service configurations).
    - `orders/` (job orders between users and workers).
  - **Notifications**
    - Client-side FCM tokens are stored in Realtime DB.
    - Server-side `/api/notify` resolves `users/{uid}/fcmToken` or `workers/{uid}/fcmToken` and sends FCM notifications using Firebase Admin.
    - Admin and worker actions (e.g., verifying commission, updating order status) call `/api/notify` to inform counterparties.

## Important Files and Their Purpose

- **`server.ts`**
  - Configures Express, loads environment variables, and initializes Firebase Admin via either `firebase-service-account.json` or environment variables.
  - Implements `POST /api/notify` to send push notifications to target UIDs by resolving FCM tokens in Realtime DB.
  - Serves a dynamic `firebase-messaging-sw.js` script that configures Firebase Messaging for the browser.
  - Integrates Vite middleware in development; serves `dist` and `public` statics in production and falls back to `dist/index.html` for SPA routing.

- **`vite.config.ts`**
  - Adds React and Tailwind plugins.
  - Injects `process.env.GEMINI_API_KEY` into the client bundle.
  - Configures an alias `@` to the project root for ergonomic imports.

- **`src/main.tsx`**
  - SPA entry: mounts `<App />` into `#root` using React DOM’s `createRoot`.

- **`src/App.tsx`**
  - Checks `isFirebaseConfigured` (currently hard-coded `true` but conceptually used to gate config).
  - Shows an animated `SplashScreen` for a short duration before rendering the router and routes.
  - Wires up routes and wraps main content with `AuthProvider` and `LanguageProvider`.

- **`src/contexts/AuthContext.tsx`**
  - Centralizes authentication and user profile loading.
  - Manages foreground FCM notifications and writes FCM tokens to DB for users/workers.

- **`src/contexts/LanguageContext.tsx`**
  - Defines translations for a large number of UI keys in English and Tamil.
  - Provides `t(key)` to all components and persists language selection.

- **`src/components/Auth/Login.tsx`**
  - Handles both login and registration flows using email/password.
  - On registration, writes a `users/{uid}` profile and a default `workers/{uid}` record when role is `worker`.
  - Offers a “hidden” admin role toggle after repeated logo taps.

- **`src/components/Auth/AuthGuard.tsx`**
  - Protects routes based on authentication state and optional `allowedRoles`.
  - Redirects unauthenticated users to `/login` and unauthorized roles to their role-appropriate dashboard.

- **`src/components/Layout/MobileLayout.tsx`**
  - Defines the mobile container and bottom navigation, dynamically adapted for admin, worker, or customer.
  - Listens to `orders/` in Realtime DB for workers to show a badge count of pending jobs.

- **User-facing components**
  - `UserDashboard.tsx`: Lists workers (including outdoor workers) with filtering by category, city, search, and sorting (by rate or experience).
  - `WorkerDetail.tsx`: Detailed worker view and booking flow (creates an order, triggers push notification, opens WhatsApp).
  - `OrderHistory.tsx`: Displays the user’s past and active bookings with filtering, modal details, and cancellation (updates `orders/{id}/status` to `rejected`).

- **Worker-facing components**
  - `WorkerDashboard.tsx`: Worker’s job inbox showing pending/active/completed/declined jobs; supports accept/decline and completion with commission calculation and due dates, plus push notifications back to the customer.
  - `WorkerProfileSetup.tsx`: Trade selection, address and bio management, and rate configuration (quick visit, half day, full day).
  - `OutdoorProfileSetup.tsx`: Configuration for outdoor services (Auto, Tempo Van, Marriage Hall, Catering, House Rent), with trade-specific rate model.
  - `Earnings.tsx`: Shows aggregated earnings, unpaid commission, and push-driven payment confirmation via UPI and admin verification.

- **Admin-facing components**
  - `AdminDashboard.tsx`: Admin console with tabs for stats, orders, workers, and users; provides push notification modals to target all workers/users or specific ones and to verify worker payments/commissions.

- **Utility and support**
  - `src/lib/firebase.ts`: Single source of truth for Firebase client instances (Auth, DB, Storage, Messaging).
  - `src/lib/utils.ts`: Utility helpers (classNames, currency and date formatting, WhatsApp link builder).
  - `src/lib/notifications.ts`: Alternative FCM helper for requesting permission and listening for messages.
  - `src/lib/imageUtils.ts`: Used by `Profile` for compressing profile pictures before uploading.
  - `src/components/Common/ConfigRequired.tsx`: Guidance screen when Firebase configuration is missing.
  - `src/components/Common/SplashScreen.tsx`: Animated splash screen using `motion/react`.

## Key Functions and Modules

- **Authentication and profiles**
  - `AuthProvider` (`AuthContext.tsx`):
    - Subscribes to Firebase Auth and manages `user`, `profile`, and `loading` state.
    - `fetchProfile(uid)`: loads `users/{uid}` profile, sets it into context, and calls `setupNotifications`.
    - `setupNotifications(uid, role)`: requests notification permissions, retrieves FCM token, and writes it into `users/{uid}/fcmToken` and optionally `workers/{uid}/fcmToken`, plus attaches a foreground `onMessage` listener.
    - `refreshProfile()`: re-loads the user profile.
  - `Login` component:
    - Uses `createUserWithEmailAndPassword` and `signInWithEmailAndPassword`.
    - On registration, writes user profile and initializes default worker profile data when role is `worker`.

- **Orders and workflow**
  - **Booking (User → Worker)**
    - `WorkerDetail.handleBooking`:
      - Validates auth, creates a new order under `orders/` with details such as issue, preferred time, duration, offered amount, and computed commission/platform fee.
      - Calls `/api/notify` to send a push notification to the worker.
      - Builds a detailed WhatsApp message and opens a `wa.me` link to contact the worker.
  - **Worker job management**
    - `WorkerDashboard.handleStatusUpdate(orderId, newStatus)`:
      - Updates `orders/{id}/status` and associated timestamps (e.g., `rejectedAt`, `completedAt`).
      - On completion, increments `workers/{uid}/totalJobs` and `totalEarnings`.
      - Calls `/api/notify` to send role-based notifications to the user.
    - `WorkerDashboard.handleCompleteOrder`:
      - Confirms order is still `accepted`, then computes final amount and a 2% commission; sets `commissionPaid`, `paymentStatus`, `feeDueDate`, and `platformFee` fields.
      - Triggers a push notification to the user.
  - **User order history**
    - `OrderHistory`:
      - Subscribes to all `orders` and filters by `userId` to show the current user’s bookings.
      - `handleCancelOrder`: toggles confirmation state and, once confirmed, sets the order’s `status` to `rejected` with `rejectedAt`.
  - **Commission & payments (worker → platform)**
    - `Earnings.handlePayCommission`:
      - Computes unpaid commission, opens a UPI deep link prefilled with payee, amount, and currency.
    - `Earnings.handleConfirmPayment`:
      - Marks unpaid orders with `paymentRequested: true` and shows an alert; admin later verifies payments via `AdminDashboard`.

- **Admin operations**
  - `AdminDashboard`:
    - Subscribes to orders, workers, and users.
    - Computes platform-wide stats (total orders, workers, users, earnings, commission).
    - `handleVerifyPayment(orderId)`: marks `commissionPaid` + `paymentStatus: 'paid'` and unsets `paymentRequested`.
    - `sendNotification()`: sends targeted or broadcast push notifications by iterating through selected UIDs and calling `/api/notify`.

- **Utility modules**
  - `cn(...inputs)`: merges Tailwind class names using `clsx` + `tailwind-merge`.
  - `formatCurrency(amount)`: Indian Rupee formatting with `Intl.NumberFormat('en-IN')`.
  - `formatDate(timestamp)`: robust date formatting for `Order` and analytics timestamps.
  - `generateWhatsAppLink(phone, message)`: builds a `wa.me` URL with encoded message.
  - `compressImage(file)`: compresses images before uploading to Firebase Storage.

## Application Workflow

- **1. Environment & configuration**
  - Developer or operator configures `.env` or hosting secrets with:
    - Firebase web configuration (`VITE_FIREBASE_*`) for the client-side SDK.
    - Firebase Admin credentials (`FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_DATABASE_URL`) or a `firebase-service-account.json` file for the server.
    - Optional `GEMINI_API_KEY` for future AI integrations.

- **2. Server startup**
  - `npm run dev` / `npm run start`:
    - Runs `tsx server.ts`.
    - Express initializes Firebase Admin and starts on port `3000`.
    - In development, Vite is created with `middlewareMode: true` and mounted on Express.
    - In production, Express serves `dist` (build output) and `public` assets.

- **3. Client bootstrapping**
  - Browser loads `index.html` and then `src/main.tsx`.
  - `main.tsx` renders `<App />` into `#root`.
  - `App`:
    - Shows the animated `SplashScreen` briefly.
    - If Firebase isn’t configured (conceptually via `isFirebaseConfigured`), shows `ConfigRequired`.
    - Otherwise, sets up providers and `BrowserRouter`.

- **4. Authentication & role selection**
  - User visits `/login`:
    - Can toggle between **Login** and **Register**.
    - Chooses role: customer, worker, or (hidden) admin.
    - On registration, `users/{uid}` is created; workers also get a default `workers/{uid}` record.
  - After login or registration, user is redirected to `/` and `AuthProvider` begins monitoring auth state and loading profile data and FCM tokens.

- **5. Core flows**
  - **Customer:**
    - Uses `UserDashboard` to browse workers/outdoor services by category, location, and price.
    - Opens `WorkerDetail`, fills in issue/time/duration, and confirms a booking.
      - Creates an `Order` in Realtime DB (status `Pending`).
      - Worker receives push and WhatsApp messages.
    - Tracks requests via `OrderHistory`, which supports filtering and cancellation.
  - **Worker:**
    - Configures trade, address, bio, and rates via `WorkerProfileSetup`.
    - Optionally configures outdoor services via `OutdoorProfileSetup`.
    - Manages incoming job requests via `WorkerDashboard` (accept/decline/complete).
      - On completion, commission is calculated and a fee due date is set.
    - Pays platform commission via UPI and confirms via `Earnings`, which flags `paymentRequested` for admin verification.
  - **Admin:**
    - Accesses `AdminDashboard` to monitor:
      - Overall stats and pending verifications.
      - Full order list with filters and status tags.
      - Worker and user lists with contact details and stats.
    - Verifies commission payments using the pending verifications list.
    - Sends broadcast or targeted notifications using the notification modal.

- **6. Push notifications**
  - Client registers for FCM:
    - `AuthContext` asks for `Notification` permission and retrieves a token using `getToken(messaging)`.
    - Token is written into Realtime DB under the user and optionally worker nodes.
  - Server receives `/api/notify` calls from admin or worker flows and:
    - Looks up the target’s FCM token in `users` and/or `workers`.
    - Uses `admin.messaging().send(message)` to push notifications.
  - `firebase-messaging-sw.js` ensures background messages show native notifications and interact properly with the PWA.

## Dependencies

- **Runtime dependencies (from `package.json`)**
  - `react`, `react-dom`: Core UI library.
  - `react-router-dom`: Client-side routing.
  - `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`: Bundler and dev tooling.
  - `tailwind-merge`, `clsx`: Class name utilities.
  - `firebase`: Client SDKs (App, Auth, Database, Storage, Analytics, Messaging).
  - `firebase-admin`: Server SDK used in `server.ts` for notifications and database access.
  - `express`: HTTP server and routing framework.
  - `dotenv`: Environment variable loader.
  - `better-sqlite3`: Installed but not used in current code; could be removed or integrated for server-side persistence if needed.
  - `browser-image-compression`: Image compression for avatar uploads.
  - `framer-motion`, `motion`: Animation libraries.
  - `lucide-react`: Icons.
  - `@google/genai`: Present but not currently used; reserved for future Gemini integrations.
  - `tsx`: TypeScript runner for Node.

- **Dev dependencies**
  - `typescript`, `@types/node`, `@types/express`: TypeScript tooling and Node typings.
  - `tailwindcss`, `autoprefixer`: CSS tooling for Tailwind v4.

## How to Run the Project

> Note: Exact commands and environment setup may vary depending on your hosting environment. The steps below assume a local development setup.

- **1. Install dependencies**

```bash
npm install
```

- **2. Configure environment**
  - Copy `.env.example` to `.env` (or configure environment variables via your hosting platform) and set:
    - Firebase web config: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_DATABASE_URL`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID`.
    - Firebase Admin credentials: either provide `firebase-service-account.json` file at the project root, or configure `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, and `VITE_FIREBASE_PROJECT_ID` / `VITE_FIREBASE_DATABASE_URL`.
    - (Optional) `GEMINI_API_KEY` for future AI features.

- **3. Start the dev server (Express + Vite)**

```bash
npm run dev
```

- This runs `server.ts` via `tsx`, which:
  - Spins up Express on port `3000`.
  - Boots Vite in middleware mode for hot reloading.
  - Serves the SPA at `http://localhost:3000`.

- **4. Build and run in production-like mode**

```bash
npm run build
# then, using the same server entry:
npm run start
```

- `npm run build` builds the Vite app into `dist/`.
- `npm run start` runs `server.ts` again, but in production mode the server serves static assets from `dist/` and `public/`.

- **5. Type-check**

```bash
npm run lint
```

This runs the TypeScript compiler with `--noEmit` using `tsconfig.json`.

## Possible Improvements

- **Security and configuration**
  - **Externalize hard-coded Firebase config** in `src/lib/firebase.ts` to rely fully on environment variables (e.g., via Vite’s `import.meta.env`), reducing risk when the repository is shared.
  - Ensure `firebase-service-account.json` is **ignored in `.gitignore`** and never committed (the file is present locally now but should be treated as a secret).
  - Use **role-based security rules** in Firebase Realtime Database to enforce server-side access control matching the roles in the app.

- **Code quality and consistency**
  - Remove or integrate unused dependencies such as `better-sqlite3` and `@google/genai` if not needed.
  - Normalize `Order` types and statuses:
    - In code there are mixed casing and additional fields (`status: 'Pending'` vs `'pending'`, `issue` vs `description`, `duration` as UI label vs strict union type).
    - Standardize field names and status enums and update Firestore/Realtime DB structures for consistency.
  - Extract shared logic (e.g., order mapping from Realtime DB snapshots) into reusable helpers to avoid duplication across admin, worker, and user views.

- **DX and documentation**
  - Expand `README.md` to include:
    - Detailed setup instructions for Firebase (project creation, Auth, Realtime DB, Messaging, Storage).
    - Local development vs production deployment notes.
    - A concise architecture diagram and data model examples.
  - Document the **notification flow** (how FCM tokens are stored, who calls `/api/notify`, and expected payloads).

- **UX and robustness**
  - Add better **error handling and user-facing feedback** around network and Firebase failures (e.g., toasts/snackbars instead of raw `alert()` in many places).
  - Improve **accessibility** (ARIA labels, keyboard focus states) and consider light/dark theme toggling.
  - Consider implementing **pagination or virtualized lists** for large datasets in admin views.
  - Enhance **input validation** (phone numbers, email, numeric ranges for rates and commission amounts) and guard against malformed or missing data from the database.

- **Testing and monitoring**
  - Add at least a minimal **test suite** (unit tests for utilities and context logic, plus basic integration tests for core flows).
  - Introduce **logging and monitoring** (client and server) for key events like failed notifications, order creation, and payment verification.

