import React, { useState, useEffect } from 'react';
import { ref, onValue, query, orderByChild, equalTo, update } from 'firebase/database';
import { db } from '@/src/lib/firebase';
import { Order } from '@/src/types';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { AbstractGradientBackground } from '../Common/AbstractGradientBackground';
import { Wallet, AlertCircle, Clock, History, CreditCard, ArrowLeft, ShieldAlert, ShieldCheck, XCircle, CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useLayoutOutlet } from '@/src/contexts/LayoutOutletContext';

export const UserFees: React.FC = () => {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const { navigateTo } = useLayoutOutlet();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [upiClicked, setUpiClicked] = useState(false);
  const [confirming, setConfirming] = useState(false);
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

    const ordersRef = ref(db, 'orders');
    const userOrdersQuery = query(ordersRef, orderByChild('userId'), equalTo(profile.uid));
    
    const unsubscribe = onValue(userOrdersQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const orderList = Object.entries(data).map(([id, val]: [string, any]) => ({
          ...val,
          id
        })) as Order[];
        // Filter orders where user cancellation fee exists
        setOrders(orderList.filter(o => 
          (o.userCancellationFee || 0) > 0
        ).sort((a, b) => (b.rejectedAt || b.createdAt || 0) - (a.rejectedAt || a.createdAt || 0)));
      } else {
        setOrders([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  // CATEGORIES
  const paidOrders = orders.filter(o => o.userCancellationPaid === true);
  const verifyingOrders = orders.filter(o => o.userCancellationPaid !== true && o.userCancellationPaymentRequested === true);
  const unpaidOrders = orders.filter(o => o.userCancellationPaid !== true && o.userCancellationPaymentRequested !== true);

  // TOTALS
  const totalPaid = paidOrders.reduce((acc, o) => acc + (o.userCancellationFee || 0), 0);
  const totalVerifying = verifyingOrders.reduce((acc, o) => acc + (o.userCancellationFee || 0), 0);
  const totalUnpaid = unpaidOrders.reduce((acc, o) => acc + (o.userCancellationFee || 0), 0);

  const handlePayFees = () => {
    const upiId = 'selvan1974g@okhdfcbank'; 
    const amount = totalUnpaid.toFixed(2);
    const name = 'DIP Cancellation Fee';
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
        updates[`orders/${order.id}/userCancellationPaymentRequested`] = true;
      });
      await update(ref(db), updates);
      alert(t('Payment confirmation sent to admin for verification.'));
      setUpiClicked(false);
    } catch (err) {
      console.error("Error confirming payment:", err);
      alert('Failed to send confirmation.');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-[#2d3446] px-6 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-8 rounded-b-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] bg-[#4a5568] rotate-[15deg] skew-x-[-10deg]" />
          <div className="absolute top-[10%] right-[-5%] w-[35%] h-[50%] bg-[#3a445a] rotate-[-20deg] skew-y-[5deg]" />
          <div className="absolute bottom-[-15%] left-[20%] w-[50%] h-[40%] bg-[#4a5568] rotate-[5deg] skew-x-[20deg]" />
        </div>
        
        <div className="relative z-10">
          <button 
            onClick={() => navigateTo('/profile')}
            className="mb-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white backdrop-blur-md border border-white/20"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-white/10 rounded-[1.5rem] flex items-center justify-center text-white backdrop-blur-md border border-white/20">
                <Wallet size={32} />
             </div>
             <div>
                <h1 className="text-2xl font-black text-white tracking-tighter uppercase">{t('User Fees')}</h1>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('Balance & Verification')}</p>
             </div>
          </div>
        </div>
      </div>

      <div className="flex-1 relative bg-emerald-100/40 -mt-6 rounded-t-[2.5rem] z-20 pb-12 overflow-y-auto no-scrollbar">
        <AbstractGradientBackground />
        
        <div className="px-6 pt-10 space-y-8 relative z-10">
           
           {/* Summary Cards */}
           <div className="grid grid-cols-1 gap-4">
              <div className="bg-white p-7 rounded-[2.5rem] shadow-2xl border border-slate-50 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700 opacity-60" />
                  <div className="relative z-10">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2 block">{t('Total Unpaid')}</label>
                      <h2 className="text-4xl font-black text-red-600 mb-8 tracking-tighter">{formatCurrency(totalUnpaid)}</h2>
                      
                      {!upiClicked ? (
                          <button 
                             onClick={handlePayFees}
                             disabled={totalUnpaid <= 0}
                             className="w-full btn-primary py-5 text-xs shadow-2xl shadow-blue-200 rounded-[2rem] font-black flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale uppercase tracking-widest"
                          >
                             <CreditCard size={20} />
                             {t('Pay Outstanding')}
                          </button>
                       ) : (
                          <div className="space-y-4">
                             <button 
                                onClick={handleConfirmPayment}
                                disabled={confirming}
                                className="w-full btn-primary bg-emerald-600 py-5 text-xs shadow-2xl shadow-emerald-200 rounded-[2rem] font-black uppercase tracking-widest"
                             >
                                {confirming ? t('Verifying...') : t('Confirm Payment')}
                             </button>
                             <p className="text-[10px] text-emerald-600 font-bold text-center leading-tight">
                                {t('Notify admin after transfer')}
                             </p>
                          </div>
                       )}
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/90 backdrop-blur-md p-6 rounded-[2.2rem] border-l-4 border-l-blue-500 shadow-xl">
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">{t('Under Verification')}</p>
                      <p className="text-2xl font-black text-blue-600 tracking-tight leading-none">{formatCurrency(totalVerifying)}</p>
                  </div>
                  <div className="bg-white/90 backdrop-blur-md p-6 rounded-[2.2rem] border-l-4 border-l-emerald-500 shadow-xl">
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">{t('Total Paid')}</p>
                      <p className="text-2xl font-black text-emerald-600 tracking-tight leading-none">{formatCurrency(totalPaid)}</p>
                  </div>
              </div>
           </div>

           {/* Detailed Lists */}
           <div className="space-y-8">
              {/* PAYMENT PENDING SECTION */}
              {(unpaidOrders.length > 0 || verifyingOrders.length > 0) && (
                <div className="space-y-4">
                   <div className="flex items-center justify-between px-2">
                      <h2 className="text-lg font-black text-slate-900 tracking-tight">{t('Payment Pending')}</h2>
                      <span className="text-[10px] font-black bg-amber-100 text-amber-600 px-3 py-1 rounded-full uppercase shadow-sm">{(unpaidOrders.length + verifyingOrders.length)} {t('items')}</span>
                   </div>
                   <div className="space-y-3">
                      {[...unpaidOrders, ...verifyingOrders].map(order => {
                         const isOverdue = order.userCancellationDueDate && order.userCancellationDueDate < Date.now();
                         const isVerifying = order.userCancellationPaymentRequested === true;
                         
                         return (
                            <div 
                                key={order.id} 
                                onClick={() => handleSetSelectedOrderDetails(order)}
                                className={cn(
                                    "bg-white p-5 rounded-[1.8rem] border transition-all flex items-center justify-between shadow-sm active:scale-[0.98] cursor-pointer relative overflow-hidden", 
                                    (isOverdue && !isVerifying) ? "border-red-200" : "border-slate-50"
                                )}
                            >
                               <div className="flex items-center gap-4">
                                  <div className={cn(
                                    "w-12 h-12 rounded-[1.2rem] flex items-center justify-center shadow-inner", 
                                    isVerifying ? "bg-blue-50 text-blue-500" : isOverdue ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-500"
                                  )}>
                                     {isVerifying ? <Clock size={22} className="animate-pulse" /> : <Clock size={22} />}
                                  </div>
                                  <div>
                                     <p className="font-black text-slate-900 text-sm leading-tight">{order.workerName || t('Service Provider')}</p>
                                     <p className={cn("text-[10px] font-bold uppercase mt-1", isVerifying ? "text-blue-500" : isOverdue ? "text-red-500" : "text-amber-500")}>
                                        {isVerifying ? t('Verifying...') : isOverdue ? t('Overdue') : t('Payment Due')}
                                     </p>
                                  </div>
                               </div>
                               <div className="text-right">
                                  <p className="text-lg font-black text-slate-900">{formatCurrency(order.userCancellationFee || 0)}</p>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                                    {order.userCancellationDueDate ? formatDate(order.userCancellationDueDate) : ''}
                                  </p>
                               </div>
                            </div>
                         );
                      })}
                   </div>
                </div>
              )}

              {/* PAYMENT HISTORY SECTION */}
              {paidOrders.length > 0 && (
                <div className="space-y-4">
                   <div className="flex items-center justify-between px-2">
                      <h2 className="text-lg font-black text-slate-900 tracking-tight">{t('Payment History')}</h2>
                      <History size={18} className="text-slate-300" />
                   </div>
                   <div className="space-y-3">
                      {paidOrders.map(order => (
                         <div 
                            key={order.id} 
                            onClick={() => handleSetSelectedOrderDetails(order)}
                            className="bg-white p-5 rounded-[1.8rem] border border-emerald-50 flex items-center justify-between shadow-sm active:scale-[0.98] cursor-pointer group"
                         >
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-[1.2rem] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                  <CheckCircle2 size={24} />
                               </div>
                               <div>
                                  <p className="font-black text-slate-900 text-sm leading-tight">{order.workerName}</p>
                                  <p className="text-emerald-500 text-[9px] font-bold uppercase mt-1">{t('Successfully Verified')}</p>
                               </div>
                            </div>
                            <div className="text-right">
                               <p className="text-lg font-black text-slate-900">{formatCurrency(order.userCancellationFee || 0)}</p>
                               <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{t('Verified')}</p>
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
              )}

              {orders.length === 0 && (
                 <div className="text-center py-20 bg-white/40 rounded-[2.5rem] border border-white/60">
                    <History size={48} className="mx-auto text-slate-200 mb-4" />
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{t('No Fee History')}</h3>
                    <p className="text-slate-400 text-xs mt-1 font-bold">{t('Everything looks clean here!')}</p>
                 </div>
              )}
           </div>
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
               className="relative transform rounded-[2.5rem] bg-white w-full max-w-sm shadow-2xl transition-all p-8 border-t-8 border-amber-500 max-h-[85vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                   <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t('Worker')}: {selectedOrderDetails.workerName}</h3>
                   <p className="text-amber-600 text-[11px] font-black uppercase tracking-wider mt-0.5">{t(selectedOrderDetails.trade)}</p>
                   <p className="text-amber-500 text-[10px] font-black uppercase tracking-widest mt-1">{t('Cancellation Fee Breakdown & Progress')}</p>
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
                    <span className="text-slate-400 text-xs font-black uppercase tracking-wider">{t('Cancellation Fee')}</span>
                    <span className="text-red-600 font-black text-lg">
                        {formatCurrency(selectedOrderDetails.userCancellationFee || 0)}
                    </span>
                 </div>
                 
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
                                <p className="text-xs font-black uppercase tracking-widest text-emerald-600">{t('Order Cancelled')}</p>
                                <p className="text-[9px] text-slate-400 font-bold">{t('Job was cancelled by you after acceptance')}</p>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center border-2",
                                    (selectedOrderDetails.userCancellationPaymentRequested || selectedOrderDetails.userCancellationPaid) 
                                        ? "bg-emerald-500 border-emerald-500 text-white shadow-lg" 
                                        : "border-blue-500 border-dashed animate-pulse text-blue-500 bg-blue-50"
                                )}>
                                    {(selectedOrderDetails.userCancellationPaymentRequested || selectedOrderDetails.userCancellationPaid) ? <CheckCircle2 size={14} /> : <Clock size={12} />}
                                </div>
                                <div className={cn("w-0.5 h-10 my-1", selectedOrderDetails.userCancellationPaid ? "bg-emerald-500/20" : "bg-slate-100")} />
                            </div>
                            <div className="pt-0.5">
                                <p className={cn(
                                    "text-xs font-black uppercase tracking-widest",
                                    (selectedOrderDetails.userCancellationPaymentRequested || selectedOrderDetails.userCancellationPaid) ? "text-emerald-600" : "text-blue-600"
                                )}>
                                    {t('Payment Reported')}
                                </p>
                                <p className="text-[9px] text-slate-400 font-bold">
                                    {(selectedOrderDetails.userCancellationPaymentRequested || selectedOrderDetails.userCancellationPaid) ? t('Notification sent to admin') : t('Awaiting payment from you')}
                                </p>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center border-2",
                                    selectedOrderDetails.userCancellationPaid 
                                        ? "bg-emerald-500 border-emerald-500 text-white shadow-lg" 
                                        : selectedOrderDetails.userCancellationPaymentRequested ? "border-amber-500 border-dashed animate-pulse text-amber-500 bg-amber-50" : "border-slate-100 text-slate-200"
                                )}>
                                    {selectedOrderDetails.userCancellationPaid ? <CheckCircle2 size={14} /> : <Clock size={12} />}
                                </div>
                            </div>
                            <div className="pt-0.5">
                                <p className={cn(
                                    "text-xs font-black uppercase tracking-widest",
                                    selectedOrderDetails.userCancellationPaid ? "text-emerald-600" : selectedOrderDetails.userCancellationPaymentRequested ? "text-amber-600" : "text-slate-300"
                                )}>
                                    {t('Admin Verified')}
                                </p>
                                <p className="text-[9px] text-slate-400 font-bold">
                                    {selectedOrderDetails.userCancellationPaid ? t('Payment successfully verified') : selectedOrderDetails.userCancellationPaymentRequested ? t('Reviewing payment proof') : t('Awaiting verification')}
                                </p>
                            </div>
                        </div>
                    </div>
                 </div>

                 <div className="flex justify-between items-center pt-8 mt-4 border-t border-slate-50">
                    <span className="text-slate-900 text-sm font-black uppercase tracking-tighter">{t('Total Balance Due')}</span>
                    <span className="text-3xl font-black text-red-600">{formatCurrency(selectedOrderDetails.userCancellationFee || 0)}</span>
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
