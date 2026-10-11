export type VideoCategory = 'cinematic' | 'cartoon' | 'product';

export type GenerationMode = 
  | 'text_to_video' 
  | 'image_to_video' 
  | 'product_animation' 
  | 'cartoon_animation' 
  | 'cinematic_video';

export type AspectRatio = '16:9' | '9:16' | '1:1';
export type VideoResolution = '720p' | '1080p' | '4k';
export type VideoDuration = 3 | 5 | 10;

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type CreditTxType = 'grant' | 'reserve' | 'settle' | 'refund' | 'bonus' | 'purchase';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: 'user' | 'admin';
  preferences: {
    theme: 'dark' | 'light';
    notifications: boolean;
  };
  createdAt: string;
}

export interface CreditAccount {
  id: string;
  userId: string;
  balance: number;
  reservedBalance: number;
  lifetimeUsed: number;
  tier: 'free' | 'creator' | 'pro' | 'studio';
  updatedAt: string;
}

export interface CreditTransaction {
  id: string;
  accountId: string;
  userId: string;
  amount: number;
  type: CreditTxType;
  description: string;
  referenceId?: string;
  balanceAfter: number;
  createdAt: string;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: VideoCategory;
  isFavorite: boolean;
  tags: string[];
  thumbnailUrl?: string;
  latestJobId?: string;
  createdAt: string;
  updatedAt: string;
  videoUrl?: string;
}

export interface GenerationJob {
  id: string;
  projectId: string;
  userId: string;
  category: VideoCategory;
  generationMode: GenerationMode;
  prompt: string;
  negativePrompt?: string;
  inputImageUrl?: string;
  referenceImageUrl?: string;
  aspectRatio: AspectRatio;
  durationSeconds: VideoDuration;
  resolution: VideoResolution;
  motionStrength: number;
  seed?: number;
  audioEnabled: boolean;
  provider: 'fal' | 'replicate' | 'mock';
  modelName: string;
  providerJobId?: string;
  status: JobStatus;
  progressPercent: number;
  creditsCost: number;
  creditsStatus: 'reserved' | 'settled' | 'refunded';
  errorMessage?: string;
  outputVideoUrl?: string;
  outputThumbnailUrl?: string;
  storagePath?: string;
  storageBucket?: string;
  thumbnailStoragePath?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGenerationJobDTO {
  projectId?: string;
  title?: string;
  category: VideoCategory;
  generationMode: GenerationMode;
  prompt: string;
  negativePrompt?: string;
  inputImageUrl?: string;
  referenceImageUrl?: string;
  aspectRatio: AspectRatio;
  durationSeconds: VideoDuration;
  resolution: VideoResolution;
  motionStrength?: number;
  seed?: number;
  audioEnabled?: boolean;
  provider?: 'fal' | 'replicate' | 'mock';
  modelName?: string;
  idempotencyKey?: string;
}

export interface ProviderModelInfo {
  id: string;
  name: string;
  category: VideoCategory;
  costCredits: number;
  description: string;
}

export interface ProviderCapabilities {
  name: string;
  supportedModes: GenerationMode[];
  supportedAspectRatios: AspectRatio[];
  supportedDurations: VideoDuration[];
  supportedResolutions: VideoResolution[];
  audioGeneration: boolean;
  models: ProviderModelInfo[];
}

export interface ProviderHealth {
  name?: string;
  provider?: string;
  isConfigured: boolean;
  status: 'healthy' | 'degraded' | 'offline' | 'unconfigured';
  message?: string;
  lastChecked?: string;
}
