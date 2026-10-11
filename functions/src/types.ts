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
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'user' | 'admin';
  preferences: {
    theme: 'dark' | 'light';
    notifications: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreditAccount {
  uid: string;
  balance: number;
  reservedBalance: number;
  lifetimeUsed: number;
  tier: 'free' | 'creator' | 'pro' | 'studio';
  updatedAt: string;
}

export interface CreditTransaction {
  id: string;
  uid: string;
  amount: number;
  type: CreditTxType;
  description: string;
  referenceId?: string;
  idempotencyKey?: string;
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
  videoUrl?: string;
  latestJobId?: string;
  createdAt: string;
  updatedAt: string;
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
  idempotencyKey?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedAsset {
  id: string;
  jobId: string;
  userId: string;
  projectId: string;
  assetType: 'video' | 'thumbnail' | 'audio' | 'frame';
  fileUrl: string;
  downloadUrl?: string;
  storagePath?: string;
  mimeType: string;
  durationSeconds?: number;
  resolution?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
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
