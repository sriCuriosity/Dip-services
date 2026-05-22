import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, Check, MapPin, Search, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchService } from '@/src/lib/searchService';

interface LocationPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (lat: number, lng: number, address: string) => void;
  initialLocation?: { lat: number, lng: number } | null;
  title?: string;
}

const LocationMarker = ({ position, setPosition }: { position: L.LatLng | null, setPosition: (pos: L.LatLng) => void }) => {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });
  return position === null ? null : <Marker position={position} />;
};

const InvalidateSize = () => {
  const map = useMap();
  useEffect(() => {
    // Small delay ensures container is visible before size recalculation
    const timer = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

const FlyToLocation = ({ center }: { center: L.LatLngExpression }) => {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    map.flyTo(center, 16, { animate: true, duration: 1 });
  }, [center, map]);
  return null;
};

export const LocationPicker: React.FC<LocationPickerProps> = ({ isOpen, onClose, onSelect, initialLocation, title = 'Select Location' }) => {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const [flyTarget, setFlyTarget] = useState<L.LatLngExpression | null>(null);
  const [address, setAddress] = useState('');
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Reset state when opened
  useEffect(() => {
    if (!isOpen) return;
    setSearchQuery('');
    setSearchResults([]);
    if (initialLocation) {
      const latlng = L.latLng(initialLocation.lat, initialLocation.lng);
      setPosition(latlng);
      reverseGeocode(initialLocation.lat, initialLocation.lng);
    } else {
      setPosition(null);
      setAddress('');
    }
  }, [isOpen, initialLocation]);

  // Auto reverse-geocode when position changes by map click
  useEffect(() => {
    if (position) {
      reverseGeocode(position.lat, position.lng);
    }
  }, [position]);

  const reverseGeocode = async (lat: number, lng: number) => {
    setGeocodeLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&email=test@example.com`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      setAddress(data.display_name || 'Selected Location');
    } catch {
      setAddress('Selected Location');
    } finally {
      setGeocodeLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setSearchLoading(true);
    try {
      const results = await SearchService.suggest(query, position ? { lat: position.lat, lon: position.lng } : undefined);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const selectSearchResult = async (result: any) => {
    setSearchLoading(true);
    try {
      const resolved = await SearchService.resolve(result);
      if (resolved) {
        const latlng = L.latLng(resolved.lat, resolved.lon);
        setPosition(latlng);
        setFlyTarget([latlng.lat, latlng.lng]);
        setAddress(resolved.display_name);
        setSearchResults([]);
        setSearchQuery(resolved.display_name);
      }
    } catch (error) {
      console.error('Resolve error:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const useCurrentLocation = () => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng = L.latLng(pos.coords.latitude, pos.coords.longitude);
        setPosition(latlng);
        setFlyTarget([latlng.lat, latlng.lng]);
        reverseGeocode(latlng.lat, latlng.lng);
      },
      () => alert('Could not get location. Check app permissions.')
    );
  };

  const handleConfirm = () => {
    if (!position) return;
    onSelect(position.lat, position.lng, address);
    onClose();
  };

  if (!isOpen) return null;

  const defaultCenter: L.LatLngExpression = initialLocation
    ? [initialLocation.lat, initialLocation.lng]
    : [13.0827, 80.2707]; // Chennai

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex flex-col bg-white"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-3 bg-white border-b border-slate-100 shadow-sm shrink-0">
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors shrink-0">
            <X size={22} className="text-slate-600" />
          </button>
          <h3 className="text-lg font-bold text-slate-900 flex-1">{title}</h3>
          <button
            onClick={useCurrentLocation}
            className="flex items-center gap-1.5 text-blue-600 text-[11px] font-bold px-3 py-2 bg-blue-50 rounded-xl border border-blue-100 active:scale-95 transition-all"
          >
            <Navigation size={14} />
            My Location
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3 bg-white relative z-[300] shrink-0">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search area, street or landmark..."
                className="w-full pl-10 pr-10 py-3 bg-slate-100 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-medium text-slate-900"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); if (!e.target.value) setSearchResults([]); }}
              />
              {searchQuery && (
                <button type="button" onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={searchLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-2xl font-bold text-sm active:scale-95 transition-all disabled:opacity-50"
            >
              {searchLoading ? '...' : 'Go'}
            </button>
          </form>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute left-4 right-4 top-full mt-1 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-[400] max-h-60 overflow-y-auto">
              {searchResults.map((result, idx) => (
                <button
                  type="button"
                  key={idx}
                  className="w-full px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 text-left"
                  onPointerDown={(e) => { e.preventDefault(); selectSearchResult(result); }}
                >
                  <MapPin size={16} className="text-blue-500 mt-0.5 shrink-0" />
                  <span className="text-sm font-medium text-slate-700 line-clamp-2">{result.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Map */}
        <div className="flex-1 relative z-0 min-h-0">
          <MapContainer
            center={position || defaultCenter}
            zoom={13}
            style={{ height: '420px', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <InvalidateSize />
            <LocationMarker position={position} setPosition={(pos) => { setPosition(pos); setFlyTarget(null); }} />
            {flyTarget && <FlyToLocation center={flyTarget} />}
          </MapContainer>

          {!position && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[400] pointer-events-none">
              <div className="bg-slate-900/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl flex items-center gap-2">
                <MapPin size={14} />
                Tap on map to pin location
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] bg-white border-t border-slate-100 shrink-0 shadow-[0_-4px_15px_rgba(0,0,0,0.07)]">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 mb-3 flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
              <MapPin size={16} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Pinned Location</p>
              {geocodeLoading ? (
                <div className="h-3.5 w-3/4 bg-slate-200 animate-pulse rounded mt-1" />
              ) : (
                <p className="text-sm font-semibold text-slate-700 leading-tight line-clamp-2">
                  {address || 'No location pinned yet...'}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleConfirm}
            disabled={!position || geocodeLoading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:grayscale shadow-lg shadow-blue-200 active:scale-95"
          >
            <Check size={20} strokeWidth={3} />
            CONFIRM LOCATION
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
