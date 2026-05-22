import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ref, update, onValue } from 'firebase/database';
import { db } from '@/src/lib/firebase';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { AbstractGradientBackground } from '../Common/AbstractGradientBackground';
import { Hammer, Zap, Paintbrush, Droplets, Wrench, Sparkles, Clock, MapPin, Save, User, Tv, Grid, Flame, BrickWall, Palmtree, X, Car, Truck, Tent, ChefHat, Home, CheckCircle2, XCircle, Store, Trash2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { fileToBase64, compressImage } from '@/src/lib/imageUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPicker } from '../Common/MapPicker';

const IndianRupee = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 3h12" />
    <path d="M6 8h12" />
    <path d="m6 13 8.5 8" />
    <path d="M6 13h3" />
    <path d="M9 13c6.667 0 6.667-10 0-10" />
  </svg>
);

const TRADES = [
  { id: 'Painter', icon: Paintbrush },
  { id: 'Plumber', icon: Droplets },
  { id: 'Electrician', icon: Zap },
  { id: 'Carpenter', icon: Hammer },
  { id: 'Mason', icon: BrickWall },
  { id: 'Cleaner', icon: Sparkles },
  { id: 'TV Repair', icon: Tv },
  { id: 'Tiles Worker', icon: Grid },
  { id: 'Welder', icon: Flame },
  { id: 'Coconut Plucker', icon: Palmtree },
  { id: 'Auto', icon: Car },
  { id: 'Tempo', icon: Truck },
  { id: 'Van', icon: Truck },
  { id: 'Mechanic', icon: Wrench },
  { id: 'Cable', icon: Zap },
  { id: 'Marriage Hall', icon: Tent },
  { id: 'Catering', icon: ChefHat },
  { id: 'House Rent', icon: Home },
  { id: 'Shop Rent', icon: Store },
  { id: 'JCB', icon: Truck },
  { id: 'Car', icon: Car },
];

