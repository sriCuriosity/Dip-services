# Frontend Structure - React SPA

## 🧱 Component Organization

- **`/components/Auth`**: Login, Registration, and `AuthGuard`.
- **`/components/Layout`**: `MobileLayout` with dynamic bottom navigation.
- **`/components/User`**: `UserDashboard`, `WorkerDetail`, `WorkerMapView`.
- **`/components/Worker`**: `WorkerDashboard`, `Earnings`, `ProfileSetup`.
- **`/components/Common`**: `MapPicker`, `LocationPicker`, `SplashScreen`.

## 🌐 State Management

### 1. AuthContext
Manages user sessions and profile synchronization:
- Listens to `onAuthStateChanged`.
- Fetches profile data from `users/{uid}`.
- Initializes FCM notification listeners.

### 2. LanguageContext
Handles i18n for English and Tamil:
- Stores preference in `localStorage`.
- Provides a `t(key)` helper for all UI strings.

## 🎨 UI & Styling
- **Tailwind CSS v4**: Provides high-performance utility classes.
- **Framer Motion**: Used for smooth transitions between dashboards and modal animations.
- **Lucide React**: Consistent iconography across the platform.

## 🗺️ Maps Integration
- **React Leaflet**: For interactive map views.
- **SearchService**: Custom wrapper for ArcGIS and Photon (OpenStreetMap) geocoding.