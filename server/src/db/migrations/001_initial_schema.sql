-- ==============================================================================
-- Animora AI — Production Database Schema & RLS Policies
-- PostgreSQL / Supabase Migration
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS & SCHEMAS
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

-- 3. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY, -- Maps to auth.users.id
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    preferences JSONB NOT NULL DEFAULT '{"theme": "dark", "notifications": true}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 4. CREDIT ACCOUNTS TABLE
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

CREATE INDEX IF NOT EXISTS idx_credit_accounts_user ON public.credit_accounts(user_id);

-- 5. CREDIT TRANSACTIONS TABLE (Audit Ledger)
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.credit_accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- negative for debit, positive for grant/refund
    type TEXT NOT NULL CHECK (type IN ('grant', 'reserve', 'settle', 'refund', 'bonus', 'purchase')),
    description TEXT NOT NULL,
    reference_id TEXT, -- e.g. job_id or payment_intent_id
    idempotency_key TEXT UNIQUE,
    balance_after INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_credit_tx_user ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_tx_reference ON public.credit_transactions(reference_id);
CREATE INDEX IF NOT EXISTS idx_credit_tx_created ON public.credit_transactions(created_at DESC);

-- 6. PROJECTS TABLE
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

CREATE INDEX IF NOT EXISTS idx_projects_user ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_category ON public.projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_favorite ON public.projects(user_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_projects_updated ON public.projects(updated_at DESC);

-- 7. GENERATION JOBS TABLE
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

CREATE INDEX IF NOT EXISTS idx_jobs_user ON public.generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_project ON public.generation_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_provider_job ON public.generation_jobs(provider, provider_job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON public.generation_jobs(created_at DESC);

-- Link projects latest_job_id
ALTER TABLE public.projects 
    DROP CONSTRAINT IF EXISTS fk_project_latest_job,
    ADD CONSTRAINT fk_project_latest_job 
    FOREIGN KEY (latest_job_id) REFERENCES public.generation_jobs(id) ON DELETE SET NULL;

-- 8. GENERATED ASSETS TABLE
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

CREATE INDEX IF NOT EXISTS idx_assets_job ON public.generated_assets(job_id);
CREATE INDEX IF NOT EXISTS idx_assets_project ON public.generated_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_user ON public.generated_assets(user_id);

-- 9. PROVIDER CONFIGURATIONS TABLE (Operational Health & Routing)
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

-- Seed initial provider records
INSERT INTO public.provider_configurations (provider_name, is_enabled, default_model, supported_models, rate_limit_per_minute, health_status)
VALUES 
('fal', true, 'fal-ai/minimax-video/image-to-video', '[
    {"id": "fal-ai/minimax-video/image-to-video", "name": "Minimax Hailuo Video-01", "category": "cinematic", "cost": 15},
    {"id": "fal-ai/kling-video/v1.5/pro", "name": "Kling 1.5 Pro", "category": "cinematic", "cost": 20},
    {"id": "fal-ai/animatediff/v2", "name": "AnimateDiff V2 Cartoon/Anime", "category": "cartoon", "cost": 8},
    {"id": "fal-ai/ltx-video", "name": "LTX Fast Video 3D/Product", "category": "product", "cost": 10}
]'::jsonb, 60, 'healthy'),
('replicate', true, 'wan-video/wan-2.1-t2v-14b', '[
    {"id": "wan-video/wan-2.1-t2v-14b", "name": "Wan 2.1 14B Cinema", "category": "cinematic", "cost": 18},
    {"id": "luma/ray", "name": "Luma Dream Machine Ray", "category": "product", "cost": 20}
]'::jsonb, 30, 'healthy'),
('mock', true, 'animora/sandbox-cinematic-v1', '[
    {"id": "animora/sandbox-cinematic-v1", "name": "Animora Cinema Sandbox", "category": "cinematic", "cost": 5},
    {"id": "animora/sandbox-toon-v1", "name": "Animora Toon/3D Sandbox", "category": "cartoon", "cost": 5},
    {"id": "animora/sandbox-product-v1", "name": "Animora 360 Showcase Sandbox", "category": "product", "cost": 5}
]'::jsonb, 1000, 'healthy')
ON CONFLICT (provider_name) DO NOTHING;

-- 10. ATOMIC STORED PROCEDURES FOR CREDITS (Concurrency-Safe)

-- Procedure A: Reserve Credits
CREATE OR REPLACE FUNCTION public.reserve_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_reference_id TEXT,
    p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_account RECORD;
    v_new_balance INTEGER;
    v_tx_id UUID;
BEGIN
    -- Check idempotency
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_tx_id FROM public.credit_transactions WHERE idempotency_key = p_idempotency_key;
        IF v_tx_id IS NOT NULL THEN
            RETURN jsonb_build_object('success', true, 'idempotent', true, 'transaction_id', v_tx_id);
        END IF;
    END IF;

    -- Lock credit account row for update
    SELECT * INTO v_account 
    FROM public.credit_accounts 
    WHERE user_id = p_user_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Credit account not found');
    END IF;

    IF v_account.balance < p_amount THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Insufficient credits',
            'required', p_amount,
            'available', v_account.balance
        );
    END IF;

    -- Update balances
    v_new_balance := v_account.balance - p_amount;
    UPDATE public.credit_accounts
    SET balance = v_new_balance,
        reserved_balance = reserved_balance + p_amount,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_account.id;

    -- Record transaction
    INSERT INTO public.credit_transactions (
        account_id, user_id, amount, type, description, reference_id, idempotency_key, balance_after
    ) VALUES (
        v_account.id, p_user_id, -p_amount, 'reserve', 
        'Reserved credits for generation job ' || COALESCE(p_reference_id, ''),
        p_reference_id, p_idempotency_key, v_new_balance
    ) RETURNING id INTO v_tx_id;

    RETURN jsonb_build_object(
        'success', true, 
        'transaction_id', v_tx_id, 
        'remaining_balance', v_new_balance,
        'reserved_amount', p_amount
    );
END;
$$;

-- Procedure B: Settle Credits (Job Succeeded)
CREATE OR REPLACE FUNCTION public.settle_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_reference_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_account RECORD;
BEGIN
    SELECT * INTO v_account 
    FROM public.credit_accounts 
    WHERE user_id = p_user_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Credit account not found');
    END IF;

    -- Deduct from reserved balance and increment lifetime used
    UPDATE public.credit_accounts
    SET reserved_balance = GREATEST(0, reserved_balance - p_amount),
        lifetime_used = lifetime_used + p_amount,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_account.id;

    INSERT INTO public.credit_transactions (
        account_id, user_id, amount, type, description, reference_id, balance_after
    ) VALUES (
        v_account.id, p_user_id, 0, 'settle', 
        'Settled reserved credits for completed job ' || COALESCE(p_reference_id, ''),
        p_reference_id, v_account.balance
    );

    RETURN jsonb_build_object('success', true, 'settled_amount', p_amount);
END;
$$;

-- Procedure C: Refund Credits (Job Failed or Cancelled)
CREATE OR REPLACE FUNCTION public.refund_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_reference_id TEXT,
    p_reason TEXT DEFAULT 'Job failed or cancelled'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_account RECORD;
    v_new_balance INTEGER;
BEGIN
    SELECT * INTO v_account 
    FROM public.credit_accounts 
    WHERE user_id = p_user_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Credit account not found');
    END IF;

    -- Release from reserved back into balance
    v_new_balance := v_account.balance + p_amount;
    UPDATE public.credit_accounts
    SET balance = v_new_balance,
        reserved_balance = GREATEST(0, reserved_balance - p_amount),
        updated_at = timezone('utc'::text, now())
    WHERE id = v_account.id;

    INSERT INTO public.credit_transactions (
        account_id, user_id, amount, type, description, reference_id, balance_after
    ) VALUES (
        v_account.id, p_user_id, p_amount, 'refund', 
        'Refunded reserved credits: ' || COALESCE(p_reason, ''),
        p_reference_id, v_new_balance
    );

    RETURN jsonb_build_object('success', true, 'refunded_amount', p_amount, 'new_balance', v_new_balance);
END;
$$;

-- 11. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_configurations ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Credit Accounts Policies
CREATE POLICY "Users can read own credit balance" ON public.credit_accounts
    FOR SELECT USING (auth.uid() = user_id);

-- Credit Transactions Policies
CREATE POLICY "Users can view own transactions" ON public.credit_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Projects Policies
CREATE POLICY "Users can read own projects" ON public.projects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects" ON public.projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON public.projects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON public.projects
    FOR DELETE USING (auth.uid() = user_id);

-- Generation Jobs Policies
CREATE POLICY "Users can read own jobs" ON public.generation_jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own jobs" ON public.generation_jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs status" ON public.generation_jobs
    FOR UPDATE USING (auth.uid() = user_id);

-- Generated Assets Policies
CREATE POLICY "Users can read own generated assets" ON public.generated_assets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own generated assets" ON public.generated_assets
    FOR DELETE USING (auth.uid() = user_id);

-- Provider Configurations (Public can view health status, only admin/service role can mutate)
CREATE POLICY "Anyone can view provider health" ON public.provider_configurations
    FOR SELECT USING (true);
