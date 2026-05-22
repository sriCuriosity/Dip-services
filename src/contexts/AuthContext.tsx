import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ref, get, update } from 'firebase/database';
import { auth, db, messaging } from '@/src/lib/firebase';
import { UserProfile } from '@/src/types';
import { initializePushNotifications } from '@/src/lib/push';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null | undefined;
  loading: boolean;
  refreshProfile: (uid?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [currentToken, setCurrentToken] = useState<string | null>(null);

  const fetchProfile = async (uid: string) => {
    try {
      const profileRef = ref(db, `users/${uid}`);
      
      // Add a timeout to the fetch operation
      const profilePromise = get(profileRef);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
      );

      const snapshot = await Promise.race([profilePromise, timeoutPromise]) as any;
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        setProfile({ ...data, uid });
        
        // Setup push notifications after profile is loaded (web & native)
        initializePushNotifications(auth.currentUser, data.role);
      } else {
        console.warn('No profile found for user:', uid);
        setProfile(null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    }
  };


  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth State Changed:', firebaseUser?.uid || 'No User');
      setLoading(true);
      setUser(firebaseUser);
      if (firebaseUser && db) {
        await fetchProfile(firebaseUser.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []); // Removed user from dependencies to avoid infinite loop

  const refreshProfile = async (uid?: string) => {
    const currentUid = uid || auth?.currentUser?.uid;
    if (currentUid) {
      await fetchProfile(currentUid);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
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
