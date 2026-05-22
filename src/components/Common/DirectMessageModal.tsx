import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, User, ShieldCheck } from 'lucide-react';
import { ref, onValue, push, set, serverTimestamp, update, get } from 'firebase/database';
import { db } from '@/src/lib/firebase';
import { useAuth } from '@/src/contexts/AuthContext';
import { FCMService } from '@/src/lib/fcmService';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { cn, formatDate } from '@/src/lib/utils';

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  read: boolean;
}

interface DirectMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string; // If admin, this is user UID. If user, this is their own UID.
  targetName?: string;
  isAdmin: boolean;
}

export const DirectMessageModal: React.FC<DirectMessageModalProps> = ({
  isOpen,
  onClose,
  targetId,
  targetName,
  isAdmin
}) => {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !targetId) return;

    const messagesRef = ref(db, `messages/${targetId}`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const msgList = Object.entries(data).map(([key, val]: [string, any]) => ({
          ...val,
          id: key,
        })).sort((a, b) => a.timestamp - b.timestamp);
        setMessages(msgList);

        // Mark incoming messages as read
        const unreadUpdates: any = {};
        let hasUnread = false;
        msgList.forEach(msg => {
          // I mark it as read if it is NOT from me.
          const isFromMe = isAdmin ? (msg.senderId === 'admin') : (msg.senderId === profile.uid);
          if (!msg.read && !isFromMe) {
            unreadUpdates[`${msg.id}/read`] = true;
            hasUnread = true;
          }
        });
        if (hasUnread) {
          update(messagesRef, unreadUpdates);
        }
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, [isOpen, targetId, isAdmin]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile) return;

    const msgText = newMessage.trim();
    setNewMessage('');

    try {
      const messagesRef = ref(db, `messages/${targetId}`);
      const newMsgRef = push(messagesRef);
      await set(newMsgRef, {
        senderId: isAdmin ? 'admin' : profile.uid,
        text: msgText,
        timestamp: serverTimestamp(),
        read: false
      });

      // Direct Notification
      try {
        const recipientPath = isAdmin ? `users/${targetId}` : `admins/primary`;
        const tokenRef = ref(db, `${recipientPath}/fcmToken`);
        const snapshot = await get(tokenRef);
        const token = snapshot.val();

        if (token) {
          await FCMService.sendPushNotification(
            token,
            isAdmin ? t('New Message from Admin') : t('New Message from User'),
            msgText,
            { type: isAdmin ? 'admin_message' : 'user_message', path: '#messages' }
          );
        }
      } catch (err) {
        console.error('Failed to send direct chat notification', err);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please check your connection.');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed inset-0 z-[100] bg-white flex flex-col pt-[env(safe-area-inset-top,0px)]"
      >
        {/* Header */}
        <div className="bg-slate-900 px-6 py-5 flex items-center justify-between text-white border-b border-slate-800 shrink-0 shadow-lg relative">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
              {isAdmin ? <User size={24} className="text-blue-400" /> : <ShieldCheck size={24} className="text-blue-400" />}
            </div>
            <div>
              <h3 className="font-black text-lg tracking-tight leading-none mb-1">
                {isAdmin ? (targetName || t('User Chat')) : t('Admin Support')}
              </h3>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest leading-none">
                  {isAdmin ? t('Online') : t('Instant Support')}
                </p>
              </div>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-all active:scale-90 border border-slate-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 relative pb-10 no-scrollbar">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none overflow-hidden">
             <div className="absolute top-10 right-10 w-64 h-64 bg-blue-600 rounded-full blur-[100px]" />
             <div className="absolute bottom-10 left-10 w-64 h-64 bg-indigo-600 rounded-full blur-[100px]" />
          </div>

          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 relative z-10">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl shadow-slate-200/50 mb-2 rotate-6">
                <Send size={32} className="text-blue-500 -rotate-12 translate-x-0.5" />
              </div>
              <div className="text-center">
                <p className="font-black text-slate-900">{t('Start a Conversation')}</p>
                <p className="text-xs font-semibold max-w-[200px] mt-1">{t('Send a message to our team and we will help you right away.')}</p>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = isAdmin ? (msg.senderId === 'admin') : (msg.senderId !== 'admin');
              return (
                <div key={msg.id} className={cn("flex flex-col max-w-[85%] relative z-10", isMine ? "ml-auto items-end" : "mr-auto items-start")}>
                  <div className={cn(
                    "px-5 py-3.5 rounded-3xl text-[14px] shadow-sm font-semibold break-words leading-relaxed transition-all",
                    isMine 
                      ? "bg-blue-600 text-white rounded-br-none shadow-blue-100/50" 
                      : "bg-white text-slate-800 border border-slate-200/50 rounded-bl-none shadow-slate-100"
                  )}>
                    {msg.text}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 px-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMine && msg.timestamp && (
                       <div className={cn("w-1 h-1 rounded-full", msg.read ? "bg-blue-400" : "bg-slate-300")} />
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-slate-100 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] px-4 pt-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
          <form onSubmit={handleSendMessage} className="max-w-xl mx-auto flex items-center gap-3">
            <div className="flex-1 relative group">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={t('Type your message here...')}
                className="w-full bg-slate-100 border-2 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl px-5 py-4 text-sm font-semibold transition-all duration-300"
              />
            </div>
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center disabled:opacity-40 hover:bg-blue-700 active:scale-95 transition-all shrink-0 shadow-lg shadow-blue-500/20"
            >
              <Send size={22} className="ml-1" />
            </button>
          </form>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
