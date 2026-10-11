import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  getDoc, 
  getDocs,
  setDoc, 
  updateDoc, 
  deleteDoc,
  Unsubscribe,
  serverTimestamp
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL 
} from 'firebase/storage';
import { 
  getFunctions, 
  httpsCallable 
} from 'firebase/functions';
import { CreditAccount, GenerationJob, Project } from '../types/index.js';

// Official configuration for Firebase Project 'any-video-to' (ANY Video TO)
// Web App ID: 1:1016314223204:web:1bfeb551f24af9a6d81d71
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBjobdPzb3c5oLK6mnSrj2tWeAm9VM7mpI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "any-video-to.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "any-video-to",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "any-video-to.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1016314223204",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1016314223204:web:1bfeb551f24af9a6d81d71",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-57YH9NHCZ7"
};

// Initialize modular Firebase instance
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Authentication Helpers
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function signOutUser() {
  return firebaseSignOut(auth);
}

// Phone Authentication Helpers
export function createRecaptchaVerifier(containerId: string): RecaptchaVerifier {
  // Clear any existing verifier if present
  const win = window as unknown as { recaptchaVerifier?: RecaptchaVerifier };
  if (win.recaptchaVerifier) {
    try {
      win.recaptchaVerifier.clear();
    } catch {
      // ignore
    }
  }

  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved
    },
    'expired-callback': () => {
      // Response expired
    }
  });

  win.recaptchaVerifier = verifier;
  return verifier;
}

export async function sendPhoneOtp(
  phoneNumber: string,
  verifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  return signInWithPhoneNumber(auth, phoneNumber, verifier);
}

// Storage: Private User Image Upload
export async function uploadReferenceImage(
  file: File, 
  userId: string, 
  onProgress?: (progress: number) => void
): Promise<{ downloadUrl: string; filename: string }> {
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `uploads/${userId}/${Date.now()}_${sanitizedName}`;
  const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type,
    customMetadata: { userId, originalName: file.name }
  });

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      },
      (error) => reject(error),
      async () => {
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
        resolve({ downloadUrl, filename: file.name });
      }
    );
  });
}

// Firestore: Real-time Credit Balance Listener
export function subscribeToCreditAccount(
  userId: string, 
  onUpdate: (account: CreditAccount | null) => void
): Unsubscribe {
  const docRef = doc(db, 'creditAccounts', userId);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate(docSnap.data() as CreditAccount);
    } else {
      onUpdate(null);
    }
  }, (err) => console.warn('Credit subscription error:', err));
}

// Firestore: Real-time Jobs Listener
export function subscribeToUserJobs(
  userId: string, 
  onUpdate: (jobs: GenerationJob[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'generationJobs'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const jobs = snap.docs.map(d => ({ id: d.id, ...d.data() } as GenerationJob));
    onUpdate(jobs);
  }, (err) => console.warn('Jobs subscription error:', err));
}

// Firestore: Real-time Projects Listener
export function subscribeToUserProjects(
  userId: string, 
  onUpdate: (projects: Project[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'projects'),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const projs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Project));
    onUpdate(projs);
  }, (err) => console.warn('Projects subscription error:', err));
}

// Cloud Functions Callables
export const fnCreateVideoGeneration = httpsCallable(functions, 'createVideoGeneration');
export const fnGetGenerationStatus = httpsCallable(functions, 'getGenerationStatus');
export const fnRetryGeneration = httpsCallable(functions, 'retryGeneration');
export const fnCancelGeneration = httpsCallable(functions, 'cancelGeneration');
export const fnAdminAdjustCredits = httpsCallable(functions, 'adminAdjustCredits');
