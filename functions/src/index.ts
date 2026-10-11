import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { creditService } from './services/creditService.js';
import { resolveProvider } from './providers/index.js';
import { GenerationJob, Project } from './types.js';
import { functionsSupabaseStorage } from './services/supabaseStorage.js';

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const aiProviderApiKey = defineSecret('AI_VIDEO_PROVIDER_API_KEY');

const createJobSchema = z.object({
  projectId: z.string().optional(),
  title: z.string().optional(),
  category: z.enum(['cinematic', 'cartoon', 'product']),
  generationMode: z.enum([
    'text_to_video',
    'image_to_video',
    'product_animation',
    'cartoon_animation',
    'cinematic_video'
  ]),
  prompt: z.string().min(3),
  negativePrompt: z.string().optional(),
  inputImageUrl: z.string().optional(),
  referenceImageUrl: z.string().optional(),
  aspectRatio: z.enum(['16:9', '9:16', '1:1']),
  durationSeconds: z.union([z.literal(3), z.literal(5), z.literal(10)]),
  resolution: z.enum(['720p', '1080p', '4k']),
  motionStrength: z.number().optional(),
  seed: z.number().optional(),
  audioEnabled: z.boolean().optional(),
  provider: z.enum(['fal', 'replicate', 'mock']).optional(),
  modelName: z.string().optional(),
  idempotencyKey: z.string().optional()
});

// ==========================================
// 1. CREATE VIDEO GENERATION (Callable Function)
// ==========================================
export const createVideoGeneration = onCall(
  {
    secrets: [aiProviderApiKey],
    cors: true,
    maxInstances: 20
  },
  async (request) => {
    // 1. Verify Authentication Identity
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated with Firebase Auth.');
    }

    const uid = request.auth.uid;
    const parsed = createJobSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError('invalid-argument', 'Invalid generation parameters', parsed.error.issues);
    }

    const dto = parsed.data;
    const creditsCost = 15; // standard model cost

    // 2. Reserve Credits Atomically
    const reserveResult = await creditService.reserveCredits(
      uid,
      creditsCost,
      `job_pending_${Date.now()}`,
      dto.idempotencyKey
    );

    if (!reserveResult.success) {
      throw new HttpsError('failed-precondition', reserveResult.error || 'Insufficient credits.');
    }

    // 3. Resolve or Create Project
    let projectId = dto.projectId;
    if (!projectId) {
      projectId = `proj_${uuidv4().substring(0, 10)}`;
      const title = dto.title || `${dto.category.toUpperCase()} Render: ${dto.prompt.substring(0, 30)}...`;
      const projDoc: Project = {
        id: projectId,
        userId: uid,
        title,
        description: dto.prompt,
        category: dto.category,
        isFavorite: false,
        tags: [dto.category],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await db.collection('projects').doc(projectId).set(projDoc);
    }

    // 4. Create Job Record
    const jobId = `job_${uuidv4().substring(0, 10)}`;
    const jobDoc: GenerationJob = {
      id: jobId,
      projectId,
      userId: uid,
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
      provider: dto.provider || 'fal',
      modelName: dto.modelName || 'fal-ai/minimax-video/image-to-video',
      status: 'queued',
      progressPercent: 5,
      creditsCost,
      creditsStatus: 'reserved',
      idempotencyKey: dto.idempotencyKey,
      startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 5. Submit to Provider
    const providerKey = aiProviderApiKey.value();
    const provider = resolveProvider(dto.provider, providerKey);

    try {
      const resp = await provider.createJob(jobDoc);
      jobDoc.providerJobId = resp.providerJobId;
      jobDoc.status = resp.status;
      jobDoc.progressPercent = resp.progressPercent || 10;
      await db.collection('generationJobs').doc(jobId).set(jobDoc);
      return jobDoc;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Provider failed';
      // Auto-refund reserved credits
      await creditService.refundCredits(uid, creditsCost, jobId, msg);
      jobDoc.status = 'failed';
      jobDoc.errorMessage = msg;
      jobDoc.creditsStatus = 'refunded';
      await db.collection('generationJobs').doc(jobId).set(jobDoc);
      throw new HttpsError('internal', `Generation failed: ${msg}`);
    }
  }
);

