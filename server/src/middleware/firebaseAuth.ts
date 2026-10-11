import { Request, Response, NextFunction } from 'express';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';
import { db, DEFAULT_USER_ID, ADMIN_USER_ID } from '../db/store.js';

dotenv.config();

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'any-video-to';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    initializeApp({
      projectId: FIREBASE_PROJECT_ID
    });
  } catch (err) {
    console.warn('Firebase Admin initialization notice:', err);
  }
}

export interface AuthenticatedUser {
  id: string;
  email?: string;
  role: 'user' | 'admin';
  displayName?: string;
  isFirebaseVerified?: boolean;
}

export async function verifyFirebaseTokenString(token: string): Promise<AuthenticatedUser> {
  // 1. Try real Firebase Admin verifyIdToken
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    const existing = db.getProfile(decodedToken.uid);
    return {
      id: decodedToken.uid,
      email: decodedToken.email,
      role: decodedToken.email?.includes('admin') || (decodedToken as any).admin ? 'admin' : (existing?.role || 'user'),
      displayName: (decodedToken as any).name || existing?.displayName,
      isFirebaseVerified: true
    };
  } catch (err) {
    // 2. In test/dev environments, allow structured mock tokens (e.g. "Bearer test-token-<userId>")
    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
      if (token.startsWith('test-token-') || token.startsWith('mock-token-') || token.startsWith('token_')) {
        const uid = token.replace(/^(test-token-|mock-token-|token_)/, '');
        const existing = db.getProfile(uid) || db.getProfile(DEFAULT_USER_ID);
        return {
          id: uid || DEFAULT_USER_ID,
          email: existing?.email || `${uid}@animora.ai`,
          role: existing?.role || 'user',
          isFirebaseVerified: true
        };
      }
    }
    throw new Error('Invalid or expired Firebase ID token');
  }
}

/**
 * Strict authentication middleware for private storage operations.
 * Enforces verified Firebase ID tokens and rejects unauthenticated requests with HTTP 401.
 */
export async function requireFirebaseStorageAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Explicit unauthenticated test flag
  if (req.headers['x-no-auth'] === 'true' || req.headers['x-user-id'] === 'unauthorized_guest') {
    res.status(401).json({ error: 'Unauthorized: Firebase authentication token required' });
    return;
  }

  const authHeader = req.headers['authorization'];
  const firebaseTokenHeader = req.headers['x-firebase-token'] as string;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : firebaseTokenHeader;

  if (token) {
    try {
      const verifiedUser = await verifyFirebaseTokenString(token);
      (req as any).user = verifiedUser;
      return next();
    } catch (err) {
      res.status(401).json({ error: 'Unauthorized: Invalid or expired Firebase authentication token' });
      return;
    }
  }

  // In testing environment, allow test runner to simulate an authenticated user with x-user-id header
  if (process.env.NODE_ENV === 'test' && req.headers['x-user-id']) {
    const userId = req.headers['x-user-id'] as string;
    const role = (req.headers['x-user-role'] as string) || (userId === ADMIN_USER_ID ? 'admin' : 'user');
    const profile = db.getProfile(userId) || { id: userId, role: role as 'user' | 'admin' };
    (req as any).user = profile;
    return next();
  }

  // Admin role header in test environment
  if (process.env.NODE_ENV === 'test' && req.headers['x-user-role'] === 'admin') {
    (req as any).user = db.getProfile(ADMIN_USER_ID) || { id: ADMIN_USER_ID, role: 'admin' };
    return next();
  }

  // Rejection: No fallback to default user for private storage operations!
  res.status(401).json({ error: 'Unauthorized: Missing Firebase ID token for storage operation' });
}
