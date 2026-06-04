import React, { useState, useEffect } from 'react';
import { ref, onValue, query, orderByChild, equalTo, update, get, increment } from 'firebase/database';
import { db } from '@/src/lib/firebase';
import { Order } from '@/src/types';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { AbstractGradientBackground } from '../Common/AbstractGradientBackground';
import { formatCurrency, formatDate, generateWhatsAppLink, cn } from '@/src/lib/utils';
import { RateWorkerModal } from '../Common/RateWorkerModal';
import { RejectionReasonModal } from '../Common/RejectionReasonModal';
import { ClipboardList, Clock, CheckCircle2, XCircle, ChevronRight, MapPin, Phone, Calendar, Star, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FCMService } from '@/src/lib/fcmService';

const IndianRupee = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 3h12" />
    <path d="M6 8h12" />
    <path d="m6 13 8.5 8" />
    <path d="M6 13h3" />
    <path d="M9 13c6.667 0 6.667-10 0-10" />
  </svg>
);

export const OrderHistory: React.FC = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const handleSetSelectedOrder = (order: Order | null) => {
    setSelectedOrder(order);
  };

  const handleSetIsRateModalOpen = (isOpen: boolean) => {
    setIsRateModalOpen(isOpen);
  };

  const handleSetIsRejectionModalOpen = (isOpen: boolean) => {
    setIsRejectionModalOpen(isOpen);
  };
  const [filter, setFilter] = useState<Order['status'] | 'all'>('all');
  const FILTER_ORDER = ['all', 'pending', 'accepted'] as const;

  const processOrdersSnapshot = (data: Record<string, unknown> | null) => {
    if (!data) {
      setOrders([]);
      return;
    }
    const allOrders = Object.entries(data).map(([key, value]) => ({
      ...(value as object),
      id: key,
    })) as Order[];

    const userOrders = allOrders.filter((order) => {
      const status = order.status?.toLowerCase();
      return status === 'pending' || status === 'accepted';
    });

    setOrders(userOrders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let cancelled = false;
    const ordersRef = ref(db, 'orders');
    const userOrdersQuery = query(ordersRef, orderByChild('userId'), equalTo(user.uid));

    const finish = () => {
      if (!cancelled) setLoading(false);
    };

    const loadFallback = async () => {
      try {
        const snap = await get(ordersRef);
        const all = snap.val() || {};
        const mine = Object.fromEntries(
          Object.entries(all).filter(([, o]) => (o as { userId?: string }).userId === user.uid)
        );
        if (!cancelled) processOrdersSnapshot(mine);
      } catch (err) {
        console.error('Orders fallback load failed:', err);
        if (!cancelled) setOrders([]);
      } finally {
        finish();
      }
    };

    const unsubscribe = onValue(
      userOrdersQuery,
      (snapshot) => {
        try {
          processOrdersSnapshot(snapshot.val());
        } catch (err) {
          console.error('Error processing orders:', err);
          setOrders([]);
        } finally {
          finish();
        }
      },
      (error) => {
        console.warn('Orders indexed query failed, using fallback:', error);
        loadFallback();
      }
    );

    const timeout = setTimeout(() => {
      if (!cancelled) finish();
    }, 12000);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [user?.uid, authLoading]);

  if (authLoading && !user) {
    return (
      <div className="flex items-center justify-center min-h-full bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'accepted': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'completed': return 'bg-green-50 text-green-600 border-green-100';
      case 'rejected': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return <Clock size={14} />;
      case 'accepted': return <CheckCircle2 size={14} />;
      case 'completed': return <CheckCircle2 size={14} />;
      case 'rejected': return <XCircle size={14} />;
      default: return null;
    }
  };

  const filteredOrders = orders.filter(order => filter === 'all' || order.status?.toLowerCase() === filter.toLowerCase());

  const [isCancelling, setIsCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);

  useEffect(() => {
    setConfirmCancel(false);
    setIsRateModalOpen(false);
  }, [selectedOrder]);

  const handleCancelOrder = async (reason: string) => {
    if (!selectedOrder) return;
    const orderId = selectedOrder.id;
    
    setIsCancelling(true);
    try {
      // Read the order to check its current status
      const orderSnap = await get(ref(db, `orders/${orderId}`));
      const order = orderSnap.val() as Order;

      if (!order) {
        alert('Order not found.');
        setIsRejectionModalOpen(false);
        setSelectedOrder(null);
        return;
      }

      const currentStatus = (order.status || '').toLowerCase();
      const wasAccepted = currentStatus === 'accepted' || currentStatus === 'completed';

      // Mark the order as cancelled.
      await update(ref(db), {
        [`orders/${orderId}/status`]: 'rejected',
        [`orders/${orderId}/rejectedAt`]: Date.now(),
        [`orders/${orderId}/rejectedBy`]: 'user',
        [`orders/${orderId}/rejectionReason`]: reason,
        [`orders/${orderId}/platformFee`]: 0,
        [`orders/${orderId}/commissionAmount`]: 0,
        [`orders/${orderId}/feeDueDate`]: null,
        [`orders/${orderId}/isFine`]: false,
        [`orders/${orderId}/needsStatsReversal`]: wasAccepted,
        [`orders/${orderId}/userCancellationFee`]: wasAccepted ? 10 : 0,
        [`orders/${orderId}/userCancellationPaid`]: false,
        [`orders/${orderId}/userCancellationDueDate`]: wasAccepted ? Date.now() + (6 * 24 * 60 * 60 * 1000) : null,
      });
      
      // Send push notification to worker
      if (order.workerId) {
        try {
          const tokenSnap = await get(ref(db, `users/${order.workerId}/fcmToken`));
          const token = tokenSnap.val();
          if (token) {
            await FCMService.sendPushNotification(
              token,
              t('Booking Cancelled'),
              `${profile?.name || t('The customer')} ${t('has cancelled the booking.')}\n${t('Reason')}: ${reason}`,
              { orderId, path: '/worker', type: 'booking_cancelled' }
            );
          }
        } catch (err) {
          console.error('Failed to notify worker of cancellation:', err);
        }
      }

      setIsRejectionModalOpen(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error('Cancel order error:', error);
      alert('Failed to cancel order: ' + (error as any).message);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-6 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-8 rounded-b-[2.5rem] shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">{t('My Bookings')}</h1>
          <p className="text-blue-100 text-xs font-bold mt-1 uppercase tracking-widest">{t('Track your service requests')}</p>
        </div>
        
        <div className="flex bg-white/20 p-1 rounded-2xl overflow-x-auto no-scrollbar scroll-smooth mt-6 mb-2 border border-white/30 relative z-10">
          {FILTER_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={cn(
                "flex-1 min-w-fit whitespace-nowrap px-4 py-2.5 text-xs font-bold rounded-xl transition-all",
                filter === s 
                  ? "bg-white text-blue-600 shadow-sm" 
                  : "text-white hover:bg-white/10",
                language === 'en' ? "capitalize" : ""
              )}
            >
              {t(s)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 relative bg-slate-50 min-h-0">
        <AbstractGradientBackground />
        <div className="px-6 pt-6 pb-32 space-y-4 relative z-10">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-white animate-pulse rounded-2xl border border-slate-100" />
            ))}
          </div>
        ) : filteredOrders.length > 0 ? (
          filteredOrders.map((order) => {
            if (!order) return null;
            return (
              <motion.div
                key={order.id || Math.random().toString()}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => handleSetSelectedOrder(order)}
                className="bg-gradient-to-br from-white to-blue-50/30 p-5 rounded-[24px] border border-blue-100/50 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(59,130,246,0.15)] hover:border-blue-200 active:scale-[0.98] transition-all duration-300 cursor-pointer relative overflow-hidden group"
              >
                {/* Decorative background blur */}
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full blur-2xl opacity-40 group-hover:opacity-70 transition-opacity duration-300 pointer-events-none" />
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="font-bold text-slate-900 break-words leading-tight">{order.workerName || t('Worker')}</h3>
                    <p className="text-blue-600 text-xs font-semibold break-words leading-tight">{order.trade ? t(order.trade) : t('General Service')}</p>
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 px-3 py-1 rounded-full border text-[10px] font-bold",
                    getStatusColor(order.status || 'pending'),
                    language === 'en' ? "uppercase tracking-wider" : ""
                  )}>
                    {getStatusIcon(order.status || 'pending')}
                    <span>{t(order.status || 'pending')}</span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-4 text-slate-500 text-xs">
                    <div className="flex items-center gap-1">
                      <Clock size={14} className="text-blue-600" />
                      <span>{order.preferredTime || t('Time not set')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={14} className="text-blue-600" />
                      <span>{order.bookingDate ? new Date(order.bookingDate).toLocaleDateString() : new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-slate-500 text-xs">
                    <ClipboardList size={14} className="text-slate-400 mt-0.5 shrink-0" />
                    <span className="break-words leading-snug">{order.issue || order.description || t('No description')}</span>
                  </div>
                </div>

                {order.status?.toLowerCase() === 'rejected' && order.rejectionReason && (
                  <div className="mt-3 px-3 py-2 bg-red-50/50 rounded-xl border border-red-100/30">
                    <p className="text-[10px] text-red-600 font-bold italic leading-tight line-clamp-2">
                      "{order.rejectionReason}"
                    </p>
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                  <div>
                    <p className="text-slate-400 text-[10px] uppercase font-bold">{t('Amount')}</p>
                    <p className="text-slate-900 font-bold">
                      {['marriage hall', 'catering'].includes((order.trade || '').toLowerCase().trim()) 
                        ? formatCurrency(0) 
                        : formatCurrency(Number(order.offeredAmount) || 0)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap justify-end">
                    {order.status?.toLowerCase() === 'completed' && !order.isRated && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetSelectedOrder(order);
                          handleSetIsRateModalOpen(true);
                        }}
                        className="flex items-center gap-1 bg-amber-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-transform active:scale-95"
                      >
                        <Star size={12} className="fill-white" />
                        {t('Rate Now')}
                      </button>
                    )}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-blue-600 text-[10px] font-bold uppercase">{t('Details')}</span>
                      <ChevronRight size={14} className="text-blue-600" />
                    </div>
                  </div>
                </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="text-center py-20 relative z-10">
            <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-white/50 shadow-sm inline-block">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                <ClipboardList size={40} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{t('No Bookings')}</h3>
              <p className="text-slate-600 text-sm mb-6">
                {filter === 'all' 
                  ? t("You haven't booked any services yet.") 
                  : `${t("You don't have any bookings with status")} "${t(filter)}".`}
              </p>
              <div className="flex flex-col gap-3 items-center">
                <button 
                  onClick={() => navigate('/')}
                  className="btn-primary px-8 w-full"
                >
                  {t('Find a Worker')}
                </button>
                <button 
                  onClick={() => window.location.reload()}
                  className="text-blue-600 text-xs font-bold py-2"
                >
                  {t('Refresh Page')}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
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
              className="bg-white w-full max-w-md rounded-[2.5rem] p-8 max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">{t('Booking Details')}</h2>
                <button type="button" onClick={() => handleSetSelectedOrder(null)} className="text-slate-400">{t('Close')}</button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl flex-wrap">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-bold shrink-0">
                    {(selectedOrder.workerName || 'W').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <h3 className="font-bold text-slate-900 break-all leading-snug">{selectedOrder.workerName || t('Worker')}</h3>
                    <p className="text-blue-600 text-[11px] font-semibold break-words leading-tight">
                      {selectedOrder.trade ? t(selectedOrder.trade) : t('General Service')}
                      {selectedOrder.preferredTime && <span className="block text-slate-400 text-[10px]">{selectedOrder.preferredTime}</span>}
                    </p>
                  </div>
                  <div className={cn(
                    "ml-auto flex items-center gap-1 px-3 py-1.5 rounded-full border text-[10px] font-bold",
                    getStatusColor(selectedOrder.status || 'pending'),
                    language === 'en' ? "uppercase tracking-wider" : ""
                  )}>
                    {t(selectedOrder.status || 'pending')}
                  </div>
                </div>

                <div className="space-y-4">
                  {['auto', 'tempo', 'van', 'car', 'rentals'].includes((selectedOrder.trade || '').toLowerCase().trim()) ? (
                    <div className="space-y-4 bg-slate-50 p-4 rounded-2xl">
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
                        <p className="text-slate-700 text-sm bg-slate-50 p-3 rounded-xl break-all">{selectedOrder.issue || selectedOrder.description}</p>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                          {(selectedOrder.trade || '').toLowerCase().trim() === 'house rent'
                            ? t('Current Job')
                            : (selectedOrder.trade || '').toLowerCase().trim() === 'shop rent'
                              ? t('Previous job/work')
                              : (selectedOrder.trade || '').toLowerCase().trim() === 'marriage hall'
                                ? t('Expected Guest Count')
                                : t('Place of Work')}
                        </label>
                        <p className="text-slate-700 text-sm bg-blue-50/50 p-3 rounded-xl border border-blue-100/50 break-all">{selectedOrder.workAddress || t('Main Address')}</p>
                      </div>
                    </>
                  )}
                  {selectedOrder.status?.toLowerCase() === 'accepted' && selectedOrder.workerPhone && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t('Worker Phone')}</label>
                      <div className="flex items-center gap-2 text-slate-900 text-sm font-bold bg-green-50 p-3 rounded-xl border border-green-100">
                        <Phone size={16} className="text-green-600" />
                        {selectedOrder.workerPhone}
                        <a href={`tel:${selectedOrder.workerPhone}`} className="ml-auto bg-green-100 text-green-700 p-2 rounded-full hover:bg-green-200">
                          <Phone size={16} />
                        </a>
                      </div>
                    </div>
                  )}

                  {selectedOrder.status?.toLowerCase() === 'accepted' && selectedOrder.acceptedAt && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t('Accepted Date')}</label>
                      <div className="flex items-center gap-2 text-slate-700 text-sm bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        {new Date(selectedOrder.acceptedAt).toLocaleString()}
                      </div>
                    </div>
                  )}

                  {selectedOrder.status?.toLowerCase() === 'rejected' && selectedOrder.rejectedAt && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t('Rejected Date')}</label>
                      <div className="flex items-center gap-2 text-slate-700 text-sm bg-red-50 p-3 rounded-xl border border-red-100">
                        <XCircle size={14} className="text-red-600" />
                        {new Date(selectedOrder.rejectedAt).toLocaleString()}
                      </div>
                    </div>
                  )}

                  {selectedOrder.status?.toLowerCase() === 'rejected' && selectedOrder.rejectionReason && (
                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl relative overflow-hidden group hover:border-orange-200 transition-colors">
                      {/* Decorative background element */}
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t('Time')}</label>
                      <div className="flex items-center gap-2 text-slate-700 text-sm">
                        <Clock size={14} className="text-blue-600" />
                        <span>{selectedOrder.preferredTime}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t('Date')}</label>
                      <div className="flex items-center gap-2 text-slate-700 text-sm">
                        <Calendar size={14} className="text-blue-600" />
                        <span>{selectedOrder.bookingDate ? new Date(selectedOrder.bookingDate).toLocaleDateString() : new Date(selectedOrder.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t('Service Amount')}</label>
                      <div className="flex items-center gap-2 text-slate-700 text-sm">
                        <span className="font-bold text-blue-600">
                          {['marriage hall', 'catering'].includes((selectedOrder.trade || '').toLowerCase().trim()) 
                            ? formatCurrency(0) 
                            : formatCurrency(Number(selectedOrder.offeredAmount) || 0)}
                        </span>
                      </div>
                    </div>
                    {(selectedOrder.userCancellationFee || 0) > 0 && (
                      <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                        <label className="text-[9px] font-bold text-red-400 uppercase tracking-widest block mb-1">{t('Cancellation Fee')}</label>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-red-600">{formatCurrency(selectedOrder.userCancellationFee || 0)}</span>
                          <span className={cn(
                             "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md",
                             selectedOrder.userCancellationPaid ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                          )}>
                             {selectedOrder.userCancellationPaid ? t('Paid') : t('Unpaid')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t('Booking Date')}</label>
                    <p className="text-slate-700 text-sm">
                      {new Date(selectedOrder.createdAt).toLocaleString(language === 'ta' ? 'ta-IN' : 'en-IN', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true 
                      })}
                    </p>
                  </div>
                </div>

                {(selectedOrder.status?.toLowerCase() === 'pending' || selectedOrder.status?.toLowerCase() === 'accepted') && (
                  <button
                    onClick={() => handleSetIsRejectionModalOpen(true)}
                    className="w-full py-3 rounded-xl border-2 border-red-100 text-red-600 active:bg-red-50 hover:bg-red-50 text-xs font-bold transition-colors"
                  >
                    {t('Cancel Order')}
                  </button>
                )}

                {selectedOrder.status?.toLowerCase() === 'completed' && !selectedOrder.isRated && (
                  <button
                    onClick={() => handleSetIsRateModalOpen(true)}
                    className="w-full py-3 rounded-xl bg-amber-500 text-white font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <Star size={18} />
                    {t('Rate Worker')}
                  </button>
                )}

                {selectedOrder.status?.toLowerCase() === 'completed' && selectedOrder.isRated && (
                  <div className="w-full py-3 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-sm flex items-center justify-center gap-2">
                    <CheckCircle2 size={18} />
                    {t('Rated')}
                  </div>
                )}

                {isRateModalOpen && (
                  <RateWorkerModal 
                    workerId={selectedOrder.workerId} 
                    orderId={selectedOrder.id} 
                    onClose={() => handleSetIsRateModalOpen(false)} 
                  />
                )}
                {isRejectionModalOpen && (
                  <RejectionReasonModal
                    isOpen={isRejectionModalOpen}
                    onClose={() => handleSetIsRejectionModalOpen(false)}
                    onSubmit={handleCancelOrder}
                    isProcessing={isCancelling}
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
