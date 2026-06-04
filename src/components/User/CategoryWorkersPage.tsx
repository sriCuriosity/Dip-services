import React from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { WorkerProfile } from '@/src/types';
import { WorkersGroupedList } from './WorkersGroupedList';

type CategoryWorkersPageProps = {
  category: string;
  workers: WorkerProfile[];
  loading: boolean;
  variant: 'service' | 'rental';
  onBack: () => void;
  onSelectWorker: (worker: WorkerProfile) => void;
  onPreviewImage?: (src: string, alt: string) => void;
};

export const CategoryWorkersPage: React.FC<CategoryWorkersPageProps> = ({
  category,
  workers,
  loading,
  variant,
  onBack,
  onSelectWorker,
  onPreviewImage,
}) => {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <div className="flex items-center gap-3 px-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-3 bg-white border-b border-slate-100 shadow-sm sticky top-0 z-10">
        <button type="button" onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft size={22} className="text-slate-700" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            {t(category)} {t('Workers')}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {workers.length} {t('workers available')}
          </p>
        </div>
      </div>
      <div className="flex-1 px-4 py-4 pb-28">
        {loading && workers.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 font-medium">{t('Loading workers...')}</p>
          </div>
        ) : workers.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Search size={32} />
            </div>
            <p className="text-slate-500 font-medium">{t('No workers found in this category')}</p>
          </div>
        ) : (
          <WorkersGroupedList
            workers={workers}
            variant={variant}
            singleCategory={category}
            pageSize={3}
            initialVisible={3}
            onSelectWorker={onSelectWorker}
            onPreviewImage={onPreviewImage}
          />
        )}
      </div>
    </div>
  );
};
