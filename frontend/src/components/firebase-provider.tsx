'use client';

import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { auth, db } from '../lib/firebase';

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
});

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const userReference = doc(db, 'users', user.uid);

    const syncPresence = async (presenceStatus: 'online' | 'away' | 'offline') => {
      await setDoc(
        userReference,
        {
          email: user.email || '',
          displayName: user.displayName || user.email || 'Denuel User',
          photoURL: user.photoURL || '',
          presenceStatus,
          lastSeenAt: serverTimestamp(),
        },
        { merge: true }
      );
    };

    void syncPresence(document.hidden ? 'away' : 'online');

    const handleVisibilityChange = () => {
      void syncPresence(document.hidden ? 'away' : 'online');
    };

    const heartbeat = window.setInterval(() => {
      void syncPresence(document.hidden ? 'away' : 'online');
    }, 60000);

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void syncPresence('offline');
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useFirebaseAuth = () => useContext(AuthContext);
