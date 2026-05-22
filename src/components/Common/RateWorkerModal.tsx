import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { ref, push, update, get, set } from 'firebase/database';
import { cn } from '@/src/lib/utils';
import { db } from '@/src/lib/firebase';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';

interface RateWorkerModalProps {
  workerId: string;
  orderId: string;
  onClose: () => void;
}

export const RateWorkerModal: React.FC<RateWorkerModalProps> = ({ workerId, orderId, onClose }) => {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    try {
      // 0. Get the order to find out which trade was performed
      const orderRef = ref(db, `orders/${orderId}`);
      const orderSnapshot = await get(orderRef);
      const orderData = orderSnapshot.val();
      const tradeId = orderData?.trade;

      // 1. Save the review
      const reviewRef = push(ref(db, `reviews/${workerId}`));
      await set(reviewRef, {
        workerId,
        userId: profile.uid,
        orderId,
        tradeId,
        rating,
        comment,
        timestamp: Date.now()
      });

      // 2. Update worker's average rating
      const workerRef = ref(db, `workers/${workerId}`);
      const snapshot = await get(workerRef);
      const workerData = snapshot.val();
      
      const currentRating = workerData.rating || 0;
      const totalRatings = workerData.totalRatings || 0;
      
      const newTotalRatings = totalRatings + 1;
      const newAverageRating = ((currentRating * totalRatings) + rating) / newTotalRatings;
      
      const updates: any = {
        rating: newAverageRating,
        totalRatings: newTotalRatings
      };

      // 3. Update trade-specific rating if tradeId exists
      if (tradeId && workerData.trades && workerData.trades[tradeId]) {
        const tradeData = workerData.trades[tradeId];
        const currentTradeRating = tradeData.rating || 0;
        const totalTradeRatings = tradeData.totalRatings || 0;
        const newTotalTradeRatings = totalTradeRatings + 1;
        const newAverageTradeRating = ((currentTradeRating * totalTradeRatings) + rating) / newTotalTradeRatings;

        updates[`trades/${tradeId}/rating`] = newAverageTradeRating;
        updates[`trades/${tradeId}/totalRatings`] = newTotalTradeRatings;
      }
      
      await update(workerRef, updates);

      // 4. Update order's rated status
      await update(orderRef, {
        isRated: true
      });

      onClose();
    } catch (error) {
      console.error('Error submitting review:', error);
      alert(t('Failed to submit review.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="bg-white w-full max-w-sm rounded-3xl p-6"
      >
        <h2 className="text-xl font-bold text-slate-900 mb-4">{t('Rate your experience')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={32}
                className={cn("cursor-pointer transition-colors", star <= rating ? "text-amber-400 fill-amber-400" : "text-slate-300")}
                onClick={() => setRating(star)}
              />
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('Review Comment')}</label>
            </div>
            <textarea
              className="input-field min-h-[100px]"
              placeholder={t('Share your feedback...')}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm">
              {t('Cancel')}
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm">
              {loading ? t('Submitting...') : t('Submit')}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
