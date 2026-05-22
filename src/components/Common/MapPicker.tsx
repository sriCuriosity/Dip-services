import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Navigation, X, Landmark } from 'lucide-react';
import { SearchService } from '@/src/lib/searchService';

interface MapPickerProps {
  initialLocation?: { lat: number; lng: number };
  onLocationSelect: (location: { lat: number; lng: number; address: string; city: string; landmark: string }) => void;
  onClose: () => void;
}

const LocationMarker = ({ position, setPosition }: { position: L.LatLng | null, setPosition: (pos: L.LatLng) => void }) => {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return position === null ? null : (
    <Marker position={position} />
  );
};

const ChangeView = ({ center, zoom }: { center: L.LatLngExpression, zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
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

export const MapPicker: React.FC<MapPickerProps> = ({ initialLocation, onLocationSelect, onClose }) => {
  const latVal = initialLocation?.lat !== undefined && initialLocation?.lat !== null ? Number(initialLocation.lat) : NaN;
  const lngVal = initialLocation?.lng !== undefined && initialLocation?.lng !== null ? Number(initialLocation.lng) : NaN;
  const validInitial = (!isNaN(latVal) && !isNaN(lngVal)) 
    ? { lat: latVal, lng: lngVal } 
    : null;

  const [position, setPosition] = useState<L.LatLng | null>(
    validInitial ? new L.LatLng(validInitial.lat, validInitial.lng) : null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState<L.LatLngExpression>(
    validInitial ? [validInitial.lat, validInitial.lng] : [13.0827, 80.2707] // Chennai default
  );
  const [zoom, setZoom] = useState(13);

  const [mapType, setMapType] = useState<'m' | 'y'>('m'); // m = street, y = hybrid

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setLoading(true);
    try {
      const results = await SearchService.suggest(query, position ? { lat: position.lat, lon: position.lng } : undefined);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectSearchResult = async (result: any) => {
    setLoading(true);
    try {
      const resolved = await SearchService.resolve(result);
      if (resolved) {
        const newPos = new L.LatLng(resolved.lat, resolved.lon);
        setPosition(newPos);
        setMapCenter([newPos.lat, newPos.lng]);
        setZoom(18);
        setSearchResults([]);
        setSearchQuery(resolved.display_name);
      }
    } catch (error) {
      console.error('Resolve error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!position) return;

    setLoading(true);
    try {
      // Reverse geocode to get address details
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}`
      );
      const data = await response.json();
      
      const address = data.display_name || '';
      const city = data.address.city || data.address.town || data.address.village || data.address.suburb || '';
      const landmark = data.address.road || data.address.neighbourhood || '';

      onLocationSelect({
        lat: position.lat,
        lng: position.lng,
        address,
        city,
        landmark
      });
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      onLocationSelect({
        lat: position.lat,
        lng: position.lng,
        address: '',
        city: '',
        landmark: ''
      });
    } finally {
      setLoading(false);
    }
  };

  const useCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const newPos = new L.LatLng(pos.coords.latitude, pos.coords.longitude);
        setPosition(newPos);
        setMapCenter([newPos.lat, newPos.lng]);
        setZoom(16);
      }, (error) => {
        console.error('Geolocation error:', error);
        alert('Could not get your location. Please check permissions.');
      });
    }
  };

  return createPortal(
    <motion.div 
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      className="fixed inset-0 z-[1000] bg-white flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-4 bg-white sticky top-0 z-10 shadow-sm">
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <X size={24} className="text-slate-600" />
        </button>
        <h2 className="text-lg font-bold text-slate-900 flex-1">Select Location</h2>
        <button 
          onClick={handleConfirm}
          disabled={!position || loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold disabled:opacity-50 active:scale-95 transition-all"
        >
          {loading ? 'Processing...' : 'Confirm'}
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 relative z-[1001]">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            placeholder="Search for area, street, or landmark..."
            className="w-full pl-12 pr-4 py-4 bg-slate-100 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all font-medium text-slate-900 shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          {searchQuery && (
             <button 
               type="button"
               onClick={() => setSearchQuery('')}
               className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
             >
               <X size={18} />
             </button>
          )}
        </form>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute left-4 right-4 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-[1002]">
            {searchResults.map((result, idx) => (
              <button
                key={idx}
                className="w-full px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 text-left"
                onClick={() => selectSearchResult(result)}
              >
                <MapPin size={18} className="text-slate-400 mt-0.5 shrink-0" />
                <span className="text-sm font-medium text-slate-700 line-clamp-2">{result.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="flex-1 relative z-0">
        <MapContainer 
          center={mapCenter} 
          zoom={zoom} 
          style={{ height: '420px', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <InvalidateSize />
          <ChangeView center={mapCenter} zoom={zoom} />
          <LocationMarker position={position} setPosition={setPosition} />
        </MapContainer>

        {/* Floating Controls */}
        <div className="absolute bottom-6 right-6 z-[400] flex flex-col gap-3">
          <button 
             onClick={() => setMapType(mapType === 'm' ? 'y' : 'm')}
             className="w-12 h-12 bg-white rounded-2xl shadow-lg flex items-center justify-center text-blue-600 hover:bg-slate-50 active:scale-95 transition-all border border-slate-100 overflow-hidden"
             title={mapType === 'm' ? 'Satellite View' : 'Street View'}
           >
             {mapType === 'm' ? (
               <div className="w-full h-full bg-[url('https://mt1.google.com/vt/lyrs=s&x=0&y=0&z=0')] bg-cover flex items-center justify-center">
                 <span className="bg-white/80 backdrop-blur-sm text-[8px] font-bold px-1 rounded shadow-sm uppercase tracking-tighter">SAT</span>
               </div>
             ) : (
               <Navigation size={22} className="rotate-45" />
             )}
           </button>
          
          <button 
            onClick={useCurrentLocation}
            className="w-12 h-12 bg-white rounded-2xl shadow-lg flex items-center justify-center text-blue-600 hover:bg-slate-50 active:scale-95 transition-all border border-slate-100"
            title="Use current location"
          >
            <Navigation size={22} />
          </button>
        </div>

        {!position && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[400] pointer-events-none">
            <div className="bg-slate-900/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl flex items-center gap-2">
              <MapPin size={14} />
              Tap on map to select location
            </div>
          </div>
        )}
      </div>

      {/* Selected Address Summary */}
      {position && !loading && (
        <div className="p-4 bg-white border-t border-slate-100 relative z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
           <div className="flex items-start gap-3">
             <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
               <MapPin className="text-blue-600" size={20} />
             </div>
             <div>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Selected Coordinates</p>
               <p className="text-sm font-bold text-slate-700">{position.lat.toFixed(6)}, {position.lng.toFixed(6)}</p>
               <p className="text-[10px] text-slate-400 mt-1 italic">Fetching address details on confirm...</p>
             </div>
           </div>
        </div>
      )}
    </motion.div>,
    document.body
  );
};
