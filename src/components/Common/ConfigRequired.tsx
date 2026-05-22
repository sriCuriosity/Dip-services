import React from 'react';
import { ShieldAlert, ExternalLink, Key } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export const ConfigRequired: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="mobile-container bg-slate-50 flex items-center justify-center p-8 text-center">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 w-full">
        <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <ShieldAlert size={40} />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 mb-4">{t('Setup Required')}</h1>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
          {t('To enable authentication and database features, you need to configure your Firebase project.')}
        </p>

        <div className="space-y-4 text-left mb-8">
          <div className="flex gap-3">
            <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold">1</span>
            </div>
            <p className="text-xs text-slate-600">{t('Create a Firebase project at')} <span className="font-bold">console.firebase.google.com</span></p>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold">2</span>
            </div>
            <p className="text-xs text-slate-600">{t('Enable')} <span className="font-bold">Email/Password</span> {t('Auth and')} <span className="font-bold">Realtime Database</span>.</p>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold">3</span>
            </div>
            <p className="text-xs text-slate-600">{t('Copy your Web App config to the')} <span className="font-bold">Secrets</span> {t('panel in AI Studio.')}</p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-8">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Key size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{t('Required Secrets')}</span>
          </div>
          <code className="text-[10px] text-blue-600 font-mono block text-left">
            VITE_FIREBASE_API_KEY<br/>
            VITE_FIREBASE_AUTH_DOMAIN<br/>
            VITE_FIREBASE_PROJECT_ID
          </code>
        </div>

        <a 
          href="https://console.firebase.google.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <span>{t('Go to Firebase Console')}</span>
          <ExternalLink size={16} />
        </a>
      </div>
    </div>
  );
};
