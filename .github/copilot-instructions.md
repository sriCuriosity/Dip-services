# VS Code Copilot Workspace Prompt — DIP Doorstep Services 
  
 > Place this file at the root of your project as `.github/copilot-instructions.md` 
 > OR paste it in VS Code's **Copilot Chat** → `@workspace` context at session start. 
 > Copilot will use this as persistent context for all suggestions in this repo. 
  
 --- 
  
 ## 🧭 Project Identity 
  
 This project is called **DIP Doorstep Services** — a hyperlocal, mobile-first service worker booking platform built for **Tamil Nadu, India**. It connects customers needing household services (Plumbing, Electrician, Painting, Carpentry, etc.) with verified local service providers, using real-time location matching within a **25km radius**. 
  
 The app also supports **Auto/transport booking** with live route display and a tighter **10km radius** broadcast. 
  
 --- 
  
 ## 🏗️ Tech Stack (Do Not Deviate) 
  
 | Layer | Technology | 
 |---|---| 
 | Frontend | React 19 + TypeScript | 
 | Styling | Tailwind CSS v4 | 
 | Routing | React Router DOM 7 | 
 | State Management | Context API (`AuthContext`, `LanguageContext`) | 
 | Backend | Node.js + Express (TypeScript via `tsx`) | 
 | Database | Firebase Realtime Database (NoSQL, hierarchical JSON) | 
 | Auth | Firebase Authentication (Email/Password) | 
 | Storage | Firebase Storage (profile pics, service images) | 
 | Push Notifications | Firebase Cloud Messaging (FCM) | 
 | Maps | React Leaflet + ArcGIS/Photon (OpenStreetMap) geocoding | 
 | Mobile Packaging | Capacitor (cross-platform iOS/Android) | 
 | Background Location | `@capacitor-community/background-geolocation` | 
 | Animation | Framer Motion | 
 | Icons | Lucide React | 
 | i18n | Custom `LanguageContext` (English + Tamil) | 
  
 --- 
  
 ## 📂 Project Structure 
  
 ``` 
 src/ 
 ├── components/ 
 │   ├── Auth/           # Login, Registration, AuthGuard 
 │   ├── Layout/         # MobileLayout, bottom nav 
 │   ├── User/           # UserDashboard, WorkerDetail, WorkerMapView 
 │   ├── Worker/         # WorkerDashboard, Earnings, ProfileSetup 
 │   └── Common/         # MapPicker, LocationPicker, SplashScreen 
 ├── contexts/ 
 │   ├── AuthContext.tsx  # Session, FCM init, role detection 
 │   └── LanguageContext.tsx 
 ├── lib/ 
 │   └── utils.ts        # getDistance (Haversine), helpers 
 ├── services/ 
 │   └── SearchService.ts # ArcGIS + Photon geocoding, TN_BBOX fencing 
 server/ 
 └── server.ts           # Express: /api/notify, FCM broadcasts, SPA serving 
 ``` 
  
 --- 
  
 ## 🗄️ Firebase Database Schema 
  
 ``` 
 /users/{uid} 
   name, phone, role ('user' | 'worker' | 'admin'), 
   city, latitude, longitude, fcmToken 
  
 /workers/{uid} 
   trades: { Plumber: { experience, rates: {Visit, HalfDay, FullDay}, rating } } 
   isAvailable: boolean 
   totalJobs: number 
   verificationStatus: 'pending' | 'approved' | 'rejected' 
   latitude, longitude, fcmToken 
  
 /orders/{orderId} 
   userId, workerId, trade, status ('pending'|'accepted'|'completed'|'rejected') 
   rate, commissionAmount, issue, workAddress 
   sourceLat, sourceLng, bookingDate, preferredTime, duration 
  
 /outdoor_profiles/{uid} 
   # Transport and rental-specific config (Auto, JCB, Marriage Hall) 
 ``` 
  
 --- 
  
 ## 📐 Core Business Logic 
  
 ### Haversine Distance Formula 
 All location matching uses this exact implementation from `src/lib/utils.ts`: 
 ```typescript 
 export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number { 
   const R = 6371; 
   const dLat = (lat2 - lat1) * Math.PI / 180; 
   const dLon = (lon2 - lon1) * Math.PI / 180; 
   const a = 
     Math.sin(dLat / 2) * Math.sin(dLat / 2) + 
     Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
     Math.sin(dLon / 2) * Math.sin(dLon / 2); 
   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
   return R * c; 
 } 
 ``` 
 - Standard services: **25km radius** — booking button disabled if exceeded. 
 - Auto/transport: **10km radius** — server-side broadcast to all available drivers. 
  
 ### Booking Validation Rule 
 In `WorkerDetail.tsx`, the Book Now button must stay **disabled** if: 
 - Either party has no coordinates stored. 
 - `getDistance(userLat, userLng, workerLat, workerLng) > 25`. 
  
 ### Commission Rates 
 - Skilled trades (Plumber, Electrician, etc.): **3% platform fee** 
 - Transport services (Auto): **10% platform fee** 
  
 --- 
  
 ## 🔔 Notification Architecture 
  
 ### Worker Offline / Background Scenario 
 When a worker has NOT opened the app but a customer books them: 
  
 1. Customer submits booking → order written to `/orders/{orderId}` with `status: 'pending'`. 
 2. Server (`server.ts`) monitors `/orders` via Firebase Admin SDK listener and detects the new pending order. 
 3. Server reads `workers/{workerId}/fcmToken`. 
 4. Server calls FCM via `/api/notify` → sends a **data+notification payload** to the worker's device. 
 5. On Android: FCM delivers the notification even when the app is killed, via the system tray. 
 6. On iOS: APNs delivers via FCM, requires background mode entitlements in Capacitor config. 
 7. Worker taps notification → app opens to the job request screen. 
  
 **Critical**: The worker's **last known location** (stored at registration or last app open) is used for the 25km check — NOT their live GPS at notification time. Real-time GPS is only active for Auto/transport workers using background geolocation. 
  
 ### `/api/notify` Payload Contract 
 ```json 
 { 
   "targetUid": "work_112233", 
   "title": "New Job Request 🛠️", 
   "body": "A customer needs an Electrician at Anna Salai, Chennai.", 
   "data": { 
     "orderId": "order_789", 
     "path": "/worker", 
     "type": "booking_request" 
   } 
 } 
 ``` 
  
 --- 
  
 ## 🗺️ Maps & Location — Known Issues to Fix 
  
 ### Issue 1: Search Pinpoints Wrong Location 
 - **Root Cause**: The geocoding query sent to Photon/ArcGIS is not bounded to Tamil Nadu. 
 - **Fix**: Always append `viewbox` or `countrycodes=in` + Tamil Nadu bounding box to geocoding requests. 
 - Tamil Nadu bounding box (`TN_BBOX`): `{ minLat: 8.07, maxLat: 13.55, minLng: 76.23, maxLng: 80.34 }` 
 - Photon example: `?q=Anna+Salai&bbox=76.23,8.07,80.34,13.55&limit=5` 
 - ArcGIS example: Add `searchExtent` parameter with the TN bbox. 
  
 ### Issue 2: Map Not Functioning Clearly 
 - Ensure `react-leaflet` tile provider URL is correct: 
   ` `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` ` 
 - Always set a fixed `height` on the map container div — Leaflet collapses to 0px without it. 
 - Call `map.invalidateSize()` after any modal or tab show/hide that contains the map. 
  
 ### Issue 3: Auto Route Not Displaying 
 - Use Leaflet Routing Machine OR fetch OSRM route: 
   ` `https://router.project-osrm.org/route/v1/driving/{srcLng},{srcLat};{dstLng},{dstLat}?overview=full&geometries=geojson` ` 
 - Decode the GeoJSON polyline and render with `<Polyline positions={coords} />` in React Leaflet. 
 - Source coordinates: customer's `sourceLat`/`sourceLng` from the order. 
 - Destination: the work address geocoded to lat/lng. 
  
 --- 
  
 ## 🔐 Security Rules (Firebase) 
  
 Always suggest Firebase security rules that enforce: 
 - Users can only read/write `users/{their_uid}`. 
 - Workers can only write to `workers/{their_uid}`. 
 - Orders: customer can create; assigned worker can update `status`; admin can read all. 
 - FCM tokens are write-only by the owning user, never readable by others. 
  
 --- 
  
 ## 🌏 Region Constraints 
  
 - All services are restricted to **Tamil Nadu, India**. 
 - `SearchService.ts` enforces a `TN_BBOX` bounding box on all geo queries. 
 - Never suggest global geocoding without this bounding box filter. 
 - Default map center: Chennai `[13.0827, 80.2707]`. 
  
 --- 
  
 ## 📋 Coding Conventions 
  
 - All components in **functional style** with React hooks. 
 - Always use **TypeScript** — no `any` types unless absolutely necessary, prefer `unknown`. 
 - Database reads use Firebase `get()` and `onValue()` from `firebase/database`. 
 - All strings displayed in the UI must pass through the `t(key)` helper from `LanguageContext` (English + Tamil support). 
 - Use `Framer Motion` for any enter/exit animations on modals and page transitions. 
 - Bottom navigation is always visible for logged-in users via `MobileLayout`. 
 - Prefer **Lucide React** icons over any other icon library. 
  
 --- 
  
 ## 🧪 Sample Booking Payload (Reference) 
  
 ```json 
 { 
   "userId": "cust_998877", 
   "userName": "Sri Nithilan", 
   "workerId": "work_112233", 
   "trade": "Electrician", 
   "rate": 500, 
   "status": "pending", 
   "issue": "Fan motor not working", 
   "workAddress": "No. 123, Anna Salai, Chennai", 
   "preferredTime": "10:30 AM", 
   "bookingDate": "2026-05-25", 
   "duration": "Quick Visit", 
   "sourceLat": 13.0827, 
   "sourceLng": 80.2707, 
   "commissionAmount": 15, 
   "platformFee": 15 
 } 
 ``` 
  
 --- 
  
 ## 🚦 Role-Based Access 
  
 | Role | Access | 
 |---|---| 
 | `user` | Browse workers, book, view own orders | 
 | `worker` | View job requests, accept/decline, view earnings | 
 | `admin` | Full dashboard, verify workers, confirm payments | 
  
 `AuthGuard` component enforces this at the route level using the `role` field from `users/{uid}`. 
  
 --- 
  
 ## 🗺️ Roadmap Context (Don't Implement Unless Asked) 
  
 These are planned but NOT yet implemented — do not generate code for them unless explicitly asked: 
 - OTP phone verification (Firebase Phone Auth) 
 - Real-time in-app chat (Firebase Realtime DB) 
 - Razorpay/Stripe payment gateway 
 - Gemini AI worker recommendations 
 - Live worker tracking on map 
 - Telugu/Kannada language support 
 - Dark mode 
  
 --- 
  
 *Last updated: May 2026. Stack is fixed — do not suggest migrations to Next.js, Supabase, or other platforms.*
