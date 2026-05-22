import React, { useState, useEffect } from 'react';
import { MapPin, MapPinOff, ArrowRight, ShieldAlert, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { Capacitor } from '@capacitor/core';
import { openLocationSettings } from '@/src/lib/backgroundLocation';

export const LocationStatusBanner: React.FC = () => {
  const { t } = useLanguage();
  const [status, setStatus] = useState<'unknown' | 'granted' | 'denied' | 'disabled'>('unknown');
  const [isVisible, setIsVisible] = useState(false);

  const checkLocationStatus = async () => {
    if (!navigator.geolocation) {
      setStatus('disabled');
      setIsVisible(true);
      return;
    }

    // Try to get position to check actual status
    navigator.geolocation.getCurrentPosition(
      () => {
        setStatus('granted');
        setIsVisible(false);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
          setIsVisible(true);
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setStatus('disabled');
          setIsVisible(true);
        } else {
          // Timeout or other error, don't show banner randomly
          setStatus('unknown');
          setIsVisible(false);
        }
      },
      { enableHighAccuracy: false, timeout: 5000 }
    );
  };

  useEffect(() => {
    checkLocationStatus();
    
    // Check when window gets focus (user might have changed settings)
    window.addEventListener('focus', checkLocationStatus);
    
    // Periodic check every 30 seconds
    const interval = setInterval(checkLocationStatus, 30000);

    return () => {
      window.removeEventListener('focus', checkLocationStatus);
      clearInterval(interval);
    };
  }, []);

  const handleEnable = () => {
    if (Capacitor.isNativePlatform()) {
      openLocationSettings();
    } else {
      // For web, we just try to get position again to trigger prompt
      navigator.geolocation.getCurrentPosition(
        () => {
          setStatus('granted');
          setIsVisible(false);
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            alert(t('Location permission denied. Please enable it in your browser settings.'));
          } else {
            alert(t('Please turn on your GPS/Location services.'));
          }
        }
      );
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0, y: -20 }}
          animate={{ height: 'auto', opacity: 1, y: 0 }}
          exit={{ height: 0, opacity: 0, y: -20 }}
          className="overflow-hidden px-6"
        >
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-4 rounded-3xl shadow-lg shadow-orange-200/50 mb-4 flex items-center justify-between border-b-4 border-orange-600/20 relative overflow-hidden group">
            {/* Background Decorative Element */}
            <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
               <Navigation size={100} className="rotate-12 text-white" />
            </div>

            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 border border-white/30">
                {status === 'denied' ? (
                  <ShieldAlert size={20} className="text-white" />
                ) : (
                  <MapPinOff size={20} className="text-white" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-white font-black text-xs uppercase tracking-widest leading-none mb-1">
                  {status === 'denied' ? t('Permission Required') : t('Location Disabled')}
                </p>
                <p className="text-white/90 text-[11px] font-bold leading-tight">
                  {status === 'denied' 
                    ? t('App needs location to find nearby services') 
                    : t('Turn on GPS for better service experience')}
                </p>
              </div>
            </div>

            <button
              onClick={handleEnable}
              className="bg-white text-orange-600 px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-wider shadow-md hover:bg-orange-50 active:scale-95 transition-all flex items-center gap-1.5 shrink-0 relative z-10 whitespace-nowrap"
            >
              {t('Turn On')}
              <ArrowRight size={14} strokeWidth={3} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
