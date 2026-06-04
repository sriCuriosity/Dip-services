import React, { useState, useEffect } from 'react';
import { ref, onValue, query, orderByChild, equalTo, update, get, increment } from 'firebase/database';
import { db } from '@/src/lib/firebase';
import { Order, WorkerProfile } from '@/src/types';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { AbstractGradientBackground } from '../Common/AbstractGradientBackground';
import { ClipboardList, Clock, CheckCircle2, XCircle, Phone, MessageSquare, MapPin, AlertCircle, Calendar, Hammer } from 'lucide-react';
import { cn, formatCurrency, formatDate, generateWhatsAppLink, apiFetch, calculatePlatformFeePercentage } from '@/src/lib/utils';
import { RejectionReasonModal } from '../Common/RejectionReasonModal';
import { motion, AnimatePresence } from 'framer-motion';

import { useNavigate, useOutletContext } from 'react-router-dom';
import { FCMService } from '@/src/lib/fcmService';
import { startBackgroundLocationTracking, stopBackgroundLocationTracking } from '@/src/lib/backgroundLocation';

export const WorkerDashboard: React.FC = () => {
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
  const [activeTab, setActiveTab] = useState<'pending' | 'active'>('pending');
  const [activeCompletionOrder, setActiveCompletionOrder] = useState<Order | null>(null);
  const [pendingAcceptanceOrder, setPendingAcceptanceOrder] = useState<Order | null>(null);
  const [receivedAmount, setReceivedAmount] = useState('');
  const [commissionConfirmed, setCommissionConfirmed] = useState(false);
  const [upiClicked, setUpiClicked] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [hasOverdueOrders, setHasOverdueOrders] = useState(false);
  const [isProfileImageOpen, setIsProfileImageOpen] = useState(false);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [pendingRejectionId, setPendingRejectionId] = useState<string | null>(null);
  

  useEffect(() => {
    const handlePopState = () => {
      // Restore states from history if present
      if (window.history.state?.modal === 'acceptance' && window.history.state?.order) {
        setPendingAcceptanceOrder(window.history.state.order);
      } else if (window.history.state?.modal !== 'acceptance') {
        setPendingAcceptanceOrder(null);
      }

      if (window.history.state?.modal === 'completion' && window.history.state?.order) {
        setActiveCompletionOrder(window.history.state.order);
      } else if (window.history.state?.modal !== 'completion') {
        setActiveCompletionOrder(null);
      }

      setIsProfileImageOpen(window.history.state?.modal === 'profile-img');
      setIsRejectionModalOpen(window.history.state?.modal === 'rejection');
      if (window.history.state?.modal === 'rejection' && window.history.state?.orderId) {
        setPendingRejectionId(window.history.state.orderId);
      }
    };

    // Check initial state on mount
    if (window.history.state?.modal === 'acceptance' && window.history.state?.order) {
      setPendingAcceptanceOrder(window.history.state.order);
    }
    if (window.history.state?.modal === 'completion' && window.history.state?.order) {
      setActiveCompletionOrder(window.history.state.order);
    }
    if (window.history.state?.modal === 'rejection') {
      setIsRejectionModalOpen(true);
      if (window.history.state?.orderId) setPendingRejectionId(window.history.state.orderId);
    }
    if (window.history.state?.modal === 'profile-img') setIsProfileImageOpen(true);

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSetPendingAcceptanceOrder = (order: Order | null) => {
    if (order) {
      window.history.pushState({ modal: 'acceptance', order: order }, '');
    }
    setPendingAcceptanceOrder(order);
  };

  const handleSetActiveCompletionOrder = (order: Order | null) => {
    if (order) {
      window.history.pushState({ modal: 'completion', order: order }, '');
    }
    setActiveCompletionOrder(order);
  };

  const handleSetIsProfileImageOpen = (isOpen: boolean) => {
    if (isOpen) {
      window.history.pushState({ modal: 'profile-img' }, '');
    }
    setIsProfileImageOpen(isOpen);
  };

  const handleSetIsRejectionModalOpen = (isOpen: boolean) => {
    if (isOpen) {
      window.history.pushState({ modal: 'rejection', orderId: pendingRejectionId }, '');
    }
    setIsRejectionModalOpen(isOpen);
  };
  const TAB_ORDER = ['pending', 'active'] as const;

  const handleSwipe = (direction: 'left' | 'right') => {
    const currentIndex = TAB_ORDER.indexOf(activeTab as any);
    if (direction === 'left') { // Right to Left swipe (Next)
      if (currentIndex < TAB_ORDER.length - 1) {
        setActiveTab(TAB_ORDER[currentIndex + 1]);
      }
    } else { // Left to Right swipe (Prev)
      if (currentIndex > 0) {
        setActiveTab(TAB_ORDER[currentIndex - 1]);
      }
    }
  };

  useEffect(() => {
    if (!profile) return;

    // Fetch worker specific profile
    const workerRef = ref(db, `workers/${profile.uid}`);
    const unsubWorker = onValue(workerRef, (snapshot) => {
      const data = snapshot.val();
      setWorkerProfile(data);
      
      // Auto-sync missing phone/email from user profile to worker profile
      if (data && (data.phone === undefined || data.email === undefined)) {
        if (profile.phone || profile.email) {
          update(workerRef, {
            phone: data.phone !== undefined ? data.phone : (profile.phone || ''),
            email: data.email !== undefined ? data.email : (profile.email || '')
          }).catch(err => console.error("Failed to sync worker contact info:", err));
        }
      }
      setLoadingStates(prev => ({ ...prev, worker: false }));
    }, (error) => {
      console.error("Worker profile error:", error);
      setLoadingStates(prev => ({ ...prev, worker: false }));
    });

    // Fetch outdoor specific profile
    const outdoorRef = ref(db, `outdoor_profiles/${profile.uid}`);
    const unsubOutdoor = onValue(outdoorRef, (snapshot) => {
      const data = snapshot.val();
      setOutdoorProfile(data);

      if (data && (data.phone === undefined || data.email === undefined)) {
        if (profile.phone || profile.email) {
          update(outdoorRef, {
            phone: data.phone !== undefined ? data.phone : (profile.phone || ''),
            email: data.email !== undefined ? data.email : (profile.email || '')
          }).catch(err => console.error("Failed to sync outdoor contact info:", err));
        }
      }
      setLoadingStates(prev => ({ ...prev, outdoor: false }));
    }, (error) => {
      console.error("Outdoor profile error:", error);
      setLoadingStates(prev => ({ ...prev, outdoor: false }));
    });

    // Fetch shop specific profile
    const shopRef = ref(db, `shops/${profile.uid}`);
    const unsubShop = onValue(shopRef, (snapshot) => {
      const data = snapshot.val();
      setShopProfile(data);

      if (data && (data.phone === undefined || data.email === undefined)) {
        if (profile.phone || profile.email) {
          update(shopRef, {
            phone: data.phone !== undefined ? data.phone : (profile.phone || ''),
            email: data.email !== undefined ? data.email : (profile.email || '')
          }).catch(err => console.error("Failed to sync shop contact info:", err));
        }
      }
      setLoadingStates(prev => ({ ...prev, shop: false }));
    }, (error) => {
      console.error("Shop profile error:", error);
      setLoadingStates(prev => ({ ...prev, shop: false }));
    });

    const ordersRef = ref(db, 'orders');
    const workerOrdersQuery = query(ordersRef, orderByChild('workerId'), equalTo(profile.uid));
    const broadcastQuery = query(ordersRef, orderByChild('status'), equalTo('pending'));

    let ownOrders: Order[] = [];
    let broadcastOrders: Order[] = [];

    const mergeAndSet = () => {
      // Merge own orders + broadcast orders where this worker is listed
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
      const overdue = ownOrders.some(order => {
        const status = order.status?.toLowerCase();
        const isDone = status === 'completed' || (status === 'rejected' && (order as any).isFine);
        if (!isDone || order.commissionPaid || (order.platformFee || 0) <= 0 || (order as any).paymentRequested === true) return false;
        const milestone = order.completedAt || order.rejectedAt || order.acceptedAt || order.createdAt;
        if (!milestone) return false;
        return (milestone + 6 * 24 * 60 * 60 * 1000) < now;
      });
      setHasOverdueOrders(overdue);
    };

    const unsubOrders = onValue(workerOrdersQuery, (snapshot) => {
      const data = snapshot.val();
      ownOrders = data
        ? (Object.entries(data).map(([key, value]) => ({ ...(value || {} as any), id: key })) as Order[])
        : [];
      mergeAndSet();
      setLoadingStates(prev => ({ ...prev, orders: false }));
    }, (error) => {
      console.error("Orders error:", error);
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
      unsubOrders();
      unsubBroadcast();
    };
  }, [profile]);


  // Dedicated effect: process any pending stat reversals from user cancellations
  useEffect(() => {
    if (!profile) return;

    const pending = orders.filter((o: any) => o.needsStatsReversal === true && o.statsAdded === true);
    if (pending.length === 0) return;

    const processReversal = async () => {
      for (const order of pending) {
        try {
          const workerSnap = await get(ref(db, `workers/${profile.uid}`));
          const workerData = workerSnap.val();
          if (!workerData) continue;

          const amount = Number(order.offeredAmount) || 0;
          const newJobs = Math.max(0, (Number(workerData.totalJobs) || 0) - 1);
          const newEarnings = Math.max(0, (Number(workerData.totalEarnings) || 0) - amount);

          const fixUpdates: any = {
            [`workers/${profile.uid}/totalJobs`]: newJobs,
            [`workers/${profile.uid}/totalEarnings`]: newEarnings,
            [`orders/${order.id}/needsStatsReversal`]: false,
          };

          if (order.trade && workerData.trades?.[order.trade]) {
            const tData = workerData.trades[order.trade];
            fixUpdates[`workers/${profile.uid}/trades/${order.trade}/totalJobs`] = Math.max(0, (Number(tData.totalJobs) || 0) - 1);
            fixUpdates[`workers/${profile.uid}/trades/${order.trade}/totalEarnings`] = Math.max(0, (Number(tData.totalEarnings) || 0) - amount);
          }

          await update(ref(db), fixUpdates);
        } catch (err) {
          console.error('Reversal error for order', order.id, err);
        }
      }
    };

    processReversal();
  }, [profile, orders]);


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

  const handleStatusUpdate = async (orderId: string, newStatus: Order['status'], reason?: string) => {
    if (newStatus === 'accepted' && hasOverdueOrders) {
      alert(t("Please complete overdue jobs first."));
      return;
    }

    try {
      const updates: any = {
        [`orders/${orderId}/status`]: newStatus
      };

      if (newStatus === 'rejected') {
        const order = orders.find(o => o.id === orderId);
        const wasAccepted = order?.status?.toLowerCase() === 'accepted';
        
        updates[`orders/${orderId}/rejectedAt`] = Date.now();
        updates[`orders/${orderId}/rejectedBy`] = 'worker';
        if (reason) updates[`orders/${orderId}/rejectionReason`] = reason;
        
        if (wasAccepted && workerProfile) {
          // Calculate 25% fine based on original platform fee
          const originalFee = order?.platformFee || 0;
          const fine = parseFloat((originalFee * 0.25).toFixed(2));
          
          if (fine > 0) {
            const now = Date.now();
            // Store fine separately, keep original platformFee for reference
            updates[`orders/${orderId}/commissionAmount`] = fine;
            updates[`orders/${orderId}/fineAmount`] = fine;
            updates[`orders/${orderId}/isFine`] = true;
            updates[`orders/${orderId}/commissionPaid`] = false;
            updates[`orders/${orderId}/feeDueDate`] = now + (6 * 24 * 60 * 60 * 1000);
          } else {
            updates[`orders/${orderId}/platformFee`] = null;
            updates[`orders/${orderId}/commissionAmount`] = null;
            updates[`orders/${orderId}/feeDueDate`] = null;
          }
        } else {
          // If was just pending, remove everything
          updates[`orders/${orderId}/platformFee`] = null;
          updates[`orders/${orderId}/commissionAmount`] = null;
          updates[`orders/${orderId}/feeDueDate`] = null;
        }
      }

      if (newStatus === 'completed') {
        const now = Date.now();
        const orderSnap = await get(ref(db, `orders/${orderId}`));
        const orderData = orderSnap.val();
        
        updates[`orders/${orderId}/completedAt`] = now;
        // Only set to false if it wasn't already paid
        if (orderData && orderData.commissionPaid === true) {
          updates[`orders/${orderId}/commissionPaid`] = true;
          updates[`orders/${orderId}/statsAdded`] = true;
        } else {
          updates[`orders/${orderId}/commissionPaid`] = false;
          updates[`orders/${orderId}/statsAdded`] = false;
        }
        updates[`orders/${orderId}/feeDueDate`] = now + (6 * 24 * 60 * 60 * 1000);
      }

      await update(ref(db), updates);

      if (newStatus === 'rejected') {
        setStatusMessage(t('Job rejected successfully'));
        setTimeout(() => setStatusMessage(null), 3000);
      }

      const order = orders.find(o => o.id === orderId);
      if (order && order.userId) {
        let title = t('Booking Update');
        let body = t('Update regarding your service request.');
        
        if (newStatus === 'accepted') {
          title = t('Booking Accepted!');
          body = `${workerProfile?.name || ''} ${t('The worker has accepted your job request.')}`;
        } else if (newStatus === 'rejected') {
          title = t('Booking Declined');
          body = `${t('The worker is currently unavailable for this job.')}${reason ? `\n${t('Reason')}: ${reason}` : ''}`;
        } else if (newStatus === 'completed') {
          title = t('Job Completed');
          body = `${t('Your job with')} ${workerProfile?.name || t('the worker')} ${t('has been marked as completed.')}`;
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
          console.error('Failed to send direct status push', err);
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleFinalAccept = async () => {
    if (!pendingAcceptanceOrder || !profile) return;
    
    try {
      const offeredAmt = pendingAcceptanceOrder.offeredAmount || 0;
      const feeRate = calculatePlatformFeePercentage(pendingAcceptanceOrder.trade);
      const commission = parseFloat((offeredAmt * feeRate).toFixed(2));
      const now = Date.now();
      const sixDaysInMs = 6 * 24 * 60 * 60 * 1000;

      const updates: any = {
        [`orders/${pendingAcceptanceOrder.id}/status`]: 'accepted',
        [`orders/${pendingAcceptanceOrder.id}/acceptedAt`]: now,
        [`orders/${pendingAcceptanceOrder.id}/platformFee`]: commission,
        [`orders/${pendingAcceptanceOrder.id}/commissionAmount`]: commission,
        [`orders/${pendingAcceptanceOrder.id}/commissionPaid`]: false,
        [`orders/${pendingAcceptanceOrder.id}/paymentRequested`]: false,
        [`orders/${pendingAcceptanceOrder.id}/statsAdded`]: false,
        [`orders/${pendingAcceptanceOrder.id}/feeDueDate`]: now + (6 * 24 * 60 * 60 * 1000),
        // Update worker details in case it was a broadcast
        [`orders/${pendingAcceptanceOrder.id}/workerId`]: profile.uid,
        [`orders/${pendingAcceptanceOrder.id}/workerName`]: workerProfile?.name || profile.name || 'Worker',
        [`orders/${pendingAcceptanceOrder.id}/workerPhone`]: workerProfile?.phone || profile.phone || '',
        [`orders/${pendingAcceptanceOrder.id}/workerEmail`]: workerProfile?.email || profile.email || '',
      };

      // Stats increment is now delayed until admin verification of commission payment.
      await update(ref(db), updates);

      // Trigger Direct Notification (Zero Server Cost)
      if (pendingAcceptanceOrder.userId) {
        try {
          const tokenSnap = await get(ref(db, `users/${pendingAcceptanceOrder.userId}/fcmToken`));
          const token = tokenSnap.val();
          if (token) {
            await FCMService.sendPushNotification(
              token,
              t('Booking Accepted!'),
              `${workerProfile?.name || ''} ${t('The worker has accepted your job request.')}`,
              { orderId: pendingAcceptanceOrder.id, path: '/orders', type: 'booking_status' }
            );
          }
        } catch (err) {
          console.error('Failed to send direct accept push', err);
        }
      }

      // Notify other broadcasted workers that the job is taken
      if (pendingAcceptanceOrder.broadcastedTo && Array.isArray(pendingAcceptanceOrder.broadcastedTo)) {
        try {
          const otherWorkerUids = pendingAcceptanceOrder.broadcastedTo.filter(uid => uid !== profile.uid);
          
          if (otherWorkerUids.length > 0) {
            const workersRef = ref(db, 'workers');
            const workersSnap = await get(workersRef);
            const workersData = workersSnap.val() || {};
            
            const notificationTitle = t('Job Accepted');
            const notificationBody = t('This job has been accepted by another driver.');
            
            await Promise.all(otherWorkerUids.map(uid => {
              const otherWorker = workersData[uid];
              if (otherWorker && otherWorker.fcmToken) {
                return FCMService.sendPushNotification(
                  otherWorker.fcmToken,
                  notificationTitle,
                  notificationBody,
                  { orderId: pendingAcceptanceOrder!.id, path: '/worker', type: 'job_taken' }
                ).catch(err => console.error(`Failed to notify worker ${uid}`, err));
              }
              return Promise.resolve();
            }));
          }
        } catch (err) {
          console.error('Failed to notify other broadcasted workers', err);
        }
      }

      setPendingAcceptanceOrder(null);
      setStatusMessage(t('Job accepted successfully'));
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error("Error accepting job:", err);
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
      const feeRate = calculatePlatformFeePercentage(activeCompletionOrder.trade);
      const commission = parseFloat((finalAmt * feeRate).toFixed(2));
      const now = Date.now();
      const sixDaysInMs = 6 * 24 * 60 * 60 * 1000;
      
       const updates: any = {
        [`orders/${activeCompletionOrder.id}/status`]: 'completed',
        [`orders/${activeCompletionOrder.id}/receivedAmount`]: finalAmt,
        [`orders/${activeCompletionOrder.id}/completedAt`]: now,
        [`orders/${activeCompletionOrder.id}/feeDueDate`]: now + sixDaysInMs
      };

      // Only update commission if it hasn't been paid/verified yet
      if (currentOrder && currentOrder.commissionPaid === true) {
        updates[`orders/${activeCompletionOrder.id}/commissionPaid`] = true;
        updates[`orders/${activeCompletionOrder.id}/statsAdded`] = true;
        updates[`orders/${activeCompletionOrder.id}/paymentStatus`] = 'verified';
        // Keep existing fee info
        updates[`orders/${activeCompletionOrder.id}/platformFee`] = currentOrder.platformFee || 0;
        updates[`orders/${activeCompletionOrder.id}/commissionAmount`] = currentOrder.commissionAmount || 0;
      } else {
        updates[`orders/${activeCompletionOrder.id}/platformFee`] = commission;
        updates[`orders/${activeCompletionOrder.id}/commissionAmount`] = commission;
        updates[`orders/${activeCompletionOrder.id}/commissionPaid`] = false;
        updates[`orders/${activeCompletionOrder.id}/paymentStatus`] = 'pending';
        updates[`orders/${activeCompletionOrder.id}/statsAdded`] = false;
      }

      // Stats will be fully computed only when paymentStatus becomes "verified" / commissionPaid is true.
      await update(ref(db), updates);
      
      // Trigger Direct Push Notification (Zero Server Cost)
      if (activeCompletionOrder.userId) {
        try {
          const tokenSnap = await get(ref(db, `users/${activeCompletionOrder.userId}/fcmToken`));
          const token = tokenSnap.val();
          if (token) {
            await FCMService.sendPushNotification(
              token,
              t('Job Completed'),
              `${t('Your job with')} ${workerProfile?.name || t('the worker')} ${t('has been marked as completed.')}`,
              { orderId: activeCompletionOrder.id, path: '/user/history', type: 'booking_completed' }
            );
          }
        } catch (err) {
          console.error('Failed to send direct completion push', err);
        }
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
    return false;
  });

  // Background Location Tracking for Available Workers
  useEffect(() => {
    if (profile && workerProfile?.isAvailable) {
      startBackgroundLocationTracking((lat, lng) => {
        const workerRef = ref(db, `workers/${profile.uid}`);
        update(workerRef, {
          latitude: lat,
          longitude: lng,
          lastLocationUpdate: Date.now()
        }).catch(err => console.error("Failed to update bg location:", err));
      }, (errType) => {
        console.warn("[Worker] BgLocation error:", errType);
      });
    } else {
      stopBackgroundLocationTracking();
    }

    return () => {
      stopBackgroundLocationTracking();
    };
  }, [profile, workerProfile?.isAvailable]);

  if (loading) {
    return (
      <div className="p-8 flex-1 flex flex-col items-center justify-center min-h-[70vh]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const hasRegularProfile = workerProfile && workerProfile.trades && typeof workerProfile.trades === 'object' && Object.keys(workerProfile.trades).length > 0;
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
    if (workerProfile?.trades && typeof workerProfile.trades === 'object') {
      Object.keys(workerProfile.trades).forEach(trade => {
        updates[`trades/${trade}/isAvailable`] = newStatus;
      });
    }
    update(ref(db, `workers/${profile.uid}`), updates);
  };



  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-[#2d3446] px-6 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-6 rounded-b-[2rem] shadow-2xl relative overflow-hidden">
        {/* Low-poly geometric background elements */}
        <div className="absolute -inset-0 opacity-20">
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
            onClick={() => handleSetIsProfileImageOpen(true)}
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
          >
            <div className={cn("w-2 h-2 rounded-full", workerProfile?.isAvailable ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-slate-500")} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">
              {workerProfile?.isAvailable ? t('Available') : t('Busy')}
            </span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-white/5 p-1.5 rounded-[1.5rem] border border-white/5 backdrop-blur-md relative z-10 overflow-x-auto no-scrollbar gap-1">
          {(['pending', 'active'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 px-4 py-3 text-[11px] font-black rounded-2xl transition-all uppercase tracking-wider whitespace-nowrap min-w-fit",
                activeTab === tab ? "bg-white text-[#2d3446] shadow-xl scale-[1.02]" : "text-white/40 hover:text-white/60"
              )}
            >
              {t(tab === 'pending' ? 'Pending' : 'Active')}
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
          const threshold = 50;
          if (info.offset.x < -threshold) {
             handleSwipe('left');
          } else if (info.offset.x > threshold) {
             handleSwipe('right');
          }
        }}
      >
        <AbstractGradientBackground />
        <div className="px-6 pt-6 pb-32 space-y-4 relative z-10">
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
                  <h3 className="font-bold text-slate-900 break-words leading-snug">
                    <span className="text-slate-400 font-medium mr-1">{t('Client')}:</span>
                    {order.userName || t('User')}
                  </h3>
                  <p className="text-blue-600 text-xs font-bold">{t(order.trade)}</p>
                  <div className="bg-slate-50 p-3 rounded-xl mb-3 text-left">
                    {['auto', 'tempo', 'van', 'car', 'rentals'].includes((order.trade || '').toLowerCase().trim()) ? (
                      <div className="space-y-3">
                        {/* Source */}
                        <div className="flex items-start gap-2">
                          <MapPin size={14} className="text-green-500 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0 flex flex-col items-start text-left">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('Source')}</span>
                            <p className="text-[12px] font-bold text-slate-700 leading-tight block">{order.pickupPoint || t('No source provided')}</p>
                          </div>
                        </div>
                        {/* Destination */}
                        <div className="flex items-start gap-2">
                          <MapPin size={14} className="text-red-500 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0 flex flex-col items-start text-left">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('Destination')}</span>
                            <p className="text-[12px] font-bold text-slate-700 leading-tight block">{order.workAddress || t('No destination provided')}</p>
                          </div>
                        </div>
                        {/* Pickup Point (User Note / Pin) */}
                        <div className="flex items-start gap-2 pt-2 border-t border-slate-200/50">
                          <div className="flex-1 min-w-0 flex flex-col items-start text-left">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('Pickup Point')}</span>
                            <p className="text-slate-600 text-[12px] font-medium leading-relaxed italic break-words w-full text-left">"{order.issue || order.description || t('No description')}"</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                            {(order.trade || '').toLowerCase().trim() === 'jcb'
                              ? t('Purpose of Work')
                              : (order.trade || '').toLowerCase().trim() === 'shop rent'
                                ? t('Type of Shop')
                                : (order.trade || '').toLowerCase().trim() === 'house rent'
                                  ? t('Type of Family')
                                  : (order.trade || '').toLowerCase().trim() === 'coconut plucker'
                                    ? t('Number of trees (approximately)')
                                    : ['marriage hall', 'catering'].includes((order.trade || '').toLowerCase().trim())
                                      ? t('What kind of function')
                                      : t('Description')}
                        </span>
                        <p className="text-slate-600 text-[13px] font-medium leading-relaxed italic break-words">"{order.issue || order.description || t('No description')}"</p>
                      </>
                    )}
                  </div>

                  {!['auto', 'tempo', 'van', 'car', 'rentals'].includes((order.trade || '').toLowerCase().trim()) && (
                    <div className="mb-3 py-2 px-3 bg-blue-50/50 rounded-xl border border-blue-100/30 flex items-start gap-2">
                      <MapPin size={12} className="text-blue-500 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
                            {(order.trade || '').toLowerCase().trim() === 'house rent'
                              ? t('Current Job')
                              : (order.trade || '').toLowerCase().trim() === 'shop rent'
                                ? t('Previous job/work')
                                : (order.trade || '').toLowerCase().trim() === 'marriage hall'
                                  ? t('Expected Guest Count')
                                  : t('Place of Work')}
                        </span>
                        <p className="text-[11px] font-bold text-slate-700 break-all leading-tight">{order.workAddress || t('Main Address')}</p>
                      </div>
                    </div>
                  )}

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
                  <div className="flex items-start gap-1 text-slate-500 text-xs mt-1">
                    <MapPin size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <span className="leading-tight break-words flex-1 min-w-0">
                      {order.userAddress || t('No address provided')}
                      {order.city && <>, {order.city}</>}
                      {order.landmark && (
                        <div className="text-[10px] text-slate-400 mt-0.5 break-words">
                          <span className="font-semibold">{t('Landmark')}:</span> {order.landmark}
                        </div>
                      )}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-blue-600 font-bold">
                    {['marriage hall', 'catering'].includes((order.trade || '').toLowerCase().trim()) 
                      ? formatCurrency(0) 
                      : formatCurrency(order.offeredAmount)}
                  </p>
                  <p className={cn(
                    "text-slate-400 text-[10px] font-bold",
                    language === 'en' ? "uppercase" : ""
                  )}>{t(order.duration)}</p>
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
                      onClick={() => {
                        setPendingRejectionId(order.id);
                        handleSetIsRejectionModalOpen(true);
                      }}
                      className="flex-1 py-3 px-1 rounded-xl border-2 border-slate-100 text-slate-500 text-[10px] font-bold active:bg-slate-50 leading-tight text-center flex items-center justify-center min-h-[48px]"
                    >
                      {t('Decline')}
                    </button>
                    <button 
                      onClick={() => handleSetPendingAcceptanceOrder(order)}
                      disabled={hasOverdueOrders}
                      className="flex-[2] btn-primary text-[10px] font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:border-slate-300 disabled:text-slate-500 leading-tight px-1 text-center flex items-center justify-center min-h-[48px]"
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
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border-2 border-green-100 text-green-600 text-[9px] font-bold active:bg-green-50 leading-tight text-center overflow-hidden"
                    >
                      <MessageSquare size={12} className="shrink-0" />
                      <span>{t('Chat')}</span>
                    </button>
                    <button 
                      onClick={() => {
                        if (window.confirm(t('Are you sure you want to cancel this job? The platform fee and earnings will be removed from your stats.'))) {
                          setPendingRejectionId(order.id);
                          handleSetIsRejectionModalOpen(true);
                        }
                      }}
                      className="flex-1 py-3 px-1 rounded-xl border-2 border-red-50 text-red-500 text-[9px] font-bold active:bg-red-50 leading-tight text-center"
                    >
                      {t('Cancel')}
                    </button>
                    <button 
                      onClick={() => {
                        if (window.confirm(t('Are you sure you want to mark this job as completed?'))) {
                          handleStatusUpdate(order.id, 'completed');
                        }
                      }}
                      className="flex-[2] btn-primary bg-green-600 text-[10px] font-bold leading-tight"
                    >
                      {t('Mark Completed')}
                    </button>
                  </>
                )}
                {order.status?.toLowerCase() === 'completed' && (
                  <div className="w-full py-3 bg-green-50 text-green-600 rounded-xl text-center text-[10px] font-bold flex items-center justify-center gap-2 px-2">
                    <CheckCircle2 size={14} className="shrink-0" />
                    <span className="leading-tight">{t('Job Completed Successfully')}</span>
                  </div>
                )}
                {order.status?.toLowerCase() === 'rejected' && (
                  <div className="w-full py-3 bg-slate-50 text-slate-400 rounded-xl text-center text-[10px] font-bold leading-tight">
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
      </motion.div>

      {/* Acceptance Modal */}
      <AnimatePresence>
        {pendingAcceptanceOrder && (
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
                <h2 className="text-xl font-bold text-slate-900">{t('Accept Job')}</h2>
                <button onClick={() => window.history.back()} className="text-slate-400 font-bold">{t('Close')}</button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-2 block">{t('Final Amount Received (₹)')}</label>
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center">
                    <span className="text-2xl font-bold text-slate-900">
                      {['marriage hall', 'catering'].includes((pendingAcceptanceOrder.trade || '').toLowerCase().trim()) 
                        ? '0' 
                        : pendingAcceptanceOrder.offeredAmount}
                    </span>
                  </div>
                </div>

                <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[13px] font-bold text-slate-500">
                          {t('Platform Fee')} ({(calculatePlatformFeePercentage(pendingAcceptanceOrder.trade) * 100).toFixed(0)}%)
                        </span>
                        <span className="text-lg font-black text-slate-900">
                         {formatCurrency(parseFloat(((pendingAcceptanceOrder.offeredAmount || 0) * calculatePlatformFeePercentage(pendingAcceptanceOrder.trade)).toFixed(2)))}
                       </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                      {t('This fee will be added to your pending balance. You have 6 days to pay it.')}
                    </p>
                </div>

                <button
                  onClick={handleFinalAccept}
                  className="btn-primary w-full py-5 rounded-[2rem] shadow-xl shadow-blue-200"
                >
                  {t('Accept')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion Modal - No longer needed with new flow, keeping skeleton for safety if state persists */}
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
                <button onClick={() => window.history.back()} className="text-slate-400 font-bold">{t('Close')}</button>
              </div>
              <div className="space-y-6">
                <p className="text-slate-600 font-medium text-center">{t('Are you sure you want to mark this job as completed?')}</p>
                <button
                  onClick={() => {
                    handleStatusUpdate(activeCompletionOrder.id, 'completed');
                    setActiveCompletionOrder(null);
                  }}
                  className="btn-primary bg-green-600 w-full"
                >
                  {t('Confirm Completion')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isProfileImageOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => window.history.back()}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="relative max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={profile?.photoURL || ''} 
                alt="Profile" 
                className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl object-contain border-4 border-white/20"
              />
              <button
                onClick={() => window.history.back()}
                className="absolute -top-4 -right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg text-slate-900 z-[120]"
              >
                <XCircle size={24} />
              </button>
            </motion.div>
          </motion.div>
        )}
        {isRejectionModalOpen && (
          <RejectionReasonModal
            isOpen={isRejectionModalOpen}
              onClose={() => window.history.back()}
            onSubmit={(reason) => {
              if (pendingRejectionId) {
                handleStatusUpdate(pendingRejectionId, 'rejected', reason);
                setIsRejectionModalOpen(false);
                setPendingRejectionId(null);
              }
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
};
