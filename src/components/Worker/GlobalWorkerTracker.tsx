import React, { useState, useEffect, useRef } from 'react';
import { ref, update, onValue } from 'firebase/database';
import { db } from '@/src/lib/firebase';
import { WorkerProfile } from '@/src/types';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { MapPin, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { startBackgroundLocationTracking, stopBackgroundLocationTracking, openLocationSettings } from '@/src/lib/backgroundLocation';

/**
 * Global component that handles worker tracking and location alerts 
 * regardless of what page the worker is currently viewing.
 */
export const GlobalWorkerTracker: React.FC = () => {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null);
  
  // GPS warning state
  const [showGpsAlert, setShowGpsAlert] = useState(false);
  const [gpsErrorType, setGpsErrorType] = useState<'permission_denied' | 'gps_disabled' | 'timeout' | null>(null);
  const lastGpsAlertRef = useRef<number>(0);

  // Sync worker profile state to check for isAvailable
  useEffect(() => {
    if (!profile?.uid || profile.role?.toLowerCase() !== 'worker') {
      setWorkerProfile(null);
      return;
    }

    const workerRef = ref(db, `workers/${profile.uid}`);
    const unsubscribe = onValue(workerRef, (snapshot) => {
      setWorkerProfile(snapshot.val());
    });

    return () => unsubscribe();
  }, [profile?.uid, profile?.role]);

  // Main Tracking Effect
  useEffect(() => {
    // Only track if worker exists, is a worker, and is marked as available
    if (!profile?.uid || profile.role?.toLowerCase() !== 'worker' || !workerProfile?.isAvailable) {
      stopBackgroundLocationTracking();
      return;
    }

    const handleLocation = (latitude: number, longitude: number) => {
      const updates: any = {
        [`workers/${profile.uid}/latitude`]: latitude,
        [`workers/${profile.uid}/longitude`]: longitude,
        [`workers/${profile.uid}/lastLocationUpdate`]: Date.now(),
      };
      
      // Also update trade-specific locations if they exist
      if (workerProfile?.trades) {
        Object.keys(workerProfile.trades).forEach(trade => {
          updates[`workers/${profile.uid}/trades/${trade}/latitude`] = latitude;
          updates[`workers/${profile.uid}/trades/${trade}/longitude`] = longitude;
        });
      }
      
      update(ref(db), updates).catch(err => console.error('[GlobalTracker] Push failed:', err));
    };

    startBackgroundLocationTracking(
      handleLocation,
      (errorType) => {
        const now = Date.now();
        const isCritical = errorType === 'gps_disabled' || errorType === 'permission_denied';
        const cooldownMs = isCritical ? 60000 : 300000; // 1 min for critical, 5 mins for others
        
        // Show immediately if we haven't reached the cooldown from the previous DISMISSAL
        // Ignore 'timeout' because it happens frequently on mobile even when GPS is ON
        if (!showGpsAlert && errorType !== 'timeout' && (now - lastGpsAlertRef.current > cooldownMs)) { 
          setGpsErrorType(errorType);
          setShowGpsAlert(true);
        }
      },
      'DIP – Location Active',
      'You are visible to users. Turn off Availability to stop.'
    );

    return () => {
      // We don't stop on unmount if it's "global", but since it's used in App.tsx
      // it only unmounts on logout or total app close.
    };
  }, [profile?.uid, profile?.role, workerProfile?.isAvailable, workerProfile?.trades]);

  return (
    <AnimatePresence>
      {showGpsAlert && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 to-orange-500" />
            
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-5 text-orange-500 shadow-inner">
              <MapPin size={32} />
            </div>

            <h3 className="text-xl font-black text-slate-900 text-center mb-2 tracking-tight">
              {gpsErrorType === 'permission_denied' 
                ? t('Location Permission Denied') 
                : t('Location is Turned Off')}
            </h3>

            <p className="text-slate-500 text-sm text-center font-medium leading-relaxed mb-8 px-2">
              {gpsErrorType === 'permission_denied'
                ? t('Please allow location permissions so that users can find you for jobs.')
                : t('Your GPS is disabled. Please turn on Location so you can receive job requests!')}
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={async () => {
                  await openLocationSettings();
                  setShowGpsAlert(false);
                  lastGpsAlertRef.current = Date.now();
                }}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 transition-all shadow-xl shadow-blue-100"
              >
                {t('Turn On Location')}
              </button>
              
              <button
                onClick={() => {
                  setShowGpsAlert(false);
                  lastGpsAlertRef.current = Date.now();
                }}
                className="w-full bg-slate-100 text-slate-500 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-all text-xs"
              >
                {t('Dismiss')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
