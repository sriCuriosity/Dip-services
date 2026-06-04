import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Navigation, X, Loader2, Check, Layers } from 'lucide-react';
import { SearchService } from '@/src/lib/searchService';

interface MapPickerProps {
  initialLocation?: { lat: number; lng: number };
  onLocationSelect: (location: {
    lat: number;
    lng: number;
    address: string;
    city: string;
    landmark: string;
  }) => void;
  onClose: () => void;
}

type MapStyle = 'osm' | 'esri-street' | 'satellite';

const MAP_STYLES: { id: MapStyle; label: string; emoji: string; url: string; maxZoom: number; attribution: string }[] = [
  {
    id: 'osm',
    label: 'Standard',
    emoji: '🗺️',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors',
  },
  {
    id: 'esri-street',
    label: 'Detailed',
    emoji: '🏙️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 20,
    attribution: '© Esri, HERE, Garmin, USGS',
  },
  {
    id: 'satellite',
    label: 'Satellite',
    emoji: '🛰️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 20,
    attribution: '© Esri, Maxar, Earthstar Geographics',
  },
];

// Rapido style: map drags under a fixed center pin
const CenterTracker = ({
  onDragStart,
  onDragEnd,
}: {
  onDragStart: () => void;
  onDragEnd: (lat: number, lng: number) => void;
}) => {
  const map = useMapEvents({
    movestart: () => onDragStart(),
    moveend: () => {
      const c = map.getCenter();
      onDragEnd(c.lat, c.lng);
    },
  });
  return null;
};

const FlyTo = ({ target }: { target: L.LatLngExpression | null }) => {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 18, { animate: true, duration: 1.2 });
  }, [target, map]);
  return null;
};

const InvalidateSize = () => {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, [map]);
  return null;
};

