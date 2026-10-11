import { db } from '../db/store.js';
import { providerManager } from '../providers/index.js';
import { CreateGenerationJobDTO, GenerationJob } from '../types/index.js';
import { supabaseStorage } from './supabaseStorage.js';

class JobOrchestrationService {
  private pollingTimer: NodeJS.Timeout | null = null;
  private isPolling = false;

  constructor() {
    this.startBackgroundPoller();
  }

  public async submitJob(userId: string, dto: CreateGenerationJobDTO): Promise<GenerationJob> {
    // 1. Idempotency Check
    if (dto.idempotencyKey) {
      const existingJobs = db.getJobs(userId);
      const matched = existingJobs.find(j => j.idempotencyKey === dto.idempotencyKey);
      if (matched) {
        return matched;
      }
    }

    // 2. Resolve Provider & Model
    const provider = providerManager.resolveProviderForJob(dto.provider);
    const capabilities = provider.getCapabilities();
    
    // Find model or use default for category
    let model = capabilities.models.find(m => m.id === dto.modelName);
    if (!model) {
      model = capabilities.models.find(m => m.category === dto.category) || capabilities.models[0];
    }

    const creditsCost = model?.costCredits || 15;

    // 3. Atomic Credit Reservation
    const reserveResult = db.reserveCredits(
      userId,
      creditsCost,
      `job_pending_${Date.now()}`,
      dto.idempotencyKey
    );

    if (!reserveResult.success) {
      throw new Error(reserveResult.error || 'Failed to reserve credits');
    }

    // 4. Resolve or Create Project
    let projectId = dto.projectId;
    if (!projectId) {
      const title = dto.title || `${dto.category.toUpperCase()} Generation: ${dto.prompt.substring(0, 32)}...`;
      const proj = db.createProject(userId, {
        title,
        category: dto.category,
        description: dto.prompt
      });
      projectId = proj.id;
    }

    // 5. Create Database Job Record
    const initialJob = db.createJob({
      projectId,
      userId,
      category: dto.category,
      generationMode: dto.generationMode,
      prompt: dto.prompt,
      negativePrompt: dto.negativePrompt,
      inputImageUrl: dto.inputImageUrl,
      referenceImageUrl: dto.referenceImageUrl,
      aspectRatio: dto.aspectRatio,
      durationSeconds: dto.durationSeconds,
      resolution: dto.resolution,
      motionStrength: dto.motionStrength ?? 1.0,
      seed: dto.seed,
      audioEnabled: dto.audioEnabled ?? false,
      provider: provider.name as 'fal' | 'replicate' | 'mock',
      modelName: model.id,
      status: 'queued',
      progressPercent: 5,
      creditsCost,
      creditsStatus: 'reserved',
      idempotencyKey: dto.idempotencyKey,
      startedAt: new Date().toISOString()
    });

    // 6. Submit to Provider
    try {
      const providerResp = await provider.createJob(initialJob);
      const updatedJob = db.updateJob(initialJob.id, {
        providerJobId: providerResp.providerJobId,
        status: providerResp.status,
        progressPercent: providerResp.progressPercent || 10
      });
      return updatedJob || initialJob;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Provider submission failed';
      // Auto-refund reserved credits on immediate failure
      db.refundCredits(userId, creditsCost, initialJob.id, errorMsg);
      db.updateJob(initialJob.id, {
        status: 'failed',
        errorMessage: errorMsg,
        creditsStatus: 'refunded'
      });
      throw new Error(`Generation submission failed: ${errorMsg}`);
    }
  }

  public async retryJob(userId: string, jobId: string): Promise<GenerationJob> {
    const job = db.getJob(jobId);
    if (!job) throw new Error('Job not found');
    if (job.userId !== userId) throw new Error('Unauthorized');

    return this.submitJob(userId, {
      projectId: job.projectId,
      category: job.category,
      generationMode: job.generationMode,
      prompt: job.prompt,
      negativePrompt: job.negativePrompt,
      inputImageUrl: job.inputImageUrl,
      aspectRatio: job.aspectRatio,
      durationSeconds: job.durationSeconds,
      resolution: job.resolution,
      motionStrength: job.motionStrength,
      seed: job.seed,
      audioEnabled: job.audioEnabled,
      provider: job.provider,
      modelName: job.modelName
    });
  }

