import React, { useState, useEffect, useMemo } from 'react';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';
import { db } from '@/src/lib/firebase';
import { WorkerProfile as WorkerProfileType } from '@/src/types';
import { Search, MapPin, Star, Hammer, Zap, Paintbrush, Droplets, Wrench, Sparkles, ChevronRight, Tv, Grid, Flame, BrickWall, Palmtree, Car, Truck, Home, Utensils, Building2, MessageSquare, ShieldCheck, Clock, XCircle, ShieldAlert, Store } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn, formatCurrency } from '@/src/lib/utils';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { WorkerDetail } from './WorkerDetail';
import { WorkersGroupedList } from './WorkersGroupedList';
import { FullScreenImage } from '../Common/FullScreenImage';
import { AbstractGradientBackground } from '../Common/AbstractGradientBackground';

import { useLocation } from 'react-router-dom';
import { useLayoutOutlet } from '@/src/contexts/LayoutOutletContext';
import { useWorkerDirectory } from '@/src/hooks/useWorkerDirectory';
import { filterServiceWorkers, workersForServiceTrade } from '@/src/lib/workerDirectory';
import { CategoryWorkersPage } from './CategoryWorkersPage';

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
  const location = useLocation();
  const { profile } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { setIsChatOpen, unreadMessagesCount, navTick } = useLayoutOutlet();
  const { workers: allWorkers, loading: directoryLoading } = useWorkerDirectory(!!profile);
  const workers = useMemo(() => filterServiceWorkers(allWorkers), [allWorkers]);
  const allCities = useMemo(
    () => Array.from(new Set(workers.map((w) => w.city).filter(Boolean))) as string[],
    [workers]
  );
  const [filteredWorkers, setFilteredWorkers] = useState<WorkerProfileType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryListPage, setCategoryListPage] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'amount' | 'experience' | 'amount-high-low' | 'experience-low-high' | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<WorkerProfileType | null>(null);
  const [previewImage, setPreviewImage] = useState<{ src: string, alt: string } | null>(null);
  const loading = directoryLoading;
  const [hasOverdueFees, setHasOverdueFees] = useState(false);

  useEffect(() => {
    if (!profile?.uid) return;
    let cancelled = false;
    const userOrdersQuery = query(ref(db, 'orders'), orderByChild('userId'), equalTo(profile.uid));
    const checkFees = () => {
      get(userOrdersQuery).then((snapshot) => {
        if (cancelled) return;
        const data = snapshot.val();
        if (!data) {
          setHasOverdueFees(false);
          return;
        }
        const now = Date.now();
        const overdue = Object.values(data).some(
          (o: any) =>
            !o.userCancellationPaid && o.userCancellationDueDate && o.userCancellationDueDate < now
        );
        setHasOverdueFees(overdue);
      }).catch(() => {});
    };
    const timer = setTimeout(checkFees, 800);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [profile?.uid]);


  useEffect(() => {
    setFilteredWorkers(workers);
  }, [workers]);

  useEffect(() => {
    let result = workers;

    if (selectedCategory) {
      result = workersForServiceTrade(result, selectedCategory);
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
    setSelectedWorker(null);
    setPreviewImage(null);
  }, [location.pathname, navTick]);

  const handleSetSelectedWorker = (worker: WorkerProfileType | null) => {
    setSelectedWorker(worker);
  };

  const handleSetPreviewImage = (image: { src: string, alt: string } | null) => {
    setPreviewImage(image);
  };

  if (selectedWorker) {
    return (
      <div className="flex flex-col min-h-screen pb-28">
        <WorkerDetail worker={selectedWorker} onBack={() => setSelectedWorker(null)} hasOverdueFees={hasOverdueFees} />
      </div>
    );
  }

  if (categoryListPage) {
    const tradeWorkers = workersForServiceTrade(workers, categoryListPage);
    return (
      <CategoryWorkersPage
        category={categoryListPage}
        workers={tradeWorkers}
        loading={loading}
        variant="service"
        onBack={() => setCategoryListPage(null)}
        onSelectWorker={handleSetSelectedWorker}
        onPreviewImage={(src, alt) => handleSetPreviewImage({ src, alt })}
      />
    );
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
              onClick={() => {
                setCategoryListPage(service.id);
                setSelectedCategory(service.id);
              }}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
            >
              <div className={cn(
                "w-20 h-20 rounded-[1.8rem] flex items-center justify-center transition-all shadow-md border-2 overflow-hidden",
                selectedCategory === service.id || categoryListPage === service.id
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
                selectedCategory === service.id || categoryListPage === service.id ? "text-emerald-600" : "text-slate-500"
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
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className={cn(
              "text-blue-600 text-sm font-semibold whitespace-nowrap flex-shrink-0 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/50 shadow-sm",
              !selectedCategory && "hidden"
            )}
          >
            {t('See All')}
          </button>
        </div>

        {loading && filteredWorkers.length === 0 ? (
          <div className="space-y-4">
            <div className="h-24 bg-white/80 animate-pulse rounded-2xl border border-slate-100" />
            <p className="text-center text-xs text-slate-500 font-medium">{t('Loading workers...')}</p>
          </div>
        ) : filteredWorkers.length > 0 ? (
          <WorkersGroupedList
            key={`services-${navTick}-${selectedCategory || 'all'}`}
            workers={filteredWorkers}
            variant="service"
            onSelectWorker={handleSetSelectedWorker}
            onPreviewImage={(src, alt) => handleSetPreviewImage({ src, alt })}
          />
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
        onClose={() => setPreviewImage(null)}
      />
    </div>
  </div>
  );
};
