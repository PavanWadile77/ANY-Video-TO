import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut,
  updateProfile,
  ConfirmationResult
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { 
  auth, 
  db, 
  googleProvider, 
  subscribeToCreditAccount,
  createRecaptchaVerifier,
  sendPhoneOtp
} from '../lib/firebase.js';
import { CreditAccount, UserProfile } from '../types/index.js';

interface AuthContextType {
  currentUser: User | null;
  profile: UserProfile | null;
  credits: CreditAccount | null;
  isLoading: boolean;
  isAdmin: boolean;
  signInGoogle: () => Promise<void>;
  signInEmail: (email: string, pass: string) => Promise<void>;
  signUpEmail: (email: string, pass: string, name: string) => Promise<void>;
  sendPhoneCode: (phoneNumber: string, containerId?: string) => Promise<ConfirmationResult>;
  confirmPhoneCode: (confirmationResult: ConfirmationResult, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [credits, setCredits] = useState<CreditAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    let unsubscribeCredits: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        const fallbackEmail = user.email || (user.phoneNumber ? `${user.phoneNumber.replace(/[^0-9]/g, '')}@phone.animora.ai` : `${user.uid}@animora.ai`);
        const fallbackName = user.displayName || (user.phoneNumber ? `User ${user.phoneNumber.slice(-4)}` : 'Creator');

        // Sync or create user profile in Firestore
        const userRef = doc(db, 'users', user.uid);
        try {
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              id: user.uid,
              email: fallbackEmail,
              displayName: fallbackName,
              avatarUrl: user.photoURL || undefined,
              role: user.email?.includes('admin') ? 'admin' : 'user',
              preferences: { theme: 'dark', notifications: true },
              createdAt: new Date().toISOString()
            };
            await setDoc(userRef, newProfile);
            setProfile(newProfile);
          }
        } catch (err) {
          console.warn('Firestore user fetch warning:', err);
          setProfile({
            id: user.uid,
            email: fallbackEmail,
            displayName: fallbackName,
            role: 'user',
            preferences: { theme: 'dark', notifications: true },
            createdAt: new Date().toISOString()
          });
        }

        // Initialize user credit account in Firestore if absent
        try {
          const creditRef = doc(db, 'creditAccounts', user.uid);
          const creditSnap = await getDoc(creditRef);
          if (!creditSnap.exists()) {
            const initialCreditAccount: CreditAccount = {
              id: `acc_${user.uid.substring(0, 8)}`,
              userId: user.uid,
              balance: 150,
              reservedBalance: 0,
              lifetimeUsed: 0,
              tier: 'free',
              updatedAt: new Date().toISOString()
            };
            await setDoc(creditRef, initialCreditAccount);
            setCredits(initialCreditAccount);
          }
        } catch (err) {
          console.warn('Credit document initialization notice:', err);
        }

        // Subscribe to real-time credit balance
        unsubscribeCredits = subscribeToCreditAccount(user.uid, (acc) => {
          if (acc) {
            setCredits(acc);
          } else {
            // Default 150 starter credits
            setCredits({
              id: `acc_${user.uid.substring(0, 8)}`,
              userId: user.uid,
              balance: 150,
              reservedBalance: 0,
              lifetimeUsed: 0,
              tier: 'free',
              updatedAt: new Date().toISOString()
            });
          }
        });
      } else {
        setProfile(null);
        setCredits(null);
        if (unsubscribeCredits) unsubscribeCredits();
      }

      setIsLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeCredits) unsubscribeCredits();
    };
  }, []);

  const signInGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
    setIsAuthModalOpen(false);
  };

  const signInEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
    setIsAuthModalOpen(false);
  };

  const signUpEmail = async (email: string, pass: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (cred.user) {
      await updateProfile(cred.user, { displayName: name });
    }
    setIsAuthModalOpen(false);
  };

  const sendPhoneCode = async (phoneNumber: string, containerId = 'recaptcha-container') => {
    const verifier = createRecaptchaVerifier(containerId);
    return sendPhoneOtp(phoneNumber, verifier);
  };

  const confirmPhoneCode = async (confirmationResult: ConfirmationResult, code: string) => {
    await confirmationResult.confirm(code);
    setIsAuthModalOpen(false);
  };

  const signOut = async () => {
    await fbSignOut(auth);
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        credits,
        isLoading,
        isAdmin,
        signInGoogle,
        signInEmail,
        signUpEmail,
        sendPhoneCode,
        confirmPhoneCode,
        signOut,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

