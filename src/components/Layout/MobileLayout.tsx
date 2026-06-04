import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, ClipboardList, User, LayoutDashboard, TrendingUp, MessageSquare, XCircle, Truck } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { cn } from '@/src/lib/utils';
import { ref, onValue, update, query, orderByChild, equalTo, increment } from 'firebase/database';
import { db } from '@/src/lib/firebase';
import { Order } from '@/src/types';
import { DirectMessageModal } from '../Common/DirectMessageModal';
import { FCMService } from '@/src/lib/fcmService';
import { Capacitor } from '@capacitor/core';
import { WorkerDirectoryProvider } from '@/src/contexts/WorkerDirectoryContext';
import { LayoutOutletProvider, LayoutOutletValue } from '@/src/contexts/LayoutOutletContext';
import { hashToPath, isUserSubPath, isUserTabPath, notifyHashChange, setAppHash, UserTabPath } from '@/src/lib/navigation';
import { UserDashboard } from '../User/UserDashboard';
import { RentalsList } from '../User/RentalsList';
import { OrderHistory } from '../User/OrderHistory';
import { Profile } from '../Profile/Profile';
import { BookingHistory } from '../User/BookingHistory';
import { UserFees } from '../User/UserFees';
import { ShopList } from '../User/ShopList';
import { MembersList } from '../User/MembersList';
import { ShopProfileSetup } from '../Profile/ShopProfileSetup';
import { About } from '../Common/About';
import { FAQ } from '../Common/FAQ';
import { PrivacySecurity } from '../Common/PrivacySecurity';
import { TermsOfService } from '../Common/TermsOfService';

function initialUserTab(): UserTabPath {
  const path = hashToPath();
  return isUserTabPath(path) ? path : '/';
}

function initialUserSubPage(): string | null {
  const path = hashToPath();
  return isUserSubPath(path) ? path : null;
}

const USER_SUB_PAGES: Record<string, React.FC> = {
  '/user/history': BookingHistory,
  '/user/fees': UserFees,
  '/shops': ShopList,
  '/members': MembersList,
  '/profile/shop-setup': ShopProfileSetup,
  '/about': About,
  '/faq': FAQ,
  '/privacy-security': PrivacySecurity,
  '/terms': TermsOfService,
};

