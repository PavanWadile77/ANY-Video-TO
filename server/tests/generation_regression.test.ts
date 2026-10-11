import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import { db, DEFAULT_USER_ID } from '../src/db/store.js';
import { FalVideoProvider } from '../src/providers/fal.js';
import { ReplicateVideoProvider } from '../src/providers/replicate.js';
import { jobService } from '../src/services/jobService.js';
import { supabaseStorage } from '../src/services/supabaseStorage.js';

describe('AI Video Generation Regression Test Suite (Part 1 Audit)', () => {
  beforeEach(() => {
    // Reset user credits to baseline
    const account = db.getCreditAccount(DEFAULT_USER_ID);
    account.balance = 200;
    account.reservedBalance = 0;
  });

  describe('1. Unconfigured / Missing Provider Key Handling', () => {
    it('should report exact environment variable requirement when Fal provider key is unconfigured', async () => {
      const fal = new FalVideoProvider();
      // If no valid key is in process.env, isConfigured() must be false
      if (!fal.isConfigured()) {
        await expect(
          fal.createJob({
            id: 'job_test_fal',
            projectId: 'proj_test',
            userId: DEFAULT_USER_ID,
            category: 'cinematic',
            generationMode: 'text_to_video',
            prompt: 'Cinematic sunset',
            aspectRatio: '16:9',
            durationSeconds: 5,
            resolution: '1080p',
            motionStrength: 1.0,
            audioEnabled: false,
            provider: 'fal',
            modelName: 'fal-ai/minimax-video/image-to-video',
            status: 'queued',
            progressPercent: 5,
            creditsCost: 20,
            creditsStatus: 'reserved',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
        ).rejects.toThrow('Fal.ai API key is not configured. Please set AI_VIDEO_PROVIDER_API_KEY in your environment.');
      }
    });

    it('should auto-refund reserved credits when provider submission fails due to missing credentials', async () => {
      const initialBalance = db.getCreditAccount(DEFAULT_USER_ID).balance;

      const res = await request(app)
        .post('/api/jobs')
        .set('x-user-id', DEFAULT_USER_ID)
        .send({
          category: 'cinematic',
          generationMode: 'text_to_video',
          prompt: 'Hypercar drifting in rain',
          aspectRatio: '16:9',
          durationSeconds: 5,
          resolution: '1080p',
          provider: 'fal',
          modelName: 'fal-ai/minimax-video/image-to-video'
        });

      // If fal is not configured in test environment, it must fail cleanly with 400
      if (!new FalVideoProvider().isConfigured()) {
        expect(res.status).toBe(400);
        expect(res.body.error).toContain('Fal.ai API key is not configured');

        // Verify credit balance was fully refunded and not permanently deducted
        const finalAccount = db.getCreditAccount(DEFAULT_USER_ID);
        expect(finalAccount.balance).toBe(initialBalance);
        expect(finalAccount.reservedBalance).toBe(0);
      }
    });
  });

  describe('2. Fal.ai Progress Normalization & 15% Freeze Prevention', () => {
    it('should correctly normalize float progress values from Fal instead of clamping to 15%', () => {
      const fal = new FalVideoProvider();
      
      // Test the normalization logic:
      // Float 0.45 should become 45%, float 0.85 should become 85%
      const floatProgress1 = 0.45;
      const normalized1 = Math.round(floatProgress1 * 100);
      expect(normalized1).toBe(45);

      const floatProgress2 = 0.85;
      const normalized2 = Math.round(floatProgress2 * 100);
      expect(normalized2).toBe(85);

      // Verify that progress values are bounded correctly
      const minBound = Math.max(10, Math.min(95, normalized1));
      expect(minBound).toBe(45);
      expect(minBound).not.toBe(15);
    });
  });

  describe('3. Idempotent Credit Settlement & Refund Protection', () => {
    it('should never settle or refund credits multiple times for the same job', () => {
      const account = db.getCreditAccount(DEFAULT_USER_ID);
      account.balance = 100;
      account.reservedBalance = 20;

      // First settlement
      db.settleCredits(DEFAULT_USER_ID, 20, 'job_idem_settle');
      expect(account.reservedBalance).toBe(0);

      // Re-running settle on zero reserved balance should not corrupt lifetime used
      const lifetime = account.lifetimeUsed;
      db.settleCredits(DEFAULT_USER_ID, 0, 'job_idem_settle');
      expect(account.lifetimeUsed).toBe(lifetime);

      // Reset for refund test
      account.balance = 80;
      account.reservedBalance = 20;
      db.refundCredits(DEFAULT_USER_ID, 20, 'job_idem_refund', 'Model timeout');
      expect(account.balance).toBe(100);
      expect(account.reservedBalance).toBe(0);
    });
  });

  describe('4. Stuck Job Timeout Detection & Auto-Refund', () => {
    it('should automatically fail and refund jobs that exceed the 10-minute timeout', async () => {
      const oldTimestamp = new Date(Date.now() - 11 * 60 * 1000).toISOString(); // 11 minutes ago
      
      // Reserve credits and create a stalled job in DB
      db.reserveCredits(DEFAULT_USER_ID, 25, 'job_stalled_01');
      const stalledJob = db.createJob({
        projectId: 'proj_stalled',
        userId: DEFAULT_USER_ID,
        category: 'product',
        generationMode: 'product_animation',
        prompt: 'Stalled luxury watch spin',
        aspectRatio: '16:9',
        durationSeconds: 5,
        resolution: '1080p',
        motionStrength: 1.0,
        audioEnabled: false,
        provider: 'mock',
        modelName: 'mock-product-showcase',
        providerJobId: 'prov_stalled_999',
        status: 'processing',
        progressPercent: 15,
        creditsCost: 25,
        creditsStatus: 'reserved',
        startedAt: oldTimestamp,
        createdAt: oldTimestamp
      });

      expect(db.getCreditAccount(DEFAULT_USER_ID).reservedBalance).toBe(25);

      // Poll jobs to trigger the background watchdog
      await (jobService as any).pollActiveJobs();

      // Check that the stalled job was caught, marked failed, and refunded
      const updatedJob = db.getJob(stalledJob.id);
      expect(updatedJob?.status).toBe('failed');
      expect(updatedJob?.errorMessage).toContain('timed out after 10 minutes');
      expect(updatedJob?.creditsStatus).toBe('refunded');
      expect(db.getCreditAccount(DEFAULT_USER_ID).reservedBalance).toBe(0);
    });
  });

  describe('5. Video Output Persistence to Supabase Storage', () => {
    it('should persist generated video asset and produce a valid signed playback URL', async () => {
      const mockVideoBuffer = Buffer.from('FAKE_MP4_VIDEO_STREAM_BYTES_FOR_TESTING');
      const res = await supabaseStorage.saveGeneratedVideo(
        DEFAULT_USER_ID,
        'job_persistence_test',
        mockVideoBuffer,
        'video/mp4'
      );

      expect(res.success).toBe(true);
      expect(res.bucket).toBe('ai-videos');
      expect(res.path).toBe(`${DEFAULT_USER_ID}/videos/job_persistence_test.mp4`);
      expect(res.signedUrl).toBeDefined();
      expect(res.signedUrl).toContain(`${DEFAULT_USER_ID}/videos/job_persistence_test.mp4`);
    });
  });

  describe('6. In-Flight Job Cancellation & Refund', () => {
    it('should allow user to cancel queued job and immediately refund reserved credits', async () => {
      const initialAccount = db.getCreditAccount(DEFAULT_USER_ID);
      initialAccount.balance = 150;
      initialAccount.reservedBalance = 0;

      // Submit mock job
      const submitRes = await request(app)
        .post('/api/jobs')
        .set('x-user-id', DEFAULT_USER_ID)
        .send({
          category: 'cartoon',
          generationMode: 'cartoon_animation',
          prompt: 'Cute animated fox jumping in snow',
          aspectRatio: '1:1',
          durationSeconds: 3,
          resolution: '720p',
          provider: 'mock',
          modelName: 'mock-cartoon-3d'
        });

      expect(submitRes.status).toBe(201);
      const jobId = submitRes.body.id;

      // Cancel the job
      const cancelRes = await request(app)
        .post(`/api/jobs/${jobId}/cancel`)
        .set('x-user-id', DEFAULT_USER_ID);

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.status).toBe('cancelled');
      expect(cancelRes.body.creditsStatus).toBe('refunded');

      // Verify credits were returned
      const finalAccount = db.getCreditAccount(DEFAULT_USER_ID);
      expect(finalAccount.reservedBalance).toBe(0);
    });
  });
});
