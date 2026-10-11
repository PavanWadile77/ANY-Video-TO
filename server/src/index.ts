import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { z } from 'zod';
import { db, DEFAULT_USER_ID, ADMIN_USER_ID } from './db/store.js';
import { providerManager } from './providers/index.js';
import { jobService } from './services/jobService.js';
import { enhancePrompt } from './services/promptEnhancer.js';
import { VideoCategory } from './types/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

import { 
  supabaseStorage, 
  BUCKET_AI_VIDEOS, 
  BUCKET_VIDEO_THUMBNAILS, 
  MAX_SOURCE_MEDIA_SIZE, 
  MAX_THUMBNAIL_SIZE 
} from './services/supabaseStorage.js';

// Setup uploads directory for local static fallback
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer disk storage for local uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF are permitted.'));
    }
  }
});

// Multer memory storage for direct Supabase cloud uploads
const memoryStorage = multer.memoryStorage();

const sourceMediaUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_SOURCE_MEDIA_SIZE },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm', 'video/quicktime'
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type for source media. Allowed: JPEG, PNG, WEBP, GIF, MP4, WEBM, MOV.'));
    }
  }
});

const thumbnailUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_THUMBNAIL_SIZE },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid thumbnail file type. Allowed: JPEG, PNG, WEBP.'));
    }
  }
});

app.use(cors({ origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'], credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

// Simple auth middleware simulation (reads x-user-id or defaults to demo creator user)
function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const headerUserId = req.headers['x-user-id'] as string;
  const role = req.headers['x-user-role'] as string;
  const authHeader = req.headers['authorization'] as string;
  
  if (req.headers['x-no-auth'] === 'true' || headerUserId === 'unauthorized_guest') {
    (req as any).user = null;
  } else if (role === 'admin' || headerUserId === ADMIN_USER_ID) {
    (req as any).user = db.getProfile(ADMIN_USER_ID) || { id: ADMIN_USER_ID, role: 'admin' };
  } else if (headerUserId) {
    (req as any).user = db.getProfile(headerUserId) || { id: headerUserId, role: 'user' };
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    (req as any).user = db.getProfile(token) || { id: token, role: 'user' };
  } else {
    const userId = DEFAULT_USER_ID;
    (req as any).user = db.getProfile(userId) || db.getProfile(DEFAULT_USER_ID);
  }
  next();
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || !user.id || user.id === 'unauthorized_guest') {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }
  next();
}

app.use(authMiddleware);

// ==========================================
// 1. HEALTH & SYSTEM CAPABILITIES
// ==========================================
app.get('/api/health', (_req: Request, res: Response) => {
  const providerHealth = providerManager.getHealthStatus();
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    providers: providerHealth
  });
});

app.get('/api/providers', (_req: Request, res: Response) => {
  const capabilities = providerManager.getAllCapabilities();
  const health = providerManager.getHealthStatus();
  res.json({ capabilities, health });
});

// ==========================================
// 2. USER PROFILE & CREDITS
// ==========================================
app.get('/api/auth/me', (req: Request, res: Response) => {
  const user = (req as any).user;
  const account = db.getCreditAccount(user.id);
  res.json({
    profile: user,
    credits: account
  });
});

app.put('/api/auth/profile', (req: Request, res: Response) => {
  const user = (req as any).user;
  const { displayName, preferences } = req.body;
  const updated = db.updateProfile(user.id, { displayName, preferences });
  res.json(updated);
});

app.get('/api/credits', (req: Request, res: Response) => {
  const user = (req as any).user;
  const account = db.getCreditAccount(user.id);
  const transactions = db.getTransactions(user.id);
  res.json({
    account,
    transactions
  });
});

import { requireFirebaseStorageAuth } from './middleware/firebaseAuth.js';

// ==========================================
// 3. SUPABASE STORAGE WORKFLOW
// ==========================================
app.get('/api/storage/status', (_req: Request, res: Response) => {
  res.json(supabaseStorage.getStatus());
});

app.post('/api/storage/upload/source', requireFirebaseStorageAuth, sourceMediaUpload.single('file'), async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'No file provided for upload' });
  }
  const user = (req as any).user;
  try {
    const result = await supabaseStorage.uploadSourceMedia(
      user.id,
      file.buffer,
      file.originalname,
      file.mimetype
    );
    res.status(201).json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Upload failed';
    res.status(500).json({ error: msg });
  }
});

