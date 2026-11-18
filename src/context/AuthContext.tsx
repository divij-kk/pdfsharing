import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { UserProfile } from '../types';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  profile: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [profileResolved, setProfileResolved] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthResolved(true);
      if (!user) {
        setProfile(null);
        setProfileResolved(true);
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    setProfileResolved(false);
    const unsubDoc = onSnapshot(
      doc(db, 'users', firebaseUser.uid),
      (snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
          setProfileResolved(true);
        } else {
          // First sign-in via a path that doesn't pre-create the doc (e.g.
          // the email-link flow) — create a default 'customer' profile.
          // Rules only allow a user to create their own doc with this role.
          setDoc(doc(db, 'users', firebaseUser.uid), {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: 'customer',
            createdAt: serverTimestamp(),
          }).catch(() => {
            // If this also fails, stop showing a perpetual spinner.
            setProfileResolved(true);
          });
        }
      },
      () => setProfileResolved(true)
    );
    return () => unsubDoc();
  }, [firebaseUser]);

  const loading = !authResolved || (!!firebaseUser && !profileResolved);

  return (
    <AuthContext.Provider value={{ firebaseUser, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
