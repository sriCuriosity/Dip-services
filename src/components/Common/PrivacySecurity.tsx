import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Shield, Lock, FileText, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

export const PrivacySecurity: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex flex-col min-h-full bg-slate-50/30">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-rose-600 via-pink-700 to-purple-900 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-8 px-6 rounded-b-[2.5rem] shadow-2xl shadow-rose-200/40">
        <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-rose-400/20 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex items-center justify-between mb-6">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 bg-white/10 text-white/90 hover:text-white backdrop-blur-md border border-white/20 rounded-xl transition-all active:scale-95 shadow-lg"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-[10px] font-black text-rose-100/50 tracking-[0.4em] uppercase">{t('Protection')}</h1>
          <div className="w-8" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-2xl rounded-2xl flex items-center justify-center border border-white/30 shadow-2xl mb-3">
             <Shield size={28} className="text-white drop-shadow-lg" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tighter">{t('Secure')}</h2>
        </div>
      </div>

      <motion.div 
        className="px-6 py-10 pb-32 relative"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Connection Line */}
        <div className="absolute left-[39px] top-10 bottom-32 w-0.5 bg-rose-100" />

        <div className="space-y-12">
          <motion.section variants={itemVariants} className="relative pl-12">
            <div className="absolute left-[-5px] top-1 w-6 h-6 rounded-full bg-rose-500 border-4 border-rose-50 shadow-lg z-10" />
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl shadow-sm border border-rose-100"><Lock size={20} /></div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{t('Data Collection')}</h3>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-rose-100 shadow-xl shadow-rose-500/5 leading-relaxed text-slate-600 font-medium text-sm">
              {t('At DIP Services, we only collect data that is strictly necessary to provide you with seamless connecting services. This includes your name, phone number, general location, and basic service preferences to match you with valid providers.')}
            </div>
          </motion.section>

          <motion.section variants={itemVariants} className="relative pl-12">
            <div className="absolute left-[-5px] top-1 w-6 h-6 rounded-full bg-rose-500 border-4 border-rose-50 shadow-lg z-10" />
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl shadow-sm border border-emerald-100"><CheckCircle size={20} /></div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{t('Data Protection')}</h3>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-emerald-100 shadow-xl shadow-emerald-500/5 leading-relaxed text-slate-600 font-medium text-sm">
              {t('All information related to payments, user profiles, and chat mechanisms is safely encrypted utilizing industry-standard protective measures integrated through Firebase.')}
            </div>
          </motion.section>

          <motion.section variants={itemVariants} className="relative pl-12">
            <div className="absolute left-[-5px] top-1 w-6 h-6 rounded-full bg-rose-500 border-4 border-rose-50 shadow-lg z-10" />
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl shadow-sm border border-amber-100"><FileText size={20} /></div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{t('Sharing of Data')}</h3>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-amber-100 shadow-xl shadow-amber-500/5 leading-relaxed text-slate-600 font-medium text-sm">
              {t("We never sell your data. We strictly only share your necessary details (like contact and job location) with the specific service worker you choose to book, and only upon booking confirmation.")}
            </div>
          </motion.section>

          <motion.div variants={itemVariants} className="pt-6 pl-12">
             <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/10 transition-all" />
                <Shield size={32} className="text-rose-400 mb-4" />
                <h4 className="text-lg font-black mb-2">{t('Your Privacy Matters')}</h4>
                <p className="text-slate-400 text-xs font-semibold leading-relaxed">
                   {t('We continuously update our systems to ensure your data remains protected against new threats.')}
                </p>
             </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
