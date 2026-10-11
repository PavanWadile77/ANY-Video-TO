"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const index_js_1 = __importDefault(require("../src/index.js"));
const store_js_1 = require("../src/db/store.js");
const fal_js_1 = require("../src/providers/fal.js");
const mock_js_1 = require("../src/providers/mock.js");
const promptEnhancer_js_1 = require("../src/services/promptEnhancer.js");
(0, vitest_1.describe)('Animora AI Backend Test Suite', () => {
    (0, vitest_1.beforeEach)(() => {
        // Reset user account balance for test isolation
        const acc = store_js_1.db.getCreditAccount(store_js_1.DEFAULT_USER_ID);
        acc.balance = 100;
        acc.reservedBalance = 0;
    });
    (0, vitest_1.describe)('1. Health and Provider Discovery', () => {
        (0, vitest_1.it)('should return health status and provider states', async () => {
            const res = await (0, supertest_1.default)(index_js_1.default).get('/api/health');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.status).toBe('ok');
            (0, vitest_1.expect)(Array.isArray(res.body.providers)).toBe(true);
            (0, vitest_1.expect)(res.body.providers.some((p) => p.provider === 'mock')).toBe(true);
        });
        (0, vitest_1.it)('should return capabilities for all registered providers', async () => {
            const res = await (0, supertest_1.default)(index_js_1.default).get('/api/providers');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.capabilities.length).toBeGreaterThanOrEqual(2);
            (0, vitest_1.expect)(res.body.capabilities.some((c) => c.name === 'fal')).toBe(true);
        });
    });
    (0, vitest_1.describe)('2. Credit Accounting Ledger', () => {
        (0, vitest_1.it)('should correctly reserve credits when balance is sufficient', () => {
            const result = store_js_1.db.reserveCredits(store_js_1.DEFAULT_USER_ID, 20, 'test_job_1', 'idempotency_1');
            (0, vitest_1.expect)(result.success).toBe(true);
            (0, vitest_1.expect)(result.remainingBalance).toBe(80);
            const acc = store_js_1.db.getCreditAccount(store_js_1.DEFAULT_USER_ID);
            (0, vitest_1.expect)(acc.balance).toBe(80);
            (0, vitest_1.expect)(acc.reservedBalance).toBe(20);
        });
        (0, vitest_1.it)('should reject reservation when balance is insufficient', () => {
            const result = store_js_1.db.reserveCredits(store_js_1.DEFAULT_USER_ID, 999, 'test_job_over');
            (0, vitest_1.expect)(result.success).toBe(false);
            (0, vitest_1.expect)(result.error).toContain('Insufficient credits');
        });
        (0, vitest_1.it)('should be idempotent for identical idempotency keys', () => {
            const first = store_js_1.db.reserveCredits(store_js_1.DEFAULT_USER_ID, 15, 'job_idem_1', 'unique_key_123');
            const second = store_js_1.db.reserveCredits(store_js_1.DEFAULT_USER_ID, 15, 'job_idem_1', 'unique_key_123');
            (0, vitest_1.expect)(first.success).toBe(true);
            (0, vitest_1.expect)(second.success).toBe(true);
            (0, vitest_1.expect)(second.remainingBalance).toBe(first.remainingBalance);
        });
        (0, vitest_1.it)('should refund credits after failure', () => {
            store_js_1.db.reserveCredits(store_js_1.DEFAULT_USER_ID, 30, 'job_fail_1');
            const refund = store_js_1.db.refundCredits(store_js_1.DEFAULT_USER_ID, 30, 'job_fail_1', 'Model timeout');
            (0, vitest_1.expect)(refund.success).toBe(true);
            (0, vitest_1.expect)(refund.newBalance).toBe(100);
            const acc = store_js_1.db.getCreditAccount(store_js_1.DEFAULT_USER_ID);
            (0, vitest_1.expect)(acc.reservedBalance).toBe(0);
        });
    });
    (0, vitest_1.describe)('3. Prompt Enhancer', () => {
        (0, vitest_1.it)('should enhance cinematic prompts with lens and atmospheric keywords', () => {
            const enhanced = (0, promptEnhancer_js_1.enhancePrompt)('A samurai walking in rain', 'cinematic');
            (0, vitest_1.expect)(enhanced).toContain('35mm anamorphic');
            (0, vitest_1.expect)(enhanced).toContain('photorealistic');
        });
        (0, vitest_1.it)('should enhance cartoon/anime prompts with animation keywords', () => {
            const enhanced = (0, promptEnhancer_js_1.enhancePrompt)('A dragon flying over candy mountain', 'cartoon', 'anime');
            (0, vitest_1.expect)(enhanced).toContain('anime aesthetic');
            (0, vitest_1.expect)(enhanced).toContain('Makoto Shinkai');
        });
        (0, vitest_1.it)('should enhance product prompts with studio lighting and 360 rotation', () => {
            const enhanced = (0, promptEnhancer_js_1.enhancePrompt)('Smart ring on table', 'product');
            (0, vitest_1.expect)(enhanced).toContain('commercial studio');
            (0, vitest_1.expect)(enhanced).toContain('360 turntable');
        });
    });
    (0, vitest_1.describe)('4. Generation Jobs Flow', () => {
        (0, vitest_1.it)('should create a valid generation job and reserve credits', async () => {
            const jobPayload = {
                category: 'cinematic',
                generationMode: 'text_to_video',
                prompt: 'Futuristic hypercar speeding on desert salt flats at twilight',
                aspectRatio: '16:9',
                durationSeconds: 5,
                resolution: '1080p',
                provider: 'mock'
            };
            const res = await (0, supertest_1.default)(index_js_1.default).post('/api/jobs').send(jobPayload);
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.id).toBeDefined();
            (0, vitest_1.expect)(res.body.status).toMatch(/queued|processing|completed/);
            (0, vitest_1.expect)(res.body.creditsStatus).toBe('reserved');
        });
        (0, vitest_1.it)('should reject invalid job payloads', async () => {
            const invalidPayload = {
                category: 'invalid_category',
                prompt: ''
            };
            const res = await (0, supertest_1.default)(index_js_1.default).post('/api/jobs').send(invalidPayload);
            (0, vitest_1.expect)(res.status).toBe(400);
            (0, vitest_1.expect)(res.body.error).toBe('Validation failed');
        });
    });
    (0, vitest_1.describe)('5. Admin Role Authorization', () => {
        (0, vitest_1.it)('should deny non-admin users from accessing /api/admin/overview', async () => {
            const res = await (0, supertest_1.default)(index_js_1.default)
                .get('/api/admin/overview')
                .set('x-user-id', store_js_1.DEFAULT_USER_ID)
                .set('x-user-role', 'user');
            (0, vitest_1.expect)(res.status).toBe(403);
        });
        (0, vitest_1.it)('should permit authorized admins to access /api/admin/overview', async () => {
            const res = await (0, supertest_1.default)(index_js_1.default)
                .get('/api/admin/overview')
                .set('x-user-id', store_js_1.ADMIN_USER_ID)
                .set('x-user-role', 'admin');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.metrics).toBeDefined();
            (0, vitest_1.expect)(res.body.metrics.totalUsers).toBeGreaterThanOrEqual(1);
        });
    });
    (0, vitest_1.describe)('6. Provider Adapter Contracts', () => {
        (0, vitest_1.it)('should enforce proper contract on Fal provider', () => {
            const fal = new fal_js_1.FalVideoProvider();
            (0, vitest_1.expect)(fal.name).toBe('fal');
            const caps = fal.getCapabilities();
            (0, vitest_1.expect)(caps.supportedAspectRatios).toContain('16:9');
            (0, vitest_1.expect)(caps.models.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should enforce proper contract on Mock provider', () => {
            const mock = new mock_js_1.MockVideoProvider();
            (0, vitest_1.expect)(mock.isConfigured()).toBe(true);
            const caps = mock.getCapabilities();
            (0, vitest_1.expect)(caps.models.some(m => m.category === 'cinematic')).toBe(true);
            (0, vitest_1.expect)(caps.models.some(m => m.category === 'cartoon')).toBe(true);
            (0, vitest_1.expect)(caps.models.some(m => m.category === 'product')).toBe(true);
        });
    });
});