// ==========================================
// 2. GET GENERATION STATUS (Callable Function)
// ==========================================
export const getGenerationStatus = onCall(
  {
    secrets: [aiProviderApiKey],
    cors: true
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const { jobId } = request.data as { jobId: string };
    if (!jobId) throw new HttpsError('invalid-argument', 'jobId is required.');

    const jobRef = db.collection('generationJobs').doc(jobId);
    const snap = await jobRef.get();
    if (!snap.exists) throw new HttpsError('not-found', 'Job not found.');

    const job = snap.data() as GenerationJob;
    if (job.userId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Unauthorized.');
    }

    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      return job;
    }

    // 10-Minute Timeout Check
    const startedMs = new Date(job.startedAt || job.createdAt).getTime();
    if (Date.now() - startedMs > 10 * 60 * 1000) {
      if (job.creditsStatus === 'reserved') {
        await creditService.refundCredits(job.userId, job.creditsCost, job.id, 'Generation timed out');
      }
      const updated: Partial<GenerationJob> = {
        status: 'failed',
        errorMessage: 'Video synthesis timed out after 10 minutes. Credits have been refunded.',
        creditsStatus: 'refunded',
        updatedAt: new Date().toISOString()
      };
      await jobRef.update(updated);
      return { ...job, ...updated };
    }

    // Poll provider
    if (job.providerJobId) {
      const providerKey = aiProviderApiKey.value();
      const provider = resolveProvider(job.provider, providerKey);
      try {
        const statusResp = await (provider as any).checkStatus(job.providerJobId, job.modelName, job.createdAt);
        if (statusResp.status === 'completed') {
          // Idempotent settlement: settle only if currently reserved
          if (job.creditsStatus === 'reserved') {
            await creditService.settleCredits(job.userId, job.creditsCost, job.id);
          }

          let finalVideoUrl = statusResp.videoUrl;
          let storagePath: string | undefined;
          let storageBucket: string | undefined;

          // Save to private Supabase Storage bucket 'ai-videos'
          if (statusResp.videoUrl && functionsSupabaseStorage.isConfigured()) {
            try {
              const supaRes = await functionsSupabaseStorage.saveGeneratedVideo(
                job.userId,
                job.id,
                statusResp.videoUrl
              );
              if (supaRes?.signedUrl) {
                finalVideoUrl = supaRes.signedUrl;
                storagePath = supaRes.path;
                storageBucket = supaRes.bucket;
              }
            } catch (storageErr) {
              console.warn('Functions Supabase save notice:', storageErr);
            }
          }

          const updated: Partial<GenerationJob> = {
            status: 'completed',
            progressPercent: 100,
            outputVideoUrl: finalVideoUrl,
            outputThumbnailUrl: statusResp.thumbnailUrl,
            storagePath,
            storageBucket,
            creditsStatus: 'settled',
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await jobRef.update(updated);

          // Update Project
          await db.collection('projects').doc(job.projectId).update({
            videoUrl: finalVideoUrl,
            thumbnailUrl: statusResp.thumbnailUrl || null,
            updatedAt: new Date().toISOString()
          });

          return { ...job, ...updated };
        } else if (statusResp.status === 'failed') {
          // Idempotent refund: refund only if currently reserved
          if (job.creditsStatus === 'reserved') {
            await creditService.refundCredits(job.userId, job.creditsCost, job.id, statusResp.errorMessage);
          }
          const updated: Partial<GenerationJob> = {
            status: 'failed',
            errorMessage: statusResp.errorMessage || 'Video generation failed',
            creditsStatus: 'refunded',
            updatedAt: new Date().toISOString()
          };
          await jobRef.update(updated);
          return { ...job, ...updated };
        } else {
          await jobRef.update({
            status: statusResp.status,
            progressPercent: statusResp.progressPercent || 50,
            updatedAt: new Date().toISOString()
          });
          return { ...job, status: statusResp.status, progressPercent: statusResp.progressPercent };
        }
      } catch (pollErr: unknown) {
        console.warn('Polling error:', pollErr);
      }
    }

    return job;
  }
);