  public async cancelJob(userId: string, jobId: string): Promise<GenerationJob> {
    const job = db.getJob(jobId);
    if (!job) throw new Error('Job not found');
    if (job.userId !== userId) throw new Error('Unauthorized');
    if (job.status === 'completed' || job.status === 'failed') {
      return job;
    }

    try {
      const provider = providerManager.get(job.provider);
      if (job.providerJobId && provider.cancelJob) {
        await provider.cancelJob(job.providerJobId);
      }
    } catch {
      // Ignore provider cancellation error
    }

    // Refund credits
    if (job.creditsStatus === 'reserved') {
      db.refundCredits(userId, job.creditsCost, job.id, 'User cancelled job');
    }

    const updated = db.updateJob(job.id, {
      status: 'cancelled',
      creditsStatus: 'refunded',
      errorMessage: 'Generation cancelled by user'
    });

    return updated!;
  }

  private startBackgroundPoller(): void {
    if (this.pollingTimer) return;
    this.pollingTimer = setInterval(() => this.pollActiveJobs(), 3000);
  }

  public async pollActiveJobs(): Promise<void> {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      const activeJobs = db.getJobs().filter(j => j.status === 'queued' || j.status === 'processing');
      for (const job of activeJobs) {
        // 10-Minute Timeout Protection
        const startedMs = new Date(job.startedAt || job.createdAt).getTime();
        if (Date.now() - startedMs > 10 * 60 * 1000) {
          if (job.creditsStatus === 'reserved') {
            db.refundCredits(job.userId, job.creditsCost, job.id, 'Generation timed out');
          }
          db.updateJob(job.id, {
            status: 'failed',
            progressPercent: 0,
            errorMessage: 'Video synthesis timed out after 10 minutes. Credits have been refunded.',
            creditsStatus: 'refunded',
            updatedAt: new Date().toISOString()
          });
          continue;
        }

        if (!job.providerJobId) continue;

        try {
          const provider = providerManager.get(job.provider);
          const statusResp = await provider.checkStatus(job.providerJobId, job.modelName);

          if (statusResp.status === 'completed') {
            // Idempotent settlement
            if (job.creditsStatus === 'reserved') {
              db.settleCredits(job.userId, job.creditsCost, job.id);
            }

            let finalVideoUrl = statusResp.videoUrl;
            let storagePath: string | undefined;
            let storageBucket: string | undefined;

            if (statusResp.videoUrl) {
              try {
                const uploadResult = await supabaseStorage.saveGeneratedVideo(
                  job.userId,
                  job.id,
                  statusResp.videoUrl
                );
                if (uploadResult?.signedUrl) {
                  finalVideoUrl = uploadResult.signedUrl;
                  storagePath = uploadResult.path;
                  storageBucket = uploadResult.bucket;
                }
              } catch (storageErr) {
                console.warn(`Supabase Storage save notice for job ${job.id}:`, storageErr);
              }
            }

            db.updateJob(job.id, {
              status: 'completed',
              progressPercent: 100,
              outputVideoUrl: finalVideoUrl,
              outputThumbnailUrl: statusResp.thumbnailUrl,
              storagePath,
              storageBucket,
              creditsStatus: 'settled',
              completedAt: new Date().toISOString()
            });
          } else if (statusResp.status === 'failed') {
            // Idempotent refund
            if (job.creditsStatus === 'reserved') {
              db.refundCredits(job.userId, job.creditsCost, job.id, statusResp.errorMessage);
            }
            db.updateJob(job.id, {
              status: 'failed',
              progressPercent: 0,
              errorMessage: statusResp.errorMessage || 'Provider generation failed',
              creditsStatus: 'refunded'
            });
          } else {
            db.updateJob(job.id, {
              status: statusResp.status,
              progressPercent: statusResp.progressPercent
            });
          }
        } catch (pollErr: unknown) {
          console.warn(`Error polling job ${job.id}:`, pollErr instanceof Error ? pollErr.message : pollErr);
        }
      }
    } finally {
      this.isPolling = false;
    }
  }
}

export const jobService = new JobOrchestrationService();
