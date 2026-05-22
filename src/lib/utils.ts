import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(timestamp: number | string | undefined | null) {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'Invalid Date';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(timestamp: number | string | undefined | null) {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'Invalid Date';
  const hours = date.getHours();
  const mins = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  const h12 = hours % 12 || 12;
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}, ${h12}:${mins}${ampm}`;
}

export function generateWhatsAppLink(phone: string, message: string) {
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

export function getBaseUrl() {
  if (typeof window !== 'undefined' && window.location.origin.startsWith('http')) {
      return ''; // Use relative path for web/PWA
  }
  const envUrl = import.meta.env.VITE_APP_URL || '';
  if (!envUrl) console.warn("VITE_APP_URL is not set! Native app requests will fail.");
  return envUrl;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    console.log(`[apiFetch] Calling: ${url}`);
    return fetch(url, options);
}

export function calculatePlatformFeePercentage(tradeName: string | undefined): number {
  if (!tradeName) return 0.03;
  const t = tradeName.toLowerCase().trim();
  if (['auto', 'tempo', 'van', 'car'].includes(t)) return 0.10;
  if (t === 'coconut plucker' || t === 'cocount pluger') return 0.50;
  if (t === 'jcb') return 0.05;
  if (['shop rent', 'house rent'].includes(t)) return 0.05;
  if (['marriage hall', 'catering'].includes(t)) return 0; // Keeping 0 for free trades based on earlier logic
  return 0.03; // Default 3% for all other services
}

export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

/**
 * Fetches a road-following route from OSRM — free, no API key needed
 */
export async function fetchRoute(
  srcLat: number, srcLng: number,
  dstLat: number, dstLng: number
): Promise<[number, number][]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${srcLng},${srcLat};${dstLng},${dstLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Route fetch failed');
    const data = await res.json();
    if (!data.routes?.length) throw new Error('No route found');
    
    // OSRM returns [lng, lat] — swap to [lat, lng] for Leaflet
    return data.routes[0].geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
    );
  } catch (err) {
    console.error('OSRM fetch error:', err);
    throw err;
  }
}