// ==========================================
// 3. RETRY GENERATION (Callable Function)
// ==========================================
export const retryGeneration = onCall(
  {
    secrets: [aiProviderApiKey],
    cors: true
  },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Not authenticated.');
    const { jobId } = request.data as { jobId: string };
    const jobSnap = await db.collection('generationJobs').doc(jobId).get();
    if (!jobSnap.exists) throw new HttpsError('not-found', 'Job not found.');
    const oldJob = jobSnap.data() as GenerationJob;
    if (oldJob.userId !== request.auth.uid) throw new HttpsError('permission-denied', 'Unauthorized.');

    // Re-dispatch using createVideoGeneration logic
    const reqCopy = {
      ...request,
      data: {
        projectId: oldJob.projectId,
        category: oldJob.category,
        generationMode: oldJob.generationMode,
        prompt: oldJob.prompt,
        negativePrompt: oldJob.negativePrompt,
        inputImageUrl: oldJob.inputImageUrl,
        aspectRatio: oldJob.aspectRatio,
        durationSeconds: oldJob.durationSeconds,
        resolution: oldJob.resolution,
        motionStrength: oldJob.motionStrength,
        seed: oldJob.seed,
        audioEnabled: oldJob.audioEnabled,
        provider: oldJob.provider,
        modelName: oldJob.modelName
      }
    };
    return (createVideoGeneration as any).run(reqCopy);
  }
);

// ==========================================
// 4. CANCEL GENERATION (Callable Function)
// ==========================================
export const cancelGeneration = onCall(
  {
    cors: true
  },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Not authenticated.');
    const { jobId } = request.data as { jobId: string };
    const jobRef = db.collection('generationJobs').doc(jobId);
    const snap = await jobRef.get();
    if (!snap.exists) throw new HttpsError('not-found', 'Job not found.');
    const job = snap.data() as GenerationJob;
    if (job.userId !== request.auth.uid) throw new HttpsError('permission-denied', 'Unauthorized.');

    if (job.status === 'completed' || job.status === 'failed') return job;

    if (job.creditsStatus === 'reserved') {
      await creditService.refundCredits(job.userId, job.creditsCost, job.id, 'User cancelled');
    }

    await jobRef.update({
      status: 'cancelled',
      creditsStatus: 'refunded',
      errorMessage: 'Cancelled by user',
      updatedAt: new Date().toISOString()
    });

    return { ...job, status: 'cancelled', creditsStatus: 'refunded' };
  }
);

// ==========================================
// 5. ADMIN ADJUST CREDITS (Role-Protected)
// ==========================================
export const adminAdjustCredits = onCall(
  {
    cors: true
  },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Not authenticated.');
    const callerUid = request.auth.uid;
    const userSnap = await db.collection('users').doc(callerUid).get();
    const isAdmin = request.auth.token.admin === true || userSnap.data()?.role === 'admin';
    if (!isAdmin) throw new HttpsError('permission-denied', 'Admin privileges required.');

    const { userId, deltaAmount, description } = request.data as {
      userId: string;
      deltaAmount: number;
      description?: string;
    };
    return creditService.adminAdjust(userId, deltaAmount, description || 'Admin adjustment');
  }
);

// ==========================================
// 6. PROCESS PROVIDER WEBHOOK (HTTPS Endpoint)
// ==========================================
export const processProviderWebhook = onRequest(async (req, res) => {
  const payload = req.body;
  console.log('Provider webhook payload received:', payload);
  res.status(200).json({ received: true });
});