export const MobileLayout: React.FC = () => {
  const { profile, loading } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const isUserRole = profile?.role?.toLowerCase() === 'user';

  const [activeUserTab, setActiveUserTab] = useState<UserTabPath>(initialUserTab);
  const [activeSubPage, setActiveSubPage] = useState<string | null>(initialUserSubPage);
  const [navTick, setNavTick] = useState(0);
  const displayPath = hashToPath();

  const isNavActive = (path: string) => {
    if (isUserRole && isUserTabPath(path)) return activeUserTab === path;
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const goTo = useCallback(
    (path: string) => {
      const target = path.startsWith('/') ? path : `/${path}`;
      FCMService.cancelPendingRedirect();
      setIsChatOpen(false);
      setShowNotification(false);
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';

      /* Worker/admin routes must use the router — never user tab state */
      if (target.startsWith('/worker') || target.startsWith('/admin')) {
        setActiveSubPage(null);
        setAppHash(target);
        navigate(target, { replace: true });
        notifyHashChange();
        window.scrollTo(0, 0);
        return;
      }

      if (isUserRole && isUserSubPath(target)) {
        setActiveSubPage(target);
        setAppHash(target);
        navigate(target, { replace: false });
        notifyHashChange();
        window.scrollTo(0, 0);
        return;
      }

      if (isUserRole && isUserTabPath(target)) {
        setActiveSubPage(null);
        setActiveUserTab(target);
        setAppHash(target);
        navigate(target, { replace: false });
        notifyHashChange();
        setNavTick((n) => n + 1);
        window.scrollTo(0, 0);
        return;
      }

      if (isUserRole) {
        setActiveSubPage(null);
      }
      setNavTick((n) => n + 1);
      setAppHash(target);
      navigate(target, { replace: false });
      notifyHashChange();
      window.scrollTo(0, 0);
    },
    [isUserRole, navigate]
  );

  useEffect(() => {
    const role = profile?.role?.toLowerCase();
    if (role === 'worker' || role === 'admin') {
      setActiveSubPage(null);
      return;
    }
    if (!isUserRole) return;
    const path = hashToPath();
    if (isUserSubPath(path)) {
      setActiveSubPage(path);
      return;
    }
    if (isUserTabPath(path)) {
      setActiveUserTab(path);
      setActiveSubPage(null);
    }
  }, [isUserRole, profile?.role, location.hash]);

  useEffect(() => {
    setIsChatOpen(false);
    setShowNotification(false);
    document.body.style.overflow = '';
    document.body.style.pointerEvents = '';
    window.scrollTo(0, 0);
  }, [activeUserTab, displayPath, navTick]);

  const [pendingJobsCount, setPendingJobsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [lastUnreadCount, setLastUnreadCount] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationType, setNotificationType] = useState<'message' | 'job' | 'admin_message' | 'booking_status'>('message');
  const [bookingStatusPath, setBookingStatusPath] = useState('/orders');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading) timer = setTimeout(() => setShowLogout(true), 5000);
    else setShowLogout(false);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (!profile) return;
    const messagesRef = ref(db, `messages/${profile.uid}`);
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const data = snapshot.val();
        if (data) {
          const unreadMessages = Object.values(data).filter((msg: any) => {
            if (msg.read) return false;
            if (profile.role?.toLowerCase() === 'admin') return msg.senderId !== 'admin';
            return msg.senderId !== profile.uid;
          });
          const unreadCount = unreadMessages.length;
          if (unreadCount > lastUnreadCount && !isChatOpen) {
            const latestMsg = unreadMessages[unreadMessages.length - 1] as any;
            setNotificationType(latestMsg.senderId === 'admin' ? 'admin_message' : 'message');
            setShowNotification(true);
            setTimeout(() => setShowNotification(false), 5000);
          }
          setUnreadMessagesCount(unreadCount);
          setLastUnreadCount(unreadCount);
          if (isChatOpen) {
            setUnreadMessagesCount(0);
            setLastUnreadCount(0);
          }
        } else {
          setUnreadMessagesCount(0);
        }
      }, 350);
    });
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubscribe();
    };
  }, [profile, isChatOpen, lastUnreadCount]);

  useEffect(() => {
    if (!profile) return;
    FCMService.setNavigateHandler((path) => goTo(path));
    if (Capacitor.isNativePlatform()) {
      FCMService.registerPushNotifications(profile.uid, profile.role === 'worker');
    }
  }, [profile, goTo]);

  const lastPendingJobsCountRef = React.useRef(0);
  const statsSyncTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!profile || profile.role?.toLowerCase() !== 'worker' || !profile.uid) {
      setPendingJobsCount(0);
      return;
    }
    const workerUid = profile.uid;
    const workerOrdersQuery = query(ref(db, 'orders'), orderByChild('workerId'), equalTo(workerUid));

    const syncStatsDeferred = (workerOrders: Order[]) => {
      const ordersNeedingStats = workerOrders.filter((o: any) => o.commissionPaid === true && !o.statsAdded);
      const pendingReversals = workerOrders.filter((o: any) => o.needsStatsReversal === true && o.statsAdded === true);
      if (ordersNeedingStats.length === 0 && pendingReversals.length === 0) return;
      void (async () => {
        for (const order of ordersNeedingStats) {
          try {
            const amount = Number(order.receivedAmount || order.offeredAmount) || 0;
            const updates: Record<string, unknown> = {
              [`workers/${workerUid}/totalJobs`]: increment(1),
              [`workers/${workerUid}/totalEarnings`]: increment(amount),
              [`orders/${order.id}/statsAdded`]: true,
            };
            if (order.trade) {
              updates[`workers/${workerUid}/trades/${order.trade}/totalJobs`] = increment(1);
              updates[`workers/${workerUid}/trades/${order.trade}/totalEarnings`] = increment(amount);
            }
            await update(ref(db), updates);
          } catch (err) {
            console.error('MobileLayout stat sync failed:', err);
          }
        }
      })();
    };

    const unsubscribe = onValue(workerOrdersQuery, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setPendingJobsCount(0);
        return;
      }
      const workerOrders = Object.entries(data).map(([id, val]: [string, any]) => ({ ...(val || {}), id })) as Order[];
      const pendingCount = workerOrders.filter((o) => o.status?.toLowerCase() === 'pending').length;
      if (pendingCount > lastPendingJobsCountRef.current) {
        setNotificationType('job');
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 5000);
      }
      lastPendingJobsCountRef.current = pendingCount;
      setPendingJobsCount(pendingCount);
      if (statsSyncTimerRef.current) clearTimeout(statsSyncTimerRef.current);
      statsSyncTimerRef.current = setTimeout(() => syncStatsDeferred(workerOrders), 1200);
    });

    return () => {
      if (statsSyncTimerRef.current) clearTimeout(statsSyncTimerRef.current);
      unsubscribe();
    };
  }, [profile?.uid, profile?.role]);

  useEffect(() => {
    if (!profile || profile.role?.toLowerCase() !== 'user' || !profile.uid) return;
    const userOrdersQuery = query(ref(db, 'orders'), orderByChild('userId'), equalTo(profile.uid));
    const lastStatuses = new Map<string, string>();
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = onValue(userOrdersQuery, (snapshot) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const data = snapshot.val();
        if (!data) return;
        Object.entries(data).forEach(([id, val]: [string, any]) => {
          const status = val.status?.toLowerCase();
          const prevStatus = lastStatuses.get(id);
          if (prevStatus && prevStatus !== status) {
            setNotificationType('booking_status');
            setBookingStatusPath(status === 'accepted' ? '/orders' : '/user/history');
            setShowNotification(true);
            setTimeout(() => setShowNotification(false), 5000);
          }
          lastStatuses.set(id, status);
        });
      }, 600);
    });
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubscribe();
    };
  }, [profile?.uid, profile?.role]);

  const getNavItems = (): Array<{ to: string; icon: typeof Home; label: string; badge?: number }> => {
    if (!profile) return [];
    const role = profile.role?.toLowerCase();
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
  const outletContext: LayoutOutletValue = { setIsChatOpen, unreadMessagesCount, navTick, navigateTo: goTo };

  const renderUserSubPage = () => {
    const SubPage = activeSubPage ? USER_SUB_PAGES[activeSubPage] : null;
    if (!SubPage) return null;
    return (
      <div key={activeSubPage} className="min-h-0">
        <SubPage />
      </div>
    );
  };

  const renderUserMainTabs = () => (
    <>
      <div className={activeUserTab === '/' ? 'block' : 'hidden'} aria-hidden={activeUserTab !== '/'}>
        <UserDashboard key={`services-${navTick}`} />
      </div>
      <div className={activeUserTab === '/rentals' ? 'block' : 'hidden'} aria-hidden={activeUserTab !== '/rentals'}>
        <RentalsList key={`rentals-${navTick}`} />
      </div>
      <div className={activeUserTab === '/orders' ? 'block' : 'hidden'} aria-hidden={activeUserTab !== '/orders'}>
        <OrderHistory key={`orders-${navTick}`} />
      </div>
      <div className={activeUserTab === '/profile' ? 'block' : 'hidden'} aria-hidden={activeUserTab !== '/profile'}>
        <Profile key={`profile-${navTick}`} />
      </div>
    </>
  );

  const renderMainContent = () => {
    if (isUserRole) {
      if (activeSubPage && USER_SUB_PAGES[activeSubPage]) {
        return renderUserSubPage();
      }
      if (isUserTabPath(displayPath)) {
        return renderUserMainTabs();
      }
      return (
        <div key={displayPath} className="min-h-0">
          <Outlet />
        </div>
      );
    }
    return <Outlet />;
  };

  return (
    <WorkerDirectoryProvider>
      <LayoutOutletProvider value={outletContext}>
        <div className="mobile-container relative flex flex-col min-h-screen">
          {showNotification && (
            <div
              className={cn(
                'fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-sm p-4 rounded-2xl shadow-2xl z-[200] flex items-center gap-3 cursor-pointer border',
                notificationType === 'job' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-white border-slate-200 text-slate-900'
              )}
              onClick={() => {
                if (notificationType === 'message' || notificationType === 'admin_message') {
                  setIsChatOpen(true);
                } else if (notificationType === 'booking_status') {
                  goTo(bookingStatusPath);
                } else {
                  goTo('/worker');
                }
                setShowNotification(false);
              }}
            >
              <div className={cn('p-2 rounded-xl', notificationType === 'job' ? 'bg-white/20' : 'bg-slate-100 text-slate-600')}>
                {notificationType === 'job' ? <ClipboardList size={20} /> : <MessageSquare size={20} />}
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">{t('Notification')}</p>
              </div>
              <button type="button" onClick={(e) => { e.stopPropagation(); setShowNotification(false); }} className="p-1">
                <XCircle size={18} />
              </button>
            </div>
          )}

          <main className="flex-1 overflow-y-auto no-scrollbar pb-32 relative z-0">{renderMainContent()}</main>

          <nav
            className="fixed bottom-0 left-0 right-0 z-[99999] flex justify-center max-w-md mx-auto w-full"
            style={{ touchAction: 'manipulation', pointerEvents: 'auto' }}
            aria-label="Main navigation"
          >
            <div className="w-full bg-white border-t border-slate-200 shadow-[0_-4px_24px_rgba(0,0,0,0.15)] pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] flex items-center justify-around">
              {navItems.map((item) => {
                const active = isNavActive(item.to);
                return (
                  <button
                    key={item.label}
                    type="button"
                    onPointerUp={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      goTo(item.to);
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      goTo(item.to);
                    }}
                    className={cn(
                      'flex flex-col items-center gap-1 relative min-w-[68px] min-h-[52px] px-2 py-1',
                      active ? 'text-blue-600' : 'text-slate-500'
                    )}
                  >
                    <div className="relative pointer-events-none">
                      {item.label === 'Profile' && profile?.photoURL ? (
                        <div className={cn('w-6 h-6 rounded-full overflow-hidden border', active ? 'border-blue-600' : 'border-slate-300')}>
                          <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <item.icon size={22} />
                      )}
                      {item.badge ? (
                        <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                          {item.badge}
                        </span>
                      ) : null}
                    </div>
                    <span className={cn('text-[9px] font-bold text-center pointer-events-none', language === 'en' ? 'uppercase' : '')}>
                      {t(item.label)}
                    </span>
                  </button>
                );
              })}
            </div>
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
      </LayoutOutletProvider>
    </WorkerDirectoryProvider>
  );
};
