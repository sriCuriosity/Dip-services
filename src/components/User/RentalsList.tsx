import React, { useState, useEffect } from 'react';
import { ref, onValue, get, update } from 'firebase/database';
import { db } from '@/src/lib/firebase';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { MapPin, Search, Star, Car, Truck, Home, Utensils, Building2, Store, ChevronRight, MessageSquare, ShieldCheck, ShieldAlert, Hammer, X, Calendar, Clock, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatCurrency, getDistance, calculatePlatformFeePercentage } from '@/src/lib/utils';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { WorkerDetail } from './WorkerDetail';
import { FullScreenImage } from '../Common/FullScreenImage';
import { AbstractGradientBackground } from '../Common/AbstractGradientBackground';
import { WorkerProfile as WorkerProfileType } from '@/src/types';
import { LocationPicker } from '../Common/LocationPicker';
import { push, set } from 'firebase/database';
import { FCMService } from '@/src/lib/fcmService';

const RENTAL_SERVICES = [
  { id: 'Auto', icon: Car, image: '/assets/categories/auto.jpg' },
  { id: 'Tempo', icon: Truck, image: '/assets/categories/tempo.jpg' },
  { id: 'Van', icon: Truck, image: '/assets/categories/van.jpg' },
  { id: 'Car', icon: Car, image: '/assets/categories/car.jpg' },
  { id: 'JCB', icon: Truck, image: '/assets/categories/JCB.jpg' },
  { id: 'House Rent', icon: Home, image: '/assets/categories/house rent.jpg' },
  { id: 'Shop Rent', icon: Store, image: '/assets/categories/shop rent.jpg' },
  { id: 'Marriage Hall', icon: Building2, image: '/assets/categories/marriage hall.jpg' },
  { id: 'Catering', icon: Utensils, image: '/assets/categories/catering.jpg' },
];

const RENTAL_COLORS: Record<string, string> = {
  'Auto': 'bg-sky-100 text-sky-600 border-sky-200',
  'Tempo': 'bg-slate-100 text-slate-600 border-slate-200',
  'Van': 'bg-indigo-100 text-indigo-600 border-indigo-200',
  'Car': 'bg-cyan-100 text-cyan-600 border-cyan-200',
  'JCB': 'bg-amber-100 text-amber-600 border-amber-200',
  'House Rent': 'bg-lime-100 text-lime-600 border-lime-200',
  'Shop Rent': 'bg-teal-100 text-teal-600 border-teal-200',
  'Marriage Hall': 'bg-fuchsia-100 text-fuchsia-600 border-fuchsia-200',
  'Catering': 'bg-pink-100 text-pink-600 border-pink-200',
};

const RENTAL_TRADE_NAMES = RENTAL_SERVICES.map(s => s.id);

