import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Scale, Edit3, UserCheck, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

export const TermsOfService: React.FC = () => {
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
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-600 via-orange-700 to-red-900 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-8 px-6 shadow-2xl shadow-amber-200/40">
        <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-amber-400/20 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex items-center justify-between mb-6">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 bg-black/20 text-white/90 hover:text-white border border-white/10 rounded-xl transition-all active:scale-95"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-[10px] font-black text-amber-200/40 tracking-[0.5em] uppercase">{t('Agreement')}</h1>
          <div className="w-8" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-2xl rounded-full flex items-center justify-center border-2 border-white/40 shadow-2xl mb-3">
             <Scale size={28} className="text-white drop-shadow-lg" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tighter uppercase">{t('Guidelines')}</h2>
        </div>
      </div>

      <motion.div 
        className="px-6 py-10 pb-32 space-y-12"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.section variants={itemVariants} className="bg-white/50 backdrop-blur-sm rounded-none border-l-4 border-amber-500 p-8 shadow-sm">
          <div className="flex items-start gap-5">
            <span className="text-4xl font-black text-amber-500/20 pt-1">01</span>
            <div className="flex-1">
               <h3 className="text-xl font-black text-slate-900 tracking-tight mb-4 uppercase">{t('User Conduct')}</h3>
               <div className="leading-relaxed text-slate-600 font-medium text-sm text-justify">
                 {t('When connecting with professionals or customers inside DIP Services, you agree to respectful and legal communication. You may not misrepresent your identity or request any offline or prohibited services out of the app guidelines.')}
               </div>
            </div>
          </div>
        </motion.section>

        <motion.section variants={itemVariants} className="bg-white/50 backdrop-blur-sm rounded-none border-l-4 border-orange-500 p-8 shadow-sm">
          <div className="flex items-start gap-5">
            <span className="text-4xl font-black text-orange-500/20 pt-1">02</span>
            <div className="flex-1">
               <h3 className="text-xl font-black text-slate-900 tracking-tight mb-4 uppercase">{t('Cancellations & Platform Fees')}</h3>
               <div className="leading-relaxed text-slate-600 font-medium text-sm text-justify">
                 {t('Customers may cancel before a worker starts traveling without intense penalties. For providers, cancelling consecutively without a valid reason will increase pending platform fees, which may lead to account suspension.')}
               </div>
            </div>
          </div>
        </motion.section>

        <motion.section variants={itemVariants} className="bg-white/50 backdrop-blur-sm rounded-none border-l-4 border-red-500 p-8 shadow-sm">
          <div className="flex items-start gap-5">
            <span className="text-4xl font-black text-red-500/20 pt-1">03</span>
            <div className="flex-1">
               <h3 className="text-xl font-black text-slate-900 tracking-tight mb-4 uppercase">{t('Liability Agreement')}</h3>
               <div className="leading-relaxed text-slate-600 font-medium text-sm text-justify">
                 {t("DIP Services serves exclusively as a discovery bridge. Any real-world disputes, item impairments, or uncompleted jobs must be solved between the client and the worker initially.")}
               </div>
            </div>
          </div>
        </motion.section>

        <motion.div variants={itemVariants} className="px-8 flex flex-col items-center">
           <div className="w-12 h-1 w-full bg-slate-200 rounded-full mb-6" />
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">
             {t('Binding Legal Agreement upon Usage')}
           </p>
        </motion.div>
      </motion.div>
    </div>
  );
};
