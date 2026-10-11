-- Supabase Migration: 20261011_animora_initial.sql
-- Direct migration file compatible with Supabase CLI (`supabase db push` / `supabase migration up`)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE video_category AS ENUM ('cinematic', 'cartoon', 'product');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE generation_mode AS ENUM (
        'text_to_video',
        'image_to_video',
        'product_animation',
        'cartoon_animation',
        'cinematic_video'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE job_status AS ENUM ('queued', 'processing', 'completed', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE credit_tx_type AS ENUM ('grant', 'reserve', 'settle', 'refund', 'bonus', 'purchase');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    preferences JSONB NOT NULL DEFAULT '{"theme": "dark", "notifications": true}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.credit_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 150 CHECK (balance >= 0),
    reserved_balance INTEGER NOT NULL DEFAULT 0 CHECK (reserved_balance >= 0),
    lifetime_used INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_used >= 0),
    tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'creator', 'pro', 'studio')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.credit_accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('grant', 'reserve', 'settle', 'refund', 'bonus', 'purchase')),
    description TEXT NOT NULL,
    reference_id TEXT,
    idempotency_key TEXT UNIQUE,
    balance_after INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('cinematic', 'cartoon', 'product')),
    is_favorite BOOLEAN NOT NULL DEFAULT false,
    tags TEXT[] NOT NULL DEFAULT '{}',
    thumbnail_url TEXT,
    latest_job_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('cinematic', 'cartoon', 'product')),
    generation_mode TEXT NOT NULL CHECK (generation_mode IN ('text_to_video', 'image_to_video', 'product_animation', 'cartoon_animation', 'cinematic_video')),
    prompt TEXT NOT NULL,
    negative_prompt TEXT,
    input_image_url TEXT,
    reference_image_url TEXT,
    aspect_ratio TEXT NOT NULL DEFAULT '16:9' CHECK (aspect_ratio IN ('16:9', '9:16', '1:1')),
    duration_seconds INTEGER NOT NULL DEFAULT 5 CHECK (duration_seconds IN (3, 5, 10)),
    resolution TEXT NOT NULL DEFAULT '720p' CHECK (resolution IN ('720p', '1080p', '4k')),
    motion_strength NUMERIC(3,2) NOT NULL DEFAULT 1.00,
    seed BIGINT,
    audio_enabled BOOLEAN NOT NULL DEFAULT false,
    provider TEXT NOT NULL CHECK (provider IN ('fal', 'replicate', 'mock')),
    model_name TEXT NOT NULL,
    provider_job_id TEXT,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
    progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
    credits_cost INTEGER NOT NULL DEFAULT 10 CHECK (credits_cost > 0),
    credits_status TEXT NOT NULL DEFAULT 'reserved' CHECK (credits_status IN ('reserved', 'settled', 'refunded')),
    error_message TEXT,
    idempotency_key TEXT UNIQUE,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.generated_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.generation_jobs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    asset_type TEXT NOT NULL DEFAULT 'video' CHECK (asset_type IN ('video', 'thumbnail', 'audio', 'frame')),
    file_url TEXT NOT NULL,
    download_url TEXT,
    storage_path TEXT,
    mime_type TEXT NOT NULL DEFAULT 'video/mp4',
    duration_seconds NUMERIC(5,2),
    resolution TEXT,
    file_size_bytes BIGINT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.provider_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name TEXT NOT NULL UNIQUE CHECK (provider_name IN ('fal', 'replicate', 'mock')),
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    default_model TEXT NOT NULL,
    supported_models JSONB NOT NULL DEFAULT '[]'::jsonb,
    rate_limit_per_minute INTEGER NOT NULL DEFAULT 30,
    health_status TEXT NOT NULL DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'degraded', 'offline')),
    last_error_message TEXT,
    last_checked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
