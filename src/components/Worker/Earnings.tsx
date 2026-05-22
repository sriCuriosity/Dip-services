import React, { useState, useEffect } from 'react';
import { ref, onValue, query, orderByChild, equalTo, update } from 'firebase/database';
import { db } from '@/src/lib/firebase';
import { Order, WorkerProfile } from '@/src/types';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { AbstractGradientBackground } from '../Common/AbstractGradientBackground';
import { Wallet, TrendingUp, History, ArrowUpRight, CheckCircle2, AlertCircle, Clock, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';
import { formatCurrency, formatDate, cn, calculatePlatformFeePercentage } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export const Earnings: React.FC = () => {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);

  useEffect(() => {
    const handlePopState = () => {
      if (window.history.state?.modal !== 'fee-detail') {
        setSelectedOrderDetails(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSetSelectedOrderDetails = (order: Order | null) => {
    if (order) {
      window.history.pushState({ modal: 'fee-detail' }, '');
    }
    setSelectedOrderDetails(order);
  };
  const [upiClicked, setUpiClicked] = useState(false);
  const [confirming, setConfirming] = useState(false);
  
  useEffect(() => {
    if (selectedOrderDetails) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [selectedOrderDetails]);

  useEffect(() => {
    if (!profile) return;

    const workerRef = ref(db, `workers/${profile.uid}`);
    onValue(workerRef, (snapshot) => {
      setWorkerProfile(snapshot.val());
    });

    const ordersRef = ref(db, 'orders');
    const workerOrdersQuery = query(ordersRef, orderByChild('workerId'), equalTo(profile.uid));
    
    onValue(workerOrdersQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const orderList = Object.entries(data).map(([id, val]: [string, any]) => ({
          ...val,
          id
        })) as Order[];
        setOrders(orderList.filter(o => {
          const status = o.status?.toLowerCase();
          return status === 'completed' || 
                 status === 'accepted' || 
                 (status === 'rejected' && (o as any).isFine === true);
        }).sort((a, b) => {
          const timeA = b.completedAt || b.acceptedAt || b.createdAt || 0;
          const timeB = a.completedAt || a.acceptedAt || a.createdAt || 0;
          return Number(timeA) - Number(timeB);
        }));
      }
      setLoading(false);
    });
  }, [profile]);

  // CATEGORIZATION
  const paidOrders = orders.filter(o => o.commissionPaid === true);
  const verifyingOrders = orders.filter(o => o.commissionPaid !== true && (o as any).paymentRequested === true);
  const isFreeTrade = (o: any) => ['marriage hall', 'catering'].includes((o.trade || '').toLowerCase().trim());
  const unpaidOrders = orders.filter(o => 
    o.commissionPaid !== true && 
    (o as any).paymentRequested !== true && 
    (o.commissionAmount || 0) > 0 &&
    !isFreeTrade(o)
  );

  // TOTALS
  const totalPaid = paidOrders.reduce((acc, o) => acc + (o.commissionAmount || 0), 0);
  const totalVerifying = verifyingOrders.reduce((acc, o) => acc + (o.commissionAmount || 0), 0);
  const totalUnpaid = unpaidOrders.reduce((acc, o) => acc + (o.commissionAmount || 0), 0);

  const getDaysRemaining = (dueDate: number) => {
    const now = Date.now();
    const diff = dueDate - now;
    if (diff <= 0) return 0;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const handlePayCommission = () => {
    const upiId = 'selvan1974g@okhdfcbank';
    const amount = totalUnpaid.toFixed(2);
    const name = 'DIP Platform Fee';
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR`;
    window.open(upiUrl, '_blank');
    setUpiClicked(true);
  };

  const handleConfirmPayment = async () => {
    if (!profile) return;
    setConfirming(true);
    try {
      const updates: any = {};
      unpaidOrders.forEach(order => {
        updates[`orders/${order.id}/paymentRequested`] = true;
      });
      await update(ref(db), updates);
      alert(t('Payment confirmation sent to admin for verification.'));
      setUpiClicked(false);
    } catch (err) {
      console.error("Error confirming payment:", err);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-[#2d3446] px-6 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-8 rounded-b-[2.5rem] shadow-2xl relative overflow-hidden">
        {/* Low-poly background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] bg-[#4a5568] rotate-[15deg] skew-x-[-10deg]" />
          <div className="absolute top-[10%] right-[-5%] w-[35%] h-[50%] bg-[#3a445a] rotate-[-20deg] skew-y-[5deg]" />
          <div className="absolute bottom-[-15%] left-[20%] w-[50%] h-[40%] bg-[#4a5568] rotate-[5deg] skew-x-[20deg]" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#2d3446] via-transparent to-transparent opacity-60" />

        <div className="relative z-10">
          <h1 className="text-white text-2xl font-black tracking-tight uppercase mb-6">{t('Business Stats')}</h1>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                <Wallet className="text-white" size={18} />
              </div>
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">{t('Total Earnings')}</p>
              <p className="text-white text-xl font-bold">{formatCurrency(workerProfile?.totalEarnings || 0)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                <TrendingUp className="text-white" size={18} />
              </div>
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">{t('Jobs Done')}</p>
              <p className="text-white text-xl font-bold">{workerProfile?.totalJobs || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 relative bg-emerald-100/40 min-h-screen">
        <AbstractGradientBackground />
        <div className="px-6 -mt-6 space-y-6 pb-24 relative z-10">
        
        {/* Commission/Fees Management Card */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-50">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="font-black text-slate-900 uppercase tracking-tight">{t('Platform Fees')}</h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('Total Pending Balance')}</p>
            </div>
            <div className="bg-blue-50 text-blue-600 p-2 rounded-xl">
              <ShieldAlert size={20} />
            </div>
          </div>
          
          <div className="flex justify-between items-end mb-8">
            <div>
              <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">{t('Unpaid Total')}</p>
              <p className="text-4xl font-black text-red-600 leading-none">{formatCurrency(totalUnpaid)}</p>
            </div>
            <div className="flex flex-col gap-2">
              {!upiClicked ? (
                <button 
                  onClick={handlePayCommission}
                  disabled={totalUnpaid === 0}
                  className="btn-primary py-3 px-8 text-[11px] font-black uppercase tracking-widest disabled:opacity-50 disabled:grayscale rounded-2xl"
                >
                  {t('Pay Now')}
                </button>
              ) : (
                <button 
                  onClick={handleConfirmPayment}
                  disabled={confirming}
                  className="btn-primary bg-emerald-600 py-3 px-8 text-[11px] font-black uppercase tracking-widest rounded-2xl animate-bounce"
                >
                  {confirming ? t('Verify') : t('Confirm')}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
              <div>
                  <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">{t('In Verification')}</p>
                  <p className="text-lg font-black text-blue-600">{formatCurrency(totalVerifying)}</p>
              </div>
              <div>
                  <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">{t('Total Paid')}</p>
                  <p className="text-lg font-black text-emerald-600">{formatCurrency(totalPaid)}</p>
              </div>
          </div>
        </div>

        {/* PENDING FEES SECTION */}
        {(unpaidOrders.length > 0 || verifyingOrders.length > 0) && (
          <div>
            <div className="flex justify-between items-center mb-4 px-2">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">{t('Pending Fees')}</h2>
              <span className="bg-[#fef3c7] text-[#92400e] px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-sm">
                {unpaidOrders.length + verifyingOrders.length} {t('Orders')}
              </span>
            </div>
            <div className="space-y-3">
              {[...unpaidOrders, ...verifyingOrders].sort((a,b) => (b.feeDueDate || 0) - (a.feeDueDate || 0)).map((order) => {
                const daysLeft = order.feeDueDate ? getDaysRemaining(order.feeDueDate) : 0;
                const isOverdue = daysLeft <= 0;
                const isVerifying = (order as any).paymentRequested === true;
                
                return (
                  <div 
                    key={order.id} 
                    onClick={() => handleSetSelectedOrderDetails(order)}
                    className={cn(
                        "bg-white p-5 rounded-[1.8rem] border flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer shadow-sm relative overflow-hidden", 
                        isOverdue && !isVerifying ? "border-red-100" : "border-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-[1.2rem] flex items-center justify-center shadow-inner",
                        isVerifying ? "bg-blue-50 text-blue-500" : isOverdue ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-500"
                      )}>
                        {isVerifying ? <Clock size={22} className="animate-pulse" /> : isOverdue ? <Clock size={22} className="text-red-600" /> : <Clock size={22} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-black text-slate-900 text-sm leading-tight">{order.userName}</p>
                          {(order as any).isFine && (
                            <span className="bg-red-100 text-red-600 text-[8px] px-2 py-0.5 rounded-full font-black uppercase">{t('Fine')}</span>
                          )}
                        </div>
                        <p className={cn("text-[10px] font-bold uppercase mt-1", isVerifying ? "text-blue-500" : isOverdue ? "text-red-500" : "text-amber-500")}>
                          {isVerifying ? t('Verifying...') : isOverdue ? t('Overdue') : `${daysLeft} ${t('Days Remaining')}`}
                        </p>
                        {(order as any).isFine && (
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{t('Cancellation Penalty')}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-slate-900 font-black text-lg">{formatCurrency(order.commissionAmount)}</p>
                       <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{formatDate(order.completedAt || order.acceptedAt || order.rejectedAt || Date.now())}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* RECENT EARNINGS SECTION */}
        {orders.length > 0 && (
           <div className="pb-8">
              <div className="flex justify-between items-center mb-4 px-2">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">{t('Recent Earnings')}</h2>
                <History className="text-slate-300" size={20} />
              </div>
              <div className="space-y-3">
                 {orders.filter(o => o.commissionPaid === true).slice(0, 10).map(order => {
                   const isFine = (order as any).isFine;
                   const isCompleted = order.status === 'completed';
                   
                   return (
                    <div 
                         key={order.id} 
                          onClick={() => handleSetSelectedOrderDetails(order)}
                         className="bg-white p-5 rounded-[1.8rem] border border-slate-50 flex items-center justify-between shadow-sm active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden group"
                    >
                       <div className="flex items-center gap-4">
                          <div className={cn(
                             "w-12 h-12 rounded-[1.2rem] flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform",
                             isFine ? "bg-red-50 text-red-500" : isCompleted ? "bg-emerald-50 text-emerald-500" : "bg-blue-50 text-blue-500"
                          )}>
                             {isFine ? <AlertCircle size={22} /> : isCompleted ? <CheckCircle2 size={24} /> : <Clock size={22} />}
                          </div>
                          <div>
                             <div className="flex items-center gap-2">
                                 <p className="font-black text-slate-900 text-sm leading-tight">{order.userName}</p>
                                 {isFine && (
                                     <span className="bg-red-100 text-red-600 text-[8px] px-2 py-0.5 rounded-full font-black uppercase">{t('Fine')}</span>
                                 )}
                             </div>
                             <p className="text-slate-400 text-[9px] font-black uppercase mt-1 tracking-wider">
                                 {formatDate(order.completedAt || order.rejectedAt || order.acceptedAt || Date.now())}
                             </p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className={cn("font-black text-lg", isFine ? "text-red-600" : "text-emerald-600")}>
                             {isFine ? '-' : '+'}{formatCurrency(isFine ? (order.commissionAmount || 0) : order.offeredAmount)}
                          </p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                             {isFine ? `${t('Fine Due')} ${formatCurrency(order.commissionAmount || 0)}` : `${t('Fee')}: ${formatCurrency(order.commissionAmount || 0)}`}
                          </p>
                       </div>
                    </div>
                  );
                 })}
              </div>
           </div>
        )}
        </div>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedOrderDetails && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-8 sm:items-center sm:p-0">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => window.history.back()} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
            <motion.div 
               initial={{ opacity: 0, y: 100 }} 
               animate={{ opacity: 1, y: 0 }} 
               exit={{ opacity: 0, y: 100 }} 
               className="relative transform overflow-hidden rounded-[2.5rem] bg-white w-full max-w-lg shadow-2xl transition-all p-8 border-t-8 border-blue-500 max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                   <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t('Client')}: {selectedOrderDetails.userName}</h3>
                   <p className="text-blue-600 text-[11px] font-black uppercase tracking-wider mt-0.5">{t(selectedOrderDetails.trade)}</p>
                   <p className="text-blue-500 text-[10px] font-black uppercase tracking-widest mt-1">{t('Platform Fee Breakdown & Progress')}</p>
                </div>
                <button 
                    onClick={() => window.history.back()} 
                    className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                >
                    <XCircle size={24}/>
                </button>
              </div>

              <div className="space-y-5">
                 <div className="flex justify-between items-center py-3 border-b border-slate-50">
                    <span className="text-slate-400 text-xs font-black uppercase tracking-wider">{t('Booking Amount')}</span>
                    <span className="text-slate-900 font-black text-lg">{formatCurrency(selectedOrderDetails.offeredAmount)}</span>
                 </div>
                  <div className="flex justify-between items-center py-3 border-b border-slate-50">
                     <span className="text-slate-400 text-xs font-black uppercase tracking-wider">
                        {t('Platform Fee')} ({(calculatePlatformFeePercentage(selectedOrderDetails.trade || '') * 100).toFixed(0)}%)
                     </span>
                     <span className="text-slate-900 font-black">
                         {formatCurrency(selectedOrderDetails.platformFee || 0)}
                     </span>
                  </div>
                 {(selectedOrderDetails as any).isFine && (
                   <div className="flex justify-between items-center p-4 bg-red-50 rounded-2xl border border-red-100">
                      <span className="text-red-500 text-xs font-black uppercase tracking-widest leading-tight">
                        {t('Penalty Fee')}<br/>
                        <span className="text-[9px] opacity-70">(25% of platform fee)</span>
                      </span>
                      <span className="text-red-600 font-black text-lg">{formatCurrency((selectedOrderDetails as any).fineAmount || selectedOrderDetails.commissionAmount)}</span>
                   </div>
                 )}

                 {/* Progress Tracker */}
                 <div className="mt-8 pt-6 border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{t('Payment Progress')}</p>
                    <div className="space-y-6">
                        {/* Step 1 */}
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
                                    <CheckCircle2 size={14} />
                                </div>
                                <div className="w-0.5 h-10 bg-emerald-500/20 my-1" />
                            </div>
                            <div className="pt-0.5">
                                <p className="text-xs font-black uppercase tracking-widest text-emerald-600">{t('Job Done')}</p>
                                <p className="text-[9px] text-slate-400 font-bold">{t('Service successfully completed')}</p>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center border-2",
                                    ((selectedOrderDetails as any).paymentRequested || selectedOrderDetails.commissionPaid) 
                                        ? "bg-emerald-500 border-emerald-500 text-white shadow-lg" 
                                        : "border-blue-500 border-dashed animate-pulse text-blue-500 bg-blue-50"
                                )}>
                                    {((selectedOrderDetails as any).paymentRequested || selectedOrderDetails.commissionPaid) ? <CheckCircle2 size={14} /> : <Clock size={12} />}
                                </div>
                                <div className={cn("w-0.5 h-10 my-1", selectedOrderDetails.commissionPaid ? "bg-emerald-500/20" : "bg-slate-100")} />
                            </div>
                            <div className="pt-0.5">
                                <p className={cn(
                                    "text-xs font-black uppercase tracking-widest",
                                    ((selectedOrderDetails as any).paymentRequested || selectedOrderDetails.commissionPaid) ? "text-emerald-600" : "text-blue-600"
                                )}>
                                    {t('Payment Requested')}
                                </p>
                                <p className="text-[9px] text-slate-400 font-bold">
                                    {((selectedOrderDetails as any).paymentRequested || selectedOrderDetails.commissionPaid) ? t('Notification sent to admin') : t('Waiting for worker to pay')}
                                </p>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center border-2",
                                    selectedOrderDetails.commissionPaid 
                                        ? "bg-emerald-500 border-emerald-500 text-white shadow-lg" 
                                        : (selectedOrderDetails as any).paymentRequested ? "border-amber-500 border-dashed animate-pulse text-amber-500 bg-amber-50" : "border-slate-100 text-slate-200"
                                )}>
                                    {selectedOrderDetails.commissionPaid ? <CheckCircle2 size={14} /> : <Clock size={12} />}
                                </div>
                            </div>
                            <div className="pt-0.5">
                                <p className={cn(
                                    "text-xs font-black uppercase tracking-widest",
                                    selectedOrderDetails.commissionPaid ? "text-emerald-600" : (selectedOrderDetails as any).paymentRequested ? "text-amber-600" : "text-slate-300"
                                )}>
                                    {t('Admin Verification')}
                                </p>
                                <p className="text-[9px] text-slate-400 font-bold">
                                    {selectedOrderDetails.commissionPaid ? t('Payment successfully verified') : (selectedOrderDetails as any).paymentRequested ? t('Reviewing payment proof') : t('Awaiting payment request')}
                                </p>
                            </div>
                        </div>
                    </div>
                 </div>

                 <div className="flex justify-between items-center pt-8 mt-4 border-t border-slate-50">
                    <span className="text-slate-900 text-sm font-black uppercase tracking-tighter">{(selectedOrderDetails as any).isFine ? t('Penalty Due') : t('Total Balance Due')}</span>
                    <span className="text-3xl font-black text-blue-600">{formatCurrency(selectedOrderDetails.commissionAmount)}</span>
                 </div>
              </div>

              <button 
                onClick={() => window.history.back()} 
                className="w-full btn-primary py-5 rounded-[1.8rem] mt-10 font-black uppercase tracking-widest text-xs shadow-2xl shadow-blue-100 active:scale-95 transition-all"
              >
                {t('Close Breakdown')}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
