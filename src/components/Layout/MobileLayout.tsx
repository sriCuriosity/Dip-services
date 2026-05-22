import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, ClipboardList, User, Briefcase, LayoutDashboard, Calendar, TrendingUp, Users, MessageSquare, Building2, XCircle, Truck } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { cn } from '@/src/lib/utils';
import { ref, onValue, get, update, query, orderByChild, equalTo, increment } from 'firebase/database';
import { db } from '@/src/lib/firebase';
import { Order } from '@/src/types';
import { DirectMessageModal } from '../Common/DirectMessageModal';
import { FCMService } from '@/src/lib/fcmService';
import { Capacitor } from '@capacitor/core';

export const MobileLayout: React.FC = () => {
  const { profile, loading } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [pendingJobsCount, setPendingJobsCount] = useState(0);
  const [lastPendingJobsCount, setLastPendingJobsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [lastUnreadCount, setLastUnreadCount] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationType, setNotificationType] = useState<'message' | 'job' | 'admin_message' | 'booking_status'>('message');
  const [bookingStatusPath, setBookingStatusPath] = useState('/orders');
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading) {
      timer = setTimeout(() => setShowLogout(true), 5000);
    } else {
      setShowLogout(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (!profile) return;

    const messagesRef = ref(db, `messages/${profile.uid}`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const unreadMessages = Object.values(data).filter((msg: any) => {
          if (msg.read) return false;
          // If I am admin, I only care about messages NOT from 'admin'
          if (profile.role?.toLowerCase() === 'admin') return msg.senderId !== 'admin';
          // If I am user/worker, I only care about messages NOT from my own uid
          return msg.senderId !== profile.uid;
        });
        const unreadCount = unreadMessages.length;
        
        if (unreadCount > lastUnreadCount && !isChatOpen) {
          const latestMsg = unreadMessages[unreadMessages.length - 1] as any;
          if (latestMsg.senderId === 'admin') {
            setNotificationType('admin_message');
          } else {
            setNotificationType('message');
          }
          setShowNotification(true);
          setTimeout(() => setShowNotification(false), 5000);
        }
        
        setUnreadMessagesCount(unreadCount);
        setLastUnreadCount(unreadCount);
        
        // Final safeguard: if chat is currently open, we should keep the badge at 0
        if (isChatOpen) {
           setUnreadMessagesCount(0);
           setLastUnreadCount(0);
        }
      } else {
        setUnreadMessagesCount(0);
      }
    });

    return () => unsubscribe();
  }, [profile]);

  useEffect(() => {
    if (profile && Capacitor.isNativePlatform()) {
      FCMService.setNavigateHandler((path) => {
        navigate(path);
      });
      FCMService.registerPushNotifications(profile.uid, profile.role === 'worker');
    }
  }, [profile, navigate]);

  // Don't block rendering — Outlet must always mount so useOutletContext works
  const lastPendingJobsCountRef = React.useRef(0);

  useEffect(() => {
    if (!profile || profile.role?.toLowerCase() !== 'worker' || !profile.uid) {
      setPendingJobsCount(0);
      return;
    }

    const ordersRef = ref(db, 'orders');
    const workerOrdersQuery = query(ordersRef, orderByChild('workerId'), equalTo(profile.uid));
    
    const unsubscribe = onValue(workerOrdersQuery, async (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const workerOrders = Object.entries(data).map(([id, val]: [string, any]) => ({
          ...(val || {}),
          id
        })) as Order[];
        
        const pendingCount = workerOrders.filter(o => o.status?.toLowerCase() === 'pending').length;
        
        // 1. Job Notification
        if (pendingCount > lastPendingJobsCountRef.current) {
          setNotificationType('job');
          setShowNotification(true);
          setTimeout(() => setShowNotification(false), 5000);
        }
        lastPendingJobsCountRef.current = pendingCount;
        setPendingJobsCount(pendingCount);

        // 2. Global stat addition on Admin Payment Verification (Atomic Update)
        const ordersNeedingStats = workerOrders.filter(
          (o: any) => o.commissionPaid === true && !o.statsAdded
        );

        for (const order of ordersNeedingStats) {
          try {
            const amount = Number(order.receivedAmount || order.offeredAmount) || 0;
            const updates: any = {
              [`workers/${profile.uid}/totalJobs`]: increment(1),
              [`workers/${profile.uid}/totalEarnings`]: increment(amount),
              [`orders/${order.id}/statsAdded`]: true,
            };

            // Also update specific trade stats atomically if trade exists
            if (order.trade) {
               updates[`workers/${profile.uid}/trades/${order.trade}/totalJobs`] = increment(1);
               updates[`workers/${profile.uid}/trades/${order.trade}/totalEarnings`] = increment(amount);
            }

            await update(ref(db), updates);
          } catch (err) {
            console.error('MobileLayout atomic stat sync failed:', err);
          }
        }

        // 3. Global stat reversal on User Cancellation (Atomic Reversal)
        const pendingReversals = workerOrders.filter((o: any) => o.needsStatsReversal === true && o.statsAdded === true);
        
        for (const order of pendingReversals) {
          try {
            const amount = Number(order.receivedAmount || order.offeredAmount) || 0;
            const revUpdates: any = {
              [`workers/${profile.uid}/totalJobs`]: increment(-1),
              [`workers/${profile.uid}/totalEarnings`]: increment(-amount),
              [`orders/${order.id}/needsStatsReversal`]: false,
              [`orders/${order.id}/statsAdded`]: false,
            };

            if (order.trade) {
              revUpdates[`workers/${profile.uid}/trades/${order.trade}/totalJobs`] = increment(-1);
              revUpdates[`workers/${profile.uid}/trades/${order.trade}/totalEarnings`] = increment(-amount);
            }

            await update(ref(db), revUpdates);
          } catch (err) {
            console.error('MobileLayout atomic reversal failed:', err);
          }
        }
      } else {
        setPendingJobsCount(0);
        lastPendingJobsCountRef.current = 0;
      }
    });

    return () => unsubscribe();
  }, [profile?.uid, profile?.role]);

  // NEW: Listener for User Booking Status Updates (for in-app Toast)
  useEffect(() => {
    if (!profile || profile.role?.toLowerCase() !== 'user' || !profile.uid) return;

    const ordersRef = ref(db, 'orders');
    const userOrdersQuery = query(ordersRef, orderByChild('userId'), equalTo(profile.uid));
    
    // We'll store the last seen statuses to detect changes
    const lastStatuses = new Map<string, string>();

    const unsubscribe = onValue(userOrdersQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        Object.entries(data).forEach(([id, val]: [string, any]) => {
          const status = val.status?.toLowerCase();
          const prevStatus = lastStatuses.get(id);
          
          if (prevStatus && prevStatus !== status) {
            // Status changed! Show notification
            setNotificationType('booking_status');
            setBookingStatusPath(status === 'accepted' ? '/orders' : '/user/history');
            setShowNotification(true);
            setTimeout(() => setShowNotification(false), 5000);
          }
          lastStatuses.set(id, status);
        });
      }
    });

    return () => unsubscribe();
  }, [profile?.uid, profile?.role]);

  const getNavItems = (): Array<{to: string, icon: any, label: string, badge?: number, onClick?: () => void}> => {
    console.log('MobileLayout - Profile:', profile);
    if (!profile) return [];
    const role = profile.role?.toLowerCase();
    console.log('MobileLayout - Role:', role);

    if (role === 'admin') {
      return [
        { to: '/admin', icon: LayoutDashboard, label: 'Stats' },
        { to: '/orders', icon: ClipboardList, label: 'All Orders' },
        { to: '/profile', icon: User, label: 'Profile' },
      ];
    }

    if (role === 'worker') {
      return [
        { to: '/worker/jobs', icon: ClipboardList, label: 'Jobs', badge: pendingJobsCount > 0 ? pendingJobsCount : undefined },
        { to: '/worker/earnings', icon: TrendingUp, label: 'Earnings' },
        { to: '/profile', icon: User, label: 'Profile' },
      ];
    }

    return [
      { to: '/', icon: Home, label: 'Services' },
      { to: '/rentals', icon: Truck, label: 'Rentals' },
      { to: '/orders', icon: ClipboardList, label: 'My Bookings' },
      { to: '/profile', icon: User, label: 'Profile' },
    ];
  };

  const navItems = getNavItems();

  return (
    <div className="mobile-container relative">
      {/* Notification Toast */}
      {showNotification && (
        <div 
          className={cn(
            "fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-sm p-4 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 animate-in slide-in-from-top duration-300 cursor-pointer border",
            notificationType === 'job' ? "bg-emerald-600 border-emerald-500 text-white" : "bg-white border-slate-200 text-slate-900"
          )}
          onClick={() => {
            if (notificationType === 'message' || notificationType === 'admin_message') {
              setIsChatOpen(true);
              setUnreadMessagesCount(0);
              setLastUnreadCount(0);
            } else if (notificationType === 'booking_status') {
              navigate(bookingStatusPath);
            } else {
              navigate('/worker');
            }
            setShowNotification(false);
          }}
        >
          <div className={cn(
            "p-2 rounded-xl",
            notificationType === 'job' ? "bg-white/20" : "bg-slate-100 text-slate-600"
          )}>
            {notificationType === 'job' ? <ClipboardList size={20} /> : <MessageSquare size={20} />}
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">
              {notificationType === 'job' 
                ? t('New Job Request') 
                : notificationType === 'admin_message'
                  ? t('Message from Admin')
                  : notificationType === 'booking_status'
                    ? t('Booking Update')
                    : t('Admin have sent u a message')}
            </p>
            <p className={cn(
              "text-xs",
              notificationType === 'job' ? "text-white/80" : "text-slate-500"
            )}>
              {notificationType === 'job' 
                ? t('A new job request has been assigned to you.')
                : notificationType === 'admin_message'
                  ? t('Admin has sent you a message.')
                  : notificationType === 'booking_status'
                    ? t('Your booking status has been updated.')
                    : t('A user has sent you a message.')}
            </p>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowNotification(false);
            }}
            className={cn(
              "p-1 rounded-lg",
              notificationType === 'job' ? "hover:bg-white/10" : "hover:bg-slate-100 text-slate-400"
            )}
          >
            <XCircle size={18} />
          </button>
        </div>
      )}

      <main className="flex-1 overflow-y-auto no-scrollbar pb-28">
        <Outlet context={{ setIsChatOpen, unreadMessagesCount }} />
      </main>

      <nav className={cn(
        "fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-slate-900 border-t border-slate-800 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] z-50 overflow-x-auto",
        "flex items-center justify-around"
      )}>
        {navItems.map((item) => (
          item.onClick ? (
            <button
              key={item.label}
              onClick={item.onClick}
              className={cn(
                "flex flex-col items-center gap-1 transition-colors relative min-w-[60px] px-2",
                "text-slate-500 hover:text-slate-400"
              )}
            >
              <div className="relative">
                <item.icon size={22} />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[9px] font-bold leading-[1.1] text-center px-0.5 w-full line-clamp-2 whitespace-pre-line",
                language === 'en' ? "uppercase tracking-wider" : ""
              )}>
                {t(item.label)}
              </span>
            </button>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/' || item.to === '/worker' || item.to === '/worker/jobs'}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 transition-colors relative min-w-[60px] px-2",
                  isActive ? "text-blue-400" : "text-slate-500 hover:text-slate-400"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    {item.label === 'Profile' && profile?.photoURL ? (
                      <div className={cn(
                        "w-6 h-6 rounded-full overflow-hidden border",
                        isActive ? "border-blue-400" : "border-slate-600"
                      )}>
                        <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    ) : (
                      <item.icon size={22} />
                    )}
                    {item.badge && (
                      <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    "text-[9px] font-bold leading-[1.1] text-center px-0.5 w-full line-clamp-2 whitespace-pre-line",
                    language === 'en' ? "uppercase tracking-wider" : ""
                  )}>
                    {t(item.label)}
                  </span>
                </>
              )}
            </NavLink>
          )
        ))}
      </nav>

      {profile && (
        <DirectMessageModal
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          targetId={profile.uid}
          targetName={profile.name || 'User'}
          isAdmin={profile.role?.toLowerCase() === 'admin'}
        />
      )}
    </div>
  );
};
