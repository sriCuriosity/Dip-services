import React, { useState, useEffect } from 'react';
import { ref, onValue, query, orderByChild, get, equalTo } from 'firebase/database';
import { db } from '@/src/lib/firebase';
import { WorkerProfile as WorkerProfileType } from '@/src/types';
import { Search, MapPin, Star, Hammer, Zap, Paintbrush, Droplets, Wrench, Sparkles, ChevronRight, Tv, Grid, Flame, BrickWall, Palmtree, Car, Truck, Home, Utensils, Building2, MessageSquare, ShieldCheck, Clock, XCircle, ShieldAlert, Store } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn, formatCurrency } from '@/src/lib/utils';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { WorkerDetail } from './WorkerDetail';
import { WorkerMapView } from './WorkerMapView';
import { FullScreenImage } from '../Common/FullScreenImage';
import { AbstractGradientBackground } from '../Common/AbstractGradientBackground';

import { useNavigate, useOutletContext } from 'react-router-dom';

const SERVICES = [
  { id: 'Painter', icon: Paintbrush, image: '/assets/categories/Painter.png' },
  { id: 'Plumber', icon: Droplets, image: '/assets/categories/Plumber.png' },
  { id: 'Electrician', icon: Zap, image: '/assets/categories/Electrician.png' },
  { id: 'Carpenter', icon: Hammer, image: '/assets/categories/Carpenter.png' },
  { id: 'Mason', icon: BrickWall, image: '/assets/categories/Mason.png' },
  { id: 'Cleaner', icon: Sparkles, image: '/assets/categories/Cleaner.png' },
  { id: 'TV Repair', icon: Tv, image: '/assets/categories/TV Repair.jpg' },
  { id: 'Tiles Worker', icon: Grid, image: '/assets/categories/Tiles worker.jpg' },
  { id: 'Welder', icon: Flame, image: '/assets/categories/Welder.jpg' },
  { id: 'Coconut Plucker', icon: Palmtree, image: '/assets/categories/coconut plucker.jpg' },
  { id: 'Mechanic', icon: Wrench, image: '/assets/categories/mechanic.jpg' },
  { id: 'Cable', icon: Zap, image: '/assets/categories/cable.jpg' },
];

const SERVICE_COLORS: Record<string, string> = {
  'Painter': 'bg-rose-100 text-rose-600 border-rose-200',
  'Plumber': 'bg-blue-100 text-blue-600 border-blue-200',
  'Electrician': 'bg-amber-100 text-amber-600 border-amber-200',
  'Carpenter': 'bg-orange-100 text-orange-600 border-orange-200',
  'Mason': 'bg-stone-100 text-stone-600 border-stone-200',
  'Cleaner': 'bg-violet-100 text-violet-600 border-violet-200',
  'TV Repair': 'bg-indigo-100 text-indigo-600 border-indigo-200',
  'Tiles Worker': 'bg-teal-100 text-teal-600 border-teal-200',
  'Welder': 'bg-red-100 text-red-600 border-red-200',
  'Coconut Plucker': 'bg-green-100 text-green-600 border-green-200',
  'Mechanic': 'bg-pink-100 text-pink-600 border-pink-200',
  'Cable': 'bg-violet-100 text-violet-600 border-violet-200',
};

