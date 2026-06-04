import React, { useState, useEffect } from 'react';
import { ref, onValue, query, orderByChild, equalTo, update, get } from 'firebase/database';
import { db } from '@/src/lib/firebase';
import { Order, WorkerProfile } from '@/src/types';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { AbstractGradientBackground } from '../Common/AbstractGradientBackground';
import { ClipboardList, Clock, CheckCircle2, XCircle, Phone, MessageSquare, MapPin, AlertCircle, Calendar, Hammer } from 'lucide-react';
import { FCMService } from '@/src/lib/fcmService';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatCurrency, generateWhatsAppLink } from '@/src/lib/utils';

import { useNavigate, useOutletContext } from 'react-router-dom';

export const JobRequest: React.FC = () => {
  const { profile } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const outletContext = useOutletContext<{ setIsChatOpen: (open: boolean) => void, unreadMessagesCount: number }>() || { setIsChatOpen: () => {}, unreadMessagesCount: 0 };
  const { setIsChatOpen, unreadMessagesCount } = outletContext;
  const [orders, setOrders] = useState<Order[]>([]);
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null);
  const [outdoorProfile, setOutdoorProfile] = useState<any | null>(null);
  const [shopProfile, setShopProfile] = useState<any | null>(null);
  const [loadingStates, setLoadingStates] = useState({
    worker: true,
    outdoor: true,
    shop: true,
    orders: true
  });
  const loading = loadingStates.worker || loadingStates.outdoor || loadingStates.shop || loadingStates.orders;
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'completed' | 'declined'>('pending');
  const [activeCompletionOrder, setActiveCompletionOrder] = useState<Order | null>(null);
  const [receivedAmount, setReceivedAmount] = useState('');
  const [commissionConfirmed, setCommissionConfirmed] = useState(false);
  const [upiClicked, setUpiClicked] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [hasOverdueOrders, setHasOverdueOrders] = useState(false);
  const [isProfileImageOpen, setIsProfileImageOpen] = useState(false);

  useEffect(() => {
    if (!profile) return;

    // Fetch worker specific profile
    const workerRef = ref(db, `workers/${profile.uid}`);
    const unsubWorker = onValue(workerRef, (snapshot) => {
      const data = snapshot.val();
      setWorkerProfile(data);
      if (data && (!data.phone || !data.email)) {
        update(workerRef, {
          phone: profile.phone || '',
          email: profile.email || ''
        }).catch(err => console.error("Failed to sync worker contact info:", err));
      }
      setLoadingStates(prev => ({ ...prev, worker: false }));
    });

    // Fetch outdoor specific profile
    const outdoorRef = ref(db, `outdoor_profiles/${profile.uid}`);
    const unsubOutdoor = onValue(outdoorRef, (snapshot) => {
      const data = snapshot.val();
      setOutdoorProfile(data);
      if (data && (!data.phone || !data.email)) {
        update(outdoorRef, {
          phone: profile.phone || '',
          email: profile.email || ''
        }).catch(err => console.error("Failed to sync outdoor contact info:", err));
      }
      setLoadingStates(prev => ({ ...prev, outdoor: false }));
    });

    // Fetch shop specific profile
    const shopRef = ref(db, `shops/${profile.uid}`);
    const unsubShop = onValue(shopRef, (snapshot) => {
      const data = snapshot.val();
      setShopProfile(data);
      if (data && (!data.phone || !data.email)) {
        update(shopRef, {
          phone: profile.phone || '',
          email: profile.email || ''
        }).catch(err => console.error("Failed to sync shop contact info:", err));
      }
      setLoadingStates(prev => ({ ...prev, shop: false }));
    });

    const ordersRef = ref(db, 'orders');
    const workerOrdersQuery = query(ordersRef, orderByChild('workerId'), equalTo(profile.uid));
    const broadcastQuery = query(ordersRef, orderByChild('status'), equalTo('pending'));

    let ownOrders: Order[] = [];
    let broadcastOrders: Order[] = [];

    const mergeAndSet = () => {
      const broadcastFiltered = broadcastOrders.filter(o =>
        o.workerId === 'broadcast' &&
        Array.isArray((o as any).broadcastedTo) &&
        (o as any).broadcastedTo.includes(profile.uid) &&
        !ownOrders.find(own => own.id === o.id)
      );
      const merged = [...ownOrders, ...broadcastFiltered]
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setOrders(merged);

      const now = Date.now();
      const overdue = ownOrders.some(order =>
        order.status === 'completed' &&
        !order.commissionPaid &&
        order.feeDueDate &&
        order.feeDueDate < now
      );
      setHasOverdueOrders(overdue);
    };

    const unsubscribe = onValue(workerOrdersQuery, (snapshot) => {
      const data = snapshot.val();
      ownOrders = data
        ? (Object.entries(data).map(([key, value]) => ({ ...(value || {} as any), id: key })) as Order[])
        : [];
      mergeAndSet();
      setLoadingStates(prev => ({ ...prev, orders: false }));
    });

    const unsubBroadcast = onValue(broadcastQuery, (snapshot) => {
      const data = snapshot.val();
      broadcastOrders = data
        ? (Object.entries(data).map(([key, value]) => ({ ...(value || {} as any), id: key })) as Order[])
        : [];
      mergeAndSet();
    }, () => { broadcastOrders = []; });

    return () => {
      unsubWorker();
      unsubOutdoor();
      unsubShop();
      unsubscribe();
      unsubBroadcast();
    };
  }, [profile]);

  // Watch for external status changes (e.g. user cancelling) while modal is open
  useEffect(() => {
    if (activeCompletionOrder) {
      const updatedOrder = orders.find(o => o.id === activeCompletionOrder.id);
      if (updatedOrder && updatedOrder.status === 'rejected') {
        setActiveCompletionOrder(null);
        alert(t("This order has been cancelled by the user."));
      }
    }
  }, [orders, activeCompletionOrder]);

  const handleStatusUpdate = async (orderId: string, newStatus: Order['status']) => {
    if (newStatus === 'accepted' && hasOverdueOrders) {
      alert(t("Please complete overdue jobs first."));
      return;
    }

    try {
      const updates: any = {
        [`orders/${orderId}/status`]: newStatus
      };

      if (newStatus === 'accepted') {
        updates[`orders/${orderId}/acceptedAt`] = Date.now();
        updates[`orders/${orderId}/workerId`] = profile?.uid;
        updates[`orders/${orderId}/workerName`] = workerProfile?.name || profile?.name || 'Worker';
      }

      if (newStatus === 'rejected') {
        updates[`orders/${orderId}/rejectedAt`] = Date.now();
      }

      if (newStatus === 'completed') {
        updates[`orders/${orderId}/completedAt`] = Date.now();
        
        // Update worker stats
        if (workerProfile) {
          const order = orders.find(o => o.id === orderId);
          if (order) {
            updates[`workers/${profile?.uid}/totalJobs`] = (workerProfile.totalJobs || 0) + 1;
            updates[`workers/${profile?.uid}/totalEarnings`] = (workerProfile.totalEarnings || 0) + order.offeredAmount;
          }
        }
      }

      await update(ref(db), updates);

      if (newStatus === 'rejected') {
        setStatusMessage(t('Job rejected successfully'));
        setTimeout(() => setStatusMessage(null), 3000);
      }
      const order = orders.find(o => o.id === orderId);
      if (order && order.userId) {
        let title = t('Booking Update');
        let body = t('Your job with the worker has been marked as completed.'); // Default fallback
        
        if (newStatus === 'accepted') {
          title = t('Booking Accepted!');
          body = t('The worker has accepted your job request.');
        } else if (newStatus === 'rejected') {
          title = t('Booking Declined');
          body = t('The worker is currently unavailable for this job.');
        } else if (newStatus === 'completed') {
          title = t('Job Completed');
          body = t('Your job with the worker has been marked as completed.');
        }

        try {
          const tokenSnap = await get(ref(db, `users/${order.userId}/fcmToken`));
          const token = tokenSnap.val();
          if (token) {
            await FCMService.sendPushNotification(
              token,
              title,
              body,
              {
                orderId,
                path: newStatus === 'accepted' ? '/orders' : '/user/history',
                type: 'booking_status'
              }
            );
          }
        } catch (err) {
          console.error('Failed to send status push notification', err);
        }

        // Notify other broadcasted workers that the job is taken
        if (newStatus === 'accepted' && order.broadcastedTo && Array.isArray(order.broadcastedTo)) {
          try {
            const otherWorkerUids = order.broadcastedTo.filter((uid: string) => uid !== profile?.uid);
            
            if (otherWorkerUids.length > 0) {
              const workersRef = ref(db, 'workers');
              const workersSnap = await get(workersRef);
              const workersData = workersSnap.val() || {};
              
              const notificationTitle = t('Job Accepted');
              const notificationBody = t('This job has been accepted by another driver.');
              
              await Promise.all(otherWorkerUids.map((uid: string) => {
                const otherWorker = workersData[uid];
                if (otherWorker && otherWorker.fcmToken) {
                  return FCMService.sendPushNotification(
                    otherWorker.fcmToken,
                    notificationTitle,
                    notificationBody,
                    { orderId: order.id, path: '/worker', type: 'job_taken' }
                  ).catch(err => console.error(`Failed to notify worker ${uid}`, err));
                }
                return Promise.resolve();
              }));
            }
          } catch (err) {
            console.error('Failed to notify other broadcasted workers', err);
          }
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleCompleteOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeCompletionOrder) return;

    try {
      // Double check status before proceeding
      const snapshot = await get(ref(db, `orders/${activeCompletionOrder.id}`));
      const currentOrder = snapshot.val();
      
      if (!currentOrder || currentOrder.status !== 'accepted') {
        alert(t("This order is no longer active or has been cancelled."));
        setActiveCompletionOrder(null);
        return;
      }

      const finalAmt = parseFloat(receivedAmount || String(activeCompletionOrder.offeredAmount) || '0');
      const commission = parseFloat((finalAmt * 0.02).toFixed(2));
      const now = Date.now();
      const sixDaysInMs = 6 * 24 * 60 * 60 * 1000;
      
      const updates: any = {
        [`orders/${activeCompletionOrder.id}/status`]: 'completed',
        [`orders/${activeCompletionOrder.id}/receivedAmount`]: finalAmt,
        [`orders/${activeCompletionOrder.id}/platformFee`]: commission,
        [`orders/${activeCompletionOrder.id}/commissionAmount`]: commission,
        [`orders/${activeCompletionOrder.id}/commissionPaid`]: false,
        [`orders/${activeCompletionOrder.id}/paymentStatus`]: 'pending',
        [`orders/${activeCompletionOrder.id}/completedAt`]: now,
        [`orders/${activeCompletionOrder.id}/feeDueDate`]: now + sixDaysInMs
      };

      // Update worker stats
      if (workerProfile) {
        const trade = activeCompletionOrder.trade;
        const tradeProfile = workerProfile.trades?.[trade];

        updates[`workers/${profile?.uid}/totalJobs`] = (workerProfile.totalJobs || 0) + 1;
        updates[`workers/${profile?.uid}/totalEarnings`] = (workerProfile.totalEarnings || 0) + finalAmt;
        
        if (tradeProfile) {
          updates[`workers/${profile?.uid}/trades/${trade}/totalJobs`] = (tradeProfile.totalJobs || 0) + 1;
          updates[`workers/${profile?.uid}/trades/${trade}/totalEarnings`] = (tradeProfile.totalEarnings || 0) + finalAmt;
        }
      }

      await update(ref(db), updates);
      
      // Trigger Push Notification to User
        try {
          const tokenSnap = await get(ref(db, `users/${activeCompletionOrder.userId}/fcmToken`));
          const token = tokenSnap.val();
          if (token) {
            await FCMService.sendPushNotification(
              token,
              t('Job Completed'),
              `${t('Your job with')} ${workerProfile?.name || t('the worker')} ${t('has been marked as completed.')}`,
              {
                orderId: activeCompletionOrder.id,
                path: '/orders',
                type: 'booking_completed'
              }
            );
          }
        } catch (err) {
          console.error('Failed to send completion push notification', err);
        }

      setActiveCompletionOrder(null);
      setReceivedAmount('');
    } catch (err) {
      console.error("Error completing order:", err);
    }
  };

  const filteredOrders = orders.filter(order => {
    const status = order.status?.toLowerCase();
    if (activeTab === 'pending') return status === 'pending';
    if (activeTab === 'active') return status === 'accepted';
    if (activeTab === 'completed') return status === 'completed';
    if (activeTab === 'declined') return status === 'rejected';
    return false;
  });

  if (loading) {
    return (
      <div className="p-8 flex-1 flex flex-col items-center justify-center min-h-[70vh]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const hasRegularProfile = workerProfile && workerProfile.trades && Object.keys(workerProfile.trades).length > 0;
  const hasOutdoorProfile = outdoorProfile && outdoorProfile.trade;
  const hasShopProfile = shopProfile && shopProfile.name;

  if (!hasRegularProfile && !hasOutdoorProfile && !hasShopProfile) {
    return (
      <div className="p-8 flex-1 flex flex-col items-center justify-center min-h-[70vh] text-center">
        <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mb-6">
          <AlertCircle size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('Complete Your Profile')}</h2>
        <p className="text-slate-500 mb-8 text-sm">{t('You need to set your trade and rates before you can receive job requests.')}</p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button 
            onClick={() => navigate('/worker/profile')}
            className="btn-primary w-full"
          >
            {t('Setup Service Profile')}
          </button>
          <button 
            onClick={() => navigate('/worker/outdoor-profile')}
            className="btn-secondary w-full bg-white border-2 border-slate-200 text-slate-700 py-3 rounded-xl font-bold"
          >
            {t('Setup Outdoor Profile')}
          </button>
          <button 
            onClick={() => navigate('/worker/shop-profile')}
            className="btn-secondary w-full bg-white border-2 border-slate-200 text-slate-700 py-3 rounded-xl font-bold"
          >
            {t('Setup Shop Profile')}
          </button>
        </div>
      </div>
    );
  }

  const toggleAvailability = () => {
    if (!profile) return;
    const newStatus = !workerProfile?.isAvailable;
    const updates: any = {
      isAvailable: newStatus
    };
    if (workerProfile?.trades) {
      Object.keys(workerProfile.trades).forEach(trade => {
        updates[`trades/${trade}/isAvailable`] = newStatus;
      });
    }
    update(ref(db, `workers/${profile.uid}`), updates);
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-[#2d3446] px-6 pt-12 pb-10 rounded-b-[3rem] shadow-2xl relative overflow-hidden">
        {/* Low-poly geometric background elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] bg-[#4a5568] rotate-[15deg] skew-x-[-10deg]" />
          <div className="absolute top-[10%] right-[-5%] w-[35%] h-[50%] bg-[#3a445a] rotate-[-20deg] skew-y-[5deg]" />
          <div className="absolute bottom-[-15%] left-[20%] w-[50%] h-[40%] bg-[#4a5568] rotate-[5deg] skew-x-[20deg]" />
          <div className="absolute top-[30%] left-[40%] w-[20%] h-[30%] bg-[#5a677c] rotate-[45deg]" />
        </div>
        
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#2d3446] via-transparent to-transparent opacity-60" />
        
        {statusMessage && (
          <div className="relative z-20 bg-red-500/20 text-white p-3 rounded-2xl mb-4 text-sm font-bold text-center backdrop-blur-md border border-white/10">
            {t(statusMessage)}
          </div>
        )}
        {hasOverdueOrders && (
          <div className="relative z-20 bg-red-500/20 border border-red-400/30 p-4 rounded-2xl mb-4 flex items-start gap-3 backdrop-blur-md">
            <AlertCircle className="text-red-100 shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="text-sm font-bold text-white">{t('Action Required')}</h3>
              <p className="text-xs text-red-100 mt-1">
                {t('You have overdue platform fees. Please pay them in the Earnings section to accept new jobs.')}
              </p>
            </div>
          </div>
        )}

        {/* Top Bar */}
        <div className="flex items-center justify-between mb-8 relative z-10">
          <button 
            onClick={() => setIsProfileImageOpen(true)}
            className="w-20 h-20 rounded-full bg-white/10 overflow-hidden border-4 border-white/20 flex-shrink-0 shadow-2xl transition-transform hover:scale-105 active:scale-95"
          >
            {profile?.photoURL ? (
              <img 
                src={profile.photoURL} 
                alt={profile.displayName || 'Profile'} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-black text-2xl">
                {(profile?.displayName || 'W').charAt(0).toUpperCase()}
              </div>
            )}
          </button>
          
          <div className="text-center">
            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mb-1">{t('DIP Services')}</p>
            <h1 className="text-xl font-black text-white tracking-tight uppercase">{t('Job Requests')}</h1>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsChatOpen(true)}
              className="relative p-2 text-white/50 hover:text-white transition-colors"
            >
              <MessageSquare size={24} />
              {unreadMessagesCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0f172a]" />
              )}
            </button>
          </div>
        </div>

        {/* Availability */}
        <div className="flex items-center mb-8 relative z-10 px-2">
          <button
            onClick={toggleAvailability}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full transition-all border border-white/10 backdrop-blur-md",
              workerProfile?.isAvailable ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-slate-400"
            )}
            style={{
              backgroundColor: workerProfile?.isAvailable ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
              color: workerProfile?.isAvailable ? '#34d399' : '#94a3b8'
            }}
          >
            <div
              className={cn("w-2 h-2 rounded-full", workerProfile?.isAvailable ? "bg-emerald-400" : "bg-slate-500")}
              style={{ backgroundColor: workerProfile?.isAvailable ? '#34d399' : '#64748b' }}
            />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">
              {workerProfile?.isAvailable ? t('Available') : t('Busy')}
            </span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-white/5 p-1.5 rounded-[1.5rem] border border-white/5 backdrop-blur-md relative z-10">
          {(['pending', 'active', 'completed', 'declined'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest",
                activeTab === tab 
                  ? 'bg-slate-800 text-white shadow-xl border border-white/5' 
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              )}
            >
              {t(tab)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 relative bg-emerald-100/40 min-h-screen">
        <AbstractGradientBackground />
        <div className="p-6 space-y-4 relative z-10">
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-40 bg-white animate-pulse rounded-2xl border border-slate-100" />
            ))}
          </div>
        ) : filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-white to-blue-50/30 p-5 rounded-[24px] border border-blue-100/50 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(59,130,246,0.15)] hover:border-blue-200 transition-all duration-300 relative overflow-hidden group"
            >
              {/* Decorative background blur */}
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full blur-2xl opacity-40 group-hover:opacity-70 transition-opacity duration-300 pointer-events-none" />
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 truncate">
                    <span className="text-slate-400 font-medium mr-1">{t('Client')}:</span>
                    {order.userName || t('User')}
                  </h3>
                  <p className="text-blue-600 text-xs font-bold">{t(order.trade)}</p>
                  <div className="flex items-center gap-2 text-slate-500 text-xs mt-1">
                    <div className="flex items-center gap-1">
                      <Phone size={12} className="text-slate-400" />
                      <span>{order.status?.toLowerCase() === 'accepted' ? (order.userPhone || t('No phone provided')) : t('Hidden until accepted')}</span>
                    </div>
                    {order.status?.toLowerCase() === 'accepted' && order.userPhone && (
                      <a href={`tel:${order.userPhone}`} className="bg-green-100 text-green-700 p-1 rounded-full hover:bg-green-200">
                        <Phone size={12} />
                      </a>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 mt-2 w-full text-left">
                    <div className="flex items-start gap-2">
                      <MapPin size={12} className="text-slate-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0 flex flex-col items-start text-left">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('Source')}</span>
                        <p className="text-[11px] font-bold text-slate-700 leading-tight block break-words">{order.pickupPoint || t('No source provided')}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin size={12} className="text-slate-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0 flex flex-col items-start text-left">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('Destination')}</span>
                        <p className="text-[11px] font-bold text-slate-700 leading-tight block break-words">{order.workAddress || t('No destination provided')}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin size={12} className="text-slate-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0 flex flex-col items-start text-left">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('Pickup Point')}</span>
                        <p className="text-[11px] font-bold text-slate-700 leading-tight block break-words">{order.issue || t('No pickup details provided')}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-blue-600 font-bold">{formatCurrency(order.offeredAmount)}</p>
                  <p className={cn(
                    "text-slate-400 text-[10px] font-bold",
                    language === 'en' ? "uppercase" : ""
                  )}>{t(order.duration)}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl mb-4">
                <p className="text-slate-600 text-xs leading-relaxed italic">"{order.issue || order.description || t('No description')}"</p>
              </div>

              <div className="flex items-center gap-4 text-slate-500 text-xs mb-6">
                <div className="flex items-center gap-1">
                  <Clock size={14} className="text-blue-600" />
                  <span className="font-medium">{order.preferredTime || t('Time not set')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar size={14} className="text-blue-600" />
                  <span className="font-medium">{order.bookingDate ? new Date(order.bookingDate).toLocaleDateString() : new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="mb-6">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t('Booking Date')}</label>
                <p className="text-slate-700 text-xs font-medium">
                  {new Date(order.createdAt).toLocaleString(language === 'ta' ? 'ta-IN' : 'en-IN', { 
                    day: 'numeric', 
                    month: 'short', 
                    year: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </p>
              </div>

              <div className="flex gap-2">
                {order.status?.toLowerCase() === 'pending' && (
                  <>
                    <button 
                      onClick={() => handleStatusUpdate(order.id, 'rejected')}
                      className="flex-1 py-3 rounded-xl border-2 text-[10px] font-bold leading-tight"
                      style={{ borderColor: '#e2e8f0', color: '#64748b', backgroundColor: 'transparent' }}
                    >
                      {t('Decline')}
                    </button>
                    <button 
                      onClick={() => handleStatusUpdate(order.id, 'accepted')}
                      disabled={hasOverdueOrders}
                      className="flex-[2] btn-primary text-[10px] font-bold leading-tight"
                      style={hasOverdueOrders ? { opacity: 0.5, cursor: 'not-allowed', backgroundColor: '#cbd5e1', borderColor: '#cbd5e1', color: '#64748b' } : {}}
                    >
                      {hasOverdueOrders ? t('Blocked (Overdue)') : t('Accept Job')}
                    </button>
                  </>
                )}
                {order.status?.toLowerCase() === 'accepted' && (
                  <>
                    <button 
                      onClick={() => {
                        const link = generateWhatsAppLink('91' + order.userId, `Hi ${order.userName}, I've accepted your request for ${order.trade}. I'll be there at ${order.preferredTime}.`);
                        window.open(link, '_blank');
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-[10px] font-bold leading-tight"
                      style={{ borderColor: '#bbf7d0', color: '#16a34a', backgroundColor: 'transparent' }}
                    >
                      <MessageSquare size={14} />
                      <span>{t('Chat')}</span>
                    </button>
                    <button 
                      onClick={() => {
                        setActiveCompletionOrder(order);
                        setReceivedAmount(String(order.offeredAmount));
                        setCommissionConfirmed(false);
                        setUpiClicked(false);
                      }}
                      className="flex-[2] btn-primary text-[10px] font-bold leading-tight"
                      style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', color: '#ffffff' }}
                    >
                      {t('Mark Completed')}
                    </button>
                  </>
                )}
                {order.status?.toLowerCase() === 'completed' && (
                  <div
                    className="w-full py-3 rounded-xl text-center text-[10px] font-bold flex items-center justify-center gap-2 px-2"
                    style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}
                  >
                    <CheckCircle2 size={14} className="shrink-0" />
                    <span className="leading-tight">{t('Job Completed Successfully')}</span>
                  </div>
                )}
                {order.status?.toLowerCase() === 'rejected' && (
                  <div
                    className="w-full py-3 rounded-xl text-center text-[10px] font-bold leading-tight"
                    style={{ backgroundColor: '#f8fafc', color: '#94a3b8' }}
                  >
                    {t('Job Declined')}
                  </div>
                )}
              </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
              <ClipboardList size={40} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">{t('No')} {t(activeTab)} {t('Jobs')}</h3>
            <p className="text-slate-500 text-sm px-6">{t("When you get new requests, they'll appear here.")}</p>
          </div>
        )}
      </div>
    </div>

      {/* Completion Modal */}
      <AnimatePresence>
        {activeCompletionOrder && (
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
              className="bg-white w-full max-w-md rounded-[2.5rem] p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">{t('Complete Job')}</h2>
                <button onClick={() => setActiveCompletionOrder(null)} className="text-slate-400">{t('Close')}</button>
              </div>

              <form onSubmit={handleCompleteOrder} className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">{t('Final Amount Received (₹)')}</label>
                  <input
                    type="number"
                    className="input-field"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    required
                  />
                  <div className="bg-slate-50 p-4 rounded-xl mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-slate-500">{t('Platform fee (2%)')}</span>
                      <span className="text-sm font-bold text-slate-900">
                        {formatCurrency(parseFloat((parseFloat(receivedAmount || '0') * 0.02).toFixed(2)))}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {t('This fee will be added to your pending balance. You have 6 days to pay it.')}
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full"
                  style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', color: '#ffffff' }}
                >
                  {t('Confirm Completion')}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {isProfileImageOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsProfileImageOpen(false)}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="relative max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setIsProfileImageOpen(false)}
                className="absolute -top-12 right-0 text-white/70 hover:text-white p-2"
              >
                <XCircle size={32} />
              </button>
              {profile?.photoURL ? (
                <img 
                  src={profile.photoURL} 
                  alt={profile.displayName || 'Profile'} 
                  className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl object-contain border-4 border-white/10"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-64 h-64 rounded-full bg-white/10 flex items-center justify-center text-white font-black text-6xl border-4 border-white/20">
                  {(profile?.displayName || 'W').charAt(0).toUpperCase()}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
