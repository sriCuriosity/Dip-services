import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Star, Hammer, ShieldCheck, ShieldAlert, ChevronDown } from 'lucide-react';
import { WorkerProfile } from '@/src/types';
import { cn, formatCurrency } from '@/src/lib/utils';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { tradeMatchesCategory } from '@/src/lib/workerDirectory';

type ListVariant = 'service' | 'rental';

/** Flattened worker row used on Services/Rentals lists (trade + rates from RTDB). */
export type WorkerListItem = WorkerProfile & {
  trade?: string;
  rates?: Record<string, number>;
  experience?: string | number;
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  location?: string;
};

interface WorkersGroupedListProps {
  workers: WorkerListItem[];
  onSelectWorker: (worker: WorkerListItem) => void;
  onPreviewImage?: (src: string, alt: string) => void;
  variant?: ListVariant;
  /** When set, only this trade is shown (flat list, no grouping header). */
  singleCategory?: string | null;
  /** Workers shown before first "Show More" (home list). */
  initialVisible?: number;
  /** Extra workers loaded per "Show More" click. */
  pageSize?: number;
}

function getWorkerAmount(worker: WorkerListItem, variant: ListVariant): { amount: number; labelKey: string } {
  const trade = (worker.trade || '').toLowerCase().trim();
  if (variant === 'rental') {
    if (['house rent', 'shop rent', 'marriage hall', 'catering'].includes(trade)) {
      return { amount: (worker.rates as any)?.advance || 0, labelKey: 'Advance' };
    }
    if (['auto', 'tempo', 'van', 'jcb', 'car'].includes(worker.trade || '')) {
      return {
        amount: (worker.rates as any)?.ratePerKm || (worker.rates as any)?.ratePerHour || 0,
        labelKey: 'Starts from',
      };
    }
  }
  if (trade === 'coconut plucker') {
    return { amount: (worker.rates as any)?.ratePerTree || 0, labelKey: 'Starts from' };
  }
  return { amount: worker.rates?.quickVisit || 0, labelKey: 'Starts from' };
}

interface WorkerCardProps {
  worker: WorkerListItem;
  variant: ListVariant;
  onSelectWorker: (w: WorkerListItem) => void;
  onPreviewImage?: (src: string, alt: string) => void;
}

