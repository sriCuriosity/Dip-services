import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { FCMService } from './lib/fcmService';

// Fix missing default marker icon in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Initialize global push listeners immediately
FCMService.initGlobalListeners();

// Ensure light UI (Tailwind dark variant inverts bg-white, etc.)
document.documentElement.classList.remove('dark');

// Register the PWA service worker (also used for Firebase Messaging)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/firebase-messaging-sw.js')
      .catch((err) => {
        console.error('Service worker registration failed:', err);
      });
  });
}

// Global error handling for debugging
window.onerror = (message, source, lineno, colno, error) => {
  console.error('Global error:', { message, source, lineno, colno, error });
};

window.onunhandledrejection = (event) => {
  console.error('Unhandled promise rejection:', event.reason);
};

const container = document.getElementById('root');

if (container) {
  console.log('Mounting React app to #root');
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} else {
  console.error('ERROR: Root element (#root) not found in the DOM.');
  // Fallback: try to create it if it's missing (unlikely but safe)
  const rootDiv = document.createElement('div');
  rootDiv.id = 'root';
  document.body.appendChild(rootDiv);
  createRoot(rootDiv).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
