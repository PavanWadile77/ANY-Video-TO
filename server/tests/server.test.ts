import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import { db, DEFAULT_USER_ID, ADMIN_USER_ID } from '../src/db/store.js';
import { FalVideoProvider } from '../src/providers/fal.js';
import { MockVideoProvider } from '../src/providers/mock.js';
import { enhancePrompt } from '../src/services/promptEnhancer.js';

describe('Animora AI Backend Test Suite', () => {
  beforeEach(() => {
    // Reset user account balance for test isolation
    const acc = db.getCreditAccount(DEFAULT_USER_ID);
    acc.balance = 100;
    acc.reservedBalance = 0;
  });

  describe('1. Health and Provider Discovery', () => {
    it('should return health status and provider states', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(Array.isArray(res.body.providers)).toBe(true);
      expect(res.body.providers.some((p: any) => p.provider === 'mock')).toBe(true);
    });

    it('should return capabilities for all registered providers', async () => {
      const res = await request(app).get('/api/providers');
      expect(res.status).toBe(200);
      expect(res.body.capabilities.length).toBeGreaterThanOrEqual(2);
      expect(res.body.capabilities.some((c: any) => c.name === 'fal')).toBe(true);
    });
  });

  describe('2. Credit Accounting Ledger', () => {
    it('should correctly reserve credits when balance is sufficient', () => {
      const result = db.reserveCredits(DEFAULT_USER_ID, 20, 'test_job_1', `idempotency_${Date.now()}_1`);
      expect(result.success).toBe(true);
      expect(result.remainingBalance).toBe(80);

      const acc = db.getCreditAccount(DEFAULT_USER_ID);
      expect(acc.balance).toBe(80);
      expect(acc.reservedBalance).toBe(20);
    });

    it('should reject reservation when balance is insufficient', () => {
      const result = db.reserveCredits(DEFAULT_USER_ID, 999, 'test_job_over');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient credits');
    });

    it('should be idempotent for identical idempotency keys', () => {
      const testKey = `unique_key_${Date.now()}`;
      const first = db.reserveCredits(DEFAULT_USER_ID, 15, 'job_idem_1', testKey);
      const second = db.reserveCredits(DEFAULT_USER_ID, 15, 'job_idem_1', testKey);
      expect(first.success).toBe(true);
      expect(second.success).toBe(true);
      expect(second.remainingBalance).toBe(first.remainingBalance);
    });

    it('should refund credits after failure', () => {
      db.reserveCredits(DEFAULT_USER_ID, 30, 'job_fail_1');
      const refund = db.refundCredits(DEFAULT_USER_ID, 30, 'job_fail_1', 'Model timeout');
      expect(refund.success).toBe(true);
      expect(refund.newBalance).toBe(100);

      const acc = db.getCreditAccount(DEFAULT_USER_ID);
      expect(acc.reservedBalance).toBe(0);
    });
  });

  describe('3. Prompt Enhancer', () => {
    it('should enhance cinematic prompts with lens and atmospheric keywords', () => {
      const enhanced = enhancePrompt('A samurai walking in rain', 'cinematic');
      expect(enhanced).toContain('35mm anamorphic');
      expect(enhanced).toContain('photorealistic');
    });

    it('should enhance cartoon/anime prompts with animation keywords', () => {
      const enhanced = enhancePrompt('A dragon flying over candy mountain', 'cartoon', 'anime');
      expect(enhanced).toContain('anime aesthetic');
      expect(enhanced).toContain('Makoto Shinkai');
    });

    it('should enhance product prompts with studio lighting and 360 rotation', () => {
      const enhanced = enhancePrompt('Smart ring on table', 'product');
      expect(enhanced).toContain('commercial studio');
      expect(enhanced).toContain('360 turntable');
    });
  });

  describe('4. Generation Jobs Flow', () => {
    it('should create a valid generation job and reserve credits', async () => {
      const jobPayload = {
        category: 'cinematic',
        generationMode: 'text_to_video',
        prompt: 'Futuristic hypercar speeding on desert salt flats at twilight',
        aspectRatio: '16:9',
        durationSeconds: 5,
        resolution: '1080p',
        provider: 'mock'
      };

      const res = await request(app).post('/api/jobs').send(jobPayload);
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.status).toMatch(/queued|processing|completed/);
      expect(res.body.creditsStatus).toBe('reserved');
    });

    it('should reject invalid job payloads', async () => {
      const invalidPayload = {
        category: 'invalid_category',
        prompt: ''
      };
      const res = await request(app).post('/api/jobs').send(invalidPayload);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });
  });

  describe('5. Admin Role Authorization', () => {
    it('should deny non-admin users from accessing /api/admin/overview', async () => {
      const res = await request(app)
        .get('/api/admin/overview')
        .set('x-user-id', DEFAULT_USER_ID)
        .set('x-user-role', 'user');
      expect(res.status).toBe(403);
    });

    it('should permit authorized admins to access /api/admin/overview', async () => {
      const res = await request(app)
        .get('/api/admin/overview')
        .set('x-user-id', ADMIN_USER_ID)
        .set('x-user-role', 'admin');
      expect(res.status).toBe(200);
      expect(res.body.metrics).toBeDefined();
      expect(res.body.metrics.totalUsers).toBeGreaterThanOrEqual(1);
    });
  });

  describe('6. Provider Adapter Contracts', () => {
    it('should enforce proper contract on Fal provider', () => {
      const fal = new FalVideoProvider();
      expect(fal.name).toBe('fal');
      const caps = fal.getCapabilities();
      expect(caps.supportedAspectRatios).toContain('16:9');
      expect(caps.models.length).toBeGreaterThan(0);
    });

    it('should enforce proper contract on Mock provider', () => {
      const mock = new MockVideoProvider();
      expect(mock.isConfigured()).toBe(true);
      const caps = mock.getCapabilities();
      expect(caps.models.some(m => m.category === 'cinematic')).toBe(true);
      expect(caps.models.some(m => m.category === 'cartoon')).toBe(true);
      expect(caps.models.some(m => m.category === 'product')).toBe(true);
    });
  });
});
