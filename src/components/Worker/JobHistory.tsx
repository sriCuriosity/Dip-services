import React, { useState, useEffect } from 'react';
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { db } from '@/src/lib/firebase';
import { Order } from '@/src/types';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { AbstractGradientBackground } from '../Common/AbstractGradientBackground';
import { ClipboardList, Clock, CheckCircle2, XCircle, Calendar, MapPin, ArrowLeft, Phone, Info, AlertCircle } from 'lucide-react';
import { cn, formatCurrency, generateWhatsAppLink } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export const JobHistory: React.FC = () => {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'rejected'>('all');

  useEffect(() => {
    if (!profile) return;

    const ordersRef = ref(db, 'orders');
    const workerOrdersQuery = query(ordersRef, orderByChild('workerId'), equalTo(profile.uid));
    
    const unsubscribe = onValue(workerOrdersQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const orderList = Object.entries(data).map(([id, val]: [string, any]) => ({
          ...val,
          id
        })) as Order[];
        setOrders(orderList.filter(o => {
          const status = o.status?.toLowerCase();
          return status === 'completed' || status === 'rejected';
        }).sort((a, b) => {
          const timeA = b.completedAt || b.rejectedAt || b.createdAt || 0;
          const timeB = a.completedAt || a.rejectedAt || a.createdAt || 0;
          return Number(timeA) - Number(timeB);
        }));
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const filteredOrders = orders.filter(order => {
    const status = order.status?.toLowerCase();
    if (activeTab === 'all') return true;
    return status === activeTab;
  });

  const handleSwipe = (direction: 'left' | 'right') => {
    const tabs: ('all' | 'completed' | 'rejected')[] = ['all', 'completed', 'rejected'];
    const currentIndex = tabs.indexOf(activeTab);
    if (direction === 'left' && currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1]);
    } else if (direction === 'right' && currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1]);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-[#2d3446] px-6 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-8 rounded-b-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] bg-[#4a5568] rotate-[15deg] skew-x-[-10deg]" />
          <div className="absolute top-[10%] right-[-5%] w-[35%] h-[50%] bg-[#3a445a] rotate-[-20deg] skew-y-[5deg]" />
          <div className="absolute bottom-[-15%] left-[20%] w-[50%] h-[40%] bg-[#4a5568] rotate-[5deg] skew-x-[20deg]" />
        </div>
        
        <div className="relative z-10">
          <button 
            onClick={() => navigate(-1)}
            className="mb-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white backdrop-blur-md border border-white/20"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">{t('Job History')}</h1>
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mt-1">{t('Your Past Performance')}</p>
        </div>
      </div>

      <motion.div 
        className="flex-1 relative bg-emerald-100/40 min-h-screen -mt-6 rounded-t-[2.5rem] z-20 pb-24"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.x < -50) handleSwipe('left');
          else if (info.offset.x > 50) handleSwipe('right');
        }}
      >
        <AbstractGradientBackground />
        
        <div className="px-6 pt-10 space-y-6 relative z-10">
          <div className="flex bg-white/80 backdrop-blur-md p-1.5 rounded-2xl border border-white/50 shadow-sm gap-1">
            {(['all', 'completed', 'rejected'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 px-4 py-2.5 text-[11px] font-black rounded-xl transition-all uppercase tracking-wider",
                  activeTab === tab ? "bg-[#2d3446] text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {t(tab)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-[#2d3446] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const isCompleted = order.status === 'completed';
                const statusDate = isCompleted ? order.completedAt : order.rejectedAt;
                
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white p-5 rounded-[2.2rem] border border-slate-50 shadow-sm relative overflow-hidden group"
                  >
                    <div className={cn(
                        "absolute left-0 top-0 w-2 h-full",
                        isCompleted ? "bg-emerald-500" : "bg-red-500"
                    )} />
                    
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className="font-black text-slate-900 leading-tight text-lg truncate">
                          <span className="text-slate-400 font-medium mr-1">{t('Client')}:</span>
                          {order.userName}
                        </h3>
                        <p className="text-blue-600 text-[10px] font-black uppercase tracking-widest mt-0.5">{t(order.trade)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-slate-900 font-black text-lg">
                          {['marriage hall', 'catering'].includes((order.trade || '').toLowerCase().trim()) 
                            ? formatCurrency(0) 
                            : formatCurrency(order.offeredAmount)}
                        </p>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter">
                          {t(order.duration)}
                        </p>
                      </div>
                    </div>

                    {order.status?.toLowerCase() === 'rejected' && order.rejectionReason && (
                      <div className="mb-4 ml-2 px-3 py-2 bg-red-50/50 rounded-xl border border-red-100/30">
                        <p className="text-[10px] text-red-600 font-bold italic leading-tight line-clamp-2">
                          "{order.rejectionReason}"
                        </p>
                      </div>
                    )}

                    <div className="space-y-4">
                        <div className="bg-slate-50 p-3 rounded-2xl flex items-start gap-2.5">
                            <Info size={14} className="text-slate-400 shrink-0 mt-0.5" />
                            <p className="text-[11px] font-medium text-slate-600 leading-relaxed italic break-words">"{order.issue || order.description || t('No description')}"</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                                <MapPin size={14} className="shrink-0 text-slate-400" />
                                <span className="leading-tight line-clamp-2">{order.userAddress}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-500 text-[11px] justify-end">
                                <Clock size={14} className="shrink-0 text-blue-400" />
                                <span className="font-bold">{order.bookingDate ? `${order.bookingDate}, ` : ''}{order.preferredTime || t('Flexible')}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-blue-600 text-[11px] bg-blue-50/50 p-2 rounded-xl border border-blue-100/30">
                            <MapPin size={14} className="shrink-0 text-blue-500" />
                            <div className="flex-1 min-w-0">
                                <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest block">
                                    {['auto', 'tempo', 'van', 'car'].includes((order.trade || '').toLowerCase().trim()) 
                                      ? t('Travel Source to Destination') 
                                      : (order.trade || '').toLowerCase().trim() === 'house rent'
                                        ? t('Current Job')
                                        : (order.trade || '').toLowerCase().trim() === 'shop rent'
                                          ? t('Previous job/work')
                                          : (order.trade || '').toLowerCase().trim() === 'marriage hall'
                                            ? t('Expected Guest Count')
                                            : t('Place of Work')}
                                </span>
                                <span className="font-bold break-words">{order.workAddress || t('Main Address')}</span>
                            </div>
                        </div>
                        
                        <div className="space-y-4 pt-4 border-t border-slate-50">
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('Booking Date')}</p>
                                    <p className="text-slate-700 font-bold text-[11px]">
                                        {new Date(order.createdAt).toLocaleString(language === 'ta' ? 'ta-IN' : 'en-IN', { 
                                          day: 'numeric', month: 'short', year: 'numeric', 
                                          hour: '2-digit', minute: '2-digit', hour12: true 
                                        })}
                                    </p>
                                </div>
                                {statusDate && (
                                  <div>
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                          {isCompleted ? t('Completed At') : t('Rejected At')}
                                      </p>
                                      <p className={cn("font-bold text-[11px]", isCompleted ? "text-emerald-600" : "text-red-600")}>
                                          {new Date(statusDate).toLocaleString(language === 'ta' ? 'ta-IN' : 'en-IN', { 
                                            day: 'numeric', month: 'short', year: 'numeric', 
                                            hour: '2-digit', minute: '2-digit', hour12: true 
                                          })}
                                      </p>
                                  </div>
                                )}
                                
                                {order.status?.toLowerCase() === 'rejected' && order.rejectionReason && (
                                   <div className="mt-4 p-4 bg-orange-50 border border-orange-100 rounded-2xl relative overflow-hidden group hover:border-orange-200 transition-colors">
                                      {/* Decorative background element */}
                                      <div className="absolute -right-4 -top-4 w-16 h-16 bg-orange-100 rounded-full blur-xl opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                      
                                      <label className="text-[10px] font-black text-orange-400 uppercase tracking-widest block mb-1 relative z-10 flex items-center gap-1.5">
                                        <AlertCircle size={12} />
                                        {t('Cancellation Reason')}
                                      </label>
                                      <p className="text-slate-700 text-sm font-bold relative z-10 leading-relaxed italic break-words">
                                        "{order.rejectionReason}"
                                      </p>
                                      <p className="text-[9px] text-orange-400 font-bold uppercase mt-2 relative z-10 text-right">
                                        {order.rejectedBy === 'user' ? t('Cancelled by Customer') : t('Cancelled by You')}
                                      </p>
                                   </div>
                                )}
                            </div>

                            <div className="flex justify-end mt-2">
                               <span className={cn(
                                  "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter shadow-sm",
                                  isCompleted ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                               )}>
                                  {t(order.status)}
                               </span>
                            </div>
                        </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-white/40 rounded-[2.5rem] border border-white/60">
              <ClipboardList size={48} className="mx-auto text-slate-200 mb-4" />
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{t('No History')}</h3>
              <p className="text-slate-400 text-xs mt-1 font-bold">{t('Your records will appear here.')}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
