import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tboopdrzolsjfdanmqww.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || null;

export const BUCKET_AI_VIDEOS = process.env.SUPABASE_BUCKET_VIDEOS || 'ai-videos';
export const BUCKET_VIDEO_THUMBNAILS = process.env.SUPABASE_BUCKET_THUMBNAILS || 'video-thumbnails';

class FunctionsSupabaseStorage {
  private client: SupabaseClient | null = null;

  constructor() {
    if (SUPABASE_SERVICE_ROLE_KEY && SUPABASE_SERVICE_ROLE_KEY.length > 20) {
      try {
        this.client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          auth: {
            persistSession: false,
            autoRefreshToken: false
          }
        });
      } catch (err) {
        console.warn('Functions Supabase client initialization notice:', err);
      }
    }
  }

  public isConfigured(): boolean {
    return Boolean(this.client);
  }

  public async saveGeneratedVideo(
    userId: string,
    jobId: string,
    remoteUrl: string
  ): Promise<{ success: boolean; bucket: string; path: string; signedUrl: string } | null> {
    const storagePath = `${userId}/videos/${jobId}.mp4`;
    const expiresIn = 3600 * 24; // 24 hours

    if (!this.client) {
      return null;
    }

    try {
      // Download remote video
      const res = await fetch(remoteUrl);
      if (!res.ok) {
        console.warn(`Could not download remote video from provider (HTTP ${res.status})`);
        return null;
      }
      const arrayBuf = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);

      // Upload to private bucket
      const { error: uploadErr } = await this.client.storage
        .from(BUCKET_AI_VIDEOS)
        .upload(storagePath, buffer, {
          contentType: 'video/mp4',
          upsert: true
        });

      if (uploadErr) {
        console.warn('Functions Supabase upload error:', uploadErr.message);
        return null;
      }

      // Generate signed URL
      const { data: signData, error: signErr } = await this.client.storage
        .from(BUCKET_AI_VIDEOS)
        .createSignedUrl(storagePath, expiresIn);

      if (signErr || !signData?.signedUrl) {
        console.warn('Functions Supabase signed URL error:', signErr?.message);
        return null;
      }

      return {
        success: true,
        bucket: BUCKET_AI_VIDEOS,
        path: storagePath,
        signedUrl: signData.signedUrl
      };
    } catch (err) {
      console.warn('saveGeneratedVideo exception in Functions:', err);
      return null;
    }
  }
}

export const functionsSupabaseStorage = new FunctionsSupabaseStorage();
