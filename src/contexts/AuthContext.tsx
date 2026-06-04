import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ref, get, update, onValue } from 'firebase/database';
import { auth, db, messaging } from '@/src/lib/firebase';
import { UserProfile } from '@/src/types';
import { initializePushNotifications } from '@/src/lib/push';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null | undefined;
  loading: boolean;
  refreshProfile: (uid?: string) => Promise<void>;
  /** Immediate UI update before Firebase onValue catches up (e.g. role switch). */
  patchProfile: (patch: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const fetchIdRef = useRef(0);

  const setupProfileListener = (uid: string) => {
    const profileRef = ref(db, `users/${uid}`);
    
    // Listen to profile changes in real-time
    const unsubscribe = onValue(profileRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setProfile({ ...data, uid });
        
        try {
          if (auth.currentUser) {
            initializePushNotifications(auth.currentUser, data.role);
          }
        } catch (pushErr) {
          console.warn('Push notification init failed (non-fatal):', pushErr);
        }
      } else {
        console.warn(`Profile not found for ${uid}`);
        setProfile(null);
      }
      setLoading(false);
    }, (error) => {
      console.error('Profile listener error:', error);
      setLoading(false);
    });

    return unsubscribe;
  };


  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    let profileUnsubscribe: (() => void) | undefined;

    const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth State Changed:', firebaseUser?.uid || 'No User');
      setUser(firebaseUser);
      
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = undefined;
      }

      if (firebaseUser && db) {
        setProfile(undefined);
        setLoading(true);
        profileUnsubscribe = setupProfileListener(firebaseUser.uid);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, []);

  const refreshProfile = async (uid?: string) => {
    // With onValue listener, manual refresh is generally not needed for database updates.
    // We keep this function for compatibility with components that call it.
    return Promise.resolve();
  };

  const patchProfile = (patch: Partial<UserProfile>) => {
    setProfile((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile, patchProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
