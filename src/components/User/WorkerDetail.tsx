import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkerProfile, Order } from '@/src/types';
import { ChevronLeft, MapPin, Clock, ShieldCheck, ShieldAlert, ShieldX, Phone, MessageCircle, Calendar, Star, Mail, UserCircle, X, Briefcase } from 'lucide-react';
import { FullScreenImage } from '../Common/FullScreenImage';
import { AbstractGradientBackground } from '../Common/AbstractGradientBackground';
import { formatCurrency, generateWhatsAppLink, apiFetch, cn, calculatePlatformFeePercentage } from '@/src/lib/utils';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { ref, push, set } from 'firebase/database';
import { db } from '@/src/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { FCMService } from '@/src/lib/fcmService';
import { LocationPicker } from '../Common/LocationPicker';
import { getDistance } from '@/src/lib/utils';

interface WorkerDetailProps {
  worker: WorkerProfile;
  onBack: () => void;
  hasOverdueFees?: boolean;
}

export const WorkerDetail: React.FC<WorkerDetailProps> = ({ worker, onBack, hasOverdueFees = false }) => {
  const { profile, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isBooking, setIsBooking] = useState(false);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSetPreviewImage = (image: { src: string, alt: string } | null) => {
    setPreviewImage(image);
  };

  const handleOpenBooking = (isOpen: boolean) => {
    setIsBooking(isOpen);
  };
  const [previewImage, setPreviewImage] = useState<{ src: string, alt: string } | null>(null);
  const [selectedTradeForBooking, setSelectedTradeForBooking] = useState<string>(worker.trade || '');
  const [bookingDetails, setBookingDetails] = useState({
    issue: '',
    workAddress: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00 AM',
    hour: '09',
    minute: '00',
    ampm: 'AM',
    duration: 'Full Day',
    offeredAmount: '',
    guestCount: '',
    pickupPoint: '',
    jobInfo: '',
    sourceLat: null as number | null,
    sourceLng: null as number | null,
    destLat: null as number | null,
    destLng: null as number | null
  });

  const [activePicker, setActivePicker] = useState<'source' | 'dest' | 'pickup' | null>(null);

  const getTradeRates = (trade: string, rates: any) => {
    if (['Auto', 'Tempo', 'Van', 'Car'].includes(trade)) {
      return [
        { id: 'ratePerKm', label: t('Rate per KM'), value: rates?.ratePerKm || 0 },
        { id: 'ratePerHour', label: t('Rate per Hour'), value: rates?.ratePerHour || 0 },
      ];
    } else if (trade === 'JCB') {
      return [
        { id: 'ratePerHour', label: t('Rate per Hour'), value: rates?.ratePerHour || 0 },
      ];
    } else if (trade === 'Coconut Plucker') {
      return [
        { id: 'ratePerTree', label: t('Rate per Tree'), value: rates?.ratePerTree || 0 },
      ];
    } else if (['House Rent', 'Shop Rent'].includes(trade)) {
      return [
        { id: 'advance', label: t('Advance'), value: rates?.advance || 0 },
        { id: 'monthlyRent', label: t('Monthly Rent'), value: rates?.monthlyRent || 0 },
      ];
    } else if (trade === 'Marriage Hall') {
      return [
        { id: 'advance', label: t('Advance'), value: rates?.advance || 0 },
        { id: 'oneDayRate', label: t('One Day Rate'), value: rates?.oneDayRate || 0 },
        { id: 'twoDayRate', label: t('Two Day Rate'), value: rates?.twoDayRate || 0 },
      ];
    } else if (trade === 'Catering') {
      return [
        { id: 'advance', label: t('Advance'), value: rates?.advance || 0 },
        { id: 'oneTimeRate', label: t('One Time Rate'), value: rates?.oneTimeRate || 0 },
        { id: 'twoTimeRate', label: t('Two Time Rate'), value: rates?.twoTimeRate || 0 },
      ];
    } else {
      return [
        { id: 'quickVisit', label: t('Quick Visit'), value: rates?.quickVisit || 0 },
        { id: 'halfDay', label: t('Half Day'), value: rates?.halfDay || 0 },
        { id: 'fullDay', label: t('Full Day'), value: rates?.fullDay || 0 },
      ];
    }
  };

  const openBookingModal = (trade: string) => {
    setSelectedTradeForBooking(trade);
    const tradeRates = getTradeRates(trade, worker.rates);
    
    let defaultDuration = tradeRates[0].label;
    let defaultAmount = String(tradeRates[0].value);

    // For Rent, default to Monthly Rent if available
    if (['House Rent', 'Shop Rent'].includes(trade)) {
      const monthlyTier = tradeRates.find(t => t.id === 'monthlyRent');
      if (monthlyTier) {
        defaultDuration = monthlyTier.label;
        defaultAmount = String(monthlyTier.value);
      }
    } else if (['Marriage Hall', 'Catering'].includes(trade)) {
      defaultAmount = '0';
    }

    setBookingDetails(prev => ({
      ...prev,
      duration: defaultDuration,
      offeredAmount: defaultAmount,
      guestCount: '',
      pickupPoint: '',
      jobInfo: ''
    }));
    handleOpenBooking(true);
  };

  const formatTimeFromParts = (hour: string, minute: string, ampm: string) => {
    return `${hour}:${minute} ${ampm}`;
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert(t("You must be logged in to book a worker."));
      return;
    }

    setLoading(true);
    try {
      const isTransport = ['Auto', 'Tempo', 'Van', 'Car'].includes(selectedTradeForBooking);

      if (isTransport && (!profile?.latitude || !profile?.longitude)) {
        alert(t("Please turn on your location to book instant rides."));
        setLoading(false);
        return;
      }

      const ordersRef = ref(db, 'orders');
      const newOrderRef = push(ordersRef);
      
      const msgTime = bookingDetails.time || formatTimeFromParts(bookingDetails.hour, bookingDetails.minute, bookingDetails.ampm);
      const isFreeTrade = ['marriage hall', 'catering'].includes(selectedTradeForBooking.toLowerCase().trim());
      const finalOfferedAmount = isFreeTrade
        ? 0 
        : (Number(bookingDetails.offeredAmount) || worker.rates?.fullDay || worker.rates?.quickVisit || 0);

      const feeRate = calculatePlatformFeePercentage(selectedTradeForBooking);

      const orderData = {
        userId: user.uid,
        userName: profile?.name || user.displayName || t('User'),
        userPhone: profile?.phone || user.phoneNumber || '',
        userAddress: profile?.address || '',
        doorNo: '',
        street: '',
        landmark: profile?.landmark || '',
        city: profile?.city || '',
        workerId: worker.uid,
        workerName: worker.name,
        workerPhone: worker.phone || '',
        workerEmail: worker.email || '',
        trade: selectedTradeForBooking || worker.trade || t('General Service'),
        rate: finalOfferedAmount,
        status: 'pending',
        issue: selectedTradeForBooking === 'Catering' 
          ? `${bookingDetails.issue}\n(${t('Guest Count')}: ${bookingDetails.guestCount})`
          : bookingDetails.issue,
        workAddress: isTransport
          ? `${bookingDetails.workAddress}\n(${t('Pickup')}: ${bookingDetails.pickupPoint})`
          : ['House Rent', 'Shop Rent'].includes(selectedTradeForBooking)
            ? bookingDetails.jobInfo
            : bookingDetails.workAddress,
        preferredTime: msgTime,
        bookingDate: bookingDetails.date,
        duration: bookingDetails.duration,
        offeredAmount: finalOfferedAmount,
        timestamp: new Date().toISOString(),
        createdAt: Date.now(),
        commissionPaid: false,
        commissionAmount: Number((finalOfferedAmount * feeRate).toFixed(2)),
        platformFee: Number((finalOfferedAmount * feeRate).toFixed(2)),
        sourceLat: bookingDetails.sourceLat,
        sourceLng: bookingDetails.sourceLng,
        destLat: bookingDetails.destLat,
        destLng: bookingDetails.destLng
      };

      await set(newOrderRef, { ...orderData, id: newOrderRef.key });

      let notifiedCount = 0;

      if (worker.fcmToken) {
        notifiedCount = 1;
        let notificationBody = `Job: ${selectedTradeForBooking}\nAmount: ₹${finalOfferedAmount}\nIssue: ${bookingDetails.issue}\nPlace: ${bookingDetails.workAddress}`;
        
        if (isTransport) {
          notificationBody = `Job: ${selectedTradeForBooking}\nStart: ${bookingDetails.pickupPoint}\nEnd: ${bookingDetails.workAddress}\nPickup: ${bookingDetails.issue}\nDate: ${bookingDetails.date}`;
        } else if (selectedTradeForBooking === 'JCB') {
          notificationBody = `Job: ${selectedTradeForBooking}\nPlace: ${bookingDetails.workAddress}\nPurpose: ${bookingDetails.issue}\nDate: ${bookingDetails.date}`;
        } else if (selectedTradeForBooking === 'Coconut Plucker') {
          notificationBody = `Job: ${selectedTradeForBooking}\nPlace: ${bookingDetails.workAddress}\nTrees: ${bookingDetails.issue}\nDate: ${bookingDetails.date}`;
        } else if (selectedTradeForBooking === 'House Rent') {
          notificationBody = `Job: ${selectedTradeForBooking}\nType: ${bookingDetails.issue}\nJob: ${bookingDetails.jobInfo}\nDate: ${bookingDetails.date}`;
        } else if (selectedTradeForBooking === 'Shop Rent') {
          notificationBody = `Job: ${selectedTradeForBooking}\nType: ${bookingDetails.issue}\nPrev: ${bookingDetails.jobInfo}\nDate: ${bookingDetails.date}`;
        } else if (selectedTradeForBooking === 'Catering') {
          notificationBody = `Job: ${selectedTradeForBooking}\nKind: ${bookingDetails.issue}\nPlace: ${bookingDetails.workAddress}\nDate: ${bookingDetails.date}`;
        } else if (selectedTradeForBooking === 'Marriage Hall') {
          notificationBody = `Job: ${selectedTradeForBooking}\nKind: ${bookingDetails.issue}\nDate: ${bookingDetails.date}`;
        }

        await FCMService.sendPushNotification(
          worker.fcmToken,
          `New Service Booking! 🛠️ / புதிய சேவை முன்பதிவு! 🛠️`,
          notificationBody,
          {
            orderId: newOrderRef.key || '',
            path: '/worker',
            type: 'booking_request'
          }
        );
      }

      alert(`${t('Booked')} ${worker.name}! (${t('Notification sent to')} ${notifiedCount} ${t('worker')})`);
      handleOpenBooking(false);
      navigate('/orders');
    } catch (error) {
      console.error('Booking error:', error);
      alert(t("Error booking worker."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header Image/Cover - increased height to show more image */}
      <div 
        className="h-80 bg-slate-900 relative cursor-zoom-in overflow-hidden shadow-xl"
        onClick={() => {
          if (worker.photoURL) {
            handleSetPreviewImage({ src: worker.photoURL, alt: worker.name });
          }
        }}
      >
        {worker.photoURL ? (
          <img src={worker.photoURL} alt={worker.name} className="w-full h-full object-cover opacity-90" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full bg-[#2d3446] relative overflow-hidden flex items-center justify-center">
            {/* Low-poly geometric background elements */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] bg-[#4a5568] rotate-[15deg] skew-x-[-10deg]" />
              <div className="absolute top-[10%] right-[-5%] w-[35%] h-[50%] bg-[#3a445a] rotate-[-20deg] skew-y-[5deg]" />
              <div className="absolute bottom-[-15%] left-[20%] w-[50%] h-[40%] bg-[#4a5568] rotate-[5deg] skew-x-[20deg]" />
              <div className="absolute top-[30%] left-[40%] w-[20%] h-[30%] bg-[#5a677c] rotate-[45deg]" />
            </div>
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#2d3446] via-transparent to-transparent opacity-60" />
            <UserCircle size={120} className="text-white/20 relative z-10" />
          </div>
        )}
        
        {/* Fixed Back Button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onBack();
          }}
          className="absolute top-[calc(1.5rem+env(safe-area-inset-top,0px))] left-6 w-10 h-10 bg-white/90 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg text-slate-900 z-20"
        >
          <ChevronLeft size={24} />
        </button>
      </div>

      {/* Content Container */}
      <div className="flex-1 px-6 -mt-12 rounded-t-[3rem] pb-10 relative z-10 bg-white">
        {/* Stats Bubbles - Outside the card, overlapping at the top */}
        <div className="flex justify-between items-center -mt-10 px-4 mb-6 relative z-30">
          {/* Experience Circle */}
          <div className="w-20 h-20 bg-white rounded-full shadow-[0_8px_20px_-4px_rgba(0,0,0,0.1)] flex flex-col items-center justify-center border-4 border-emerald-50 text-center p-2">
            <span className="text-[14px] font-bold text-slate-900 leading-tight">{worker.experience || '0'}</span>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{t('Years Exp')}</span>
          </div>

          {/* Verification Circle */}
          <div
            className={cn(
              "w-24 h-24 rounded-full shadow-[0_8px_25px_-4px_rgba(0,0,0,0.15)] flex flex-col items-center justify-center border-4 transform scale-110",
              worker.verificationStatus === 'approved' ? "bg-emerald-500 border-white text-white" : 
              worker.verificationStatus === 'rejected' ? "bg-red-500 border-white text-white" : 
              "bg-amber-500 border-white text-white"
            )}
            style={{
              backgroundColor:
                worker.verificationStatus === 'approved' ? '#10b981' :
                worker.verificationStatus === 'rejected' ? '#ef4444' :
                '#f59e0b',
              color: '#ffffff',
              borderColor: '#ffffff'
            }}
          >
            {worker.verificationStatus === 'approved' ? <ShieldCheck size={24} /> : 
             worker.verificationStatus === 'rejected' ? <ShieldX size={24} /> : 
             <ShieldAlert size={24} />}
            <span className="text-[9px] font-bold uppercase mt-1 tracking-widest">
              {t(worker.verificationStatus === 'approved' ? 'Verified' : worker.verificationStatus === 'rejected' ? 'Rejected' : 'Unverified')}
            </span>
          </div>

          {/* Jobs Completed Circle */}
          <div className="w-20 h-20 bg-white rounded-full shadow-[0_8px_20px_-4px_rgba(0,0,0,0.1)] flex flex-col items-center justify-center border-4 border-blue-50 text-center p-2">
            <span className="text-[14px] font-bold text-blue-600 leading-tight">{worker.totalJobs || 0}</span>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{t('Jobs Done')}</span>
          </div>
        </div>

        {/* The Main Card */}
        <div className="bg-blue-50/30 p-6 rounded-[2.5rem] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border-2 border-amber-400/50 mb-8 relative z-10">
          <div className="space-y-4">
            {/* Row 1: Name and Rating 👋 */}
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-slate-900 break-all leading-tight">{worker.name} 👋</h1>
              </div>
              <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-3 py-1 rounded-full font-bold text-sm shrink-0 border border-amber-100">
                <Star size={14} className="fill-amber-600" />
                <span>{worker.rating ? worker.rating.toFixed(1) : '0.0'}</span>
              </div>
            </div>

            {/* Row 2: Worker Available/Busy */}
            <div className="flex">
              <div
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-widest",
                  worker.isAvailable ? "bg-emerald-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)]" : "bg-red-500 text-white shadow-[0_4px_12px_rgba(239,68,68,0.3)]"
                )}
                style={{
                  backgroundColor: worker.isAvailable ? '#10b981' : '#ef4444',
                  color: '#ffffff'
                }}
              >
                <span className={cn("w-2 h-2 rounded-full", worker.isAvailable ? "bg-white animate-pulse" : "bg-white/50")} />
                {worker.isAvailable ? t('Worker Available') : t('Worker Busy')}
              </div>
            </div>

            {/* Row 3: Service Type */}
            <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
              <Briefcase size={16} />
              <span className="break-all uppercase tracking-wide">{t(worker.trade || 'General Service')}</span>
            </div>

            {/* Row 4: Time */}
            {worker.workingHours && (
              <div className="flex items-center gap-2 text-slate-600 font-bold text-xs bg-white/80 p-2 rounded-xl border border-slate-100/50 self-start inline-flex">
                <Clock size={16} className="text-blue-500" />
                <span>{worker.workingHours}</span>
              </div>
            )}

            {/* Row 5: Address */}
            <div className="flex items-start gap-2 pt-2 border-t border-slate-200/50">
              <MapPin size={18} className="text-blue-600 mt-0.5 shrink-0" />
              <span className="text-slate-700 text-xs font-bold break-all leading-snug flex-1">
                {worker.address || worker.location || t('No address provided')}
              </span>
            </div>

            {/* Row 6: Landmark & City */}
            {(worker.landmark || worker.city) && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                {worker.landmark && (
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[12px] font-bold text-slate-500 tracking-normal">{t('Landmark')}</span>
                    <span className="text-xs font-bold text-slate-700 break-all leading-tight">{worker.landmark}</span>
                  </div>
                )}
                {worker.city && (
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[12px] font-bold text-slate-500 tracking-normal">{t('City')}</span>
                    <span className="text-xs font-bold text-slate-700 break-all leading-tight uppercase">{worker.city}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Professional Bio */}
        {worker.bio && (
          <div className="mb-8 relative z-10 px-2">
            <h3 className="text-[13px] font-bold text-slate-500 tracking-normal mb-3 ml-1">{t('Professional Bio')}</h3>
            <div className="bg-blue-50/20 p-6 rounded-[2.5rem] border-2 border-amber-400/50 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-5">
                 <Briefcase size={80} />
               </div>
               <p className="text-slate-600 text-[13px] leading-relaxed italic break-all relative z-10 font-bold">
                 "{worker.bio}"
               </p>
            </div>
          </div>
        )}

        {/* Service Rate Section */}
        <div className="space-y-6 relative z-10 px-2">
           <h3 className="text-[13px] font-bold text-slate-500 tracking-normal mb-3 ml-1">{t('Service Rates')}</h3>
           <div className="bg-white p-6 rounded-[2.5rem] border-2 border-amber-400/50 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div className="flex flex-col">
                <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">{t(worker.trade || 'Service')}</h3>
                {worker.trades && worker.trades[worker.trade || ''] && (
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                      <Star size={12} className="fill-amber-500" />
                      {worker.trades[worker.trade || ''].rating ? worker.trades[worker.trade || ''].rating.toFixed(1) : '0.0'}
                    </div>
                  </div>
                )}
              </div>
              <button 
                onClick={() => {
                  if (hasOverdueFees) {
                    alert(t("Please pay overdue cancellation fees in your profile before booking."));
                    return;
                  }
                  openBookingModal(worker.trade || 'Service');
                }}
                disabled={hasOverdueFees}
                className={cn(
                  "btn-primary text-[10px] font-bold py-2.5 px-6 rounded-2xl uppercase tracking-widest shadow-blue-200",
                  hasOverdueFees && "opacity-50 grayscale cursor-not-allowed"
                )}
              >
                {t('Quick Book')}
              </button>
            </div>
            
            <div className="space-y-3">
              {getTradeRates(worker.trade || 'Service', worker.rates).map((tier) => (
                <div key={tier.id} className="flex justify-between items-center bg-slate-50/50 p-4 rounded-2xl border border-transparent hover:border-blue-100 transition-colors">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">{tier.label}</span>
                  <span className="font-bold text-slate-900 text-sm">{formatCurrency(tier.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>



      {/* Booking Modal */}
      <AnimatePresence>
        {isBooking && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[60] flex items-end justify-center px-4 pb-4"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-md rounded-[3rem] p-8 max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-4">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">{t('Book Service')}</h2>
                <button type="button" onClick={() => handleOpenBooking(false)} className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleBooking} className="space-y-6">
                    {/* Issue Description / Purpose of Travel */}
                    {/* Hide Goal for Transport */}
                    {!['Auto', 'Tempo', 'Van', 'Car'].includes(selectedTradeForBooking) && (
                      <div className="space-y-4">
                        <label className="text-xs font-bold text-slate-500 mb-3 block">
                          {selectedTradeForBooking === 'JCB'
                            ? t('Purpose of Work')
                            : selectedTradeForBooking === 'Shop Rent'
                              ? t('Type of Shop')
                              : selectedTradeForBooking === 'House Rent'
                                ? t('Type of Family')
                                : selectedTradeForBooking === 'Coconut Plucker'
                                  ? t('Number of trees (approximately)')
                                  : ['Marriage Hall', 'Catering'].includes(selectedTradeForBooking)
                                    ? t('What kind of function')
                                    : t('Describe the Issue')}
                        </label>
                        <textarea
                          className="input-field min-h-[120px] resize-none font-semibold text-sm bg-slate-50 border-transparent focus:bg-white transition-all rounded-[1.5rem]"
                          placeholder={selectedTradeForBooking === 'JCB'
                            ? t('E.g. Digging for foundation...')
                            : selectedTradeForBooking === 'Shop Rent'
                              ? t('E.g. Grocery Shop...')
                              : selectedTradeForBooking === 'House Rent'
                                ? t('Kids, Adults, Vegetarians...')
                                : selectedTradeForBooking === 'Coconut Plucker'
                                  ? t('E.g. 5 trees...')
                                  : ['Marriage Hall', 'Catering'].includes(selectedTradeForBooking)
                                    ? t('E.g. Wedding, Birthday, Corporate Event...')
                                    : t('E.g. Broken pipe in bathroom...')}
                          value={bookingDetails.issue}
                          onChange={(e) => setBookingDetails({...bookingDetails, issue: e.target.value})}
                          required={selectedTradeForBooking !== 'Marriage Hall'}
                        />
                      </div>
                    )}

                    {/* Job Info for Rent */}
                    {['House Rent', 'Shop Rent'].includes(selectedTradeForBooking) && (
                      <div className="mt-4">
                        <label className="text-xs font-bold text-slate-500 mb-3 block">
                          {selectedTradeForBooking === 'House Rent' ? t('Current Job') : t('Previous job/work')}
                        </label>
                        <input
                          type="text"
                          placeholder={selectedTradeForBooking === 'House Rent' ? t('E.g. Software Engineer, Teacher...') : t('E.g. Textile, Hardware Store...')}
                          value={bookingDetails.jobInfo}
                          onChange={(e) => setBookingDetails({...bookingDetails, jobInfo: e.target.value})}
                          required
                          className="input-field font-semibold bg-slate-50 border-transparent rounded-[1.5rem]"
                        />
                      </div>
                    )}

                    {/* Place of Work / Travel Source / Guest Count */}
                    {['House Rent', 'Shop Rent'].includes(selectedTradeForBooking) ? (
                      <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200">
                        <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">📋 {t('Important Note')}</p>
                        <p className="text-sm text-amber-800 font-semibold leading-relaxed">
                          இந்த சேவையை நீங்கள் பதிவு செய்யும்போது, உரிமையாளர் உங்கள் கோரிக்கையை ஏற்றால், முன்பணம் (Advance) மற்றும் மாத வாடகை (Monthly Rent) இரண்டையும் Cash அல்லது UPI மூலம் நேரடியாக உரிமையாளருக்கே செலுத்த ஒப்புக்கொள்ள வேண்டும். இந்த பணம் app மூலம் செலுத்தப்படாது.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Source Selection - For Auto/Transport */}
                        {['Auto', 'Tempo', 'Van', 'Car'].includes(selectedTradeForBooking) && (
                          <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100/50 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                              <label className="text-xs font-black text-blue-600 uppercase tracking-[0.2em]">{t('Source (Pickup Location)')}</label>
                              <button 
                                type="button"
                                onClick={() => setActivePicker('source')}
                                className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-md border border-blue-50 hover:bg-blue-50 active:scale-95 transition-all"
                              >
                                <MapPin size={14} className="animate-bounce" />
                                {t('Pin Point on Map')}
                              </button>
                            </div>
                            <textarea 
                              className="w-full p-4 bg-white/60 rounded-2xl border border-blue-50/50 text-sm font-bold text-slate-700 leading-tight resize-none focus:bg-white focus:border-blue-400 outline-none transition-all"
                              placeholder={t('Enter start point Or select on map...')}
                              value={bookingDetails.pickupPoint}
                              onChange={(e) => setBookingDetails({...bookingDetails, pickupPoint: e.target.value})}
                              rows={2}
                            />
                          </div>
                        )}

                        {/* Destination Selection - For Auto/Transport */}
                        {['Auto', 'Tempo', 'Van', 'Car'].includes(selectedTradeForBooking) && (
                          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                              <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">{t('Destination (Drop Location)')}</label>
                              <button 
                                type="button"
                                onClick={() => setActivePicker('dest')}
                                className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-md border border-slate-100 hover:bg-slate-50 active:scale-95 transition-all"
                              >
                                <MapPin size={14} />
                                {t('Pin Point on Map')}
                              </button>
                            </div>
                            <textarea 
                              className="w-full p-4 bg-white/60 rounded-2xl border border-slate-100/50 text-sm font-bold text-slate-700 leading-tight resize-none focus:bg-white focus:border-slate-300 outline-none transition-all"
                              placeholder={t('Enter destination Or select on map...')}
                              value={bookingDetails.workAddress}
                              onChange={(e) => setBookingDetails({...bookingDetails, workAddress: e.target.value})}
                              rows={2}
                            />
                          </div>
                        )}

                        {/* Large Pickup Point Detail Box (Replacement for Purpose) */}
                        {['Auto', 'Tempo', 'Van', 'Car', 'Rentals'].includes((selectedTradeForBooking || '').trim()) && (
                          <div className="bg-blue-50/30 p-6 rounded-[2rem] border border-blue-100/30">
                            <div className="flex justify-between items-center mb-4">
                               <label className="text-xs font-black text-blue-700 uppercase tracking-[0.2em] drop-shadow-sm">{t('Pickup Point (Exact Spot)')}</label>
                              <button 
                                type="button"
                                onClick={() => setActivePicker('pickup')}
                                className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-md border border-blue-50 hover:bg-blue-50 active:scale-95 transition-all"
                              >
                                <MapPin size={14} className="animate-pulse" />
                                {t('Use Map')}
                              </button>
                            </div>
                            <textarea
                              className="input-field min-h-[120px] resize-none font-bold text-[13px] bg-white border-blue-100 focus:border-blue-500 transition-all rounded-[1.5rem] shadow-inner leading-relaxed text-slate-700"
                              placeholder={t('E.g. Near Arumbakkam Metro Gate No 2, standing in front of the bakery...')}
                              value={bookingDetails.issue} // Using issue field as the "detailed pickup box"
                              onChange={(e) => setBookingDetails({...bookingDetails, issue: e.target.value})}
                              required
                            />
                          </div>
                        )}

                        {/* Non-Transport Address Field */}
                        {!['Auto', 'Tempo', 'Van', 'Car'].includes(selectedTradeForBooking) && (
                          <div>
                            <div className="flex justify-between items-center mb-3">
                              <label className="text-xs font-bold text-slate-500">
                                {selectedTradeForBooking === 'Marriage Hall'
                                    ? t('Expected Guest Count')
                                    : t('Place of Work')}
                              </label>
                            </div>
                            <textarea
                              className="input-field min-h-[120px] resize-none font-semibold text-sm bg-slate-50 border-transparent focus:bg-white transition-all rounded-[1.5rem]"
                              placeholder={selectedTradeForBooking === 'Marriage Hall'
                                  ? t('E.g. 500 Guests...')
                                  : t('Enter work address...')}
                              value={bookingDetails.workAddress}
                              onChange={(e) => setBookingDetails({...bookingDetails, workAddress: e.target.value})}
                              required={selectedTradeForBooking !== 'Marriage Hall'}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Guest Count for Catering */}
                    {selectedTradeForBooking === 'Catering' && (
                      <div>
                        <label className="text-xs font-bold text-slate-500 mb-3 block">{t('Expected Guest Count')}</label>
                        <input 
                          type="number"
                          className="input-field font-semibold bg-slate-50 border-transparent rounded-[1.5rem]"
                          placeholder={t('E.g. 200 Guests...')}
                          value={bookingDetails.guestCount}
                          onChange={(e) => setBookingDetails({...bookingDetails, guestCount: e.target.value})}
                          required
                        />
                      </div>
                    )}

                    {/* Date Selection */}
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-3 block">{['House Rent', 'Shop Rent'].includes(selectedTradeForBooking) ? t('Date of Joining') : t('Date Selection')}</label>
                      <input 
                        type="date"
                        className="input-field font-semibold bg-slate-50 border-transparent rounded-[1.5rem]"
                        value={bookingDetails.date}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setBookingDetails({...bookingDetails, date: e.target.value})}
                        required
                      />
                    </div>

                    {/* Estimate Section for Transport */}
                    {['Auto', 'Tempo', 'Van', 'Car'].includes(selectedTradeForBooking) && bookingDetails.sourceLat && bookingDetails.destLat && (
                      <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex items-center justify-between shadow-sm animate-in fade-in zoom-in duration-300">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{t('Estimated Distance')}</span>
                          <p className="text-lg font-black text-emerald-700">
                            {getDistance(bookingDetails.sourceLat, bookingDetails.sourceLng, bookingDetails.destLat, bookingDetails.destLng).toFixed(2)} KM
                          </p>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{t('Approx. Fare')}</span>
                          <p className="text-lg font-black text-emerald-700">
                            ₹{(25 + (getDistance(bookingDetails.sourceLat, bookingDetails.sourceLng, bookingDetails.destLat, bookingDetails.destLng) * (worker.rates?.ratePerKm || 15))).toFixed(0)}*
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Time Selection - Hidden for rentals */}
                    {!['House Rent', 'Shop Rent', 'Marriage Hall', 'Catering'].includes(selectedTradeForBooking) && (
                      <div>
                        <label className="text-xs font-bold text-slate-500 mb-3 block">{t('Time Selection')}</label>
                        <div className="flex gap-2">
                          <select 
                            className="input-field flex-1 font-semibold bg-slate-50 border-transparent rounded-[1.5rem]" 
                            value={bookingDetails.hour}
                            onChange={(e) => {
                              const newHr = e.target.value;
                              setBookingDetails({...bookingDetails, hour: newHr, time: formatTimeFromParts(newHr, bookingDetails.minute, bookingDetails.ampm)});
                            }}
                          >
                            {['01','02','03','04','05','06','07','08','09','10','11','12'].map(h => <option key={h} value={h}>{h}</option>)}
                          </select>

                          <select 
                            className="input-field flex-1 font-semibold bg-slate-50 border-transparent rounded-[1.5rem]" 
                            value={bookingDetails.minute}
                            onChange={(e) => {
                              const newMin = e.target.value;
                              setBookingDetails({...bookingDetails, minute: newMin, time: formatTimeFromParts(bookingDetails.hour, newMin, bookingDetails.ampm)});
                            }}
                          >
                            {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
                          </select>

                          <select 
                            className="input-field flex-1 font-semibold bg-slate-50 border-transparent rounded-[1.5rem]" 
                            value={bookingDetails.ampm}
                            onChange={(e) => {
                              const newAmPm = e.target.value;
                              setBookingDetails({...bookingDetails, ampm: newAmPm, time: formatTimeFromParts(bookingDetails.hour, bookingDetails.minute, newAmPm)});
                            }}
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Booking Type */}
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-3 block">
                        {['Auto', 'Tempo', 'Van', 'JCB', 'Car', 'House Rent', 'Shop Rent', 'Marriage Hall', 'Catering', 'Coconut Plucker'].includes(selectedTradeForBooking) ? t('Booking Type') : t('Duration Selection')}
                      </label>
                      
                      {['House Rent', 'Shop Rent'].includes(selectedTradeForBooking) ? (
                        <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-center border-2 border-blue-600/20 shadow-sm">
                           <span className="text-blue-600 font-bold text-sm tracking-wide">{t('Monthly Rental Plan')}</span>
                        </div>
                      ) : ['Marriage Hall', 'Catering'].includes(selectedTradeForBooking) ? (
                        <div className="bg-emerald-50 p-4 rounded-2xl flex items-center justify-center border-2 border-emerald-500/20 shadow-sm">
                           <span className="text-emerald-600 font-bold text-sm tracking-wide">{t('Free Booking (No Fee)')}</span>
                        </div>
                      ) : (
                        <div className="flex gap-2 flex-wrap pb-2">
                          {getTradeRates(selectedTradeForBooking, worker.rates).map((tier) => (
                            <button
                              key={tier.id}
                              type="button"
                              onClick={() => {
                                setBookingDetails({
                                  ...bookingDetails, 
                                  duration: tier.label,
                                  offeredAmount: String(tier.value).replace(/\D/g, '')
                                });
                              }}
                              className={cn(
                                "flex-1 min-w-[124px] py-4 px-3 rounded-2xl text-[11px] font-bold border-2 transition-all leading-snug text-center tracking-tight",
                                bookingDetails.duration === tier.label ? "border-blue-600 bg-blue-50 text-blue-600 shadow-lg shadow-blue-100" : "border-slate-50 bg-slate-50/50 text-slate-400"
                              )}
                            >
                              {tier.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Transport, JCB & Coconut Plucker Instructions */}
                      {['Auto', 'Tempo', 'Van', 'Car', 'JCB', 'Coconut Plucker'].includes(selectedTradeForBooking) && (
                        <motion.div 
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 p-4 rounded-2xl bg-blue-50 border border-blue-100 shadow-sm"
                        >
                          <p className="text-[13px] font-bold text-blue-700 leading-relaxed italic">
                            {bookingDetails.duration === t('Rate per KM') 
                              ? "இது ஒரு கிலோமீட்டர்க்கான பணம் .நீங்கள் எத்தனை கிலோமீட்டர் செல்கிறீர்களோ அவ்வளவு உங்களிடம் இருந்து வசூலிக்கப்படும்."
                              : bookingDetails.duration === t('Rate per Hour')
                                ? selectedTradeForBooking === 'JCB'
                                  ? "இது ஒரு மணி நேர கட்டணம் ஆகும், மற்றும் மணிநேரங்கள் அதிகரித்தால் கட்டணம் அதிகரிக்கும்."
                                  : "1 மணி நேரத்திற்கான பணம். நீங்கள் எவ்வளவு மணி நேரம் பயணம் செய்தீர்களோ அதற்கேற்ப உங்கள் இடம் இருந்து பணம் வசூலிக்கப்படும்."
                                : bookingDetails.duration === t('Base Rate')
                                  ? "சிறிது தூரம் செல்வதற்கு இந்த பணம் வசூலிக்கப்படும்."
                                  : bookingDetails.duration === t('Rate per Tree')
                                    ? selectedTradeForBooking === 'Coconut Plucker'
                                      ? "இது ஒரு மரம் ஏறுவதற்கான பணம் .மரங்களை பொறுத்து மொத்த பணம் கூடும்"
                                      : "இது ஒரு மரத்திற்கான பணம் .எத்தனை மரம் ஏறுகிறார்களோ அவ்வளவு பணம் நீங்கள் கொடுக்க வேண்டியிருக்கும்."
                                    : ""}
                          </p>
                        </motion.div>
                      )}
                    </div>

                    {/* Service Fee Display (Fixed) */}
                    <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100 mb-4 transition-all duration-300">
                      <label className="text-xs font-bold text-blue-600 mb-3 block text-center uppercase tracking-widest">
                        {['Marriage Hall', 'Catering'].includes(selectedTradeForBooking)
                            ? t('No Booking Fee')
                            : t('Service Fee (₹)')}
                      </label>
                      <div className="w-full text-center text-3xl font-black text-blue-900 flex items-center justify-center gap-1">
                        <span className="text-xl font-bold text-blue-400 mt-1">₹</span>
                        {bookingDetails.offeredAmount || '0'}
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold text-center mt-2 uppercase tracking-tight opacity-70">
                         {t('Fixed price based on service')}
                      </p>
                    </div>

                    {hasOverdueFees && (
                      <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-start gap-3">
                        <ShieldAlert size={18} className="text-red-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-red-600 font-bold leading-tight">
                          {t('Your account has overdue cancellation fees. Please pay them in your profile to enable new bookings.')}
                        </p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || hasOverdueFees}
                      className={cn(
                        "btn-primary w-full flex items-center justify-center gap-3 py-5 rounded-[2.5rem] shadow-xl shadow-blue-200",
                        hasOverdueFees && "opacity-50 grayscale cursor-not-allowed"
                      )}
                    >
                      {loading ? (
                        <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <MessageCircle size={24} strokeWidth={2.5} />
                          <span className="font-bold uppercase tracking-[0.1em] text-[15px]">{t('Send Request')}</span>
                        </>
                      )}
                    </button>
                  </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <FullScreenImage
        src={previewImage?.src || ''}
        alt={previewImage?.alt}
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
      />

      <LocationPicker
        isOpen={!!activePicker}
        onClose={() => setActivePicker(null)}
        title={activePicker === 'source' ? t('Select Pickup Point') : activePicker === 'dest' ? t('Select Destination') : t('Select Detailed Pin')}
        initialLocation={
          activePicker === 'source' 
            ? (bookingDetails.sourceLat ? { lat: bookingDetails.sourceLat, lng: bookingDetails.sourceLng! } : (profile?.latitude ? { lat: profile.latitude, lng: profile.longitude! } : null))
            : activePicker === 'dest'
              ? (bookingDetails.destLat ? { lat: bookingDetails.destLat, lng: bookingDetails.destLng! } : null)
              : null // 'pickup' doesn't strictly need a starting pin, but defaults to current location anyway in picker
        }
        onSelect={(lat, lng, addr) => {
          if (activePicker === 'source') {
            setBookingDetails({
              ...bookingDetails,
              sourceLat: lat,
              sourceLng: lng,
              pickupPoint: addr
            });
          } else if (activePicker === 'dest') {
            setBookingDetails({
              ...bookingDetails,
              destLat: lat,
              destLng: lng,
              workAddress: addr
            });
          } else if (activePicker === 'pickup') {
            // Append the actual mapped address explicitly into the text field so user can still add notes
            setBookingDetails({
              ...bookingDetails,
              issue: addr + "\n\n(Add any additional notes here...)"
            });
          }
        }}
      />
    </div>
  );
};
