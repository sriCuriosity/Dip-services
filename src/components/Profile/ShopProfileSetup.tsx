import React, { useState, useEffect } from 'react';
import { ref, update, onValue } from 'firebase/database';
import { db } from '@/src/lib/firebase';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { AbstractGradientBackground } from '../Common/AbstractGradientBackground';
import { Building2, MapPin, Save, User, FileText, Camera, Loader2, Clock, Calendar, X, Trash2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion } from 'framer-motion';
import { compressImage, fileToBase64 } from '@/src/lib/imageUtils';
import { useNavigate } from 'react-router-dom';
import { CITIES_LIST } from '@/src/lib/citiesData';

export const ShopProfileSetup: React.FC<{ onComplete?: () => void, onClose?: () => void }> = ({ onComplete, onClose }) => {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [shopType, setShopType] = useState('');
  const [bio, setBio] = useState('');
  const [address, setAddress] = useState(profile?.address || '');
  const [city, setCity] = useState(profile?.city || '');
  const [landmark, setLandmark] = useState(profile?.landmark || '');
  const [photos, setPhotos] = useState<string[]>(['', '', '']);
  const [openingTime, setOpeningTime] = useState('09:00');
  const [closingTime, setClosingTime] = useState('21:00');
  const [holidays, setHolidays] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadSize, setUploadSize] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!profile) return;
    const shopRef = ref(db, `shops/${profile.uid}`);
    onValue(shopRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setName(data.name || '');
        setOwnerName(data.ownerName || '');
        setShopType(data.shopType || '');
        setBio(data.bio || '');
        setAddress(data.address || profile.address || '');
        setCity(data.city || profile.city || '');
        setLandmark(data.landmark || profile.landmark || '');
        setPhotos(data.photos || [data.photoURL || '', '', '']);
        setOpeningTime(data.openingTime || '09:00');
        setClosingTime(data.closingTime || '21:00');
        setHolidays(data.holidays || []);
      }
    }, { onlyOnce: true });
  }, [profile]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploadingIndex(index);
    try {
      const compressed = await compressImage(file);
      const base64Url = await fileToBase64(compressed);
      
      // Calculate size in KB
      const sizeInKb = Math.round((base64Url.length * 3) / 4 / 1024);
      setUploadSize(`${sizeInKb} KB`);
      
      setPhotos(prev => {
        const newPhotos = [...prev];
        newPhotos[index] = base64Url;
        return newPhotos;
      });
      
      // Clear size after 5 seconds
      setTimeout(() => setUploadSize(null), 5000);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => {
      const newPhotos = [...prev];
      newPhotos[index] = '';
      return newPhotos;
    });
    setUploadSize(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    try {
      const updates = {
        name,
        ownerName,
        shopType,
        bio,
        address,
        city,
        landmark,
        photos,
        photoURL: photos[0] || '', // keep backwards compatibility
        openingTime,
        closingTime,
        holidays,
        phone: profile.phone || '',
        email: profile.email || '',
        createdAt: Date.now(),
      };

      await update(ref(db, `shops/${profile.uid}`), updates);
      alert(t('Data stored successfully'));
      if (onComplete) onComplete();
    } catch (error) {
      console.error('Shop setup error:', error);
      alert(t('Error storing data'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-purple-600 px-6 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-8 rounded-b-[2.5rem] shadow-lg shadow-purple-100 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('Shop Profile')}</h1>
          <p className="text-purple-100 text-sm">{t('Configure your shop details')}</p>
        </div>
        <button onClick={onClose || (() => navigate(-1))} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 relative bg-emerald-100/40">
        <AbstractGradientBackground />
        <form onSubmit={handleSubmit} className="p-6 space-y-8 pb-24 relative z-10">
        <div className="flex justify-center gap-4 mb-6">
          {[0, 1, 2].map((index) => (
            <div key={index} className="relative">
              <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
                {uploadingIndex === index ? (
                  <Loader2 className="text-emerald-600 animate-spin" size={24} />
                ) : photos[index] ? (
                  <img 
                    src={photos[index]} 
                    alt={`${name} - ${index + 1}`} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer" 
                  />
                ) : (
                  <Building2 size={24} className="text-emerald-200" />
                )}
              </div>
              <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-600 text-white rounded-xl flex items-center justify-center border-2 border-white shadow-md cursor-pointer active:scale-90 transition-transform">
                <Camera size={14} />
                 <input type="file" className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(e, index)} disabled={uploadingIndex !== null} />
              </label>
              {photos[index] && (
                <button 
                  type="button"
                  onClick={() => handleRemovePhoto(index)}
                  className="absolute -bottom-2 -left-2 w-8 h-8 bg-red-600 text-white rounded-xl flex items-center justify-center border-2 border-white shadow-md cursor-pointer active:scale-90 transition-transform"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        {uploadSize && (
          <div className="text-center -mt-4 mb-4">
            <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold border border-emerald-200">
              {t('Image Size')}: {uploadSize}
            </span>
          </div>
        )}

        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <Building2 size={18} />
            </div>
            <label className={cn(
              "text-sm font-bold text-emerald-900",
              language === 'en' ? "uppercase tracking-wider" : ""
            )}>{t('Shop Details')}</label>
          </div>
          
          <div>
            <label className={cn("text-xs font-bold text-emerald-600 mb-2 block", language === 'en' ? "uppercase" : "")}>{t('Shop Name')}</label>
            <input
              type="text"
              placeholder={t('e.g. My Awesome Shop')}
              className="input-field border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className={cn("text-xs font-bold text-emerald-600 mb-2 block", language === 'en' ? "uppercase" : "")}>{t('Owner Name')}</label>
            <input
              type="text"
              placeholder={t('e.g. John Doe')}
              className="input-field border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className={cn("text-xs font-bold text-emerald-600 mb-2 block", language === 'en' ? "uppercase" : "")}>{t('Shop Type')}</label>
            <input
              type="text"
              placeholder={t('e.g. Grocery, Hardware')}
              className="input-field border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500"
              value={shopType}
              onChange={(e) => setShopType(e.target.value)}
              required
            />
          </div>

          <div>
            <label className={cn("text-xs font-bold text-emerald-600 mb-2 block", language === 'en' ? "uppercase" : "")}>{t('Address')}</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" size={18} />
              <input
                type="text"
                placeholder={t('e.g. 123 Street Name')}
                className="input-field pl-12 border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className={cn("text-xs font-bold text-emerald-600 mb-2 block", language === 'en' ? "uppercase" : "")}>{t('City')}</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" size={18} />
              <input
                type="text"
                list="shop-cities-list"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="input-field pl-12 border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500"
                placeholder={t('Enter City')}
                required
              />
              <datalist id="shop-cities-list">
                {CITIES_LIST.map(c => <option key={c} value={c}>{c}</option>)}
              </datalist>
            </div>
          </div>
          <div>
            <label className={cn("text-xs font-bold text-emerald-600 mb-2 block", language === 'en' ? "uppercase" : "")}>{t('Landmark')}</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" size={18} />
              <input
                type="text"
                placeholder={t('e.g. Near Railway Station')}
                className="input-field pl-12 border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className={cn("text-xs font-bold text-emerald-600", language === 'en' ? "uppercase" : "")}>{t('About Shop')}</label>
            </div>
            <textarea
              placeholder={t('Tell customers about your shop...')}
              className="input-field min-h-[100px] resize-none border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Business Hours */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <Clock size={18} />
            </div>
            <label className={cn(
              "text-sm font-bold text-emerald-900",
              language === 'en' ? "uppercase tracking-wider" : ""
            )}>{t('Business Hours')}</label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={cn("text-xs font-bold text-emerald-600 mb-2 block", language === 'en' ? "uppercase" : "")}>{t('Opening Time')}</label>
              <input
                type="time"
                className="input-field border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500"
                value={openingTime}
                onChange={(e) => setOpeningTime(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={cn("text-xs font-bold text-emerald-600 mb-2 block", language === 'en' ? "uppercase" : "")}>{t('Closing Time')}</label>
              <input
                type="time"
                className="input-field border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500"
                value={closingTime}
                onChange={(e) => setClosingTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className={cn("text-xs font-bold text-emerald-600 mb-2 block", language === 'en' ? "uppercase" : "")}>{t('Weekly Holidays')}</label>
            <div className="flex flex-wrap gap-2">
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    setHolidays(prev => 
                      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
                    );
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                    holidays.includes(day)
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                  )}
                >
                  {t(day)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="fixed bottom-20 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-slate-100 z-40 max-w-md mx-auto">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save size={20} />
                <span>{t('Save Shop Profile')}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  </div>
  );
};