app.post('/api/storage/upload/thumbnail', requireFirebaseStorageAuth, thumbnailUpload.single('file'), async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'No thumbnail file provided' });
  }
  const user = (req as any).user;
  try {
    const result = await supabaseStorage.uploadThumbnail(
      user.id,
      file.buffer,
      file.originalname,
      file.mimetype
    );
    res.status(201).json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Thumbnail upload failed';
    res.status(500).json({ error: msg });
  }
});

const signedUrlSchema = z.object({
  bucket: z.string(),
  path: z.string().min(1),
  expiresIn: z.number().int().min(10).max(604800).optional()
});

app.post('/api/storage/signed-url', requireFirebaseStorageAuth, async (req: Request, res: Response) => {
  const parsed = signedUrlSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid parameters', details: parsed.error.issues });
  }

  const user = (req as any).user;
  const { bucket, path: storagePath, expiresIn = 3600 } = parsed.data;

  // Strict ownership check (Requirement 5 & 6)
  const isAuthorized = supabaseStorage.verifyPathOwnership(user.id, storagePath, user.role === 'admin');
  if (!isAuthorized) {
    return res.status(403).json({ error: 'Access denied: You do not have permission to access this resource' });
  }

  try {
    const signedUrl = await supabaseStorage.createSignedUrl(bucket, storagePath, expiresIn);
    res.json({
      success: true,
      bucket,
      path: storagePath,
      signedUrl,
      expiresIn
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to generate signed URL';
    res.status(500).json({ error: msg });
  }
});

app.post('/api/upload', upload.single('image'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }
  const user = (req as any).user;
  const localFileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  
  // Try cloud upload to Supabase storage if available and user is authenticated
  let cloudSignedUrl: string | undefined;
  let cloudStoragePath: string | undefined;

  try {
    // Only attempt private Supabase upload for verified/authenticated user, never for unauthenticated guests
    if (user && user.id && user.id !== 'unauthorized_guest' && fs.existsSync(req.file.path)) {
      const buf = fs.readFileSync(req.file.path);
      const supaResult = await supabaseStorage.uploadSourceMedia(
        user.id,
        buf,
        req.file.originalname,
        req.file.mimetype
      );
      cloudSignedUrl = supaResult.signedUrl;
      cloudStoragePath = supaResult.path;
    }
  } catch (cloudErr) {
    console.warn('Notice: Local storage fallback used for image upload:', cloudErr);
  }

  res.json({
    success: true,
    fileUrl: cloudSignedUrl || localFileUrl,
    storagePath: cloudStoragePath,
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
});

// ==========================================
// 4. PROMPT ENHANCER
// ==========================================
const enhancePromptSchema = z.object({
  prompt: z.string().min(1),
  category: z.enum(['cinematic', 'cartoon', 'product']),
  stylePreference: z.string().optional()
});

app.post('/api/prompt/enhance', (req: Request, res: Response) => {
  const parsed = enhancePromptSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid parameters', details: parsed.error.issues });
  }
  const enhanced = enhancePrompt(parsed.data.prompt, parsed.data.category as VideoCategory, parsed.data.stylePreference);
  res.json({ original: parsed.data.prompt, enhanced });
});

// ==========================================
// 5. PROJECTS MANAGEMENT
// ==========================================
app.get('/api/projects', (req: Request, res: Response) => {
  const user = (req as any).user;
  const { category, isFavorite, q } = req.query;
  const projects = db.getProjects(user.id, {
    category: category as VideoCategory | undefined,
    isFavorite: isFavorite !== undefined ? isFavorite === 'true' : undefined,
    query: q as string | undefined
  });
  res.json(projects);
});

app.post('/api/projects', (req: Request, res: Response) => {
  const user = (req as any).user;
  const { title, category, description, tags } = req.body;
  if (!title || !category) {
    return res.status(400).json({ error: 'Title and category are required' });
  }
  const project = db.createProject(user.id, { title, category, description, tags });
  res.status(201).json(project);
});

app.put('/api/projects/:id', (req: Request, res: Response) => {
  const user = (req as any).user;
  const projectId = req.params.id as string;
  const proj = db.getProject(projectId);
  if (!proj || proj.userId !== user.id) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const updated = db.updateProject(projectId, req.body);
  res.json(updated);
});

app.delete('/api/projects/:id', (req: Request, res: Response) => {
  const user = (req as any).user;
  const projectId = req.params.id as string;
  const success = db.deleteProject(projectId, user.id);
  if (!success) {
    return res.status(404).json({ error: 'Project not found or unauthorized' });
  }
  res.json({ success: true, message: 'Project deleted' });
});

// ==========================================
// 6. VIDEO GENERATION STUDIO JOBS
// ==========================================
const createJobSchema = z.object({
  projectId: z.string().optional(),
  title: z.string().optional(),
  category: z.enum(['cinematic', 'cartoon', 'product']),
  generationMode: z.enum(['text_to_video', 'image_to_video', 'product_animation', 'cartoon_animation', 'cinematic_video']),
  prompt: z.string().min(3, 'Prompt must be at least 3 characters'),
  negativePrompt: z.string().optional(),
  inputImageUrl: z.string().optional(),
  referenceImageUrl: z.string().optional(),
  aspectRatio: z.enum(['16:9', '9:16', '1:1']),
  durationSeconds: z.union([z.literal(3), z.literal(5), z.literal(10)]),
  resolution: z.enum(['720p', '1080p', '4k']),
  motionStrength: z.number().min(0.1).max(2.0).optional(),
  seed: z.number().optional(),
  audioEnabled: z.boolean().optional(),
  provider: z.enum(['fal', 'replicate', 'mock']).optional(),
  modelName: z.string().optional(),
  idempotencyKey: z.string().optional()
});

app.get('/api/jobs', (req: Request, res: Response) => {
  const user = (req as any).user;
  const jobs = db.getJobs(user.id);
  res.json(jobs);
});

app.get('/api/jobs/:id', (req: Request, res: Response) => {
  const user = (req as any).user;
  const jobId = req.params.id as string;
  const job = db.getJob(jobId);
  if (!job || (job.userId !== user.id && user.role !== 'admin')) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

app.post('/api/jobs', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const parsed = createJobSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
  }

  try {
    const job = await jobService.submitJob(user.id, parsed.data);
    res.status(201).json(job);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Job submission failed';
    res.status(400).json({ error: message });
  }
});

app.post('/api/jobs/:id/retry', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const jobId = req.params.id as string;
  try {
    const job = await jobService.retryJob(user.id, jobId);
    res.json(job);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Retry failed';
    res.status(400).json({ error: message });
  }
});

