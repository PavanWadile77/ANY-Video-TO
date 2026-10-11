import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  UserProfile,
  CreditAccount,
  CreditTransaction,
  Project,
  GenerationJob,
  VideoCategory,
  JobStatus,
  GenerationMode,
  AspectRatio,
  VideoDuration,
  VideoResolution
} from '../types/index.js';

export interface DatabaseState {
  profiles: Record<string, UserProfile>;
  creditAccounts: Record<string, CreditAccount>;
  creditTransactions: CreditTransaction[];
  projects: Record<string, Project>;
  generationJobs: Record<string, GenerationJob>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'animora_db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default initial state with seed demo data
const DEFAULT_USER_ID = 'usr_animora_demo_001';
const ADMIN_USER_ID = 'usr_animora_admin_001';

const INITIAL_STATE: DatabaseState = {
  profiles: {
    [DEFAULT_USER_ID]: {
      id: DEFAULT_USER_ID,
      email: 'creator@animora.ai',
      displayName: 'Alex Rivers',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      role: 'user',
      preferences: {
        theme: 'dark',
        notifications: true
      },
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString()
    },
    [ADMIN_USER_ID]: {
      id: ADMIN_USER_ID,
      email: 'admin@animora.ai',
      displayName: 'Animora Ops Admin',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      role: 'admin',
      preferences: {
        theme: 'dark',
        notifications: true
      },
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
    }
  },
  creditAccounts: {
    [DEFAULT_USER_ID]: {
      id: 'acc_001',
      userId: DEFAULT_USER_ID,
      balance: 180,
      reservedBalance: 0,
      lifetimeUsed: 75,
      tier: 'pro',
      updatedAt: new Date().toISOString()
    },
    [ADMIN_USER_ID]: {
      id: 'acc_admin',
      userId: ADMIN_USER_ID,
      balance: 9999,
      reservedBalance: 0,
      lifetimeUsed: 500,
      tier: 'studio',
      updatedAt: new Date().toISOString()
    }
  },
  creditTransactions: [
    {
      id: 'tx_init_1',
      accountId: 'acc_001',
      userId: DEFAULT_USER_ID,
      amount: 200,
      type: 'grant',
      description: 'Welcome Pro Plan credit allocation',
      balanceAfter: 200,
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString()
    },
    {
      id: 'tx_job_1',
      accountId: 'acc_001',
      userId: DEFAULT_USER_ID,
      amount: -20,
      type: 'settle',
      description: 'Render: Cyberpunk Neo-Tokyo Rain (Cinematic)',
      referenceId: 'job_seed_001',
      balanceAfter: 180,
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
    }
  ],
  projects: {
    'proj_seed_001': {
      id: 'proj_seed_001',
      userId: DEFAULT_USER_ID,
      title: 'Cyberpunk Neo-Tokyo Rain',
      description: 'Cinematic night street, neon reflections, anamorphic depth of field',
      category: 'cinematic',
      isFavorite: true,
      tags: ['cyberpunk', 'cinematic', 'rain', 'tokyo'],
      thumbnailUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&auto=format&fit=crop&q=80',
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-city-with-traffic-lights-at-night-42861-large.mp4',
      latestJobId: 'job_seed_001',
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 86400000).toISOString()
    },
    'proj_seed_002': {
      id: 'proj_seed_002',
      userId: DEFAULT_USER_ID,
      title: 'Playful Mech Puppy Adventure',
      description: 'Pixar 3D stylized puppy robot leaping through enchanted bioluminescent forest',
      category: 'cartoon',
      isFavorite: true,
      tags: ['3d', 'pixar', 'robot', 'fantasy'],
      thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-background-1610-large.mp4',
      latestJobId: 'job_seed_002',
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
    },
    'proj_seed_003': {
      id: 'proj_seed_003',
      userId: DEFAULT_USER_ID,
      title: 'Aura Luxury Chronograph 360°',
      description: 'Titanium luxury watch rotating gracefully with studio softbox lighting and metallic sheen',
      category: 'product',
      isFavorite: false,
      tags: ['product', 'luxury', 'watch', 'commercial'],
      thumbnailUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-gold-watch-34063-large.mp4',
      latestJobId: 'job_seed_003',
      createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 12 * 3600000).toISOString()
    }
  },
  generationJobs: {
    'job_seed_001': {
      id: 'job_seed_001',
      projectId: 'proj_seed_001',
      userId: DEFAULT_USER_ID,
      category: 'cinematic',
      generationMode: 'text_to_video',
      prompt: 'Cinematic drone tracking shot over rain-soaked Neo-Tokyo cyberpunk alley, neon billboards reflected in puddles, atmospheric steam, 35mm lens, 4k master',
      aspectRatio: '16:9',
      durationSeconds: 5,
      resolution: '1080p',
      motionStrength: 1.2,
      seed: 849201,
      audioEnabled: false,
      provider: 'fal',
      modelName: 'fal-ai/minimax-video/image-to-video',
      providerJobId: 'fal_seed_req_001',
      status: 'completed',
      progressPercent: 100,
      creditsCost: 20,
      creditsStatus: 'settled',
      outputVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-city-with-traffic-lights-at-night-42861-large.mp4',
      outputThumbnailUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&auto=format&fit=crop&q=80',
      completedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 86400000).toISOString()
    },
    'job_seed_002': {
      id: 'job_seed_002',
      projectId: 'proj_seed_002',
      userId: DEFAULT_USER_ID,
      category: 'cartoon',
      generationMode: 'text_to_video',
      prompt: '3D Pixar style cute golden mechanical puppy leaping in mystical glowing moss forest, expressive eyes, vibrant colors, raytraced reflections',
      aspectRatio: '16:9',
      durationSeconds: 5,
      resolution: '720p',
      motionStrength: 1.0,
      seed: 192834,
      audioEnabled: false,
      provider: 'fal',
      modelName: 'fal-ai/animatediff/v2',
      providerJobId: 'fal_seed_req_002',
      status: 'completed',
      progressPercent: 100,
      creditsCost: 15,
      creditsStatus: 'settled',
      outputVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-background-1610-large.mp4',
      outputThumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
      completedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
    },
    'job_seed_003': {
      id: 'job_seed_003',
      projectId: 'proj_seed_003',
      userId: DEFAULT_USER_ID,
      category: 'product',
      generationMode: 'product_animation',
      prompt: 'Commercial product showcase of luxury titanium watch rotating 360 degrees on polished obsidian pedestal, rim light reflections, slow motion, crisp details',
      aspectRatio: '1:1',
      durationSeconds: 5,
      resolution: '1080p',
      motionStrength: 0.8,
      seed: 492817,
      audioEnabled: false,
      provider: 'fal',
      modelName: 'fal-ai/ltx-video',
      providerJobId: 'fal_seed_req_003',
      status: 'completed',
      progressPercent: 100,
      creditsCost: 10,
      creditsStatus: 'settled',
      outputVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-gold-watch-34063-large.mp4',
      outputThumbnailUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
      completedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
      createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 12 * 3600000).toISOString()
    }
  }
};

