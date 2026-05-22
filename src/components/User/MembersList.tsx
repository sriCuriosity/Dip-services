import React, { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '@/src/lib/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { AbstractGradientBackground } from '../Common/AbstractGradientBackground';
import { motion } from 'framer-motion';
import { Users, Search, Camera, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { FullScreenImage } from '../Common/FullScreenImage';

export const MembersList: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [members, setMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
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
    const fetchMembers = async () => {
      setLoading(true);
      try {
        const usersSnap = await get(ref(db, 'users'));
        const usersData = usersSnap.val() || {};

        // Get all users
        const allUsers = Object.entries(usersData)
          .filter(([_, userData]: [string, any]) => userData && !userData.deleted)
          .map(([uid, userData]: [string, any]) => ({
            uid,
            name: userData.name || 'Unknown User',
            phone: userData.phone || '',
            photoURL: userData.photoURL || '',
            city: userData.city || '',
            address: userData.address || '',
            role: userData.role || 'user'
          }));

        setMembers(allUsers);
      } catch (error) {
        console.error('Error fetching members:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [profile?.uid]);

  const displayList = members.filter(member => {
    const query = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(query) ||
      member.city.toLowerCase().includes(query) ||
      member.address.toLowerCase().includes(query) ||
      member.phone.includes(query)
    );
  });

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
            onClick={() => navigate('/profile')}
            className="absolute -top-2 -right-2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-md border border-white/20 transition-all z-20"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-3 mb-4 pr-12">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white backdrop-blur-md border border-white/30 flex-shrink-0">
              <Users size={24} />
            </div>
            <h1 className="text-white text-xl font-black tracking-tight uppercase leading-snug break-words">{t('Community Members')}</h1>
          </div>
          
          {/* Search Bar */}
          <div className="mt-4 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('Search by name, city or number...')}
              className="w-full bg-white rounded-xl py-3 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm shadow-sm transition-all"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 relative bg-emerald-100/40 min-h-screen">
        <AbstractGradientBackground />
        {/* Members List */}
      <div className="px-6 py-6 flex-1 relative z-10">
        <div className="flex justify-between items-center gap-4 mb-4 relative z-10">
          <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/50 shadow-sm inline-flex items-center">
            <h2 className="text-slate-900 font-bold leading-tight">
              {t('All Users')}
            </h2>
          </div>
          <div className="bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/50 shadow-sm inline-flex items-center">
            <span className="text-slate-600 font-medium text-xs whitespace-nowrap flex-shrink-0">{displayList.length} {t('Members')}</span>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-slate-200 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : displayList.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {displayList.map((member, index) => (
              <motion.div
                key={member.uid}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-orange-50/90 p-4 rounded-2xl shadow-sm border border-orange-100/50 flex flex-col items-center text-center gap-3"
              >
                <div 
                  className={cn(
                    "w-16 h-16 bg-white rounded-full overflow-hidden flex-shrink-0 border-2 border-orange-200 relative group",
                    member.photoURL && "cursor-zoom-in"
                  )}
                  onClick={() => {
                    if (member.photoURL) {
                      handleSetPreviewImage({ src: member.photoURL, alt: member.name });
                    }
                  }}
                >
                  {member.photoURL ? (
                    <>
                      <img src={member.photoURL} alt={member.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <Camera size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-orange-100 text-orange-600 font-bold text-2xl">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="w-full min-w-0">
                  <h3 className="font-bold text-slate-900 truncate text-sm">{member.name}</h3>
                  {(member.city || member.address) && (
                    <p className="text-slate-500 text-[10px] truncate mt-0.5">
                      {member.city || member.address}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 relative z-10">
            <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-white/50 shadow-sm inline-block">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <Users size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">{t('No members found')}</h3>
              <p className="text-slate-600 text-sm">
                {t('There are no other community members yet.')}
              </p>
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
  </div>
  );
};
