import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import { db, DEFAULT_USER_ID, ADMIN_USER_ID } from '../src/db/store.js';
import { supabaseStorage, BUCKET_AI_VIDEOS, BUCKET_VIDEO_THUMBNAILS } from '../src/services/supabaseStorage.js';

describe('Supabase Storage Integration Test Suite', () => {
  beforeEach(() => {
    const acc = db.getCreditAccount(DEFAULT_USER_ID);
    acc.balance = 150;
    acc.reservedBalance = 0;
  });

  describe('1. Storage Status & Configuration', () => {
    it('should report Supabase project ref and private bucket configurations', async () => {
      const res = await request(app).get('/api/storage/status');
      expect(res.status).toBe(200);
      expect(res.body.projectRef).toBe('tboopdrzolsjfdanmqww');
      expect(res.body.buckets.videos).toBe('ai-videos');
      expect(res.body.buckets.thumbnails).toBe('video-thumbnails');
    });
  });

  describe('2. Authorized User Scoped Uploads', () => {
    it('should upload source media with user-scoped path and signed URL', async () => {
      const testBuffer = Buffer.from('fake-image-bytes-content-123');

      const res = await request(app)
        .post('/api/storage/upload/source')
        .set('x-user-id', DEFAULT_USER_ID)
        .attach('file', testBuffer, 'reference_photo.png');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.bucket).toBe(BUCKET_AI_VIDEOS);
      expect(res.body.path).toMatch(new RegExp(`^${DEFAULT_USER_ID}/source/`));
      expect(res.body.signedUrl).toBeDefined();
      expect(res.body.expiresIn).toBeGreaterThan(0);
    });

    it('should upload thumbnail image with user-scoped path and signed URL', async () => {
      const thumbBuffer = Buffer.from('fake-thumbnail-image-bytes');

      const res = await request(app)
        .post('/api/storage/upload/thumbnail')
        .set('x-user-id', DEFAULT_USER_ID)
        .attach('file', thumbBuffer, 'poster.jpg');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.bucket).toBe(BUCKET_VIDEO_THUMBNAILS);
      expect(res.body.path).toMatch(new RegExp(`^${DEFAULT_USER_ID}/thumbnails/`));
      expect(res.body.signedUrl).toBeDefined();
    });

    it('should enforce allowed file types for source media', async () => {
      const textBuffer = Buffer.from('hello-world');

      const res = await request(app)
        .post('/api/storage/upload/source')
        .set('x-user-id', DEFAULT_USER_ID)
        .attach('file', textBuffer, 'malicious.exe');

      expect(res.status).toBe(500);
    });
  });

  describe('3. Security & Unauthorized Access Denial', () => {
    it('should deny uploads from unauthenticated requests with no token (HTTP 401)', async () => {
      const testBuffer = Buffer.from('fake-image-data');

      // Request with no headers at all
      const res = await request(app)
        .post('/api/storage/upload/source')
        .attach('file', testBuffer, 'sample.jpg');

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Unauthorized');
    });

    it('should reject invalid or forged Firebase ID tokens (HTTP 401)', async () => {
      const testBuffer = Buffer.from('fake-image-data');

      const res = await request(app)
        .post('/api/storage/upload/source')
        .set('Authorization', 'Bearer invalid_forged_malicious_token')
        .attach('file', testBuffer, 'sample.jpg');

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Unauthorized');
    });

    it('should authenticate requests using valid Firebase Bearer tokens', async () => {
      const testBuffer = Buffer.from('fake-image-bytes-content-456');

      const res = await request(app)
        .post('/api/storage/upload/source')
        .set('Authorization', `Bearer test-token-${DEFAULT_USER_ID}`)
        .attach('file', testBuffer, 'firebase_authenticated_clip.png');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.path).toMatch(new RegExp(`^${DEFAULT_USER_ID}/source/`));
    });

    it('should deny signed URL generation from unauthenticated requests (HTTP 401)', async () => {
      const res = await request(app)
        .post('/api/storage/signed-url')
        .send({
          bucket: BUCKET_AI_VIDEOS,
          path: `${DEFAULT_USER_ID}/videos/job_123.mp4`
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Unauthorized');
    });

    it('should DENY cross-user file access when requesting signed URL (HTTP 403 Forbidden)', async () => {
      const otherUserId = 'usr_victim_user_999';
      const unauthorizedPath = `${otherUserId}/videos/private_job_video.mp4`;

      // Request as DEFAULT_USER_ID attempting to access otherUserId's files
      const res = await request(app)
        .post('/api/storage/signed-url')
        .set('x-user-id', DEFAULT_USER_ID)
        .send({
          bucket: BUCKET_AI_VIDEOS,
          path: unauthorizedPath,
          expiresIn: 3600
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access denied');
    });

    it('should allow Admin to generate signed URL for any user file', async () => {
      const targetUserPath = 'usr_another_client/videos/demo.mp4';

      const res = await request(app)
        .post('/api/storage/signed-url')
        .set('x-user-role', 'admin')
        .send({
          bucket: BUCKET_AI_VIDEOS,
          path: targetUserPath,
          expiresIn: 1800
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.signedUrl).toBeDefined();
    });
  });

  describe('4. Short-Lived Signed URL Generation & Private Playback', () => {
    it('should generate short-lived signed URL for authenticated owner', async () => {
      const ownFilePath = `${DEFAULT_USER_ID}/videos/my_rendered_video.mp4`;

      const res = await request(app)
        .post('/api/storage/signed-url')
        .set('x-user-id', DEFAULT_USER_ID)
        .send({
          bucket: BUCKET_AI_VIDEOS,
          path: ownFilePath,
          expiresIn: 3600
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.path).toBe(ownFilePath);
      expect(res.body.signedUrl).toContain('supabase.co');
      expect(res.body.expiresIn).toBe(3600);
    });
  });

  describe('5. Existing Generation Workflow & Storage Integration', () => {
    it('should submit generation job successfully without regressions', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('x-user-id', DEFAULT_USER_ID)
        .send({
          category: 'cinematic',
          generationMode: 'text_to_video',
          prompt: 'A futuristic electric hypercar drifting through neo-Tokyo neon rain',
          aspectRatio: '16:9',
          durationSeconds: 5,
          resolution: '1080p',
          provider: 'mock'
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBe('queued');
      expect(res.body.creditsCost).toBeGreaterThan(0);
      expect(res.body.creditsStatus).toBe('reserved');
    });

    it('should save generated video output to Supabase Storage on completion', async () => {
      const testJobId = `job_test_storage_${Date.now()}`;
      const dummyVideoBuffer = Buffer.from('mp4-video-stream-content-bytes');

      const uploadRes = await supabaseStorage.saveGeneratedVideo(
        DEFAULT_USER_ID,
        testJobId,
        dummyVideoBuffer
      );

      expect(uploadRes.success).toBe(true);
      expect(uploadRes.bucket).toBe(BUCKET_AI_VIDEOS);
      expect(uploadRes.path).toBe(`${DEFAULT_USER_ID}/videos/${testJobId}.mp4`);
      expect(uploadRes.signedUrl).toBeDefined();
    });
  });
});
