import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { WorkerProfile as WorkerProfileType, Order } from '@/src/types';
import { Star, Hammer, MapPin, Phone, MessageSquare, ShieldCheck, ShieldAlert } from 'lucide-react';
import { formatCurrency, getDistance, fetchRoute } from '@/src/lib/utils';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { SearchService } from '@/src/lib/searchService';

interface WorkerMapViewProps {
  workers: WorkerProfileType[];
  onSelectWorker: (worker: WorkerProfileType) => void;
  userCoords?: { lat: number, lng: number } | null;
  order?: Order | null;
}

// Helper component to auto-fit bounds when workers or route change
const FitBounds = ({ workers, routeCoords }: { workers: WorkerProfileType[], routeCoords?: [number, number][] }) => {
  const map = useMap();
  
  useEffect(() => {
    if (routeCoords && routeCoords.length > 1) {
      map.fitBounds(routeCoords, { padding: [40, 40] });
    } else if (workers.length > 0) {
      const bounds = L.latLngBounds(workers.map(w => [w.latitude!, w.longitude!]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
    }
  }, [workers, routeCoords, map]);
  
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

export const WorkerMapView: React.FC<WorkerMapViewProps> = ({ workers, onSelectWorker, userCoords, order }) => {
  const { t } = useLanguage();
  const [mapType, setMapType] = React.useState<'m' | 's' | 'y'>('m'); // m = street, s = satellite, y = hybrid
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [routeError, setRouteError] = useState(false);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  
  // Filter workers who have coordinates
  const workersWithLocation = workers.filter(w => w.latitude && w.longitude);

  // Resolve destination coordinates if it's an Auto order and we only have address
  useEffect(() => {
    if (!order) return;
    if (order.destLat && order.destLng) {
      setDestCoords({ lat: order.destLat, lng: order.destLng });
      return;
    }
    if (!order.workAddress) return;

    SearchService.search(order.workAddress).then(results => {
      if (results[0]) {
        setDestCoords({ lat: results[0].lat, lng: results[0].lon });
      }
    });
  }, [order]);

  // Fetch route for Auto booking
  useEffect(() => {
    if (!order || !order.sourceLat || !order.sourceLng || !destCoords) {
      setRouteCoords([]);
      return;
    }

    fetchRoute(order.sourceLat, order.sourceLng, destCoords.lat, destCoords.lng)
      .then(setRouteCoords)
      .catch((err) => {
        console.error('Route fetch failed:', err);
        setRouteError(true);
      });
  }, [order, destCoords]);

  const mapCenter: L.LatLngExpression = (order && order.sourceLat && order.sourceLng)
    ? [order.sourceLat, order.sourceLng]
    : (userCoords && !isNaN(userCoords.lat) && !isNaN(userCoords.lng))
      ? [userCoords.lat, userCoords.lng]
      : workersWithLocation.length > 0
        ? [workersWithLocation[0].latitude!, workersWithLocation[0].longitude!]
        : [13.0827, 80.2707]; // Chennai default

  return (
    <div className="w-full h-full relative group">
      {/* Map Type Toggle */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <button 
          onClick={() => setMapType(mapType === 'm' ? 'y' : 'm')}
          className="bg-white/90 backdrop-blur-md p-2 rounded-xl shadow-lg border border-white/50 text-blue-600 hover:bg-white transition-all active:scale-95"
          title={mapType === 'm' ? 'Switch to Satellite' : 'Switch to Street'}
        >
          {mapType === 'm' ? (
            <div className="flex items-center gap-2 px-1">
              <div className="w-5 h-5 rounded-md bg-[url('https://mt1.google.com/vt/lyrs=s&x=0&y=0&z=0')] bg-cover border border-slate-200" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Satellite</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-1">
              <div className="w-5 h-5 rounded-md bg-[#e5e7eb] border border-slate-200 flex items-center justify-center">
                <MapPin size={10} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider">Street</span>
            </div>
          )}
        </button>
      </div>

      <MapContainer 
        center={mapCenter} 
        zoom={14} 
        style={{ height: '420px', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <FitBounds workers={workersWithLocation} routeCoords={routeCoords.length > 1 ? routeCoords : (order && order.sourceLat && order.sourceLng && destCoords ? [[order.sourceLat, order.sourceLng], [destCoords.lat, destCoords.lng]] : undefined)} />
        <InvalidateSize />

        {/* Render Route Polyline */}
        {routeCoords.length > 0 && (
          <Polyline 
            positions={routeCoords} 
            color="#3B82F6" 
            weight={5} 
            opacity={0.8} 
          />
        )}

        {/* Fallback straight line if route fails */}
        {routeError && order && order.sourceLat && order.sourceLng && destCoords && (
          <Polyline 
            positions={[[order.sourceLat, order.sourceLng], [destCoords.lat, destCoords.lng]]} 
            color="#EF4444" 
            weight={3} 
            dashArray="8, 8" 
          />
        )}

        {/* Markers for Order Source and Destination */}
        {order && order.sourceLat && order.sourceLng && (
          <Marker position={[order.sourceLat, order.sourceLng]}>
            <Popup>{t('Pickup Point')}</Popup>
          </Marker>
        )}
        {destCoords && (
          <Marker position={[destCoords.lat, destCoords.lng]}>
            <Popup>{t('Destination')}</Popup>
          </Marker>
        )}
        {workersWithLocation.map((worker, index) => (
          <Marker 
            key={`${worker.uid}-${worker.trade}`} 
            position={[
              worker.latitude! + (index * 0.00002), 
              worker.longitude! + (index * 0.00002)
            ]}
          >
            <Popup className="worker-popup rounded-2xl shadow-xl border-none">
              <div className="p-1 min-w-[200px]">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100 shadow-sm">
                    {worker.photoURL ? (
                      <img src={worker.photoURL} alt={worker.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-600">
                        <Hammer size={16} />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{worker.name}</h3>
                    <div className="flex items-center gap-1 text-amber-500 text-[10px] font-bold">
                        <Star size={10} className="fill-amber-500" />
                        {(() => {
                          const tradeRating = worker.trades?.[worker.trade || '']?.rating;
                          const rating = tradeRating !== undefined ? tradeRating : worker.rating;
                          return rating ? rating.toFixed(1) : '0.0';
                        })()}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 mb-3 bg-slate-50 p-2 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] text-slate-600 font-medium">
                      <Hammer size={12} className="text-blue-500" />
                      <span>{t(worker.trade || 'Service')}</span>
                    </div>
                    {/* Live Indicator */}
                    {worker.lastLocationUpdate && (Date.now() - (worker as any).lastLocationUpdate < 10 * 60 * 1000) && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[8px] font-black text-emerald-600 uppercase">Live</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] text-slate-600 font-medium">
                      <MapPin size={12} className="text-red-500" />
                      <span className="line-clamp-1">{worker.city}</span>
                    </div>
                    {/* Distance Badge */}
                    {userCoords && worker.latitude && worker.longitude && (
                      <span className="text-[9px] font-black text-slate-400">
                        {getDistance(userCoords.lat, userCoords.lng, worker.latitude, worker.longitude).toFixed(1)} km
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] font-bold text-blue-600 mt-1 pl-5">
                    {formatCurrency(
                        ['house rent', 'shop rent', 'marriage hall', 'catering'].includes((worker.trade || '').toLowerCase().trim())
                          ? (worker.rates as any)?.advance || 0
                          : ['Auto', 'Tempo', 'Van', 'JCB', 'Car'].includes(worker.trade || '')
                            ? (worker.rates as any)?.ratePerKm || (worker.rates as any)?.ratePerHour || 0
                          : (worker.trade || '') === 'Coconut Plucker'
                            ? (worker.rates as any)?.ratePerTree || 0
                          : worker.rates?.quickVisit || 0
                    )} {['house rent', 'shop rent', 'marriage hall', 'catering'].includes((worker.trade || '').toLowerCase().trim()) ? t('Advance') : t('Starts From')}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => onSelectWorker(worker)}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-md shadow-blue-200"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {workersWithLocation.length === 0 && (
        <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px] flex items-center justify-center z-[1000] p-6 text-center">
          <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-white/50 max-w-xs scale-in-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500">
              <MapPin size={32} />
            </div>
            <p className="text-slate-900 font-bold mb-1">{t('No Local Workers')}</p>
            <p className="text-slate-500 text-xs font-medium leading-relaxed">{t('We couldn\'t find any service providers with map locations in this category.')}</p>
          </div>
        </div>
      )}
    </div>
  );
};
