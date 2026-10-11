import {
  UserProfile,
  CreditAccount,
  CreditTransaction,
  Project,
  GenerationJob,
  CreateGenerationJobDTO,
  ProviderCapabilities,
  ProviderHealth,
  VideoCategory
} from '../types/index.js';

export type {
  UserProfile,
  CreditAccount,
  CreditTransaction,
  Project,
  GenerationJob,
  CreateGenerationJobDTO,
  ProviderCapabilities,
  ProviderHealth,
  VideoCategory
};

const API_BASE = '/api';

export interface AuthMeResponse {
  profile: UserProfile;
  credits: CreditAccount;
}

export interface ProvidersResponse {
  capabilities: ProviderCapabilities[];
  health: ProviderHealth[];
}

export interface CreditsResponse {
  account: CreditAccount;
  transactions: CreditTransaction[];
}

export interface AdminOverviewResponse {
  metrics: {
    totalUsers: number;
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    processingJobs: number;
    successRate: number;
  };
  providerHealth: ProviderHealth[];
  recentJobs: GenerationJob[];
}

// Active role switcher for testing user vs admin
let currentRole: 'user' | 'admin' = 'user';

export function setCurrentRole(role: 'user' | 'admin') {
  currentRole = role;
}

export function getCurrentRole(): 'user' | 'admin' {
  return currentRole;
}

import { firestoreBackend } from './firestoreBackend.js';
import { supabaseStorageService, StorageUploadResponse } from './supabaseStorage.js';
import { 
  auth, 
  fnCreateVideoGeneration, 
  fnGetGenerationStatus, 
  fnRetryGeneration, 
  fnCancelGeneration 
} from './firebase.js';

export const api = {
  // Auth & Profile
  getMe: () => firestoreBackend.getMe(),
  updateProfile: (data: { displayName?: string; preferences?: Record<string, unknown> }) =>
    firestoreBackend.updateProfile(data),

  // Providers & Health
  getProviders: async () => firestoreBackend.getProviders(),
  getHealth: async () => firestoreBackend.getHealth(),

  // Credits & Ledger
  getCredits: () => firestoreBackend.getCredits(),

  // Projects
  getProjects: (filters?: { category?: VideoCategory; isFavorite?: boolean; q?: string }) =>
    firestoreBackend.getProjects(filters),
  createProject: (data: { title: string; category: VideoCategory; description?: string }) =>
    firestoreBackend.createProject(data),
  updateProject: (id: string, data: Partial<Project>) =>
    firestoreBackend.updateProject(id, data),
  deleteProject: (id: string) =>
    firestoreBackend.deleteProject(id),

  // Generation Jobs (Calls Firebase Cloud Functions when authenticated with resilient fallback)
  getJobs: () => firestoreBackend.getJobs(),
  getJob: async (id: string): Promise<GenerationJob> => {
    if (auth.currentUser) {
      try {
        const res = await fnGetGenerationStatus({ jobId: id });
        if (res.data) {
          return res.data as GenerationJob;
        }
      } catch (fnErr: unknown) {
        // Fall through to Firestore
      }
    }
    return firestoreBackend.getJob(id);
  },
  createJob: async (dto: CreateGenerationJobDTO): Promise<GenerationJob> => {
    if (auth.currentUser) {
      try {
        const res = await fnCreateVideoGeneration(dto);
        if (res.data) {
          return res.data as GenerationJob;
        }
      } catch (fnErr: unknown) {
        console.warn('Firebase Cloud Function createVideoGeneration notice, falling back:', fnErr);
      }
    }
    return firestoreBackend.createJob(dto);
  },
  retryJob: async (id: string): Promise<GenerationJob> => {
    if (auth.currentUser) {
      try {
        const res = await fnRetryGeneration({ jobId: id });
        if (res.data) {
          return res.data as GenerationJob;
        }
      } catch (fnErr: unknown) {
        console.warn('Firebase Cloud Function retryGeneration notice, falling back:', fnErr);
      }
    }
    return firestoreBackend.retryJob(id);
  },
  cancelJob: async (id: string): Promise<GenerationJob> => {
    if (auth.currentUser) {
      try {
        const res = await fnCancelGeneration({ jobId: id });
        if (res.data) {
          return res.data as GenerationJob;
        }
      } catch (fnErr: unknown) {
        console.warn('Firebase Cloud Function cancelGeneration notice, falling back:', fnErr);
      }
    }
    return firestoreBackend.cancelJob(id);
  },

  // Prompt Enhancer
  enhancePrompt: async (prompt: string, category: VideoCategory, stylePreference?: string) =>
    firestoreBackend.enhancePrompt(prompt, category, stylePreference),

  // Supabase Storage Operations (Buckets: ai-videos, video-thumbnails)
  uploadSourceMedia: async (file: File, onProgress?: (p: number) => void): Promise<StorageUploadResponse> =>
    supabaseStorageService.uploadSourceMedia(file, onProgress),

  uploadThumbnail: async (file: File, onProgress?: (p: number) => void): Promise<StorageUploadResponse> =>
    supabaseStorageService.uploadThumbnail(file, onProgress),

  getSignedPlaybackUrl: async (bucket: string, path: string, expiresIn?: number): Promise<string> =>
    supabaseStorageService.getSignedPlaybackUrl(bucket, path, expiresIn),

  getStorageStatus: async () =>
    supabaseStorageService.getStatus(),

  // Standard Image Upload (Unified: uses Supabase Storage with graceful fallback)
  uploadImage: async (file: File, onProgress?: (p: number) => void): Promise<{ success: boolean; fileUrl: string; filename: string }> => {
    try {
      const res = await supabaseStorageService.uploadSourceMedia(file, onProgress);
      return {
        success: true,
        fileUrl: res.signedUrl,
        filename: res.filename
      };
    } catch (err) {
      console.warn('Supabase upload notice, falling back to Firebase Storage:', err);
      return firestoreBackend.uploadImage(file);
    }
  },

  // Admin Panel
  getAdminOverview: () => firestoreBackend.getAdminOverview(),
  getAdminUsers: () => firestoreBackend.getAdminUsers(),
  adjustCredits: (userId: string, deltaAmount: number, description?: string) =>
    firestoreBackend.adjustCredits(userId, deltaAmount, description),
};
