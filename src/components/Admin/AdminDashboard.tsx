import React, { useState, useEffect } from 'react';
import { ref, onValue, update, get } from 'firebase/database';
import { db } from '@/src/lib/firebase';
import { Order, UserProfile } from '@/src/types';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { AbstractGradientBackground } from '../Common/AbstractGradientBackground';
import { ClipboardList, Clock, CheckCircle2, XCircle, ShieldCheck, Search, Users, Briefcase, Filter, ChevronRight, AlertCircle, TrendingUp, Wallet } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'verifications' | 'orders' | 'users'>('verifications');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmModal, setConfirmModal] = useState<{ id: string, type: 'verify' | 'reject', feeType: 'worker' | 'user' } | null>(null);

  useEffect(() => {
    if (profile?.role !== 'admin') {
      navigate('/', { replace: true });
      return;
    }

    const ordersRef = ref(db, 'orders');
    const unsubscribeOrders = onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setOrders(Object.entries(data).map(([id, val]: [string, any]) => ({ ...val, id })) as Order[]);
      }
      setLoading(false);
    });

    const usersRef = ref(db, 'users');
    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUsers(Object.values(data) as UserProfile[]);
      }
    });

    return () => {
      unsubscribeOrders();
      unsubscribeUsers();
    };
  }, [profile, navigate]);

  const pendingWorkerVerifications = orders.filter(o => o.paymentRequested && !o.commissionPaid);
  const pendingUserVerifications = orders.filter(o => o.userCancellationPaymentRequested && !o.userCancellationPaid);
  
  const allPending = [...pendingWorkerVerifications, ...pendingUserVerifications].sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));

  const handleAction = async (orderId: string, action: 'verify' | 'reject', feeType: 'worker' | 'user') => {
    try {
      const updates: any = {};
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      if (feeType === 'worker') {
        if (action === 'verify') {
          // 1. Fetch current worker data for incrementing
          const workerRef = ref(db, `workers/${order.workerId}`);
          const workerSnap = await get(workerRef);
          const workerData = workerSnap.val();

          if (workerData && !order.statsAdded) {
            const amount = Number(order.receivedAmount || order.offeredAmount) || 0;
            const newTotalJobs = (Number(workerData.totalJobs) || 0) + 1;
            const newTotalEarnings = (Number(workerData.totalEarnings) || 0) + amount;

            updates[`workers/${order.workerId}/totalJobs`] = newTotalJobs;
            updates[`workers/${order.workerId}/totalEarnings`] = newTotalEarnings;

            // Also update specific trade stats if available
            if (order.trade && workerData.trades?.[order.trade]) {
              const tData = workerData.trades[order.trade];
              updates[`workers/${order.workerId}/trades/${order.trade}/totalJobs`] = (Number(tData.totalJobs) || 0) + 1;
              updates[`workers/${order.workerId}/trades/${order.trade}/totalEarnings`] = (Number(tData.totalEarnings) || 0) + amount;
            }
          }

          updates[`orders/${orderId}/commissionPaid`] = true;
          updates[`orders/${orderId}/paymentRequested`] = false;
          updates[`orders/${orderId}/statsAdded`] = true; 
        } else {
          updates[`orders/${orderId}/paymentRequested`] = false;
        }
      } else {
        if (action === 'verify') {
          updates[`orders/${orderId}/userCancellationPaid`] = true;
          updates[`orders/${orderId}/userCancellationPaymentRequested`] = false;
        } else {
          updates[`orders/${orderId}/userCancellationPaymentRequested`] = false; // Move back to Unpaid
        }
      }

      await update(ref(db), updates);
      setConfirmModal(null);
    } catch (err) {
      console.error("Admin action failed:", err);
      alert("Error performing action");
    }
  };

  const filteredOrders = orders
    .filter(o => 
      o.userName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      o.workerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.trade?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));

  const stats = {
    totalRevenue: orders.filter(o => o.commissionPaid).reduce((acc, o) => acc + (o.commissionAmount || 0), 0) +
                  orders.filter(o => o.userCancellationPaid).reduce((acc, o) => acc + (o.userCancellationFee || 0), 0),
    pendingRevenue: orders.filter(o => o.paymentRequested).reduce((acc, o) => acc + (o.commissionAmount || 0), 0) +
                    orders.filter(o => o.userCancellationPaymentRequested).reduce((acc, o) => acc + (o.userCancellationFee || 0), 0),
    totalOrders: orders.length,
    activeWorkers: users.filter(u => u.role === 'worker').length
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 mt-4 font-bold uppercase tracking-widest text-[10px]">{t('Loading Admin Data...')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <div className="bg-[#1e293b] px-6 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-12 rounded-b-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#3b82f6,transparent_70%)]" />
        </div>
        
        <div className="relative z-10 flex justify-between items-center mb-8">
          <div>
             <h1 className="text-2xl font-black text-white tracking-tight uppercase">{t('Admin Console')}</h1>
             <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em]">{t('Platform Management')}</p>
          </div>
          <div className="bg-white/10 p-2 rounded-2xl backdrop-blur-md border border-white/10">
             <ShieldCheck className="text-blue-400" size={24} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 relative z-10">
           <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/10">
              <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-1">{t('Total Revenue')}</p>
              <div className="flex items-center gap-2">
                 <Wallet size={14} className="text-blue-400" />
                 <p className="text-white text-lg font-black">{formatCurrency(stats.totalRevenue)}</p>
              </div>
           </div>
           <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/10">
              <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-1">{t('Pending Verification')}</p>
              <div className="flex items-center gap-2">
                 <TrendingUp size={14} className="text-amber-400" />
                 <p className="text-blue-400 text-lg font-black">{formatCurrency(stats.pendingRevenue)}</p>
              </div>
           </div>
        </div>
      </div>

      <div className="flex-1 -mt-6 rounded-t-[3rem] bg-slate-50 relative z-20 px-6 pt-8 pb-32">
        <div className="flex bg-white/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-100 shadow-sm gap-1 mb-8">
          {[
            { id: 'verifications', label: 'Pending', icon: Clock },
            { id: 'orders', label: 'All Orders', icon: ClipboardList },
            { id: 'users', label: 'Users', icon: Users }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all",
                activeTab === tab.id 
                  ? "bg-[#1e293b] text-white shadow-lg" 
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              <tab.icon size={16} />
              <span className="text-[11px] font-black uppercase tracking-wider">{t(tab.label)}</span>
            </button>
          ))}
        </div>

        {activeTab === 'verifications' && (
          <div className="space-y-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest px-2 mb-4">{t('Pending Verifications')}</h2>
            {allPending.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                <CheckCircle2 size={48} className="mx-auto text-emerald-100 mb-4" />
                <p className="text-slate-400 font-bold text-sm">{t('All caught up!')}</p>
              </div>
            ) : (
              allPending.map((order) => {
                const isWorkerFee = order.paymentRequested;
                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={`${order.id}-${isWorkerFee ? 'worker' : 'user'}`}
                    className="bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          isWorkerFee ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
                        )}>
                          {isWorkerFee ? <Briefcase size={20} /> : <XCircle size={20} />}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-sm leading-tight">
                            {isWorkerFee ? order.workerName : order.userName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
                            {isWorkerFee ? t('Worker Commission') : t('User Cancellation Fee')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-900">{formatCurrency(isWorkerFee ? (order.commissionAmount || 0) : (order.userCancellationFee || 0))}</p>
                        <p className="text-[9px] text-slate-400 font-bold mt-0.5">{formatDate(order.createdAt)}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                       <button 
                        onClick={() => setConfirmModal({ id: order.id, type: 'reject', feeType: isWorkerFee ? 'worker' : 'user' })}
                        className="flex-1 bg-red-50 text-red-600 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-colors"
                       >
                         {t('Reject')}
                       </button>
                       <button 
                        onClick={() => setConfirmModal({ id: order.id, type: 'verify', feeType: isWorkerFee ? 'worker' : 'user' })}
                        className="flex-[3] bg-emerald-600 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"
                       >
                         {t('Verify Payment')}
                       </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'orders' && (
           <div className="space-y-4">
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="text" 
                  placeholder={t('Search by name or trade...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-100 px-12 py-4 rounded-[2rem] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="space-y-3">
                 {filteredOrders.slice(0, 50).map(order => (
                   <div key={order.id} className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                            <ClipboardList size={20} />
                         </div>
                         <div>
                            <p className="font-bold text-slate-900 text-xs">{order.userName} &rarr; {order.workerName}</p>
                            <p className="text-[9px] text-blue-600 font-black uppercase tracking-tight">{t(order.trade)}</p>
                            {order.workAddress && (
                              <p className="text-[8px] text-slate-400 font-bold italic mt-0.5 truncate max-w-[150px]">
                                {t('Place of Work')}: {order.workAddress}
                              </p>
                            )}
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="font-bold text-slate-900 text-xs">{formatCurrency(order.offeredAmount)}</p>
                         <p className="text-[8px] text-slate-400 font-bold uppercase">{t(order.status)}</p>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        )}

        {activeTab === 'users' && (
           <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                 <div className="bg-white p-5 rounded-[2.5rem] border border-slate-100 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{t('Total Users')}</p>
                    <p className="text-xl font-black text-slate-900">{users.filter(u => u.role === 'user').length}</p>
                 </div>
                 <div className="bg-white p-5 rounded-[2.5rem] border border-slate-100 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{t('Total Workers')}</p>
                    <p className="text-xl font-black text-slate-900">{users.filter(u => u.role === 'worker').length}</p>
                 </div>
              </div>
              <div className="space-y-2 pt-4">
                 {users.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 50).map(user => (
                   <div key={user.uid} className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3 pr-2 flex-1 min-w-0">
                         {user.photoURL ? (
                           <img src={user.photoURL} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
                         ) : (
                           <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                              <Users size={20} />
                           </div>
                         )}
                         <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-xs truncate">{user.name}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">{user.role}</p>
                         </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-200" />
                   </div>
                 ))}
              </div>
           </div>
        )}
      </div>

      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 px-10">
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }} 
               onClick={() => setConfirmModal(null)}
               className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }} 
               animate={{ opacity: 1, scale: 1, y: 0 }} 
               exit={{ opacity: 0, scale: 0.9, y: 20 }} 
               className="relative bg-white rounded-[3rem] w-full max-w-sm overflow-hidden shadow-2xl p-8"
            >
              <div className={cn(
                "w-16 h-16 rounded-3xl flex items-center justify-center mb-6 mx-auto",
                confirmModal.type === 'verify' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
              )}>
                {confirmModal.type === 'verify' ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
              </div>
              
              <h3 className="text-xl font-black text-slate-900 text-center mb-2 uppercase tracking-tight">
                {confirmModal.type === 'verify' ? t('Confirm Verification') : t('Confirm Rejection')}
              </h3>
              <p className="text-slate-500 text-center text-sm font-medium mb-8 leading-relaxed px-4">
                {confirmModal.type === 'verify' 
                  ? t('Are you sure you want to verify this payment? This will update the status permanently.')
                  : t('Are you sure you want to reject this request? The user/worker will need to re-submit proof.')}
              </p>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleAction(confirmModal.id, confirmModal.type, confirmModal.feeType)}
                  className={cn(
                    "w-full py-4 rounded-2xl text-white font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all outline-none",
                    confirmModal.type === 'verify' ? "bg-emerald-600 shadow-emerald-100" : "bg-red-600 shadow-red-100"
                  )}
                >
                  {confirmModal.type === 'verify' ? t('Yes, Verify') : t('Yes, Reject')}
                </button>
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="w-full py-4 rounded-2xl text-slate-400 font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-all outline-none"
                >
                  {t('Cancel')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
