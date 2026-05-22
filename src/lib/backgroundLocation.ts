/**
 * Background Location Service
 *
 * On Android (native Capacitor): uses @capacitor-community/background-geolocation
 *   — runs as a persistent Android Foreground Service, tracking GPS even when the
 *     app is fully closed, via a permanent notification in the status bar.
 *
 * On Web/browser: gracefully falls back to watchPosition + Page Visibility API
 *   + a 30-second heartbeat interval.
 *
 * Usage:
 *   startBackgroundLocationTracking((lat, lng) => { ... });
 *   stopBackgroundLocationTracking();
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';

// Register the native plugin bridge (no-op on web)
const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>(
  'BackgroundGeolocation',
  {
    // On web, provide a stub so the app doesn't crash
    web: () =>
      Promise.resolve({
        addWatcher: async (_opts: any, _cb: any) => 'web-stub',
        removeWatcher: async (_opts: any) => {},
        openSettings: async () => {},
      }),
  }
);

export type LocationCallback = (lat: number, lng: number) => void;

let _nativeWatcherId: string | null = null;
let _webWatchId: number | null = null;
let _fallbackInterval: ReturnType<typeof setInterval> | null = null;
let _visibilityHandler: (() => void) | null = null;

/**
 * Start tracking. On Android uses a native foreground service (survives app close).
 * On web falls back to browser APIs.
 */
export const startBackgroundLocationTracking = async (
  onLocation: LocationCallback,
  onError?: (errorType: 'permission_denied' | 'gps_disabled' | 'timeout') => void,
  notificationTitle = 'DIP – Location Active',
  notificationText = 'You are visible to nearby users. Turn off Availability to stop.'
): Promise<void> => {
  await stopBackgroundLocationTracking();

  // Quick hardware check for GPS availability before we begin
  if (navigator.geolocation && onError) {
    navigator.geolocation.getCurrentPosition(
      () => {}, // Success, GPS is on
      (err) => {
        if (err.code === err.PERMISSION_DENIED) onError('permission_denied');
        else if (err.code === err.POSITION_UNAVAILABLE) onError('gps_disabled');
        else if (err.code === err.TIMEOUT) onError('timeout');
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }

  if (Capacitor.isNativePlatform()) {
    try {
      _nativeWatcherId = await BackgroundGeolocation.addWatcher(
        {
          backgroundTitle: notificationTitle,
          backgroundMessage: notificationText,
          requestPermissions: true,
          stale: false,
          distanceFilter: 30, // fire every 30m of movement
        },
        (location, error) => {
          if (error) {
            console.warn('[BgLocation] Native error:', error.message);
            if (onError) onError('gps_disabled'); // native errors often mean hardware off
            return;
          }
          if (location) {
            onLocation(location.latitude, location.longitude);
          }
        }
      );
      console.log('[BgLocation] Native watcher started:', _nativeWatcherId);
      return; // native handles everything — no need for web fallback
    } catch (err) {
      console.warn('[BgLocation] Native start failed, falling back:', err);
    }
  }

  // ── Web / browser fallback ────────────────────────────────────────────────
  _startWebFallback(onLocation, onError);
};

const _startWebFallback = (onLocation: LocationCallback, onError?: (type: any) => void) => {
  if (!navigator.geolocation) {
    console.warn('[BgLocation] Geolocation not supported on this device.');
    return;
  }

  // Continuous GPS stream
  _webWatchId = navigator.geolocation.watchPosition(
    (pos) => onLocation(pos.coords.latitude, pos.coords.longitude),
    (err) => {
      console.warn('[BgLocation] watchPosition error:', err.message);
      if (onError) {
        if (err.code === err.PERMISSION_DENIED) onError('permission_denied');
        else if (err.code === err.POSITION_UNAVAILABLE) onError('gps_disabled');
        else if (err.code === err.TIMEOUT) onError('timeout');
      }
    },
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
  );

  // 30-second heartbeat (safety net for quiet watchPosition periods)
  _fallbackInterval = setInterval(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => onLocation(pos.coords.latitude, pos.coords.longitude),
      (err) => {
        if (onError) {
          if (err.code === err.PERMISSION_DENIED) onError('permission_denied');
          else if (err.code === err.POSITION_UNAVAILABLE) onError('gps_disabled');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, 30000);

  // Page Visibility: push immediately when worker returns to the app
  _visibilityHandler = () => {
    if (document.visibilityState === 'visible') {
      navigator.geolocation.getCurrentPosition(
        (pos) => onLocation(pos.coords.latitude, pos.coords.longitude),
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };
  document.addEventListener('visibilitychange', _visibilityHandler);

  console.log('[BgLocation] Web fallback tracking started.');
};

/**
 * Stop all active location tracking.
 */
export const stopBackgroundLocationTracking = async (): Promise<void> => {
  // Stop native watcher
  if (_nativeWatcherId !== null) {
    try {
      await BackgroundGeolocation.removeWatcher({ id: _nativeWatcherId });
      console.log('[BgLocation] Native watcher stopped:', _nativeWatcherId);
    } catch (e) {
      console.warn('[BgLocation] Could not remove native watcher:', e);
    }
    _nativeWatcherId = null;
  }

  // Stop web watch
  if (_webWatchId !== null) {
    navigator.geolocation?.clearWatch(_webWatchId);
    _webWatchId = null;
  }

  // Stop heartbeat
  if (_fallbackInterval !== null) {
    clearInterval(_fallbackInterval);
    _fallbackInterval = null;
  }

  // Remove visibility listener
  if (_visibilityHandler !== null) {
    document.removeEventListener('visibilitychange', _visibilityHandler);
    _visibilityHandler = null;
  }
};

/**
 * Open device location settings (native only).
 */
export const openLocationSettings = async (): Promise<void> => {
  try {
    await BackgroundGeolocation.openSettings();
  } catch (err) {
    console.warn('[BgLocation] Could not open settings:', err);
  }
};
