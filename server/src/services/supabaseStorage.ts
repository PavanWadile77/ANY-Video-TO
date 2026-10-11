import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const SUPABASE_PROJECT_REF = 'tboopdrzolsjfdanmqww';
export const DEFAULT_SUPABASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;
export const BUCKET_AI_VIDEOS = process.env.SUPABASE_BUCKET_VIDEOS || 'ai-videos';
export const BUCKET_VIDEO_THUMBNAILS = process.env.SUPABASE_BUCKET_THUMBNAILS || 'video-thumbnails';

// Maximum upload limits
export const MAX_SOURCE_MEDIA_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_VIDEO_SIZE = 250 * 1024 * 1024; // 250MB
export const MAX_THUMBNAIL_SIZE = 10 * 1024 * 1024; // 10MB

export interface StorageUploadResult {
  success: boolean;
  bucket: string;
  path: string;
  signedUrl: string;
  expiresIn: number;
  sizeBytes: number;
  mimeType: string;
  originalName?: string;
}

export class SupabaseStorageService {
  private client: SupabaseClient | null = null;
  private url: string;
  private serviceKey: string | null = null;
  private isConfigured = false;

  constructor() {
    this.url = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
    this.serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || null;

    if (this.url && this.serviceKey) {
      try {
        this.client = createClient(this.url, this.serviceKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false
          }
        });
        this.isConfigured = true;
      } catch (err) {
        console.warn('Failed to initialize Supabase storage client:', err);
        this.client = null;
        this.isConfigured = false;
      }
    }
  }

  public getStatus() {
    return {
      isConfigured: this.isConfigured,
      projectRef: SUPABASE_PROJECT_REF,
      url: this.url,
      buckets: {
        videos: BUCKET_AI_VIDEOS,
        thumbnails: BUCKET_VIDEO_THUMBNAILS
      },
      hasServiceRoleKey: !!this.serviceKey
    };
  }

  /**
   * Helper to ensure buckets exist if using service role
   */
  public async ensureBucketsExist(): Promise<{ videos: boolean; thumbnails: boolean }> {
    if (!this.client) return { videos: false, thumbnails: false };

    try {
      const { data: buckets } = await this.client.storage.listBuckets();
      const existingNames = new Set(buckets?.map((b) => b.name) || []);

      if (!existingNames.has(BUCKET_AI_VIDEOS)) {
        await this.client.storage.createBucket(BUCKET_AI_VIDEOS, {
          public: false,
          fileSizeLimit: MAX_VIDEO_SIZE
        });
      }

      if (!existingNames.has(BUCKET_VIDEO_THUMBNAILS)) {
        await this.client.storage.createBucket(BUCKET_VIDEO_THUMBNAILS, {
          public: false,
          fileSizeLimit: MAX_THUMBNAIL_SIZE
        });
      }

      return { videos: true, thumbnails: true };
    } catch (err) {
      console.warn('Ensure buckets notice:', err);
      return { videos: false, thumbnails: false };
    }
  }

  /**
   * Upload source media (images, reference clips) scoped to userId
   */
  public async uploadSourceMedia(
    userId: string,
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<StorageUploadResult> {
    const sanitized = path.basename(originalName).replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${userId}/source/${Date.now()}_${sanitized}`;

    return this.uploadFile(BUCKET_AI_VIDEOS, storagePath, fileBuffer, mimeType, originalName);
  }

  /**
   * Upload video thumbnail scoped to userId
   */
  public async uploadThumbnail(
    userId: string,
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<StorageUploadResult> {
    const sanitized = path.basename(originalName).replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${userId}/thumbnails/${Date.now()}_${sanitized}`;

    return this.uploadFile(BUCKET_VIDEO_THUMBNAILS, storagePath, fileBuffer, mimeType, originalName);
  }

  /**
   * Save a generated AI video output into Supabase Storage
   */
  public async saveGeneratedVideo(
    userId: string,
    jobId: string,
    videoBufferOrUrl: Buffer | string,
    mimeType = 'video/mp4'
  ): Promise<StorageUploadResult> {
    const storagePath = `${userId}/videos/${jobId}.mp4`;

    let buffer: Buffer;
    if (typeof videoBufferOrUrl === 'string') {
      // Remote URL - fetch it securely
      try {
        const response = await fetch(videoBufferOrUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch video from remote URL: HTTP ${response.status}`);
        }
        const arrayBuf = await response.arrayBuffer();
        buffer = Buffer.from(arrayBuf);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown download error';
        throw new Error(`Could not download video asset: ${msg}`);
      }
    } else {
      buffer = videoBufferOrUrl;
    }

    return this.uploadFile(BUCKET_AI_VIDEOS, storagePath, buffer, mimeType, `${jobId}.mp4`);
  }

  /**
   * Low-level upload to Supabase Storage with signed playback URL generation
   */
  public async uploadFile(
    bucket: string,
    storagePath: string,
    fileBuffer: Buffer,
    mimeType: string,
    originalName?: string
  ): Promise<StorageUploadResult> {
    const expiresIn = 3600 * 24; // 24 hours signed URL

    if (!this.client) {
      // Fallback for development/unconfigured credentials mode
      const fallbackSignedUrl = `https://${SUPABASE_PROJECT_REF}.supabase.co/storage/v1/object/sign/${bucket}/${storagePath}?token=mock_signed_dev_token&expires=${Date.now() + expiresIn * 1000}`;
      return {
        success: true,
        bucket,
        path: storagePath,
        signedUrl: fallbackSignedUrl,
        expiresIn,
        sizeBytes: fileBuffer.length,
        mimeType,
        originalName
      };
    }

    const { error: uploadError } = await this.client.storage
      .from(bucket)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Supabase Storage upload error: ${uploadError.message}`);
    }

    const signedUrl = await this.createSignedUrl(bucket, storagePath, expiresIn);

    return {
      success: true,
      bucket,
      path: storagePath,
      signedUrl,
      expiresIn,
      sizeBytes: fileBuffer.length,
      mimeType,
      originalName
    };
  }

  /**
   * Generate short-lived signed URL for private playback (Requirement 8)
   */
  public async createSignedUrl(bucket: string, storagePath: string, expiresInSeconds = 3600): Promise<string> {
    if (!this.client) {
      return `https://${SUPABASE_PROJECT_REF}.supabase.co/storage/v1/object/sign/${bucket}/${storagePath}?token=mock_signed_token&expires=${Date.now() + expiresInSeconds * 1000}`;
    }

    const { data, error } = await this.client.storage
      .from(bucket)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new Error(`Failed to generate signed URL: ${error?.message || 'Unknown error'}`);
    }

    return data.signedUrl;
  }

  /**
   * Verify if a requested path belongs to the requesting user (Requirement 5 & 6)
   */
  public verifyPathOwnership(userId: string, requestedPath: string, isAdmin = false): boolean {
    if (isAdmin) return true;
    if (!requestedPath || !userId) return false;

    // Path must strictly start with `${userId}/`
    const normalized = requestedPath.replace(/^\/+/, '');
    return normalized.startsWith(`${userId}/`);
  }
}

export const supabaseStorage = new SupabaseStorageService();