export const MapPicker: React.FC<MapPickerProps> = ({ initialLocation, onLocationSelect, onClose }) => {
  const latVal = initialLocation?.lat !== undefined && initialLocation?.lat !== null ? Number(initialLocation.lat) : NaN;
  const lngVal = initialLocation?.lng !== undefined && initialLocation?.lng !== null ? Number(initialLocation.lng) : NaN;
  const validInitial = !isNaN(latVal) && !isNaN(lngVal) ? { lat: latVal, lng: lngVal } : null;

  const [center, setCenter] = useState(validInitial || { lat: 13.0827, lng: 80.2707 });
  const [isDragging, setIsDragging] = useState(false);
  const [address, setAddress] = useState('');
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [flyTarget, setFlyTarget] = useState<L.LatLngExpression | null>(
    validInitial ? [validInitial.lat, validInitial.lng] : [13.0827, 80.2707]
  );
  const [mapStyle, setMapStyle] = useState<MapStyle>('osm');
  const [showStylePicker, setShowStylePicker] = useState(false);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeStyle = MAP_STYLES.find(s => s.id === mapStyle)!;

  useEffect(() => {
    reverseGeocode(center.lat, center.lng);
  }, []);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setGeocodeLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      setAddress(data.display_name || 'Selected Location');
    } catch {
      setAddress('Selected Location');
    } finally {
      setGeocodeLoading(false);
    }
  }, []);

  const handleDragStart = () => {
    setIsDragging(true);
    setShowStylePicker(false);
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
  };

  const handleDragEnd = (lat: number, lng: number) => {
    setCenter({ lat, lng });
    setIsDragging(false);
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(() => reverseGeocode(lat, lng), 600);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    setSearchLoading(true);
    try {
      const results = await SearchService.suggest(query, { lat: center.lat, lon: center.lng });
      setSearchResults(results);
    } catch {
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
        setFlyTarget([resolved.lat, resolved.lon]);
        setCenter({ lat: resolved.lat, lng: resolved.lon });
        setAddress(resolved.display_name);
        setSearchResults([]);
        setSearchQuery('');
      }
    } catch {
      /* ignore */
    } finally {
      setSearchLoading(false);
    }
  };

  const useCurrentLocation = () => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setFlyTarget([lat, lng]);
        setCenter({ lat, lng });
        reverseGeocode(lat, lng);
      },
      () => alert('Could not get your location. Please check permissions.')
    );
  };

  const handleConfirm = async () => {
    if (geocodeLoading || isDragging) return;
    setGeocodeLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${center.lat}&lon=${center.lng}`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      const finalAddress = data.display_name || address;
      const city =
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        data.address?.suburb ||
        '';
      const landmark = data.address?.road || data.address?.neighbourhood || '';
      onLocationSelect({ lat: center.lat, lng: center.lng, address: finalAddress, city, landmark });
    } catch {
      onLocationSelect({ lat: center.lat, lng: center.lng, address, city: '', landmark: '' });
    } finally {
      setGeocodeLoading(false);
    }
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-[1000] bg-white flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-2.5 bg-white border-b border-slate-100 shadow-sm shrink-0 relative z-[1100]">
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors shrink-0">
          <X size={22} className="text-slate-600" />
        </button>
        <h2 className="text-base font-bold text-slate-900 flex-1">Select Location</h2>
        <button
          onClick={useCurrentLocation}
          className="flex items-center gap-1.5 text-blue-600 text-[11px] font-bold px-3 py-2 bg-blue-50 rounded-xl border border-blue-100 active:scale-95 transition-all"
        >
          <Navigation size={14} />
          My Location
        </button>
      </div>

      {/* Search bar */}
      <div className="px-3 py-2.5 bg-white relative z-[1100] shrink-0 border-b border-slate-100">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search temple, school, area..."
              className="w-full pl-9 pr-9 py-2.5 bg-slate-100 rounded-xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-medium text-slate-800"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!e.target.value) setSearchResults([]);
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={searchLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm active:scale-95 transition-all disabled:opacity-50"
          >
            {searchLoading ? '...' : 'Go'}
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="absolute left-3 right-3 top-full mt-1 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[1200] max-h-56 overflow-y-auto">
            {searchResults.map((result, idx) => (
              <button
                type="button"
                key={idx}
                className="w-full px-4 py-3 flex items-start gap-3 hover:bg-slate-50 active:bg-slate-100 transition-colors border-b border-slate-50 last:border-0 text-left"
                onPointerDown={(e) => { e.preventDefault(); selectSearchResult(result); }}
              >
                <MapPin size={15} className="text-blue-500 mt-0.5 shrink-0" />
                <span className="text-sm font-medium text-slate-700 line-clamp-2">{result.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative z-0 overflow-hidden">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={18}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            key={activeStyle.id}
            url={activeStyle.url}
            maxZoom={activeStyle.maxZoom}
            attribution={activeStyle.attribution}
          />
          <InvalidateSize />
          <CenterTracker onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
          {flyTarget && <FlyTo target={flyTarget} />}
        </MapContainer>

        {/* Fixed center pin */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1001]">
          <div className="relative flex flex-col items-center" style={{ marginTop: '-44px' }}>
            <motion.div
              animate={{ y: isDragging ? -14 : 0 }}
              transition={{ type: 'spring', damping: 18, stiffness: 380 }}
            >
              <svg width="40" height="54" viewBox="0 0 40 54" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <filter id="mpPinShadow" x="-30%" y="-20%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#1d4ed8" floodOpacity="0.35" />
                  </filter>
                </defs>
                <path
                  d="M20 0C8.954 0 0 8.954 0 20C0 35 20 54 20 54C20 54 40 35 40 20C40 8.954 31.046 0 20 0Z"
                  fill="#2563EB"
                  filter="url(#mpPinShadow)"
                />
                <circle cx="20" cy="20" r="9" fill="white" />
                <circle cx="20" cy="20" r="5" fill="#2563EB" />
              </svg>
            </motion.div>
            <motion.div
              animate={{ scaleX: isDragging ? 0.4 : 1, opacity: isDragging ? 0.2 : 0.45 }}
              transition={{ type: 'spring', damping: 18, stiffness: 380 }}
              className="w-5 h-2 bg-slate-900/60 rounded-full blur-sm"
              style={{ marginTop: '-3px' }}
            />
          </div>
        </div>

        {/* Right-side FABs */}
        <div className="absolute right-3 bottom-4 z-[1001] flex flex-col gap-2">
          {/* Map style switcher */}
          <div className="relative">
            <button
              onClick={() => setShowStylePicker(p => !p)}
              className="w-11 h-11 bg-white rounded-2xl shadow-lg flex items-center justify-center text-slate-600 active:scale-95 transition-all border border-slate-200"
              title="Switch map style"
            >
              <Layers size={20} />
            </button>

            <AnimatePresence>
              {showStylePicker && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85, y: 8 }}
                  className="absolute bottom-full right-0 mb-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden min-w-[130px]"
                >
                  {MAP_STYLES.map(style => (
                    <button
                      key={style.id}
                      onClick={() => { setMapStyle(style.id); setShowStylePicker(false); }}
                      className={`w-full px-4 py-2.5 flex items-center gap-2.5 text-sm font-semibold transition-colors text-left
                        ${mapStyle === style.id ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      <span>{style.emoji}</span>
                      <span>{style.label}</span>
                      {mapStyle === style.id && <span className="ml-auto text-blue-500 text-xs">✓</span>}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* My location */}
          <button
            onClick={useCurrentLocation}
            className="w-11 h-11 bg-white rounded-2xl shadow-lg flex items-center justify-center text-blue-600 active:scale-95 transition-all border border-slate-200"
          >
            <Navigation size={20} />
          </button>
        </div>

        {/* Active style badge */}
        <div className="absolute bottom-4 left-3 z-[1001]">
          <div className="bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-xl border border-slate-200 shadow text-[10px] font-bold text-slate-500 flex items-center gap-1">
            <span>{activeStyle.emoji}</span>
            <span>{activeStyle.label}</span>
          </div>
        </div>
      </div>

      {/* Bottom sheet */}
      <div className="px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] bg-white border-t border-slate-100 shrink-0 shadow-[0_-8px_30px_rgba(0,0,0,0.1)]">
        <div className="flex items-start gap-3 mb-3 bg-slate-50 rounded-2xl p-3 border border-slate-200 min-h-[62px]">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
            <MapPin size={18} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-0.5">
              Selected Location
            </p>
            {geocodeLoading || isDragging ? (
              <div className="flex items-center gap-2 mt-1">
                <Loader2 size={13} className="text-blue-500 animate-spin" />
                <span className="text-xs text-slate-400">Finding address…</span>
              </div>
            ) : (
              <p className="text-sm font-semibold text-slate-800 leading-tight line-clamp-2">
                {address || 'Move the map to select a location'}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleConfirm}
          disabled={geocodeLoading || isDragging}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-blue-200"
        >
          <Check size={20} strokeWidth={3} />
          CONFIRM LOCATION
        </button>
      </div>
    </motion.div>,
    document.body
  );
};