export const WorkerProfileSetup: React.FC<{ onComplete?: () => void, onClose?: () => void }> = ({ onComplete, onClose }) => {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { trade: tradeParam } = useParams();
  const [trade, setTrade] = useState(tradeParam || '');
  const [experience, setExperience] = useState('');
  const [bio, setBio] = useState('');
  const [address, setAddress] = useState(profile?.address || '');
  const [city, setCity] = useState(profile?.city || '');
  const [landmark, setLandmark] = useState(profile?.landmark || '');
  const [fullDay, setFullDay] = useState(800);
  const [halfDay, setHalfDay] = useState(500);
  const [quickVisit, setQuickVisit] = useState(300);
  const [ratePerKm, setRatePerKm] = useState(15);
  const [ratePerHour, setRatePerHour] = useState(150);
  const [ratePerTree, setRatePerTree] = useState(50);
  const [advance, setAdvance] = useState(5000);
  const [monthlyRent, setMonthlyRent] = useState(5000);
  const [oneDayRate, setOneDayRate] = useState(10000);
  const [twoDayRate, setTwoDayRate] = useState(18000);
  const [oneTimeRate, setOneTimeRate] = useState(5000);
  const [twoTimeRate, setTwoTimeRate] = useState(8000);
  const [workingHours, setWorkingHours] = useState('09:00 AM - 06:00 PM');
  const [startTime, setStartTime] = useState('09:00');
  const [startAMPM, setStartAMPM] = useState('AM');
  const [endTime, setEndTime] = useState('06:00');
  const [endAMPM, setEndAMPM] = useState('PM');
  const [isVerified, setIsVerified] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [isAvailable, setIsAvailable] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [tradeImage, setTradeImage] = useState<string | null>(null);
  const [uploadSize, setUploadSize] = useState<number | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);

  useEffect(() => {
    if (!profile || !trade) return;
    const tradeRef = ref(db, `workers/${profile.uid}/trades/${trade}`);
    onValue(tradeRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setExperience(data.experience || '');
        setBio(data.bio || '');
        setAddress(data.address || profile?.address || '');
        setCity(data.city || profile?.city || '');
        setLandmark(data.landmark || profile?.landmark || '');
        setFullDay(data.rates?.fullDay || 800);
        setHalfDay(data.rates?.halfDay || 500);
        setQuickVisit(data.rates?.quickVisit || data.rates?.baseRate || 300);
        setRatePerKm(data.rates?.ratePerKm || 15);
        setRatePerHour(data.rates?.ratePerHour || 150);
        setRatePerTree(data.rates?.ratePerTree || 50);
        setAdvance(data.rates?.advance || 5000);
        setMonthlyRent(data.rates?.monthlyRent || 5000);
        setOneDayRate(data.rates?.oneDayRate || 10000);
        setTwoDayRate(data.rates?.twoDayRate || 18000);
        setOneTimeRate(data.rates?.oneTimeRate || 5000);
        setTwoTimeRate(data.rates?.twoTimeRate || 8000);
        setWorkingHours(data.workingHours || '09:00 AM - 06:00 PM');
        if (data.workingHours) {
          const [start, end] = data.workingHours.split(' - ');
          if (start) {
            const [time, ampm] = start.split(' ');
            setStartTime(time);
            setStartAMPM(ampm);
          }
          if (end) {
            const [time, ampm] = end.split(' ');
            setEndTime(time);
            setEndAMPM(ampm);
          }
        }
        setIsVerified(data.verificationStatus === 'approved');
        setVerificationStatus(data.verificationStatus || 'pending');
        if (data.isAvailable !== undefined) {
          setIsAvailable(data.isAvailable);
        }
        setTradeImage(data.photoURL || null);
        if (data.latitude && data.longitude) {
          setCoordinates({ lat: data.latitude, lng: data.longitude });
        } else if (profile?.latitude && profile?.longitude) {
          setCoordinates({ lat: profile.latitude, lng: profile.longitude });
        }
      } else {
        // Reset to defaults if no data exists for this trade
        setExperience('');
        setBio('');
        setAddress(profile?.address || '');
        setCity(profile?.city || '');
        setLandmark(profile?.landmark || '');
        setFullDay(800);
        setHalfDay(500);
        setQuickVisit(300);
        setRatePerKm(15);
        setRatePerHour(150);
        setRatePerTree(50);
        setAdvance(5000);
        setMonthlyRent(5000);
        setOneDayRate(10000);
        setTwoDayRate(18000);
        setOneTimeRate(5000);
        setTwoTimeRate(8000);
        setWorkingHours('09:00 AM - 06:00 PM');
        setStartTime('09:00');
        setStartAMPM('AM');
        setEndTime('06:00');
        setEndAMPM('PM');
        setIsVerified(false);
        setVerificationStatus('pending');
        setIsAvailable(true);
        setTradeImage(null);
        if (profile?.latitude && profile?.longitude) {
          setCoordinates({ lat: profile.latitude, lng: profile.longitude });
        } else {
          setCoordinates(null);
        }
      }
    }, { onlyOnce: true });
  }, [profile, trade]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      const base64 = await fileToBase64(compressed);
      setTradeImage(base64);
      setUploadSize(Math.round(base64.length / 1024));
    } catch (error) {
      console.error('Image processing error:', error);
      alert(t('Error processing image'));
    }
  };

  const handleRemoveImage = () => {
    setTradeImage(null);
    setUploadSize(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    try {
      const updates = {
        [`trades/${trade}`]: {
          trade,
          experience,
          bio,
          address,
          city,
          landmark,
          rates: {
            fullDay,
            halfDay,
            quickVisit,
            ratePerKm,
            ratePerHour,
            ratePerTree,
            advance,
            monthlyRent,
            oneDayRate,
            twoDayRate,
            oneTimeRate,
            twoTimeRate,
          },
          isAvailable: isAvailable,
          workingHours: workingHours,
          photoURL: tradeImage,
          verificationStatus: isVerified ? 'approved' : 'pending',
          latitude: coordinates?.lat || null,
          longitude: coordinates?.lng || null
        },
        phone: profile.phone || '',
        email: profile.email || '',
      };

      await update(ref(db, `workers/${profile.uid}`), updates);

      // Also update core profile coordinates if they were picked
      if (coordinates) {
        await update(ref(db, `users/${profile.uid}`), {
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          address,
          city,
          landmark
        });
      }

      alert(t('Data stored successfully'));
      if (onComplete) onComplete();
    } catch (error) {
      console.error('Profile setup error:', error);
      alert(t('Error storing data'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-[#2d3446] px-6 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-8 rounded-b-[2.5rem] shadow-2xl relative overflow-hidden flex items-center justify-between">
        {/* Low-poly geometric background elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] bg-[#4a5568] rotate-[15deg] skew-x-[-10deg]" />
          <div className="absolute top-[10%] right-[-5%] w-[35%] h-[50%] bg-[#3a445a] rotate-[-20deg] skew-y-[5deg]" />
          <div className="absolute bottom-[-15%] left-[20%] w-[50%] h-[40%] bg-[#4a5568] rotate-[5deg] skew-x-[20deg]" />
          <div className="absolute top-[30%] left-[40%] w-[20%] h-[30%] bg-[#5a677c] rotate-[45deg]" />
        </div>

        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#2d3446] via-transparent to-transparent opacity-60" />

        <div className="relative z-10">
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">{t('Service Profile')}</h1>
          <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest">{t('Configure your professional details')}</p>
        </div>
        <button onClick={onClose || (() => navigate(-1))} className="relative z-10 p-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full text-white hover:bg-white/10 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 relative bg-emerald-100/40">
        <AbstractGradientBackground />
        <form onSubmit={handleSubmit} className="p-6 space-y-8 pb-24 relative z-10">
        {/* Trade Selection */}
        <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <Wrench size={18} />
              </div>
              <label className={cn(
                "text-sm font-bold text-blue-900",
                language === 'en' ? "uppercase tracking-wider" : ""
              )}>{t('Select Your Trade')}</label>
            </div>
            {trade && (
              <div className={cn(
                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1",
                verificationStatus === 'approved' ? "bg-emerald-100 text-emerald-700" :
                verificationStatus === 'rejected' ? "bg-red-100 text-red-700" :
                "bg-amber-100 text-amber-700"
              )}>
                {verificationStatus === 'approved' ? <CheckCircle2 size={10} /> :
                 verificationStatus === 'rejected' ? <XCircle size={10} /> :
                 <Clock size={10} />}
                {t(verificationStatus === 'approved' ? 'Verified' :
                   verificationStatus === 'rejected' ? 'Rejected' : 'Pending')}
              </div>
            )}
          </div>
          <select
            className="input-field border-blue-200 focus:border-blue-500 focus:ring-blue-500"
            value={trade}
            onChange={(e) => setTrade(e.target.value)}
            required
          >
            <option value="">{t('Select a trade')}</option>
            {TRADES.map((tItem) => (
              <option key={tItem.id} value={tItem.id}>{t(tItem.id)}</option>
            ))}
          </select>
        </div>

        {/* Trade Specific Photo Upload */}
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-[2rem] border border-white/50 shadow-sm mb-6">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-4 block text-center">
            {t('Service Work Photo')}
          </label>

          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <div className="w-48 h-48 rounded-[2rem] bg-slate-100 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center transition-all group-hover:scale-[1.02]">
                {tradeImage ? (
                  <img src={tradeImage} alt="Service preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <User size={48} strokeWidth={1} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{t('No Photo')}</span>
                  </div>
                )}
              </div>

              <label className="absolute bottom-2 right-2 w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg cursor-pointer active:scale-90 transition-all hover:bg-blue-700">
                <Save size={20} />
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
              {tradeImage && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute bottom-2 left-2 w-12 h-12 bg-red-500 text-white rounded-2xl flex items-center justify-center shadow-lg cursor-pointer active:scale-90 transition-all hover:bg-red-600"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>

            {uploadSize && (
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {t('Size:')} {uploadSize} KB
              </p>
            )}

            <p className="text-[11px] text-slate-500 font-medium text-center px-4 leading-relaxed italic opacity-80">
              {t('Upload a high-quality photo of your work for this specific service.')}
            </p>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <User size={18} />
            </div>
            <label className={cn(
              "text-sm font-bold text-emerald-900",
              language === 'en' ? "uppercase tracking-wider" : ""
            )}>{t('Personal Details')}</label>
          </div>

          <div>
            <label className={cn(
              "text-xs font-bold text-emerald-600 mb-2 block",
              language === 'en' ? "uppercase" : ""
            )}>{t('Experience')}</label>
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" size={18} />
              <input
                type="text"
                placeholder={t('e.g. 5 Years')}
                className="input-field pl-12 border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className={cn(
              "text-xs font-bold text-emerald-600 mb-2 block",
              language === 'en' ? "uppercase" : ""
            )}>{t('Working Hours')}</label>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">{t('Start Time')}</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="09:00"
                    className="input-field flex-1 border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500 text-center"
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      setWorkingHours(`${e.target.value} ${startAMPM} - ${endTime} ${endAMPM}`);
                    }}
                  />
                  <select
                    className="input-field w-24 border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500"
                    value={startAMPM}
                    onChange={(e) => {
                      setStartAMPM(e.target.value);
                      setWorkingHours(`${startTime} ${e.target.value} - ${endTime} ${endAMPM}`);
                    }}
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">{t('End Time')}</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="06:00"
                    className="input-field flex-1 border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500 text-center"
                    value={endTime}
                    onChange={(e) => {
                      setEndTime(e.target.value);
                      setWorkingHours(`${startTime} ${startAMPM} - ${e.target.value} ${endAMPM}`);
                    }}
                  />
                  <select
                    className="input-field w-24 border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500"
                    value={endAMPM}
                    onChange={(e) => {
                      setEndAMPM(e.target.value);
                      setWorkingHours(`${startTime} ${startAMPM} - ${endTime} ${e.target.value}`);
                    }}
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className={cn(
              "text-xs font-bold text-emerald-600 mb-2 block",
              language === 'en' ? "uppercase" : ""
            )}>{t('Address')}</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" size={18} />
              <input
                type="text"
                placeholder={t('e.g. 123 Street Name')}
                className="input-field pl-12 pr-12 border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setIsMapOpen(true)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                title={t('Pick on Map')}
              >
                <MapPin size={16} />
              </button>
            </div>
          </div>

          <div>
            <label className={cn(
              "text-xs font-bold text-emerald-600 mb-2 block",
              language === 'en' ? "uppercase" : ""
            )}>{t('City')}</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" size={18} />
              <input
                type="text"
                placeholder={t('e.g. Mumbai')}
                className="input-field pl-12 border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className={cn(
              "text-xs font-bold text-emerald-600 mb-2 block",
              language === 'en' ? "uppercase" : ""
            )}>{t('Landmark')}</label>
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
              <label className={cn(
                "text-xs font-bold text-emerald-600",
                language === 'en' ? "uppercase" : ""
              )}>{t('Professional Bio')}</label>
            </div>
            <textarea
              placeholder={t('Tell customers about your expertise...')}
              className="input-field min-h-[100px] resize-none border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Rates */}
        <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <IndianRupee size={18} />
            </div>
            <label className={cn(
              "text-sm font-bold text-amber-900",
              language === 'en' ? "uppercase tracking-wider" : ""
            )}>{t('Service Rates')}</label>
          </div>
          
          <div className="space-y-4">
            {['Auto', 'Tempo', 'Van', 'Car'].includes(trade) ? (
              <>
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white text-amber-600 rounded-xl flex items-center justify-center shadow-sm">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{t('Rate per KM')}</p>
                      <p className="text-slate-500 text-[10px]">{t('Charge per kilometer')}</p>
                    </div>
                  </div>
                  <input
                    type="number"
                    className="w-24 px-3 py-2 bg-white border border-amber-200 rounded-xl text-right font-bold text-amber-600 focus:outline-none focus:border-amber-500"
                    value={ratePerKm}
                    onChange={(e) => setRatePerKm(Number(e.target.value))}
                  />
                </div>
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white text-amber-600 rounded-xl flex items-center justify-center shadow-sm">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{t('Rate per Hour')}</p>
                      <p className="text-slate-500 text-[10px]">{t('Charge per hour')}</p>
                    </div>
                  </div>
                  <input
                    type="number"
                    className="w-24 px-3 py-2 bg-white border border-amber-200 rounded-xl text-right font-bold text-amber-600 focus:outline-none focus:border-amber-500"
                    value={ratePerHour}
                    onChange={(e) => setRatePerHour(Number(e.target.value))}
                  />
                </div>
              </>
            ) : trade === 'JCB' ? (
              <>
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white text-amber-600 rounded-xl flex items-center justify-center shadow-sm">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{t('Rate per Hour')}</p>
                      <p className="text-slate-500 text-[10px]">{t('Charge per hour')}</p>
                    </div>
                  </div>
                  <input
                    type="number"
                    className="w-24 px-3 py-2 bg-white border border-amber-200 rounded-xl text-right font-bold text-amber-600 focus:outline-none focus:border-amber-500"
                    value={ratePerHour}
                    onChange={(e) => setRatePerHour(Number(e.target.value))}
                  />
                </div>
              </>
            ) : trade === 'Coconut Plucker' ? (
              <>
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white text-amber-600 rounded-xl flex items-center justify-center shadow-sm">
                      <Palmtree size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{t('Rate per Tree')}</p>
                      <p className="text-slate-500 text-[10px]">{t('Charge per tree')}</p>
                    </div>
                  </div>
                  <input
                    type="number"
                    className="w-24 px-3 py-2 bg-white border border-amber-200 rounded-xl text-right font-bold text-amber-600 focus:outline-none focus:border-amber-500"
                    value={ratePerTree}
                    onChange={(e) => setRatePerTree(Number(e.target.value))}
                  />
                </div>
              </>
            ) : ['House Rent', 'Shop Rent'].includes(trade) ? (
              <>
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white text-amber-600 rounded-xl flex items-center justify-center shadow-sm">
                      <IndianRupee size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{t('Advance')}</p>
                      <p className="text-slate-500 text-[10px]">{t('Security deposit')}</p>
                    </div>
                  </div>
                  <input
                    type="number"
                    className="w-24 px-3 py-2 bg-white border border-amber-200 rounded-xl text-right font-bold text-amber-600 focus:outline-none focus:border-amber-500"
                    value={advance}
                    onChange={(e) => setAdvance(Number(e.target.value))}
                  />
                </div>
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white text-amber-600 rounded-xl flex items-center justify-center shadow-sm">
                      <Home size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{t('Monthly Rent')}</p>
                      <p className="text-slate-500 text-[10px]">{t('Rent per month')}</p>
                    </div>
                  </div>
                  <input
                    type="number"
                    className="w-24 px-3 py-2 bg-white border border-amber-200 rounded-xl text-right font-bold text-amber-600 focus:outline-none focus:border-amber-500"
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(Number(e.target.value))}
                  />
                </div>
              </>
            ) : trade === 'Marriage Hall' ? (
              <>
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white text-amber-600 rounded-xl flex items-center justify-center shadow-sm">
                      <IndianRupee size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{t('Advance')}</p>
                      <p className="text-slate-500 text-[10px]">{t('Booking advance')}</p>
                    </div>
                  </div>
                  <input
                    type="number"
                    className="w-24 px-3 py-2 bg-white border border-amber-200 rounded-xl text-right font-bold text-amber-600 focus:outline-none focus:border-amber-500"
                    value={advance}
                    onChange={(e) => setAdvance(Number(e.target.value))}
                  />
                </div>
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white text-amber-600 rounded-xl flex items-center justify-center shadow-sm">
                      <Tent size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{t('One Day Rate')}</p>
                      <p className="text-slate-500 text-[10px]">{t('24 hours charge')}</p>
                    </div>
                  </div>
                  <input
                    type="number"
                    className="w-24 px-3 py-2 bg-white border border-amber-200 rounded-xl text-right font-bold text-amber-600 focus:outline-none focus:border-amber-500"
                    value={oneDayRate}
                    onChange={(e) => setOneDayRate(Number(e.target.value))}
                  />
                </div>
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white text-amber-600 rounded-xl flex items-center justify-center shadow-sm">
                      <Tent size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{t('Two Day Rate')}</p>
                      <p className="text-slate-500 text-[10px]">{t('48 hours charge')}</p>
                    </div>
                  </div>
                  <input
                    type="number"
                    className="w-24 px-3 py-2 bg-white border border-amber-200 rounded-xl text-right font-bold text-amber-600 focus:outline-none focus:border-amber-500"
                    value={twoDayRate}
                    onChange={(e) => setTwoDayRate(Number(e.target.value))}
                  />
                </div>
              </>
            ) : trade === 'Catering' ? (
              <>
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white text-amber-600 rounded-xl flex items-center justify-center shadow-sm">
                      <IndianRupee size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{t('Advance')}</p>
                      <p className="text-slate-500 text-[10px]">{t('Booking advance')}</p>
                    </div>
                  </div>
                  <input
                    type="number"
                    className="w-24 px-3 py-2 bg-white border border-amber-200 rounded-xl text-right font-bold text-amber-600 focus:outline-none focus:border-amber-500"
                    value={advance}
                    onChange={(e) => setAdvance(Number(e.target.value))}
                  />
                </div>
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white text-amber-600 rounded-xl flex items-center justify-center shadow-sm">
                      <ChefHat size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{t('One Time Rate')}</p>
                      <p className="text-slate-500 text-[10px]">{t('Single meal service')}</p>
                    </div>
                  </div>
                  <input
                    type="number"
                    className="w-24 px-3 py-2 bg-white border border-amber-200 rounded-xl text-right font-bold text-amber-600 focus:outline-none focus:border-amber-500"
                    value={oneTimeRate}
                    onChange={(e) => setOneTimeRate(Number(e.target.value))}
                  />
                </div>
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white text-amber-600 rounded-xl flex items-center justify-center shadow-sm">
                      <ChefHat size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{t('Two Time Rate')}</p>
                      <p className="text-slate-500 text-[10px]">{t('Two meals service')}</p>
                    </div>
                  </div>
                  <input
                    type="number"
                    className="w-24 px-3 py-2 bg-white border border-amber-200 rounded-xl text-right font-bold text-amber-600 focus:outline-none focus:border-amber-500"
                    value={twoTimeRate}
                    onChange={(e) => setTwoTimeRate(Number(e.target.value))}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white text-amber-600 rounded-xl flex items-center justify-center shadow-sm">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{t('Quick Visit')}</p>
                      <p className="text-slate-500 text-[10px]">{t('Up to 1 hour')}</p>
                    </div>
                  </div>
                  <input
                    type="number"
                    className="w-24 px-3 py-2 bg-white border border-amber-200 rounded-xl text-right font-bold text-amber-600 focus:outline-none focus:border-amber-500"
                    value={quickVisit}
                    onChange={(e) => setQuickVisit(Number(e.target.value))}
                  />
                </div>

                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white text-amber-600 rounded-xl flex items-center justify-center shadow-sm">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{t('Half Day')}</p>
                      <p className="text-slate-500 text-[10px]">{t('Up to 4 hours')}</p>
                    </div>
                  </div>
                  <input
                    type="number"
                    className="w-24 px-3 py-2 bg-white border border-amber-200 rounded-xl text-right font-bold text-amber-600 focus:outline-none focus:border-amber-500"
                    value={halfDay}
                    onChange={(e) => setHalfDay(Number(e.target.value))}
                  />
                </div>

                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white text-amber-600 rounded-xl flex items-center justify-center shadow-sm">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{t('Full Day')}</p>
                      <p className="text-slate-500 text-[10px]">{t('Up to 8 hours')}</p>
                    </div>
                  </div>
                  <input
                    type="number"
                    className="w-24 px-3 py-2 bg-white border border-amber-200 rounded-xl text-right font-bold text-amber-600 focus:outline-none focus:border-amber-500"
                    value={fullDay}
                    onChange={(e) => setFullDay(Number(e.target.value))}
                  />
                </div>
              </>
            )}
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
                <span>{t('Save Service Profile')}</span>
              </>
            )}
          </button>
        </div>

        {isMapOpen && (
          <MapPicker
            onClose={() => setIsMapOpen(false)}
            onLocationSelect={(data) => {
              setAddress(data.address);
              setCity(data.city);
              setLandmark(data.landmark);
              setCoordinates({ lat: data.lat, lng: data.lng });
              setIsMapOpen(false);
            }}
            initialLocation={coordinates || undefined}
          />
        )}
      </form>
    </div>
  </div>
  );
};
