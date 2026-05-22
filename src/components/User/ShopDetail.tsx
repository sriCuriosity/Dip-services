import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, MapPin, Phone, Mail, Clock, Calendar, User, Eye, EyeOff, MessageSquare } from 'lucide-react';
import { FullScreenImage } from '../Common/FullScreenImage';
import { AbstractGradientBackground } from '../Common/AbstractGradientBackground';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { cn, generateWhatsAppLink } from '@/src/lib/utils';
import { ref, increment, update, onValue } from 'firebase/database';
import { db } from '@/src/lib/firebase';

interface ShopDetailProps {
  shop: any;
  onClose: () => void;
}

export const ShopDetail: React.FC<ShopDetailProps> = ({ shop, onClose }) => {
  const { t } = useLanguage();
  const [showPhone, setShowPhone] = useState(false);
  const [workerPhoto, setWorkerPhoto] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ src: string, alt: string } | null>(null);

  useEffect(() => {
    const handlePopState = () => {
      if (!window.history.state?.preview) {
        setPreviewImage(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSetPreviewImage = (image: { src: string, alt: string } | null) => {
    if (image) {
      window.history.pushState({ preview: true }, '');
    }
    setPreviewImage(image);
  };

  useEffect(() => {
    const userRef = ref(db, `users/${shop.uid}`);
    onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.photoURL) {
        setWorkerPhoto(data.photoURL);
      }
    }, { onlyOnce: true });
  }, [shop.uid]);

  const trackClick = async (type: string) => {
    try {
      const shopRef = ref(db, `shops/${shop.uid}/stats`);
      await update(shopRef, {
        [`${type}Clicks`]: increment(1)
      });
    } catch (error) {
      console.error("Error tracking click:", error);
    }
  };

  const isShopOpen = () => {
    if (!shop.openingTime || !shop.closingTime) return true;

    const now = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[now.getDay()];

    if (shop.holidays && shop.holidays.includes(currentDay)) {
      return false;
    }

    const parseTime = (timeStr: string) => {
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return null;
      let [_, hours, mins, modifier] = match;
      let h = parseInt(hours, 10);
      let m = parseInt(mins, 10);
      if (modifier.toUpperCase() === 'PM' && h < 12) h += 12;
      if (modifier.toUpperCase() === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };

    const openMins = parseTime(shop.openingTime);
    const closeMins = parseTime(shop.closingTime);
    const currentMins = now.getHours() * 60 + now.getMinutes();

    if (openMins !== null && closeMins !== null) {
      if (closeMins < openMins) {
        // Night shift spanning midnight
        return currentMins >= openMins || currentMins <= closeMins;
      }
      return currentMins >= openMins && currentMins <= closeMins;
    }

    return true; 
  };

  const isOpen = isShopOpen();

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 flex justify-center overflow-hidden"
    >
      <div className="w-full max-w-md h-full flex flex-col relative">
        {/* Header Image Section */}
        <div className="h-64 relative flex-shrink-0">
          <div className="w-full h-full flex overflow-x-auto snap-x snap-mandatory no-scrollbar bg-slate-100">
            {(() => {
              const validPhotos = (shop.photos || [shop.photoURL]).filter((url: string) => url);
              if (validPhotos.length > 0) {
                return validPhotos.map((url: string, index: number) => (
                  <div 
                    key={index}
                    className="w-full h-full flex-shrink-0 snap-center relative cursor-zoom-in"
                    onClick={() => handleSetPreviewImage({ src: url, alt: `${shop.name} - Photo ${index + 1}` })}
                  >
                    <img src={url} alt={`${shop.name} ${index + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                ));
              }
              return (
                <div className="w-full h-full flex-shrink-0 snap-center bg-[#2d3446] relative overflow-hidden flex items-center justify-center">
                  {/* Low-poly geometric background elements */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] bg-[#4a5568] rotate-[15deg] skew-x-[-10deg]" />
                    <div className="absolute top-[10%] right-[-5%] w-[35%] h-[50%] bg-[#3a445a] rotate-[-20deg] skew-y-[5deg]" />
                    <div className="absolute bottom-[-15%] left-[20%] w-[50%] h-[40%] bg-[#4a5568] rotate-[5deg] skew-x-[20deg]" />
                    <div className="absolute top-[30%] left-[40%] w-[20%] h-[30%] bg-[#5a677c] rotate-[45deg]" />
                  </div>
                  {/* Subtle gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2d3446] via-transparent to-transparent opacity-60" />
                  <Building2 size={120} className="text-white/20 relative z-10" />
                </div>
              );
            })()}
          </div>
          
          {/* Scroll indicators if multiple photos */}
          {(() => {
            const validPhotos = (shop.photos || [shop.photoURL]).filter((url: string) => url);
            if (validPhotos.length > 1) {
              return (
                <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
                  <div className="bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full flex gap-2">
                    {validPhotos.map((_, i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/80" />
                    ))}
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute top-12 right-6 w-10 h-10 bg-white/80 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg text-slate-900 z-20"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 -mt-8 rounded-t-[2.5rem] pt-8 pb-6 relative z-10 overflow-y-auto no-scrollbar bg-emerald-100/40">
          <AbstractGradientBackground />
          
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-6 relative z-10">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <div className="flex flex-col gap-1">
                  <h1 className="text-2xl font-black text-slate-900 leading-tight break-words">{shop.name}</h1>
                  <div className="flex flex-col gap-1 items-start mt-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100/50 px-2 py-0.5 rounded-md break-words">{shop.shopType}</span>
                      {isOpen ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          {t('Open Now')}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-red-700 bg-red-100/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                          {t('Closed')}
                        </span>
                      )}
                    </div>
                    {shop.ownerName && (
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100/80 px-2 py-0.5 rounded-md break-all">
                        <span className="text-slate-400 font-medium mr-1">{t('Owner')}:</span>
                        {shop.ownerName}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-1.5 mt-4">
                  <div className="flex items-start gap-1 text-blue-800 font-bold text-xs pr-2">
                    <MapPin size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="break-all">{shop.city}</span>
                  </div>
                </div>
              </div>
              {/* Worker image display */}
              <div 
                className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center border-2 border-amber-300 overflow-hidden shadow-sm cursor-zoom-in flex-shrink-0"
                onClick={() => {
                  if (workerPhoto) {
                    handleSetPreviewImage({ src: workerPhoto, alt: shop.ownerName });
                  }
                }}
              >
                {workerPhoto ? (
                  <img src={workerPhoto} alt={shop.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User size={40} className="text-amber-500" />
                )}
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <section className="mb-6 relative z-10">
            <div className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-white/50 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-3 text-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-blue-600 shadow-sm">
                    <Phone size={16} />
                  </div>
                  <span className="text-sm font-medium">
                    {showPhone ? shop.phone : (shop.phone ? 'XXXXXX' + String(shop.phone).slice(-4) : t('No phone provided'))}
                  </span>
                </div>
                <button onClick={() => { setShowPhone(!showPhone); trackClick('phone'); }} className="text-slate-400 hover:text-blue-600">
                  {showPhone ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {shop.email && (
                <div className="flex items-center gap-3 text-slate-700">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-blue-600 shadow-sm">
                    <Mail size={16} />
                  </div>
                  <span className="text-sm font-medium">{shop.email}</span>
                </div>
              )}
              <div className="flex items-start gap-3 text-slate-700">
                <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-blue-600 shadow-sm flex-shrink-0">
                  <MapPin size={16} />
                </div>
                <div className="text-sm font-medium flex-1 min-w-0">
                  <p className="break-words line-clamp-3 mb-1">{shop.address}</p>
                  <p className="text-slate-500 text-xs break-words">{shop.city} {shop.landmark && `• ${shop.landmark}`}</p>
                </div>
              </div>
            </div>
          </section>

          {/* About */}
          <section className="mb-6 relative z-10">
            <div className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-white/50 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-2">{t('About Shop')}</h2>
              <p className="text-slate-600 text-sm leading-relaxed break-words">
                {shop.bio || t('No description provided.')}
              </p>
            </div>
          </section>

          {/* Business Hours */}
          <section className="mb-8 relative z-10">
              <div className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-white/50 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-4">{t('Business Hours')}</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                        <Clock size={16} />
                      </div>
                      <span className="text-sm font-bold text-slate-700">{t('Daily Timings')}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">
                      {shop.openingTime} - {shop.closingTime}
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                        <Calendar size={16} />
                      </div>
                      <span className="text-sm font-bold text-slate-700">{t('Weekly Holidays')}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(shop.holidays) && shop.holidays.length > 0 ? (
                        shop.holidays.map((day: string) => (
                          <span key={day} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 uppercase">
                            {t(day)}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic">{t('No weekly holidays')}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
          </section>

          {/* Action Footer (Moved inside scrollable content) */}
          <div className="flex flex-col gap-3 mt-8 pb-20">
            <button
              onClick={() => { trackClick('call'); window.open(`tel:${shop.phone}`, '_self'); }}
              className="w-full bg-slate-100 text-slate-900 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Phone size={20} />
              {t('Call Now')}
            </button>
            <button
              onClick={() => {
                trackClick('whatsapp');
                const link = generateWhatsAppLink(shop.phone, `Hi ${shop.name}, I found your shop on the app and would like to inquire about your services.`);
                window.open(link, '_blank');
              }}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 active:scale-95 transition-all"
            >
              <MessageSquare size={20} />
              {t('WhatsApp')}
            </button>
          </div>
        </div>
      </div>

      <FullScreenImage
        src={previewImage?.src || ''}
        alt={previewImage?.alt}
        isOpen={!!previewImage}
        onClose={() => window.history.back()}
      />
    </motion.div>
  );
};