export const UserDashboard: React.FC = () => {
  const { profile } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const { setIsChatOpen, unreadMessagesCount } = useOutletContext<{ setIsChatOpen: (open: boolean) => void, unreadMessagesCount: number }>();
  const [workers, setWorkers] = useState<WorkerProfileType[]>([]);
  const [filteredWorkers, setFilteredWorkers] = useState<WorkerProfileType[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [allCities, setAllCities] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'amount' | 'experience' | 'amount-high-low' | 'experience-low-high' | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<WorkerProfileType | null>(null);
  const [previewImage, setPreviewImage] = useState<{ src: string, alt: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasOverdueFees, setHasOverdueFees] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  useEffect(() => {
    if (!profile?.uid) return;
    const ordersRef = ref(db, 'orders');
    const userOrdersQuery = query(ref(db, 'orders'), orderByChild('userId'), equalTo(profile.uid));
    const unsubscribe = onValue(userOrdersQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const orderList = Object.values(data) as any[];
        const now = Date.now();
        const overdue = orderList.some(o => 
          !o.userCancellationPaid && 
          o.userCancellationDueDate && 
          o.userCancellationDueDate < now
        );
        setHasOverdueFees(overdue);
      }
    });
    return () => unsubscribe();
  }, [profile?.uid]);

  useEffect(() => {
    if (profile?.role === 'worker') {
      navigate('/worker', { replace: true });
    }
  }, [profile, navigate]);

  useEffect(() => {
    setLoading(true);
    const workersRef = ref(db, 'workers');
    const shopsRef = ref(db, 'shops');
    const usersRef = ref(db, 'users');

    // Use a combined listener approach for real-time updates
    const unsubscribeWorkers = onValue(workersRef, (workersSnap) => {
      onValue(usersRef, (usersSnap) => {
        onValue(shopsRef, (shopsSnap) => {
          const workersData = workersSnap.val() || {};
          const usersData = usersSnap.val() || {};
          const shopsData = shopsSnap.val() || {};

          const regularWorkers = Object.entries(workersData).flatMap(([key, value]) => {
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
                  name: userData.name || 'Unknown Worker',
                  phone: (val as any).phone || userData.phone || '',
                  email: (val as any).email || userData.email || '',
                  photoURL: tData.photoURL || userData.photoURL || '',
                  city: tData.city || (val as any).city || userData.city || '',
                  address: tData.address || (val as any).address || userData.address || '',
                landmark: tData.landmark || (val as any).landmark || userData.landmark || '',
                latitude: parseFloat(tData.latitude || (val as any).latitude || userData.latitude || '0') || null,
                longitude: parseFloat(tData.longitude || (val as any).longitude || userData.longitude || '0') || null,
                deleted: userData.deleted || (val as any).deleted || false
                };
              });
            }
            
            return {
              ...(val as any),
              uid: key,
              name: userData.name || 'Unknown Worker',
              phone: (val as any).phone || userData.phone || '',
              email: (val as any).email || userData.email || '',
              photoURL: userData.photoURL || '',
              city: (val as any).city || userData.city || '',
              address: (val as any).address || userData.address || '',
              landmark: (val as any).landmark || userData.landmark || '',
              deleted: userData.deleted || (val as any).deleted || false
            };
          }).filter(w => !w.deleted);

          const combinedList = regularWorkers.filter(worker => 
            worker.trade && 
            typeof worker.trade === 'string' &&
            worker.trade.trim() !== '' &&
            worker.trade !== 'undefined' &&
            worker.trade !== 'null' &&
            worker.trade !== 'Select a trade'
          );
          
          const uniqueWorkers = Array.from(new Map(combinedList.map(item => [`${item.uid}-${item.trade}`, item])).values())
            .sort((a, b) => a.name.localeCompare(b.name));
          
          const allMembers = Object.entries(usersData)
            .filter(([_, userData]: [string, any]) => userData && !userData.deleted)
            .map(([uid, userData]: [string, any]) => ({
              uid,
              name: userData.name || 'Unknown User',
              phone: userData.phone || '',
              photoURL: userData.photoURL || '',
              city: userData.city || '',
              address: userData.address || '',
              role: userData.role || 'user',
              deleted: userData.deleted || false
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

          const RENTAL_TRADES = ['Auto', 'Tempo', 'Van', 'JCB', 'Car', 'Marriage Hall', 'Catering', 'House Rent', 'Shop Rent'];
          const nonRentalWorkers = uniqueWorkers.filter(w => !RENTAL_TRADES.includes(w.trade || ''));
          
          setWorkers(nonRentalWorkers);
          setFilteredWorkers(nonRentalWorkers);
          setMembers(allMembers);
          setLoading(false);
        }, { onlyOnce: false });
      }, { onlyOnce: false });
    }, { onlyOnce: false });

    return () => {
      unsubscribeWorkers();
    };
  }, []);

  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      const usersData = snapshot.val() || {};
      const allCitiesList = Array.from(new Set(Object.values(usersData).map((u: any) => u.city).filter(Boolean))) as string[];
      setAllCities(allCitiesList);
    });
    return () => unsubscribeUsers();
  }, []);

  useEffect(() => {
    let result = workers;

    if (selectedCategory) {
      result = result.filter(w => w.trade === selectedCategory);
    }

    if (selectedCity) {
      result = result.filter(w => w.city === selectedCity);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(w => 
        (w.name || '').toLowerCase().includes(query) || 
        (w.address || '').toLowerCase().includes(query) ||
        (w.location || '').toLowerCase().includes(query) ||
        (w.trade || '').toLowerCase().includes(query) ||
        (w.phone || '').toLowerCase().includes(query) ||
        (w.city || '').toLowerCase().includes(query) ||
        (w.landmark || '').toLowerCase().includes(query) ||
        (w.email || '').toLowerCase().includes(query) ||
        (w.rates?.quickVisit?.toString() || '').includes(query)
      );
    }

    if (sortBy === 'amount') {
      result = [...result].sort((a, b) => (a.rates?.quickVisit || 0) - (b.rates?.quickVisit || 0));
    } else if (sortBy === 'amount-high-low') {
      result = [...result].sort((a, b) => (b.rates?.quickVisit || 0) - (a.rates?.quickVisit || 0));
    } else if (sortBy === 'experience') {
      result = [...result].sort((a, b) => (b.experience || 0) - (a.experience || 0));
    } else if (sortBy === 'experience-low-high') {
      result = [...result].sort((a, b) => (a.experience || 0) - (b.experience || 0));
    }

    setFilteredWorkers(result);
  }, [searchQuery, selectedCategory, selectedCity, workers, sortBy]);

  useEffect(() => {
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
        {/* Circuit board pattern background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        
        <div className="flex justify-between items-center relative z-10 gap-x-4">
          <div className="flex flex-col justify-center min-w-0 flex-1">
            <h2 className="text-white text-[15px] font-semibold tracking-wide leading-tight break-words uppercase">{t('Welcome back!')}</h2>
            <h1 className="text-white text-[28px] font-bold tracking-tight leading-tight mt-1 break-words line-clamp-2">{profile?.name || 'User'} 👋</h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Chat Button */}
            <button
              onClick={() => setIsChatOpen(true)}
              className="relative p-2 bg-transparent rounded-lg text-white/80 hover:text-white hover:bg-white/5 transition-all border border-white/20 flex items-center justify-center w-[36px] h-[36px]"
            >
              <MessageSquare size={18} strokeWidth={1.5} />
              {unreadMessagesCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-[#242938]">
                  {unreadMessagesCount}
                </span>
              )}
            </button>

            {/* Profile Image - Now on the right and square */}
            <div 
              className="w-[60px] h-[60px] rounded-2xl overflow-hidden ring-2 ring-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.3)] cursor-zoom-in flex-shrink-0"
              onClick={() => {
                if (profile?.photoURL) {
                  handleSetPreviewImage({ src: profile.photoURL, alt: profile.name || 'User' });
                }
              }}
            >
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-700 text-white font-bold text-2xl">
                  {profile?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 relative bg-emerald-100/40 min-h-screen">
        <AbstractGradientBackground />
        
        {/* Banners */}
        <div className="py-4 relative z-10 w-full overflow-hidden">
          <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar px-6 pb-2 gap-4">
            {/* Banner 1: General Home Services */}
            <div className="snap-center shrink-0 w-full max-w-[calc(100vw-3rem)]">
              <div className="bg-[#1c1c1e] rounded-[1.5rem] p-5 flex items-center justify-between overflow-hidden relative shadow-lg min-h-[160px] w-full">
                <div className="absolute top-0 right-0 bottom-0 w-2/3 bg-gradient-to-l from-blue-900/50 to-transparent pointer-events-none" />
                <div className="absolute -right-2 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none">
                  <Hammer size={160} className="text-blue-400" strokeWidth={1} />
                </div>
                
                <div className="relative z-10 flex flex-col w-full h-full justify-between">
                  <div>
                    <div className="inline-flex mb-3 shadow-sm">
                      <span className="bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-full tracking-wide">
                        {t('Save 25% Time!')}
                      </span>
                    </div>
                    
                    <h2 className="text-white text-lg font-bold mb-1 tracking-wide">
                      {t('Home Services')}
                    </h2>
                    
                    <div className="flex items-baseline gap-1.5 mb-4">
                      <span className="text-white/90 text-[13px] font-medium">{t('Exclusive')}</span>
                      <div className="relative flex items-start">
                        <span className="text-white text-xl font-black leading-none tracking-tighter mt-1">{t('Discounts')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-end justify-between w-full">
                    <p className="text-white/60 text-[8px] font-medium tracking-wide pb-1 max-w-[60%] leading-snug">
                       {t('Top rated professionals')}
                    </p>
                    <button className="bg-blue-500 text-white px-5 py-2 rounded-[0.8rem] font-bold text-xs shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                      {t('Book Now')}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Banner 2: Cleaning */}
            <div className="snap-center shrink-0 w-full max-w-[calc(100vw-3rem)]">
              <div className="bg-[#1c1c1e] rounded-[1.5rem] p-5 flex items-center justify-between overflow-hidden relative shadow-lg min-h-[160px] w-full">
                <div className="absolute top-0 right-0 bottom-0 w-2/3 bg-gradient-to-l from-violet-900/50 to-transparent pointer-events-none" />
                <div className="absolute -right-2 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none">
                  <Sparkles size={160} className="text-violet-400" strokeWidth={1} />
                </div>
                
                <div className="relative z-10 flex flex-col w-full h-full justify-between">
                  <div>
                    <div className="inline-flex mb-3 shadow-sm">
                      <span className="bg-violet-500 text-white text-[10px] font-bold px-3 py-1 rounded-full tracking-wide">
                        {t('Deep Cleaning')}
                      </span>
                    </div>
                    
                    <h2 className="text-white text-lg font-bold mb-1 tracking-wide">
                      {t('Spotless Home')}
                    </h2>
                    
                    <p className="text-violet-100 text-[11px] font-medium max-w-[70%] leading-relaxed mt-2">
                       {t('Professional cleaners for your daily or deep cleaning needs.')}
                    </p>
                  </div>
                  
                  <div className="flex items-end justify-between w-full mt-4">
                    <p className="text-white/60 text-[8px] font-medium tracking-wide pb-1 max-w-[60%] leading-snug">
                       {t('100% Satisfaction')}
                    </p>
                    <button className="bg-violet-500 text-white px-5 py-2 rounded-[0.8rem] font-bold text-xs shadow-lg shadow-violet-500/20 active:scale-95 transition-all">
                      {t('Explore')}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Banner 3: Electrical & Plumbing */}
            <div className="snap-center shrink-0 w-full max-w-[calc(100vw-3rem)]">
              <div className="bg-[#1c1c1e] rounded-[1.5rem] p-5 flex items-center justify-between overflow-hidden relative shadow-lg min-h-[160px] w-full">
                <div className="absolute top-0 right-0 bottom-0 w-2/3 bg-gradient-to-l from-amber-900/50 to-transparent pointer-events-none" />
                <div className="absolute -right-2 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none">
                  <Zap size={160} className="text-amber-400" strokeWidth={1} />
                </div>
                
                <div className="relative z-10 flex flex-col w-full h-full justify-between">
                  <div>
                    <div className="inline-flex mb-3 shadow-sm">
                      <span className="bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-full tracking-wide">
                        {t('Quick Fix!')}
                      </span>
                    </div>
                    
                    <h2 className="text-white text-lg font-bold mb-1 tracking-wide">
                      {t('Electrical & Plumbing')}
                    </h2>
                    
                    <p className="text-amber-100 text-[11px] font-medium max-w-[70%] leading-relaxed mt-2">
                       {t('Fast and reliable repair services at your doorstep.')}
                    </p>
                  </div>
                  
                  <div className="flex items-end justify-between w-full mt-4">
                    <p className="text-white/60 text-[8px] font-medium tracking-wide pb-1 max-w-[60%] leading-snug">
                       {t('Verified Experts')}
                    </p>
                    <button className="bg-amber-500 text-white px-5 py-2 rounded-[0.8rem] font-bold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all">
                      {t('Book')}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Banner 4: Painting & Renovation */}
            <div className="snap-center shrink-0 w-full max-w-[calc(100vw-3rem)]">
              <div className="bg-[#1c1c1e] rounded-[1.5rem] p-5 flex items-center justify-between overflow-hidden relative shadow-lg min-h-[160px] w-full">
                <div className="absolute top-0 right-0 bottom-0 w-2/3 bg-gradient-to-l from-rose-900/50 to-transparent pointer-events-none" />
                <div className="absolute -right-2 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none">
                  <Paintbrush size={160} className="text-rose-400" strokeWidth={1} />
                </div>
                
                <div className="relative z-10 flex flex-col w-full h-full justify-between">
                  <div>
                    <div className="inline-flex mb-3 shadow-sm">
                      <span className="bg-rose-500 text-white text-[10px] font-bold px-3 py-1 rounded-full tracking-wide">
                        {t('Fresh Look!')}
                      </span>
                    </div>
                    
                    <h2 className="text-white text-lg font-bold mb-1 tracking-wide">
                      {t('Painting & Decor')}
                    </h2>
                    
                    <p className="text-rose-100 text-[11px] font-medium max-w-[70%] leading-relaxed mt-2">
                       {t('Revamp your space with expert painters and decorators.')}
                    </p>
                  </div>
                  
                  <div className="flex items-end justify-between w-full mt-4">
                    <p className="text-white/60 text-[8px] font-medium tracking-wide pb-1 max-w-[60%] leading-snug">
                       {t('Premium Quality')}
                    </p>
                    <button className="bg-rose-500 text-white px-5 py-2 rounded-[0.8rem] font-bold text-xs shadow-lg shadow-rose-500/20 active:scale-95 transition-all">
                      {t('Book')}
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
              {SERVICES.map(cat => (
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
          {SERVICES.map((service) => (
            <motion.button
              key={service.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory(service.id === selectedCategory ? null : service.id)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
            >
              <div className={cn(
                "w-20 h-20 rounded-[1.8rem] flex items-center justify-center transition-all shadow-md border-2 overflow-hidden",
                selectedCategory === service.id 
                  ? "bg-emerald-500 text-white border-emerald-500 shadow-emerald-200" 
                  : `${SERVICE_COLORS[service.id]} hover:border-slate-200`
              )}>
                {(service as any).image ? (
                  <img 
                    src={(service as any).image} 
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
            {selectedCategory ? `${t(selectedCategory)} ${t('Near You')}` : t('Recommended Workers')}
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setViewMode('list')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  viewMode === 'list' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                )}
              >
                List
              </button>
              <button 
                onClick={() => setViewMode('map')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  viewMode === 'map' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                )}
              >
                Map
              </button>
            </div>
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
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filteredWorkers.length > 0 ? (
          viewMode === 'list' ? (
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
                      {/* Location Badge */}
                      <div className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg flex-shrink-0 font-bold text-[9px] max-w-[75px]">
                        <MapPin size={9} className="shrink-0" />
                        <span className="break-all line-clamp-2">{worker.city || t('Unknown')}</span>
                      </div>
                    </div>

                    {/* Row 2: Type of trade (left) */}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600 font-medium break-words pr-2 line-clamp-1">{t(worker.trade || 'Service')}</span>
                    </div>

                    {/* Row 3: Experience (left) */}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 break-words">{worker.experience} {t('Exp')}</span>
                    </div>

                    {/* Row 4: Address (left) | Amount starts from (right) */}
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
                              : (worker.trade || '') === 'Coconut Plucker'
                                ? (worker.rates as any)?.ratePerTree || 0
                              : worker.rates?.quickVisit || 0
                          )}
                        </span>
                        <span className="text-slate-400 text-[9px] font-bold block">
                          {['house rent', 'shop rent', 'marriage hall', 'catering'].includes((worker.trade || '').toLowerCase().trim()) ? t('Advance') : t('Starts from')}
                        </span>
                      </div>
                    </div>

                    {/* Row 5: Landmark (left) */}
                    {worker.landmark && (
                      <div className="text-slate-400 text-[10px] mt-0.5 break-all">
                        {t('Landmark:')} {t(worker.landmark)}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="h-[500px] w-full mt-4">
              <WorkerMapView 
                workers={filteredWorkers} 
                onSelectWorker={handleSetSelectedWorker} 
                userCoords={profile?.latitude && profile?.longitude ? { lat: profile.latitude, lng: profile.longitude } : null}
              />
            </div>
          )
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

      <FullScreenImage
        src={previewImage?.src || ''}
        alt={previewImage?.alt}
        isOpen={!!previewImage}
        onClose={() => window.history.back()}
      />
    </div>
  </div>
  );
};