const WorkerCard: React.FC<WorkerCardProps> = ({
  worker,
  variant,
  onSelectWorker,
  onPreviewImage,
}) => {
  const { t } = useLanguage();
  const { amount, labelKey } = getWorkerAmount(worker, variant);
  const tradeRating = worker.trades?.[worker.trade || '']?.rating;
  const rating = tradeRating !== undefined ? tradeRating : worker.rating;

  return (
    <motion.div
      layout={false}
      onClick={() => onSelectWorker(worker)}
      className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 flex items-start gap-4 cursor-pointer active:scale-[0.98] transition-all duration-200"
    >
      <div
        className="w-16 h-16 bg-slate-100 rounded-2xl overflow-hidden flex-shrink-0 mt-1 shadow-sm border border-slate-200/50"
        onClick={(e) => {
          if (worker.photoURL && onPreviewImage) {
            e.stopPropagation();
            onPreviewImage(worker.photoURL, worker.name);
          }
        }}
      >
        {worker.photoURL ? (
          <img src={worker.photoURL} alt={worker.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-600">
            <Hammer size={24} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1.5 mb-1.5">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 break-words leading-snug text-sm">{worker.name}</h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-0.5 text-amber-500 text-[10px] font-bold">
                <Star size={10} className="fill-amber-500" />
                {rating ? rating.toFixed(1) : '0.0'}
              </div>
              {worker.verificationStatus === 'approved' ? (
                <ShieldCheck size={14} className="text-emerald-500" />
              ) : (
                <ShieldAlert size={14} className="text-red-500" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg flex-shrink-0 font-bold text-[9px] max-w-[75px]">
            <MapPin size={9} className="shrink-0" />
            <span className="break-all line-clamp-2">{worker.city || t('Unknown')}</span>
          </div>
        </div>
        <div className="text-xs text-slate-600 font-medium">{t(worker.trade || 'Service')}</div>
        <div className="text-xs text-slate-500">{worker.experience} {t('Exp')}</div>
        <div className="flex justify-between items-start text-xs mt-1 gap-3">
          <span className="text-slate-900 flex-1 min-w-0 break-words leading-tight">
            {worker.address || worker.location || t('No address provided')}
          </span>
          <div className="text-right flex-shrink-0 pl-1 border-l border-slate-100 min-w-[70px]">
            <span className="text-blue-600 font-bold block">{formatCurrency(amount)}</span>
            <span className="text-slate-400 text-[9px] font-bold block">{t(labelKey)}</span>
          </div>
        </div>
        {worker.landmark && (
          <div className="text-slate-400 text-[10px] mt-0.5 break-all">
            {t('Landmark:')} {worker.landmark}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const WorkersGroupedList: React.FC<WorkersGroupedListProps> = ({
  workers,
  onSelectWorker,
  onPreviewImage,
  variant = 'service' as ListVariant,
  singleCategory = null,
  initialVisible = 1,
  pageSize = 3,
}) => {
  const listVariant: ListVariant = variant;
  const { t } = useLanguage();
  const [extraVisible, setExtraVisible] = useState<Record<string, number>>({});

  const grouped = useMemo(() => {
    const map = new Map<string, WorkerListItem[]>();
    for (const w of workers) {
      const trade = w.trade || t('Service');
      if (!map.has(trade)) map.set(trade, []);
      map.get(trade)!.push(w);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [workers, t]);

  const visibleCount = (trade: string, total: number) => {
    const extra = extraVisible[trade] ?? 0;
    return Math.min(initialVisible + extra, total);
  };

  const loadMore = (trade: string) => {
    setExtraVisible((prev) => ({
      ...prev,
      [trade]: (prev[trade] ?? 0) + pageSize,
    }));
  };

  if (singleCategory) {
    const list = workers.filter((w) => tradeMatchesCategory(w.trade, singleCategory));
    const total = list.length;
    const shown = visibleCount(singleCategory, total);
    const visible = list.slice(0, shown);
    const remaining = total - shown;

    return (
      <div className="space-y-4">
        {visible.map((worker) => (
          <WorkerCard
            key={`${worker.uid}-${worker.trade}`}
            worker={worker}
            variant={listVariant}
            onSelectWorker={onSelectWorker}
            onPreviewImage={onPreviewImage}
          />
        ))}
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => loadMore(singleCategory)}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 text-blue-700 text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <ChevronDown size={16} />
            {t('Show More')} ({Math.min(pageSize, remaining)} {t('more')})
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(([trade, tradeWorkers]) => {
        const total = tradeWorkers.length;
        const shown = visibleCount(trade, total);
        const visible = tradeWorkers.slice(0, shown);
        const remaining = total - shown;

        return (
          <section key={trade} className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                {t(trade)}
              </h3>
              <span className="text-[10px] font-bold text-slate-400">
                {total} {t('available')}
              </span>
            </div>
            <div className="space-y-3">
              {visible.map((worker) => (
                <WorkerCard
                  key={`${worker.uid}-${worker.trade}`}
                  worker={worker}
                  variant={listVariant}
                  onSelectWorker={onSelectWorker}
                  onPreviewImage={onPreviewImage}
                />
              ))}
            </div>
            {remaining > 0 && (
              <button
                type="button"
                onClick={() => loadMore(trade)}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 text-blue-700 text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                <ChevronDown size={16} />
                {t('Show More')} ({Math.min(pageSize, remaining)} {t('more')})
              </button>
            )}
          </section>
        );
      })}
    </div>
  );
};
