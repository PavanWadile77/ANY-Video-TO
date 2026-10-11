-- ==============================================================================
-- Supabase Storage Configuration Migration: Private Buckets & Service Role Access
-- Project ref: tboopdrzolsjfdanmqww
-- Target Buckets: 'ai-videos' (private), 'video-thumbnails' (private)
-- ==============================================================================
-- ARCHITECTURAL SECURITY NOTICE:
-- The application uses Firebase Authentication for identity management.
-- End-users do NOT possess native Supabase Auth sessions; hence, blind
-- Supabase RLS policies relying on `auth.uid()` are inapplicable.
--
-- All upload, deletion, and signed URL generation operations are mediated
-- through the server-side backend gateway, which verifies Firebase ID tokens
-- and enforces user-isolated directory paths (${userId}/...).
--
-- Direct public/anon access to storage.objects is explicitly DENIED.
-- Playback is authorized solely through time-limited signed URLs.
-- ==============================================================================

-- 1. Create or update private storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  (
    'ai-videos', 
    'ai-videos', 
    false, -- Strictly private
    262144000, -- 250MB limit for generated videos and high-res clips
    ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'video-thumbnails', 
    'video-thumbnails', 
    false, -- Strictly private
    10485760, -- 10MB limit for poster frames and thumbnails
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  )
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Enable Row Level Security (RLS) on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Full administrative access for the backend service role
-- The backend uses SUPABASE_SERVICE_ROLE_KEY to perform verified uploads
-- and generate short-lived signed URLs on behalf of authenticated Firebase users.
DO $$ BEGIN
  CREATE POLICY "Backend service role full access on storage objects" 
  ON storage.objects 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 4. Explicitly DENY direct anonymous / public access to private buckets
-- Signed URLs bypass RLS via valid cryptographic token verification.
DO $$ BEGIN
  CREATE POLICY "Deny anon direct access to private buckets" 
  ON storage.objects 
  FOR ALL 
  TO anon 
  USING (false);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
