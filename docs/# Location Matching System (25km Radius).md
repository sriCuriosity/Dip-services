# Location Matching System (25km Radius)

The core value proposition of DIP Services is connecting customers with **local** service providers. This is enforced through a strict 25km radius logic.

## 📐 The Haversine Formula

The distance between two points on Earth is calculated using the Haversine formula, implemented in `src/lib/utils.ts`:

```typescript
export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Result in km
}
```

## 🚀 Implementation Details

### 1. Worker Geolocation
Workers' locations are captured:
- **At Registration**: Static address-based coordinates.
- **Real-time (Mobile)**: Using `@capacitor-community/background-geolocation` for transport workers (Auto/Tempo).

### 2. Customer Booking Location
When a customer books, the location is derived from:
- Their profile's default address.
- A specific "Work Address" selected via `LocationPicker` during the booking flow.

### 3. Validation Logic
The booking button in `WorkerDetail.tsx` remains enabled only if:
1. Both user and worker have valid coordinates.
2. `getDistance(userLat, userLng, workerLat, workerLng) <= 25`.

## 📍 Special Case: Auto/Transport Broadcast
For transport services like **Auto**, the system implements a tighter **10km radius** for real-time broadcasts:
- When a customer requests an Auto, the server finds all workers with `trade: 'Auto'` and `isAvailable: true`.
- It filters those within 10km and sends a broadcast notification.

## ⚠️ Edge Cases
- **Missing Coordinates**: If a worker or customer has no coordinates, the system defaults to city-based matching or prompts for location selection.
- **Location Spoofing**: Prevented by using system-level GPS via Capacitor plugins rather than relying solely on user input.