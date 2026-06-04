import React, { useState, useEffect } from 'react';
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { db } from '@/src/lib/firebase';
import { Order } from '@/src/types';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { AbstractGradientBackground } from '../Common/AbstractGradientBackground';
import { RateWorkerModal } from '../Common/RateWorkerModal';
import { ClipboardList, Clock, CheckCircle2, XCircle, ChevronRight, Calendar, Star, ArrowLeft, AlertCircle, MapPin } from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime, cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useLayoutOutlet } from '@/src/contexts/LayoutOutletContext';

const FILTER_ORDER = ['All', 'Completed', 'Rejected'] as const;
type FilterType = typeof FILTER_ORDER[number];

export const BookingHistory: React.FC = () => {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const { navigateTo } = useLayoutOutlet();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('All');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      // Restore selected order from state if present
      if ((window.history.state?.modal === 'history-detail' || window.history.state?.modal === 'rate') && window.history.state?.order) {
        setSelectedOrder(window.history.state.order);
      } else if (!window.history.state?.modal || (window.history.state?.modal !== 'history-detail' && window.history.state?.modal !== 'rate')) {
        setSelectedOrder(null);
      }
      
      // Close rate modal if we're not in rate state
      setIsRateModalOpen(window.history.state?.modal === 'rate');
    };

    // Check initial state on mount to restore detail view
    if ((window.history.state?.modal === 'history-detail' || window.history.state?.modal === 'rate') && window.history.state?.order) {
      setSelectedOrder(window.history.state.order);
    }
    if (window.history.state?.modal === 'rate') setIsRateModalOpen(true);

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSetSelectedOrder = (order: Order | null) => {
    if (order) {
      window.history.pushState({ modal: 'history-detail', order: order }, '');
    }
    setSelectedOrder(order);
  };

  const handleSetIsRateModalOpen = (isOpen: boolean) => {
    if (isOpen) {
      window.history.pushState({ modal: 'rate', order: selectedOrder }, '');
    }
    setIsRateModalOpen(isOpen);
  };

  useEffect(() => {
    if (!profile) return;

    const ordersRef = ref(db, 'orders');
    const userOrdersQuery = query(ordersRef, orderByChild('userId'), equalTo(profile.uid));
    
    const unsubscribe = onValue(userOrdersQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const orderList = Object.values(data) as Order[];
        // Filter for completed or rejected
        setOrders(orderList.filter(o => 
          o.status?.toLowerCase() === 'completed' || o.status?.toLowerCase() === 'rejected'
        ).sort((a, b) => (b.completedAt || b.rejectedAt || b.createdAt || 0) - (a.completedAt || a.rejectedAt || a.createdAt || 0)));
      } else {
        setOrders([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const filteredOrders = orders.filter(order => {
    if (filter === 'All') return true;
    return order.status?.toLowerCase() === filter.toLowerCase();
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'rejected': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return <CheckCircle2 size={12} />;
      case 'rejected': return <XCircle size={12} />;
      default: return <Clock size={12} />;
    }
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    const currentIndex = FILTER_ORDER.indexOf(filter);
    if (direction === 'left' && currentIndex < FILTER_ORDER.length - 1) {
      setFilter(FILTER_ORDER[currentIndex + 1]);
    } else if (direction === 'right' && currentIndex > 0) {
      setFilter(FILTER_ORDER[currentIndex - 1]);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-[#2d3446] px-6 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-8 rounded-b-[2.5rem] shadow-2xl relative overflow-hidden">
        {/* Low-poly background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] bg-[#4a5568] rotate-[15deg] skew-x-[-10deg]" />
          <div className="absolute top-[10%] right-[-5%] w-[35%] h-[50%] bg-[#3a445a] rotate-[-20deg] skew-y-[5deg]" />
          <div className="absolute bottom-[-15%] left-[20%] w-[50%] h-[40%] bg-[#4a5568] rotate-[5deg] skew-x-[20deg]" />
          <div className="absolute top-[30%] left-[40%] w-[20%] h-[30%] bg-[#5a677c] rotate-[45deg]" />
        </div>
        
        <div className="absolute inset-0 bg-gradient-to-t from-[#2d3446] via-transparent to-transparent opacity-60" />

        <div className="relative z-10">
          <button type="button" onClick={() => navigateTo('/profile')} className="mb-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white backdrop-blur-md border border-white/20">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">{t('Booking History')}</h1>
          <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest">{t('Your past service requests')}</p>
        </div>
        
        <div className="flex bg-white/5 p-1 rounded-2xl overflow-x-auto no-scrollbar scroll-smooth mt-6 backdrop-blur-xl border border-white/10 relative z-10 text-white">
          {FILTER_ORDER.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "flex-1 min-w-fit whitespace-nowrap px-4 py-2 text-xs font-bold rounded-xl transition-all",
                filter === s ? "bg-white text-blue-600 shadow-sm" : "text-white/80 hover:text-white"
              )}
            >
              {t(s)}
            </button>
          ))}
        </div>
      </div>

      <motion.div 
        className="flex-1 relative bg-emerald-100/40 min-h-screen"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.x < -50) handleSwipe('left');
          else if (info.offset.x > 50) handleSwipe('right');
        }}
      >
        <AbstractGradientBackground />
        <div className="px-6 pt-6 pb-32 space-y-4 relative z-10">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white animate-pulse rounded-2xl border border-slate-100" />)}
          </div>
        ) : filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => handleSetSelectedOrder(order)}
              className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 pr-2">
                  <h3 className="font-bold text-slate-900 break-words leading-tight">{order.workerName || t('Worker')}</h3>
                  <p className="text-blue-600 text-[11px] font-semibold">{order.trade ? t(order.trade) : t('General Service')}</p>
                </div>
                <div className={cn(
                  "flex items-center gap-1 px-3 py-1 rounded-full border text-[9px] font-bold uppercase tracking-wider",
                  getStatusColor(order.status || 'completed')
                )}>
                  {getStatusIcon(order.status || 'completed')}
                  <span>{t(order.status || 'completed')}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-slate-500 text-[11px] mb-4">
                <div className="flex items-center gap-1">
                  <Clock size={12} className="text-slate-400" />
                  <span>{order.preferredTime || t('N/A')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar size={12} className="text-slate-400" />
                  <span>{formatDate(order.completedAt || order.rejectedAt || order.createdAt)}</span>
                </div>
              </div>

              {order.status?.toLowerCase() === 'rejected' && order.rejectionReason && (
                <div className="mb-4 px-3 py-2 bg-red-50/50 rounded-xl border border-red-100/30">
                  <p className="text-[10px] text-red-600 font-bold italic leading-tight line-clamp-2">
                    "{order.rejectionReason}"
                  </p>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                <p className="text-slate-900 font-bold text-sm">{formatCurrency(Number(order.offeredAmount) || 0)}</p>
                <div className="flex items-center gap-2">
                   {order.status === 'completed' && !order.isRated && (
                      <span className="text-amber-500 text-[9px] font-black uppercase flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-md">
                        <Star size={10} className="fill-amber-500" /> {t('Not Rated')}
                      </span>
                   )}
                   <ChevronRight size={16} className="text-slate-300" />
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-20 bg-white/50 backdrop-blur-sm rounded-3xl border border-white/50">
            <ClipboardList size={48} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-lg font-bold text-slate-900">{t('No History Found')}</h3>
            <p className="text-slate-400 text-xs mt-1">{t('Your completed and rejected orders will appear here.')}</p>
          </div>
        )}
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[60] flex items-end justify-center px-4 pb-4"
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-8 max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">{t('History Detail')}</h2>
                <button onClick={() => window.history.back()} className="text-slate-400">{t('Close')}</button>
              </div>

              <div className="space-y-6">
                 <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-bold text-lg">
                      {(selectedOrder.workerName || 'W')[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{selectedOrder.workerName}</h3>
                      <p className="text-blue-600 text-xs font-semibold">{t(selectedOrder.trade || 'Service')}</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl">
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t('Milestone Date')}</label>
                       <p className="text-sm font-bold text-slate-700">{formatDate(selectedOrder.completedAt || selectedOrder.rejectedAt || selectedOrder.createdAt)}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t('Amount')}</label>
                       <p className="text-sm font-bold text-blue-600">{formatCurrency(Number(selectedOrder.offeredAmount))}</p>
                    </div>
                 </div>

                 <div className="p-4 bg-slate-50 rounded-2xl space-y-3">
                    {['auto', 'tempo', 'van', 'car', 'rentals'].includes((selectedOrder.trade || '').toLowerCase().trim()) ? (
                      <div className="space-y-4">
                        {/* Source */}
                        <div className="flex items-start gap-3">
                          <MapPin size={16} className="text-green-500 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t('Source')}</span>
                            <p className="text-sm font-bold text-slate-700 leading-tight block break-words">{selectedOrder.pickupPoint || t('No source provided')}</p>
                          </div>
                        </div>
                        {/* Destination */}
                        <div className="flex items-start gap-3">
                          <MapPin size={16} className="text-red-500 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t('Destination')}</span>
                            <p className="text-sm font-bold text-slate-700 leading-tight block break-words">{selectedOrder.workAddress || t('No destination provided')}</p>
                          </div>
                        </div>
                        {/* Pickup Point */}
                        <div className="flex items-start gap-3 pt-3 border-t border-slate-200/50">
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t('Pickup Point')}</span>
                            <p className="text-slate-600 text-[13px] font-medium leading-relaxed italic break-words w-full">"{selectedOrder.issue || selectedOrder.description || t('No description')}"</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                            {(selectedOrder.trade || '').toLowerCase().trim() === 'jcb'
                              ? t('Purpose of Work')
                              : (selectedOrder.trade || '').toLowerCase().trim() === 'shop rent'
                                ? t('Type of Shop')
                                : (selectedOrder.trade || '').toLowerCase().trim() === 'house rent'
                                  ? t('Type of Family')
                                  : (selectedOrder.trade || '').toLowerCase().trim() === 'coconut plucker'
                                    ? t('Number of trees (approximately)')
                                    : ['marriage hall', 'catering'].includes((selectedOrder.trade || '').toLowerCase().trim())
                                      ? t('What kind of function')
                                      : t('Description')}
                          </label>
                          <p className="text-slate-800 text-[13px] font-medium leading-relaxed italic break-words">"{selectedOrder.issue || selectedOrder.description || t('No description')}"</p>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                            {t('Place of Work')}
                          </label>
                          <p className="text-sm text-blue-600 font-bold border-l-4 border-blue-500 pl-3 py-1 bg-blue-50/30 rounded-r-xl break-all">
                            {selectedOrder.workAddress || t('Main Address')}
                          </p>
                        </div>
                      </>
                    )}
                    
                    <div className="pt-3 border-t border-slate-200 space-y-2.5">
                      <div className="flex justify-between items-center text-[11px]">
                         <span className="text-slate-400 font-bold uppercase">{t('Booked At')}</span>
                         <span className="text-slate-900 font-black">{formatDateTime(selectedOrder.createdAt)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                         <span className="text-slate-400 font-bold uppercase">{t('Booked For')}</span>
                         <span className="text-slate-900 font-black">
                           {selectedOrder.bookingDate && selectedOrder.preferredTime ? `${selectedOrder.bookingDate}, ${selectedOrder.preferredTime}` : selectedOrder.preferredTime || t('N/A')}
                         </span>
                      </div>
                      {selectedOrder.status?.toLowerCase() === 'completed' && (
                        <div className="flex justify-between items-center text-[11px]">
                           <span className="text-slate-400 font-bold uppercase">{t('Completed At')}</span>
                           <span className="text-slate-900 font-black">{formatDateTime(selectedOrder.completedAt)}</span>
                        </div>
                      )}
                      {selectedOrder.status?.toLowerCase() === 'rejected' && (
                        <div className="flex justify-between items-center text-[11px]">
                           <span className="text-slate-400 font-bold uppercase">{t('Rejected At')}</span>
                           <span className="text-slate-900 font-black">{formatDateTime(selectedOrder.rejectedAt)}</span>
                        </div>
                      )}
                    </div>
                 </div>

                 {selectedOrder.status === 'completed' && !selectedOrder.isRated && (
                   <button
                     onClick={() => handleSetIsRateModalOpen(true)}
                     className="w-full py-4 rounded-2xl bg-amber-500 text-white font-black text-sm shadow-lg shadow-amber-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                   >
                     <Star size={20} className="fill-white" />
                     {t('Rate this Service')}
                   </button>
                 )}

                  {selectedOrder.status?.toLowerCase() === 'rejected' && selectedOrder.rejectionReason && (
                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl relative overflow-hidden group hover:border-orange-200 transition-colors">
                       <div className="absolute -right-4 -top-4 w-16 h-16 bg-orange-100 rounded-full blur-xl opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />
                       <label className="text-[10px] font-black text-orange-400 uppercase tracking-widest block mb-2 relative z-10 flex items-center gap-1.5">
                         <AlertCircle size={12} />
                         {t('Cancellation Reason')}
                       </label>
                       <p className="text-slate-700 text-sm font-bold relative z-10 leading-relaxed italic break-words">
                         "{selectedOrder.rejectionReason}"
                       </p>
                       <p className="text-[9px] text-orange-400 font-bold uppercase mt-2 relative z-10 text-right">
                         {selectedOrder.rejectedBy === 'user' ? t('Cancelled by You') : t('Cancelled by Worker')}
                       </p>
                    </div>
                  )}

                  {selectedOrder.userCancellationFee && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex justify-between items-center">
                       <div>
                          <p className="text-[10px] font-bold text-red-400 uppercase">{t('Cancellation Fee')}</p>
                          <p className="text-red-600 font-black">{formatCurrency(selectedOrder.userCancellationFee)}</p>
                       </div>
                       <span className={cn("px-2 py-1 rounded-lg text-[10px] font-bold uppercase", selectedOrder.userCancellationPaid ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                          {selectedOrder.userCancellationPaid ? t('Paid') : t('Unpaid')}
                       </span>
                    </div>
                 )}
              </div>

              {isRateModalOpen && (
                <RateWorkerModal 
                  workerId={selectedOrder.workerId} 
                  orderId={selectedOrder.id} 
                  onClose={() => window.history.back()} 
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
