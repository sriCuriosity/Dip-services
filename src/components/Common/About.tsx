import React from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, 
  Info, 
  Target, 
  ShieldCheck, 
  Zap, 
  Users, 
  Briefcase, 
  Heart,
  Globe,
  Award,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/src/contexts/LanguageContext';

export const About: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex flex-col min-h-full bg-slate-50/30">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-900 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-8 px-6 rounded-b-[3.5rem] shadow-2xl shadow-emerald-200/40">
        <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-emerald-400/20 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex items-center justify-between mb-6">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 bg-white/10 text-white/90 hover:text-white backdrop-blur-md border border-white/20 rounded-xl transition-all active:scale-90"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-[10px] font-black text-white/70 tracking-[0.3em] uppercase">{t('About Us')}</h1>
          <div className="w-8" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-2xl rounded-2xl flex items-center justify-center border border-white/30 shadow-2xl mb-3 transform rotate-6 transition-transform duration-500">
             <Info size={28} className="text-white drop-shadow-lg" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tighter">DIP Services</h2>
        </div>
      </div>

      <motion.div 
        className="px-6 py-10 pb-32 space-y-12"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Large Mission Card */}
        <motion.section variants={itemVariants} className="relative group">
           <div className="absolute inset-0 bg-emerald-500 rounded-[3rem] blur-2xl opacity-10 group-hover:opacity-20 transition-all" />
           <div className="relative bg-white p-10 rounded-[3rem] border border-emerald-100 shadow-xl overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                 <Target size={120} />
              </div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
                  <Target size={24} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t('Our Mission')}</h3>
              </div>
              <p className="text-slate-600 font-bold leading-relaxed text-sm">
                 {t('To empower local service providers and provide customers with seamless, reliable, and professional doorstep services through innovative technology.')}
              </p>
           </div>
        </motion.section>

        {/* Why Choose Us Grid */}
        <motion.section variants={itemVariants} className="space-y-6">
          <h3 className="text-xl font-black text-slate-900 tracking-tight px-2 flex items-center gap-3">
             <span className="w-2 h-8 bg-emerald-500 rounded-full" />
             {t('Why DIP Services?')}
          </h3>
          
          <div className="grid grid-cols-2 gap-6">
            {[
              { icon: ShieldCheck, color: 'bg-emerald-50 text-emerald-600', label: 'Verified Pros', desc: 'Trusted professionals.' },
              { icon: Zap, color: 'bg-blue-50 text-blue-600', label: 'Instant Booking', desc: 'Fast scheduling.' },
              { icon: Award, color: 'bg-amber-50 text-amber-600', label: 'Quality Service', desc: 'Premium standards.' },
              { icon: Globe, color: 'bg-rose-50 text-rose-600', label: 'Local Impact', desc: 'Supporting local.' }
            ].map((item, i) => (
              <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-slate-50 shadow-md flex flex-col gap-4 active:scale-95 transition-all">
                <div className={`w-12 h-12 ${item.color} rounded-2xl flex items-center justify-center shadow-inner`}>
                  <item.icon size={24} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider">{t(item.label)}</h4>
                  <p className="text-slate-400 text-[10px] font-bold mt-1 uppercase tracking-tight">{t(item.desc)}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Impact Stats */}
        <motion.section variants={itemVariants} className="bg-slate-900 p-8 rounded-[3rem] relative overflow-hidden">
           <div className="absolute bottom-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl -mb-20 -mr-20" />
           <div className="relative grid grid-cols-2 gap-8 text-center text-white">
              <div>
                 <p className="text-3xl font-black text-emerald-400 mb-1">5+</p>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('Cities')}</p>
              </div>
              <div>
                 <p className="text-3xl font-black text-emerald-400 mb-1">200+</p>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('Professionals')}</p>
              </div>
           </div>
        </motion.section>

        {/* Footer info */}
        <motion.section variants={itemVariants} className="text-center pt-8">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('Version 2.4.0')}</p>
          <div className="mt-4 flex justify-center gap-6 text-slate-300">
             <div className="h-4 w-[1px] bg-slate-200" />
             <p className="text-[10px] font-bold uppercase tracking-widest">{t('Privacy Policy')}</p>
             <div className="h-4 w-[1px] bg-slate-200" />
             <p className="text-[10px] font-bold uppercase tracking-widest">{t('Terms of Service')}</p>
             <div className="h-4 w-[1px] bg-slate-200" />
          </div>
          <p className="mt-8 text-slate-400 text-[11px] font-medium">
             © 2026 DIP Services. All rights reserved.
          </p>
        </motion.section>
      </motion.div>
    </div>
  );
};
