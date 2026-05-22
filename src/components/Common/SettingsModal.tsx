import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, ShieldCheck, Briefcase, HelpCircle, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/src/contexts/LanguageContext';

import { useNavigate } from 'react-router-dom';
import { cn } from '@/src/lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();

  const navigate = useNavigate();

  if (!isOpen) return null;

  const SettingRow = ({ icon: Icon, label, onClick, rightElement }: any) => (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between py-4 px-4 active:bg-slate-50 transition-all border-b border-slate-100 last:border-0"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-500">
          <Icon size={20} />
        </div>
        <span className="font-semibold text-sm text-slate-800">{label}</span>
      </div>
      {rightElement || <ChevronRight size={18} className="text-slate-300" />}
    </button>
  );

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex justify-end bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-sm h-full bg-white shadow-2xl flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] pb-5 flex items-center justify-between border-b border-slate-100 bg-white/80 backdrop-blur-lg sticky top-0 z-10">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">{t('Settings')}</h2>
            <button 
              onClick={onClose}
              className="p-2 -mr-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 active:scale-95 transition-all"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">

            {/* Support & Info Section */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">{t('Support & Info')}</h3>
              <div className="bg-white rounded-[28px] border border-slate-200 shadow-sm overflow-hidden">
                <SettingRow 
                  icon={Info} 
                  label={t('About DIP Services')} 
                  onClick={() => {
                    navigate('/about');
                  }} 
                />
                <SettingRow 
                  icon={HelpCircle} 
                  label={t('FAQ (Questions & Answers)')} 
                  onClick={() => {
                    navigate('/faq');
                  }} 
                />
                <SettingRow 
                  icon={ShieldCheck} 
                  label={t('Privacy & Security')} 
                  onClick={() => {
                    navigate('/privacy-security');
                  }} 
                />
                <SettingRow 
                  icon={Briefcase} 
                  label={t('Terms of Service')} 
                  onClick={() => {
                    navigate('/terms');
                  }} 
                />
              </div>
            </section>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
