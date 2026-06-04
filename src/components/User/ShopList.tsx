import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/src/lib/firebase';
import { useLayoutOutlet } from '@/src/contexts/LayoutOutletContext';
import { Building2, Search, MapPin, X } from 'lucide-react';
import { FullScreenImage } from '../Common/FullScreenImage';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { AbstractGradientBackground } from '../Common/AbstractGradientBackground';
import { LocationStatusBanner } from '../Common/LocationStatusBanner';
import { ShopDetail } from './ShopDetail';
import { AnimatePresence } from 'framer-motion';
import { cn } from '@/src/lib/utils';

interface ShopProfile {
  uid: string;
  name: string;
  ownerName: string;
  shopType: string;
  bio: string;
  address: string;
  city: string;
  landmark: string;
  photoURL: string;
  phone: string;
  email: string;
  openingTime: string;
  closingTime: string;
  holidays: string[];
  rating: number;
  createdAt: number;
}

export const ShopList: React.FC = () => {
  const { navigateTo } = useLayoutOutlet();
  const { t } = useLanguage();
  const [shops, setShops] = useState<ShopProfile[]>([]);
  const [filteredShops, setFilteredShops] = useState<ShopProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedShop, setSelectedShop] = useState<ShopProfile | null>(null);
  const [previewImage, setPreviewImage] = useState<{ src: string, alt: string } | null>(null);

  useEffect(() => {
    const shopsRef = ref(db, 'shops');
    const unsubscribe = onValue(shopsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const shopsList = Object.entries(data).map(([key, value]) => ({
        ...(value as any),
        uid: key,
        name: (value as any).name || 'Unknown Shop',
        ownerName: (value as any).ownerName || '',
        shopType: (value as any).shopType || '',
        bio: (value as any).bio || '',
        address: (value as any).address || '',
        city: (value as any).city || '',
        landmark: (value as any).landmark || '',
        photoURL: (value as any).photoURL || '',
        phone: (value as any).phone || '',
        email: (value as any).email || '',
        openingTime: (value as any).openingTime || '09:00',
        closingTime: (value as any).closingTime || '21:00',
        holidays: (value as any).holidays || [],
        rating: (value as any).rating || 0,
        createdAt: (value as any).createdAt || Date.now()
      })).filter(s => !s.deleted);
      
      const sortedShops = shopsList.sort((a, b) => a.name.localeCompare(b.name));
      setShops(sortedShops);
      setFilteredShops(sortedShops);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredShops(shops);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = shops.filter(shop => 
      shop.name.toLowerCase().includes(query) ||
      shop.shopType.toLowerCase().includes(query) ||
      shop.city.toLowerCase().includes(query) ||
      shop.address.toLowerCase().includes(query)
    );
    setFilteredShops(filtered);
  }, [searchQuery, shops]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const handlePopState = () => {
      // Restore selected shop from state if present
      if (window.history.state?.shopDetail && window.history.state?.shop) {
        setSelectedShop(window.history.state.shop);
      } else if (!window.history.state?.shopDetail) {
        setSelectedShop(null);
      }
      
      // Handle preview image separately if needed
      if (!window.history.state?.previewImage) {
        setPreviewImage(null);
      }
    };

    // Check initial state on mount to restore detail view
    if (window.history.state?.shopDetail && window.history.state?.shop) {
      setSelectedShop(window.history.state.shop);
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSetSelectedShop = (shop: ShopProfile | null) => {
    if (shop) {
      window.history.pushState({ shopDetail: true, shop: shop }, '');
    }
    setSelectedShop(shop);
  };

  const handleSetPreviewImage = (image: { src: string, alt: string } | null) => {
    if (image) {
      window.history.pushState({ previewImage: true }, '');
    }
    setPreviewImage(image);
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-[#2d3446] px-6 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-8 rounded-b-[2.5rem] shadow-2xl relative overflow-hidden">
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
          <button 
            onClick={() => navigateTo('/profile')}
            className="absolute -top-2 -right-2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-md border border-white/20 transition-all z-20"
          >
            <X size={20} />
          </button>
          <h1 className="text-white text-2xl font-black tracking-tight uppercase mb-2">{t('Local Shops')}</h1>
          <p className="text-white/90 text-sm font-medium mb-6">
            {t('Discover and connect with shops in your area')}
          </p>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder={t('Search shops, types, or locations...')}
              className="w-full pl-12 pr-4 py-3.5 bg-white rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-900"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 relative bg-emerald-100/40 min-h-screen">
        <AbstractGradientBackground />
        {/* Location Status Alert */}
        <LocationStatusBanner />
        
        {/* Shop List */}
      <div className="px-6 py-8 relative z-10">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white p-4 rounded-2xl animate-pulse flex gap-4">
                <div className="w-16 h-16 bg-slate-200 rounded-xl"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                  <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredShops.length > 0 ? (
          <div className="space-y-4">
            {filteredShops.map((shop, index) => {
              const cardBg = 'bg-white';
              return (
                <div 
                  key={shop.uid} 
                  onClick={() => handleSetSelectedShop(shop)}
                  className={cn(cardBg, "p-5 rounded-[32px] border border-slate-100 shadow-sm flex items-start gap-4 cursor-pointer active:scale-[0.98] transition-all duration-300 relative overflow-hidden group")}
                >
                  <div 
                    className="w-20 h-20 rounded-2xl bg-slate-50 overflow-hidden flex-shrink-0 mt-1 cursor-zoom-in relative z-10 shadow-inner border border-slate-100"
                    onClick={(e) => {
                      if (shop.photoURL) {
                        e.stopPropagation();
                        handleSetPreviewImage({ src: shop.photoURL, alt: shop.name });
                      }
                    }}
                  >
                    {shop.photoURL ? (
                      <img src={shop.photoURL} alt={shop.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/50 text-blue-600">
                        <Building2 size={32} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5 relative z-10">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-extrabold text-slate-900 text-lg break-words pr-1 leading-tight">{shop.name}</h3>
                        <div className="flex flex-col gap-0.5 mt-1">
                          {shop.ownerName && (
                            <span className="text-[11px] font-bold text-slate-600 self-start break-words">
                              <span className="text-slate-400 font-medium mr-1">{t('Owner')}:</span>
                              {shop.ownerName}
                            </span>
                          )}
                          <span className="text-[11px] font-bold text-blue-600 self-start break-words uppercase">{shop.shopType}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-1 text-blue-800 font-bold text-[10px] flex-shrink-0 mt-1 max-w-[40%] min-w-0">
                        <MapPin size={12} className="text-blue-600 shrink-0 mt-0.5" />
                        <span className="break-all text-right">{shop.city}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 relative z-10">
            <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-white/50 shadow-sm inline-block">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 size={24} className="text-slate-400" />
              </div>
              <h3 className="text-slate-900 font-bold mb-1">{t('No shops found')}</h3>
              <p className="text-slate-600 text-sm">
                {searchQuery ? t('Try adjusting your search') : t('No shops registered yet')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>

      <AnimatePresence>
        {selectedShop && (
          <ShopDetail 
            key="shop-detail"
            shop={selectedShop} 
            onClose={() => window.history.back()} 
          />
        )}
      </AnimatePresence>

      <FullScreenImage
        src={previewImage?.src || ''}
        alt={previewImage?.alt}
        isOpen={!!previewImage}
        onClose={() => window.history.back()}
      />
    </div>
  );
};