class DatabaseStore {
  private state: DatabaseState;

  constructor() {
    this.state = this.load();
  }

  private load(): DatabaseState {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Failed to parse database file, initializing defaults:', err);
    }
    this.persist(INITIAL_STATE);
    return JSON.parse(JSON.stringify(INITIAL_STATE));
  }

  private persist(state: DatabaseState): void {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist database:', err);
    }
  }

  public getState(): DatabaseState {
    return this.state;
  }

  // User Profile
  public getProfile(userId: string): UserProfile | null {
    return this.state.profiles[userId] || null;
  }

  public updateProfile(userId: string, partial: Partial<UserProfile>): UserProfile {
    const existing = this.state.profiles[userId] || {
      id: userId,
      email: `${userId}@animora.ai`,
      displayName: 'Creator',
      role: 'user',
      preferences: { theme: 'dark', notifications: true },
      createdAt: new Date().toISOString()
    };
    const updated = { ...existing, ...partial, updatedAt: new Date().toISOString() };
    this.state.profiles[userId] = updated;
    this.persist(this.state);
    return updated;
  }

  public getAllProfiles(): UserProfile[] {
    return Object.values(this.state.profiles);
  }

  // Credit Account
  public getCreditAccount(userId: string): CreditAccount {
    if (!this.state.creditAccounts[userId]) {
      this.state.creditAccounts[userId] = {
        id: `acc_${uuidv4().substring(0, 8)}`,
        userId,
        balance: 150,
        reservedBalance: 0,
        lifetimeUsed: 0,
        tier: 'free',
        updatedAt: new Date().toISOString()
      };
      this.persist(this.state);
    }
    return this.state.creditAccounts[userId];
  }

  public getTransactions(userId?: string): CreditTransaction[] {
    if (userId) {
      return this.state.creditTransactions.filter(t => t.userId === userId);
    }
    return this.state.creditTransactions;
  }

  // Atomic Credit Operations
  public reserveCredits(userId: string, amount: number, referenceId?: string, idempotencyKey?: string): {
    success: boolean;
    remainingBalance?: number;
    error?: string;
  } {
    if (idempotencyKey) {
      const existingTx = this.state.creditTransactions.find(t => t.idempotencyKey === idempotencyKey);
      if (existingTx) {
        return { success: true, remainingBalance: existingTx.balanceAfter };
      }
    }

    const account = this.getCreditAccount(userId);
    if (account.balance < amount) {
      return {
        success: false,
        error: `Insufficient credits. Required: ${amount}, Available: ${account.balance}`
      };
    }

    account.balance -= amount;
    account.reservedBalance += amount;
    account.updatedAt = new Date().toISOString();

    const tx: CreditTransaction = {
      id: `tx_${uuidv4().substring(0, 10)}`,
      accountId: account.id,
      userId,
      amount: -amount,
      type: 'reserve',
      description: `Reserved ${amount} credits for job ${referenceId || ''}`,
      referenceId,
      idempotencyKey,
      balanceAfter: account.balance,
      createdAt: new Date().toISOString()
    };

    this.state.creditTransactions.unshift(tx);
    this.persist(this.state);

    return { success: true, remainingBalance: account.balance };
  }

  public settleCredits(userId: string, amount: number, referenceId?: string): { success: boolean } {
    const account = this.getCreditAccount(userId);
    account.reservedBalance = Math.max(0, account.reservedBalance - amount);
    account.lifetimeUsed += amount;
    account.updatedAt = new Date().toISOString();

    const tx: CreditTransaction = {
      id: `tx_${uuidv4().substring(0, 10)}`,
      accountId: account.id,
      userId,
      amount: 0,
      type: 'settle',
      description: `Settled ${amount} credits for completed job ${referenceId || ''}`,
      referenceId,
      balanceAfter: account.balance,
      createdAt: new Date().toISOString()
    };

    this.state.creditTransactions.unshift(tx);
    this.persist(this.state);
    return { success: true };
  }

  public refundCredits(userId: string, amount: number, referenceId?: string, reason?: string): {
    success: boolean;
    newBalance: number;
  } {
    const account = this.getCreditAccount(userId);
    account.balance += amount;
    account.reservedBalance = Math.max(0, account.reservedBalance - amount);
    account.updatedAt = new Date().toISOString();

    const tx: CreditTransaction = {
      id: `tx_${uuidv4().substring(0, 10)}`,
      accountId: account.id,
      userId,
      amount: amount,
      type: 'refund',
      description: `Refunded ${amount} credits: ${reason || 'Job failed or cancelled'}`,
      referenceId,
      balanceAfter: account.balance,
      createdAt: new Date().toISOString()
    };

    this.state.creditTransactions.unshift(tx);
    this.persist(this.state);
    return { success: true, newBalance: account.balance };
  }

  public adminAdjustCredits(userId: string, deltaAmount: number, description: string): {
    success: boolean;
    newBalance: number;
  } {
    const account = this.getCreditAccount(userId);
    account.balance = Math.max(0, account.balance + deltaAmount);
    account.updatedAt = new Date().toISOString();

    const tx: CreditTransaction = {
      id: `tx_${uuidv4().substring(0, 10)}`,
      accountId: account.id,
      userId,
      amount: deltaAmount,
      type: deltaAmount >= 0 ? 'grant' : 'reserve',
      description: `Admin adjustment: ${description}`,
      balanceAfter: account.balance,
      createdAt: new Date().toISOString()
    };

    this.state.creditTransactions.unshift(tx);
    this.persist(this.state);
    return { success: true, newBalance: account.balance };
  }

  // Projects
  public getProjects(userId: string, filters?: { category?: VideoCategory; isFavorite?: boolean; query?: string }): Project[] {
    let list = Object.values(this.state.projects).filter(p => p.userId === userId);

    if (filters?.category) {
      list = list.filter(p => p.category === filters.category);
    }
    if (filters?.isFavorite !== undefined) {
      list = list.filter(p => p.isFavorite === filters.isFavorite);
    }
    if (filters?.query) {
      const q = filters.query.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || p.tags.some(t => t.toLowerCase().includes(q)));
    }

    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  public getProject(projectId: string): Project | null {
    return this.state.projects[projectId] || null;
  }

  public createProject(userId: string, data: { title: string; category: VideoCategory; description?: string; tags?: string[] }): Project {
    const id = `proj_${uuidv4().substring(0, 10)}`;
    const proj: Project = {
      id,
      userId,
      title: data.title,
      description: data.description,
      category: data.category,
      isFavorite: false,
      tags: data.tags || [data.category],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.state.projects[id] = proj;
    this.persist(this.state);
    return proj;
  }

  public updateProject(projectId: string, partial: Partial<Project>): Project | null {
    const proj = this.state.projects[projectId];
    if (!proj) return null;
    const updated = { ...proj, ...partial, updatedAt: new Date().toISOString() };
    this.state.projects[projectId] = updated;
    this.persist(this.state);
    return updated;
  }

  public deleteProject(projectId: string, userId: string): boolean {
    const proj = this.state.projects[projectId];
    if (!proj || proj.userId !== userId) return false;
    delete this.state.projects[projectId];
    this.persist(this.state);
    return true;
  }

  // Generation Jobs
  public getJob(jobId: string): GenerationJob | null {
    return this.state.generationJobs[jobId] || null;
  }

  public getJobs(userId?: string, limit: number = 50): GenerationJob[] {
    let list = Object.values(this.state.generationJobs);
    if (userId) {
      list = list.filter(j => j.userId === userId);
    }
    return list
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  public createJob(jobData: Omit<GenerationJob, 'id' | 'createdAt' | 'updatedAt'>): GenerationJob {
    const id = `job_${uuidv4().substring(0, 10)}`;
    const job: GenerationJob = {
      ...jobData,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.state.generationJobs[id] = job;

    // Link to project
    if (job.projectId && this.state.projects[job.projectId]) {
      this.state.projects[job.projectId].latestJobId = id;
      this.state.projects[job.projectId].updatedAt = new Date().toISOString();
    }

    this.persist(this.state);
    return job;
  }

  public updateJob(jobId: string, partial: Partial<GenerationJob>): GenerationJob | null {
    const job = this.state.generationJobs[jobId];
    if (!job) return null;
    const updated = { ...job, ...partial, updatedAt: new Date().toISOString() };
    this.state.generationJobs[jobId] = updated;

    // Update project thumbnail / video if completed
    if (updated.status === 'completed' && updated.outputVideoUrl && updated.projectId && this.state.projects[updated.projectId]) {
      const proj = this.state.projects[updated.projectId];
      proj.videoUrl = updated.outputVideoUrl;
      if (updated.outputThumbnailUrl) {
        proj.thumbnailUrl = updated.outputThumbnailUrl;
      }
      proj.updatedAt = new Date().toISOString();
    }

    this.persist(this.state);
    return updated;
  }
}

export const db = new DatabaseStore();
export { DEFAULT_USER_ID, ADMIN_USER_ID };