export const RentalsList: React.FC = () => {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { setIsChatOpen, unreadMessagesCount } = useOutletContext<{ setIsChatOpen: (open: boolean) => void, unreadMessagesCount: number }>();
  const [workers, setWorkers] = useState<WorkerProfileType[]>([]);
  const [filteredWorkers, setFilteredWorkers] = useState<WorkerProfileType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState<WorkerProfileType | null>(null);
  const [previewImage, setPreviewImage] = useState<{ src: string, alt: string } | null>(null);
  const [hasOverdueFees, setHasOverdueFees] = useState(false);
  const [isTransportBookingOpen, setIsTransportBookingOpen] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [activePicker, setActivePicker] = useState<'source' | 'dest' | null>(null);
  const [bookingDetails, setBookingDetails] = useState({
    trade: '',
    pickupPoint: '', // Source description
    workAddress: '', // Destination description
    issue: '',        // Pickup Point / Instructions
    date: new Date().toISOString().split('T')[0],
    hour: '09',
    minute: '00',
    ampm: 'AM',
    sourceLat: null as number | null,
    sourceLng: null as number | null,
    destLat: null as number | null,
    destLng: null as number | null,
    offeredAmount: '0'
  });

  useEffect(() => {
    setLoading(true);
    const workersRef = ref(db, 'workers');
    const usersRef = ref(db, 'users');

    const unsubscribeWorkers = onValue(workersRef, (workersSnap) => {
      onValue(usersRef, (usersSnap) => {
        const workersData = workersSnap.val() || {};
        const usersData = usersSnap.val() || {};

        const allWorkers = Object.entries(workersData).flatMap(([key, value]) => {
          const userData = usersData[key] || {};
          const val = value as any;
          
          if (val.trades && typeof val.trades === 'object') {
            return Object.entries(val.trades).map(([tradeName, tradeData]) => {
              const tData = tradeData as any;
              return {
                ...(val as any),
                ...tData,
                uid: key,
                trade: tradeName.trim(),
                name: userData.name || 'Unknown',
                phone: (val as any).phone || userData.phone || '',
                photoURL: tData.photoURL || userData.photoURL || '',
                city: tData.city || (val as any).city || userData.city || '',
                address: tData.address || (val as any).address || userData.address || '',
                latitude: tData.latitude || (val as any).latitude || userData.latitude || null,
                longitude: tData.longitude || (val as any).longitude || userData.longitude || null,
                deleted: userData.deleted || (val as any).deleted || false
              };
            });
          }
          
          return {
            ...(val as any),
            uid: key,
            name: userData.name || 'Unknown',
            phone: (val as any).phone || userData.phone || '',
            photoURL: userData.photoURL || '',
            city: (val as any).city || userData.city || '',
            address: (val as any).address || userData.address || '',
            deleted: userData.deleted || (val as any).deleted || false
          };
        });

        const rentalWorkers = allWorkers.filter(w => 
          !w.deleted && 
          typeof w.trade === 'string' && 
          w.trade.trim() !== '' && 
          RENTAL_TRADE_NAMES.includes(w.trade)
        );

        const unique = Array.from(new Map(rentalWorkers.map(item => [`${item.uid}-${item.trade}`, item])).values())
          .sort((a, b) => a.name.localeCompare(b.name));

        setWorkers(unique);
        setFilteredWorkers(unique);
        setLoading(false);
      }, { onlyOnce: false });
    }, { onlyOnce: false });

    // Check overdue fees separately (only once is fine for performance)
    if (profile) {
      get(ref(db, 'orders')).then(snapshot => {
        const ordersData = snapshot.val() || {};
        const now = Date.now();
        const hasFees = Object.values(ordersData).some((o: any) => 
          o.userId === profile.uid && 
          o.userCancellationFee && 
          !o.userCancellationPaid &&
          o.userCancellationDueDate &&
          o.userCancellationDueDate < now
        );
        setHasOverdueFees(hasFees);
      });
    }

    return () => {
      unsubscribeWorkers();
    };
  }, [profile]);

  useEffect(() => {
    let result = workers;

    if (selectedCategory) {
      result = result.filter(w => w.trade === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(w => 
        (w.name || '').toLowerCase().includes(query) || 
        (w.address || '').toLowerCase().includes(query) ||
        (w.trade || '').toLowerCase().includes(query) ||
        (w.city || '').toLowerCase().includes(query)
      );
    }

    setFilteredWorkers(result);
  }, [searchQuery, selectedCategory, workers]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const handlePopState = () => {
      // Restore selected worker from state if present
      if (window.history.state?.workerDetail && window.history.state?.worker) {
        setSelectedWorker(window.history.state.worker);
      } else if (!window.history.state?.workerDetail) {
        setSelectedWorker(null);
      }
      
      // Handle preview image separately if needed
      if (!window.history.state?.previewImage) {
        setPreviewImage(null);
      }
    };

    // Check initial state on mount to restore detail view
    if (window.history.state?.workerDetail && window.history.state?.worker) {
      setSelectedWorker(window.history.state.worker);
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleOpenTransportBooking = (trade: string) => {
    setBookingDetails({
      trade,
      pickupPoint: '',
      workAddress: '',
      issue: '',
      date: new Date().toISOString().split('T')[0],
      hour: '09',
      minute: '00',
      ampm: 'AM',
      sourceLat: null,
      sourceLng: null,
      destLat: null,
      destLng: null,
      offeredAmount: '0'
    });
    window.history.pushState({ transportBooking: true }, '');
    setIsTransportBookingOpen(true);
  };

  const handleBroadcastBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      alert(t("You must be logged in to book."));
      return;
    }

    if (!bookingDetails.sourceLat || !bookingDetails.destLat) {
      alert(t("Please select both Source and Destination on the map."));
      return;
    }

    setBookingLoading(true);
    try {
      const ordersRef = ref(db, 'orders');
      const newOrderRef = push(ordersRef);
      const orderId = newOrderRef.key;

      const msgTime = `${bookingDetails.hour}:${bookingDetails.minute} ${bookingDetails.ampm}`;
      const feeRate = calculatePlatformFeePercentage(bookingDetails.trade);
      
      const dist = getDistance(bookingDetails.sourceLat!, bookingDetails.sourceLng!, bookingDetails.destLat!, bookingDetails.destLng!);
      const estimatedFare = Number((25 + (dist * 15)).toFixed(0));

      const orderData = {
        id: orderId,
        userId: profile.uid,
        userName: profile.name || t('User'),
        userPhone: profile.phone || '',
        userAddress: profile.address || '',
        landmark: profile.landmark || '',
        city: profile.city || '',
        workerId: 'broadcast', // Mark as broadcast
        workerName: t('Broadcast Request'),
        trade: bookingDetails.trade,
        status: 'pending',
        issue: bookingDetails.issue, // Pickup Point particulars
        pickupPoint: bookingDetails.pickupPoint, // Source Name
        workAddress: bookingDetails.workAddress, // Destination Name
        sourceLat: bookingDetails.sourceLat,
        sourceLng: bookingDetails.sourceLng,
        destLat: bookingDetails.destLat,
        destLng: bookingDetails.destLng,
        preferredTime: msgTime,
        bookingDate: bookingDetails.date,
        offeredAmount: estimatedFare, // Using the estimate as the offered amount
        createdAt: Date.now(),
        timestamp: new Date().toISOString(),
        commissionPaid: false,
        platformFee: 0,
        commissionAmount: 0
      };

      // Find nearby workers
      const workersRef = ref(db, 'workers');
      const workersSnap = await get(workersRef);
      const workersData = workersSnap.val() || {};
      const workersToNotify: string[] = [];
      const tokensToNotify: string[] = [];
      const now = Date.now();
      const MAX_FRESHNESS = 30 * 60 * 1000; // 30 mins

      Object.entries(workersData).forEach(([uid, val]: [string, any]) => {
        if (val.isAvailable && val.trades && val.trades[bookingDetails.trade] && val.fcmToken) {
          const wLat = val.trades[bookingDetails.trade].latitude || val.latitude;
          const wLng = val.trades[bookingDetails.trade].longitude || val.longitude;
          const lastUpdate = val.lastLocationUpdate || 0;
          
          if (now - lastUpdate <= MAX_FRESHNESS && wLat && wLng) {
            const distance = getDistance(bookingDetails.sourceLat!, bookingDetails.sourceLng!, wLat, wLng);
            if (distance <= 25) {
              workersToNotify.push(uid);
              tokensToNotify.push(val.fcmToken);
            }
          } else if (val.city === profile.city) {
              // Fallback to city match if location not fresh but in same city
              workersToNotify.push(uid);
              tokensToNotify.push(val.fcmToken);
          }
        }
      });

      if (workersToNotify.length === 0) {
        alert(t("No available workers found within 25km. Try again later."));
        setBookingLoading(false);
        return;
      }

      await set(newOrderRef, { ...orderData, broadcastedTo: workersToNotify });

      // Send Notifications
      const notificationTitle = `Nearby ${bookingDetails.trade} Request! 🛺 ₹${estimatedFare}`;
      const notificationBody = `Amt: ₹${estimatedFare}\nFrom: ${bookingDetails.pickupPoint}\nTo: ${bookingDetails.workAddress}\nPickup: ${bookingDetails.issue}`;
      
      const uniqueTokens = Array.from(new Set(tokensToNotify));
      await Promise.all(uniqueTokens.map(token => 
        FCMService.sendPushNotification(token, notificationTitle, notificationBody, {
          orderId: orderId!,
          path: '/worker',
          type: 'booking_request'
        })
      ));

      alert(t("Booking request broadcasted to nearby workers!"));
      setIsTransportBookingOpen(false);
      navigate('/orders');
    } catch (err) {
      console.error("Broadcast booking failed:", err);
      alert(t("Failed to place booking."));
    } finally {
      setBookingLoading(false);
    }
  };

  const handleSetSelectedWorker = (worker: WorkerProfileType | null) => {
    if (worker) {
      window.history.pushState({ workerDetail: true, worker: worker }, '');
    }
    setSelectedWorker(worker);
  };

  const handleSetPreviewImage = (image: { src: string, alt: string } | null) => {
    if (image) {
      window.history.pushState({ previewImage: true }, '');
    }
    setPreviewImage(image);
  };

  if (selectedWorker) {
    return <WorkerDetail worker={selectedWorker} onBack={() => window.history.back()} hasOverdueFees={hasOverdueFees} />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="bg-[#242938] px-6 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-6 rounded-b-xl shadow-md relative overflow-hidden border-b-4 border-[#dce4f0]">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        
        <div className="flex justify-between items-center relative z-10 gap-x-4">
          <div className="flex flex-col justify-center min-w-0 flex-1">
            <h2 className="text-white text-[15px] font-semibold tracking-wide leading-tight break-words uppercase">{t('Rental & Transports')}</h2>
            <h1 className="text-white text-[28px] font-bold tracking-tight leading-tight mt-1 break-words line-clamp-2">{profile?.name || 'User'} 👋</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 relative bg-emerald-100/40 min-h-screen">
        <AbstractGradientBackground />
        
        {/* Banners */}
        <div className="py-4 relative z-10 w-full overflow-hidden">
          <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar px-6 pb-2 gap-4">
            {/* Banner 1: Transport */}
            <div className="snap-center shrink-0 w-full max-w-[calc(100vw-3rem)]">
              <div className="bg-[#1c1c1e] rounded-[1.5rem] p-5 flex items-center justify-between overflow-hidden relative shadow-lg min-h-[160px] w-full">
                <div className="absolute top-0 right-0 bottom-0 w-2/3 bg-gradient-to-l from-slate-700/50 to-transparent pointer-events-none" />
                <div className="absolute -right-2 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none">
                  <Car size={160} className="text-slate-400" strokeWidth={1} />
                </div>
                
                <div className="relative z-10 flex flex-col w-full h-full justify-between">
                  <div>
                    <div className="inline-flex mb-3 shadow-sm">
                      <span className="bg-white text-slate-900 text-[10px] font-bold px-3 py-1 rounded-full tracking-wide">
                        {t('Limited time!')}
                      </span>
                    </div>
                    
                    <h2 className="text-white text-lg font-bold mb-1 tracking-wide">
                      {t('Get Special Offer')}
                    </h2>
                    
                    <div className="flex items-baseline gap-1.5 mb-4">
                      <span className="text-white/90 text-[13px] font-medium">{t('Up to')}</span>
                      <div className="relative flex items-start">
                        <span className="text-white text-[42px] font-black leading-none tracking-tighter">40</span>
                        <span className="text-[#646cff] text-sm font-black mt-1.5 ml-0.5">%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-end justify-between w-full">
                    <p className="text-white/60 text-[8px] font-medium tracking-wide pb-1 max-w-[60%] leading-snug">
                      {t('All Transport Available | T&C Applied')}
                    </p>
                    <button className="bg-[#ff5722] text-white px-5 py-2 rounded-[0.8rem] font-bold text-xs shadow-lg shadow-orange-500/20 active:scale-95 transition-all">
                      {t('Claim')}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Banner 2: Properties (House/Shop) */}
            <div className="snap-center shrink-0 w-full max-w-[calc(100vw-3rem)]">
              <div className="bg-[#1c1c1e] rounded-[1.5rem] p-5 flex items-center justify-between overflow-hidden relative shadow-lg min-h-[160px] w-full">
                <div className="absolute top-0 right-0 bottom-0 w-2/3 bg-gradient-to-l from-sky-900/50 to-transparent pointer-events-none" />
                <div className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none">
                  <Home size={150} className="text-sky-400" strokeWidth={1} />
                </div>
                
                <div className="relative z-10 flex flex-col w-full h-full justify-between">
                  <div>
                    <div className="inline-flex mb-3 shadow-sm">
                      <span className="bg-sky-500 text-white text-[10px] font-bold px-3 py-1 rounded-full tracking-wide">
                        {t('Best Deals!')}
                      </span>
                    </div>
                    
                    <h2 className="text-white text-lg font-bold mb-1 tracking-wide">
                      {t('Rent Your Dream Home')}
                    </h2>
                    
                    <div className="flex items-baseline gap-1.5 mb-4">
                      <span className="text-white/90 text-[13px] font-medium">{t('Starting')}</span>
                      <div className="relative flex items-start">
                        <span className="text-white text-3xl font-black leading-none tracking-tighter mt-1">₹5K</span>
                        <span className="text-sky-400 text-xs font-black mt-1 ml-1">/mo</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-end justify-between w-full mt-2">
                    <p className="text-white/60 text-[8px] font-medium tracking-wide pb-1 max-w-[60%] leading-snug">
                      {t('House & Shop Rentals | Zero Brokerage')}
                    </p>
                    <button className="bg-sky-500 text-white px-5 py-2 rounded-[0.8rem] font-bold text-xs shadow-lg shadow-sky-500/20 active:scale-95 transition-all">
                      {t('Explore')}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Banner 3: Events (Marriage/Catering) */}
            <div className="snap-center shrink-0 w-full max-w-[calc(100vw-3rem)]">
              <div className="bg-[#1c1c1e] rounded-[1.5rem] p-5 flex items-center justify-between overflow-hidden relative shadow-lg min-h-[160px] w-full">
                <div className="absolute top-0 right-0 bottom-0 w-2/3 bg-gradient-to-l from-rose-900/50 to-transparent pointer-events-none" />
                <div className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none">
                  <Building2 size={150} className="text-rose-400" strokeWidth={1} />
                </div>
                
                <div className="relative z-10 flex flex-col w-full h-full justify-between">
                  <div>
                    <div className="inline-flex mb-3 shadow-sm">
                      <span className="bg-rose-500 text-white text-[10px] font-bold px-3 py-1 rounded-full tracking-wide">
                        {t('Free Booking!')}
                      </span>
                    </div>
                    
                    <h2 className="text-white text-lg font-bold mb-1 tracking-wide">
                      {t('Perfect Events')}
                    </h2>
                    
                    <p className="text-rose-100 text-[11px] font-medium max-w-[70%] leading-relaxed mt-2">
                      {t('Book top Marriage Halls & Catering services with zero upfront fees.')}
                    </p>
                  </div>
                  
                  <div className="flex items-end justify-between w-full mt-4">
                    <p className="text-white/60 text-[8px] font-medium tracking-wide pb-1 max-w-[60%] leading-snug">
                      {t('Top Rated Venues & Foods')}
                    </p>
                    <button className="bg-rose-500 text-white px-5 py-2 rounded-[0.8rem] font-bold text-xs shadow-lg shadow-rose-500/20 active:scale-95 transition-all">
                      {t('Book')}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Banner 4: Extra Rental Info */}
            <div className="snap-center shrink-0 w-full max-w-[calc(100vw-3rem)]">
              <div className="bg-[#1c1c1e] rounded-[1.5rem] p-5 flex items-center justify-between overflow-hidden relative shadow-lg min-h-[160px] w-full">
                <div className="absolute top-0 right-0 bottom-0 w-2/3 bg-gradient-to-l from-emerald-900/50 to-transparent pointer-events-none" />
                <div className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none">
                  <Truck size={150} className="text-emerald-400" strokeWidth={1} />
                </div>
                
                <div className="relative z-10 flex flex-col w-full h-full justify-between">
                  <div>
                    <div className="inline-flex mb-3 shadow-sm">
                      <span className="bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-full tracking-wide">
                        {t('Heavy Machinery')}
                      </span>
                    </div>
                    
                    <h2 className="text-white text-lg font-bold mb-1 tracking-wide">
                      {t('JCB & Commercial')}
                    </h2>
                    
                    <p className="text-white/80 text-[11px] font-medium max-w-[70%] leading-relaxed mt-2">
                      {t('Reliable machines for construction and transport.')}
                    </p>
                  </div>
                  
                  <div className="flex items-end justify-between w-full mt-4">
                    <p className="text-white/60 text-[8px] font-medium tracking-wide pb-1 max-w-[60%] leading-snug">
                      {t('Professional Operators')}
                    </p>
                    <button className="bg-emerald-500 text-white px-5 py-2 rounded-[0.8rem] font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                      {t('Check')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="px-6 py-4 relative z-10">
          <div className="flex items-center gap-2 mb-6">
            <div className="relative flex-[7] group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input
                type="text"
                placeholder={t('Search...')}
                className="w-full bg-white border border-slate-100 px-10 py-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 placeholder:text-slate-400 shadow-sm text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative flex-[3]">
              <select
                className="w-full appearance-none bg-white border border-slate-100 px-3 py-3.5 pr-8 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 text-[11px] font-bold truncate"
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
              >
                <option value="">{t('All')}</option>
                {RENTAL_SERVICES.map(cat => (
                  <option key={cat.id} value={cat.id}>{t(cat.id)}</option>
                ))}
              </select>
              <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" size={14} />
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">{t('Categories')}</h2>
          </div>

          <div className="flex overflow-x-auto no-scrollbar gap-2 pb-4 -mx-6 px-6">
            {RENTAL_SERVICES.map((service) => (
              <motion.button
                key={service.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (['Auto', 'Tempo', 'Van', 'Car'].includes(service.id)) {
                    handleOpenTransportBooking(service.id);
                  } else {
                    setSelectedCategory(service.id === selectedCategory ? null : service.id);
                  }
                }}
                className="flex flex-col items-center gap-1.5 flex-shrink-0"
              >
                <div className={cn(
                  "w-20 h-20 rounded-[1.8rem] flex items-center justify-center transition-all shadow-md border-2 overflow-hidden",
                  selectedCategory === service.id 
                    ? "bg-emerald-500 text-white border-emerald-500 shadow-emerald-200" 
                    : `${RENTAL_COLORS[service.id]} hover:border-slate-200`
                )}>
                  {service.image ? (
                    <img 
                      src={service.image} 
                      alt={t(service.id)} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <service.icon size={28} />
                  )}
                </div>
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-wider text-center w-20 px-0.5 break-words leading-[1.1] min-h-[2.2rem] flex items-center justify-center",
                  selectedCategory === service.id ? "text-emerald-600" : "text-slate-500"
                )}>
                  {t(service.id)}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Worker List */}
        <div className="px-6 pb-32 flex-1 relative z-10">
          <div className="flex justify-between items-center gap-4 mb-4">
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              {selectedCategory ? `${t('Workers in')} ${t(selectedCategory)} ${t('Near You')}` : t('Recommended Workers')}
            </h2>
            <button 
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "text-blue-600 text-sm font-semibold whitespace-nowrap flex-shrink-0 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/50 shadow-sm",
                !selectedCategory && "hidden"
              )}
            >
              {t('See All')}
            </button>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : filteredWorkers.length > 0 ? (
            <div className="space-y-4">
              {filteredWorkers.map((worker) => (
                <motion.div
                  key={`${worker.uid}-${worker.trade}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => handleSetSelectedWorker(worker)}
                  className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 flex items-start gap-4 cursor-pointer active:scale-[0.98] transition-all duration-300 relative overflow-hidden group"
                >
                  <div 
                    className="w-16 h-16 bg-slate-100 rounded-2xl overflow-hidden flex-shrink-0 mt-1 cursor-zoom-in relative z-10 shadow-sm border border-slate-200/50"
                    onClick={(e) => {
                      if (worker.photoURL) {
                        e.stopPropagation();
                        handleSetPreviewImage({ src: worker.photoURL, alt: worker.name });
                      }
                    }}
                  >
                    {worker.photoURL ? (
                      <img src={worker.photoURL} alt={worker.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-600">
                        <Hammer size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 relative z-10">
                    {/* Name and Rating Row */}
                    <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1.5 mb-1.5">
                      <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 break-words leading-snug text-sm">{worker.name}</h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="flex items-center gap-0.5 text-amber-500 text-[10px] font-bold">
                            <Star size={10} className="fill-amber-500" />
                            {(() => {
                              const tradeRating = worker.trades?.[worker.trade || '']?.rating;
                              const rating = tradeRating !== undefined ? tradeRating : worker.rating;
                              return rating ? rating.toFixed(1) : '0.0';
                            })()}
                          </div>
                          {worker.verificationStatus === 'approved' ? (
                            <ShieldCheck size={14} className="text-emerald-500" />
                          ) : (
                            <ShieldAlert size={14} className="text-red-500" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg flex-shrink-0 font-bold text-[9px] max-w-[75px]">
                        <MapPin size={9} className="shrink-0" />
                        <span className="break-all line-clamp-2">{worker.city || t('Unknown')}</span>
                      </div>
                    </div>

                    {/* Row 2: Type of trade */}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600 font-medium break-words pr-2 line-clamp-1">{t(worker.trade || 'Service')}</span>
                    </div>

                    {/* Row 3: Experience */}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 break-words">{worker.experience} {t('Exp')}</span>
                    </div>

                    {/* Row 4: Address | Amount */}
                    <div className="flex justify-between items-start text-xs mt-1 gap-3">
                      <span className="text-slate-900 flex-1 min-w-0 break-words leading-tight">
                        {worker.address || worker.location || t('No address provided')}
                      </span>
                      <div className="text-right flex-shrink-0 pl-1 border-l border-slate-100 min-w-[70px]">
                        <span className="text-blue-600 font-bold block">
                          {formatCurrency(
                            ['house rent', 'shop rent', 'marriage hall', 'catering'].includes((worker.trade || '').toLowerCase().trim())
                              ? (worker.rates as any)?.advance || 0
                              : ['Auto', 'Tempo', 'Van', 'JCB', 'Car'].includes(worker.trade || '')
                                ? (worker.rates as any)?.ratePerKm || (worker.rates as any)?.ratePerHour || 0
                                : worker.rates?.quickVisit || 0
                          )}
                        </span>
                        <span className="text-slate-400 text-[9px] font-bold block">
                          {['house rent', 'shop rent', 'marriage hall', 'catering'].includes((worker.trade || '').toLowerCase().trim()) ? t('Advance') : t('Starts from')}
                        </span>
                      </div>
                    </div>

                    {/* Row 5: Landmark */}
                    {worker.landmark && (
                      <div className="text-slate-400 text-[10px] mt-0.5 break-all">
                        {t('Landmark:')} {worker.landmark}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 relative z-10">
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm inline-block">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <Search size={32} />
                </div>
                <p className="text-slate-600 font-medium">{t('No workers found in this category')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <FullScreenImage
        src={previewImage?.src || ''}
        alt={previewImage?.alt}
        isOpen={!!previewImage}
        onClose={() => window.history.back()}
      />

      {/* Transport Booking Modal */}
      <AnimatePresence>
        {isTransportBookingOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[70] flex items-end justify-center px-4 pb-4"
          >
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="bg-white w-full max-w-md rounded-[3rem] p-8 max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl relative"
            >
              <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Car size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">{t('Book')} {t(bookingDetails.trade)}</h2>
                </div>
                <button onClick={() => window.history.back()} className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleBroadcastBooking} className="space-y-6">
                {/* Source Picker */}
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">{t('Source (Pickup Location)')}</label>
                   <div 
                     onClick={() => setActivePicker('source')}
                     className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 transition-colors cursor-pointer flex items-center gap-3"
                   >
                     <MapPin size={20} className="text-green-500 shrink-0" />
                     <div className="flex-1 min-w-0">
                       <p className="text-sm font-bold text-slate-700 truncate">{bookingDetails.pickupPoint || t('Select source on map...')}</p>
                     </div>
                   </div>
                </div>

                {/* Destination Picker */}
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">{t('Destination (Drop Location)')}</label>
                   <div 
                     onClick={() => setActivePicker('dest')}
                     className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-red-400 transition-colors cursor-pointer flex items-center gap-3"
                   >
                     <MapPin size={20} className="text-red-500 shrink-0" />
                     <div className="flex-1 min-w-0">
                       <p className="text-sm font-bold text-slate-700 truncate">{bookingDetails.workAddress || t('Select destination on map...')}</p>
                     </div>
                   </div>
                </div>

                {/* Pickup Point Details (The "issue" field) */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">{t('Pickup Point / Instructions')}</label>
                  <textarea
                    required
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500/20 focus:bg-white rounded-[1.5rem] p-4 text-sm font-semibold transition-all min-h-[100px] resize-none"
                    placeholder={t('E.g. Near Big Temple, Green Building...')}
                    value={bookingDetails.issue}
                    onChange={(e) => setBookingDetails({...bookingDetails, issue: e.target.value})}
                  />
                </div>

                {/* Date and Time Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">{t('Pickup Date')}</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={16} />
                      <input
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full bg-slate-50 pl-11 pr-4 py-3 rounded-xl text-sm font-bold border-none focus:ring-0"
                        value={bookingDetails.date}
                        onChange={(e) => setBookingDetails({...bookingDetails, date: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">{t('Pickup Time')}</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={16} />
                      <div className="flex bg-slate-50 rounded-xl px-4 py-3 gap-1">
                        <select 
                          className="bg-transparent border-none p-0 text-sm font-bold focus:ring-0 appearance-none"
                          value={bookingDetails.hour}
                          onChange={(e) => setBookingDetails({...bookingDetails, hour: e.target.value})}
                        >
                          {Array.from({length: 12}, (_, i) => (i + 1).toString().padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <span className="text-sm font-bold">:</span>
                        <select 
                          className="bg-transparent border-none p-0 text-sm font-bold focus:ring-0 appearance-none"
                          value={bookingDetails.minute}
                          onChange={(e) => setBookingDetails({...bookingDetails, minute: e.target.value})}
                        >
                          {['00', '15', '30', '45'].map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select 
                          className="bg-transparent border-none p-0 text-sm font-bold focus:ring-0 appearance-none ml-1"
                          value={bookingDetails.ampm}
                          onChange={(e) => setBookingDetails({...bookingDetails, ampm: e.target.value})}
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Estimate Section (Rapido-like) */}
                {bookingDetails.sourceLat && bookingDetails.destLat && (
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
                        ₹{(25 + (getDistance(bookingDetails.sourceLat, bookingDetails.sourceLng, bookingDetails.destLat, bookingDetails.destLng) * 15)).toFixed(0)}*
                      </p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={bookingLoading}
                  className={cn(
                    "w-full py-4 rounded-2xl bg-blue-600 text-white font-black text-sm shadow-xl shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4",
                    bookingLoading && "opacity-70 cursor-not-allowed"
                  )}
                >
                  {bookingLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Car size={18} />
                      {t('Book Now')}
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activePicker && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-white flex flex-col"
          >
            <div className="p-4 flex items-center gap-4 bg-white border-b relative z-[90]">
              <button onClick={() => setActivePicker(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <ArrowLeft size={24} className="text-slate-900" />
              </button>
              <h1 className="text-lg font-bold text-slate-900">
                {activePicker === 'source' ? t('Select Pickup Point') : t('Select Destination')}
              </h1>
            </div>
            <div className="flex-1 overflow-hidden">
               <LocationPicker 
                 isOpen={!!activePicker}
                 onClose={() => setActivePicker(null)}
                 onSelect={(lat, lng, address) => {
                   if (activePicker === 'source') {
                     setBookingDetails(prev => ({ ...prev, sourceLat: lat, sourceLng: lng, pickupPoint: address }));
                   } else {
                     setBookingDetails(prev => ({ ...prev, destLat: lat, destLng: lng, workAddress: address }));
                   }
                   setActivePicker(null);
                 }}
               />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