app.post('/api/jobs/:id/cancel', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const jobId = req.params.id as string;
  try {
    const job = await jobService.cancelJob(user.id, jobId);
    res.json(job);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Cancel failed';
    res.status(400).json({ error: message });
  }
});

// ==========================================
// 7. WEBHOOK INGRESS
// ==========================================
app.post('/api/webhooks/:provider', async (req: Request, res: Response) => {
  const providerName = req.params.provider;
  const payload = req.body;
  console.log(`Received webhook from ${providerName}:`, payload);
  res.json({ received: true });
});

// ==========================================
// 8. ADMIN OPERATIONS (Role Protected)
// ==========================================
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
}

app.get('/api/admin/overview', requireAdmin, (_req: Request, res: Response) => {
  const allJobs = db.getJobs();
  const allProfiles = db.getAllProfiles();
  const completedJobs = allJobs.filter(j => j.status === 'completed').length;
  const failedJobs = allJobs.filter(j => j.status === 'failed').length;
  const processingJobs = allJobs.filter(j => j.status === 'processing' || j.status === 'queued').length;
  const health = providerManager.getHealthStatus();

  res.json({
    metrics: {
      totalUsers: allProfiles.length,
      totalJobs: allJobs.length,
      completedJobs,
      failedJobs,
      processingJobs,
      successRate: allJobs.length > 0 ? Math.round((completedJobs / allJobs.length) * 100) : 100
    },
    providerHealth: health,
    recentJobs: allJobs.slice(0, 10)
  });
});

app.get('/api/admin/users', requireAdmin, (_req: Request, res: Response) => {
  const profiles = db.getAllProfiles().map(p => ({
    ...p,
    account: db.getCreditAccount(p.id)
  }));
  res.json(profiles);
});

app.post('/api/admin/credits/adjust', requireAdmin, (req: Request, res: Response) => {
  const { userId, deltaAmount, description } = req.body;
  if (!userId || deltaAmount === undefined) {
    return res.status(400).json({ error: 'userId and deltaAmount are required' });
  }
  const result = db.adminAdjustCredits(userId, Number(deltaAmount), description || 'Manual admin credit adjustment');
  res.json(result);
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Animora AI Backend API running on http://localhost:${PORT}`);
  });
}

export default app;
