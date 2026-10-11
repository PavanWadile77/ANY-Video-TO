import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Project Ref: tboopdrzolsjfdanmqww
export const SUPABASE_PROJECT_REF = 'tboopdrzolsjfdanmqww';
export const DEFAULT_SUPABASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;

// CRITICAL SECURITY REQUIREMENT:
// ONLY public/publishable keys are permitted on client.
// NEVER expose service_role or secret keys in frontend code or client-side variables!
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
export const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const BUCKET_AI_VIDEOS = 'ai-videos';
export const BUCKET_VIDEO_THUMBNAILS = 'video-thumbnails';

// Modular client instance with public anon/publishable credentials only
export const supabase: SupabaseClient | null = supabasePublishableKey
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: false
      }
    })
  : null;

export function isSupabaseConfigured(): boolean {
  return !!supabasePublishableKey;
}
