-- API Usage Tracking Migration
-- Adds token usage tracking and rate limiting capabilities

-- ============================================================================
-- API USAGE TABLE (per-request logging)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.api_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Anonymous users tracked by session ID (nullable user_id)
    session_id TEXT,

    -- Request details
    model TEXT NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('coding', 'prompting')),

    -- Token counts (from OpenRouter response or estimated)
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,

    -- Token estimation method
    tokens_estimated BOOLEAN NOT NULL DEFAULT true,

    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Request metadata (for debugging/analytics)
    request_chars INTEGER,
    response_chars INTEGER
);

-- Indexes for efficient querying
CREATE INDEX idx_api_usage_user_id ON public.api_usage(user_id);
CREATE INDEX idx_api_usage_session_id ON public.api_usage(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_api_usage_created_at ON public.api_usage(created_at DESC);
CREATE INDEX idx_api_usage_user_daily ON public.api_usage(user_id, created_at)
    WHERE user_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- Users can only view their own usage
CREATE POLICY "Users can view own usage" ON public.api_usage
    FOR SELECT USING (auth.uid() = user_id);

-- Insert policy - edge function uses service role, so this is for direct client access
CREATE POLICY "Users can insert own usage" ON public.api_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================================
-- USER USAGE LIMITS TABLE (configurable per-user limits)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_usage_limits (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Limit configuration
    daily_token_limit INTEGER NOT NULL DEFAULT 1000,
    monthly_token_limit INTEGER NOT NULL DEFAULT 10000,
    max_tokens_per_request INTEGER NOT NULL DEFAULT 500,

    -- Special flags
    is_unlimited BOOLEAN NOT NULL DEFAULT false,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_usage_limits ENABLE ROW LEVEL SECURITY;

-- Users can view their own limits
CREATE POLICY "Users can view own limits" ON public.user_usage_limits
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- ANONYMOUS USAGE LIMITS (by IP/session, for rate limiting guests)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.anonymous_usage (
    session_id TEXT PRIMARY KEY,
    ip_hash TEXT, -- Hashed IP for privacy

    -- Daily tracking (resets at midnight UTC)
    tokens_today INTEGER NOT NULL DEFAULT 0,
    last_request_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Total tracking
    total_tokens INTEGER NOT NULL DEFAULT 0,
    request_count INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cleanup
CREATE INDEX idx_anonymous_usage_last_seen ON public.anonymous_usage(last_seen);

-- No RLS needed - this is managed by edge functions only

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get user's usage for a time period
CREATE OR REPLACE FUNCTION public.get_user_usage(
    p_user_id UUID,
    p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    total_tokens BIGINT,
    total_requests BIGINT,
    avg_tokens_per_request NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(au.total_tokens), 0)::BIGINT as total_tokens,
        COUNT(*)::BIGINT as total_requests,
        COALESCE(AVG(au.total_tokens), 0)::NUMERIC as avg_tokens_per_request
    FROM public.api_usage au
    WHERE au.user_id = p_user_id
    AND au.created_at BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's daily usage
CREATE OR REPLACE FUNCTION public.get_user_daily_usage(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    daily_total INTEGER;
BEGIN
    SELECT COALESCE(SUM(total_tokens), 0)
    INTO daily_total
    FROM public.api_usage
    WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';

    RETURN daily_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's monthly usage
CREATE OR REPLACE FUNCTION public.get_user_monthly_usage(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    monthly_total INTEGER;
BEGIN
    SELECT COALESCE(SUM(total_tokens), 0)
    INTO monthly_total
    FROM public.api_usage
    WHERE user_id = p_user_id
    AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
    AND created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';

    RETURN monthly_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can make request (returns remaining tokens or -1 for unlimited)
CREATE OR REPLACE FUNCTION public.check_user_rate_limit(
    p_user_id UUID,
    p_requested_tokens INTEGER DEFAULT 0
)
RETURNS TABLE (
    can_proceed BOOLEAN,
    daily_remaining INTEGER,
    monthly_remaining INTEGER,
    is_unlimited BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    v_limits RECORD;
    v_daily_used INTEGER;
    v_monthly_used INTEGER;
BEGIN
    -- Get user limits (or defaults if not set)
    SELECT
        COALESCE(ul.daily_token_limit, 1000) as daily_limit,
        COALESCE(ul.monthly_token_limit, 10000) as monthly_limit,
        COALESCE(ul.max_tokens_per_request, 500) as max_per_request,
        COALESCE(ul.is_unlimited, false) as is_unlimited
    INTO v_limits
    FROM public.user_usage_limits ul
    WHERE ul.user_id = p_user_id;

    -- If no limits record, use defaults
    IF NOT FOUND THEN
        v_limits := ROW(1000, 10000, 500, false);
    END IF;

    -- Unlimited users bypass all checks
    IF v_limits.is_unlimited THEN
        RETURN QUERY SELECT true, -1, -1, true, NULL::TEXT;
        RETURN;
    END IF;

    -- Check per-request limit
    IF p_requested_tokens > v_limits.max_per_request THEN
        RETURN QUERY SELECT
            false,
            0,
            0,
            false,
            FORMAT('Request exceeds maximum tokens per request (%s). Reduce your prompt size.', v_limits.max_per_request);
        RETURN;
    END IF;

    -- Get current usage
    v_daily_used := public.get_user_daily_usage(p_user_id);
    v_monthly_used := public.get_user_monthly_usage(p_user_id);

    -- Check daily limit
    IF v_daily_used + p_requested_tokens > v_limits.daily_limit THEN
        RETURN QUERY SELECT
            false,
            GREATEST(0, v_limits.daily_limit - v_daily_used),
            v_limits.monthly_limit - v_monthly_used,
            false,
            FORMAT('Daily limit reached (%s/%s tokens). Resets at midnight UTC.', v_daily_used, v_limits.daily_limit);
        RETURN;
    END IF;

    -- Check monthly limit
    IF v_monthly_used + p_requested_tokens > v_limits.monthly_limit THEN
        RETURN QUERY SELECT
            false,
            v_limits.daily_limit - v_daily_used,
            GREATEST(0, v_limits.monthly_limit - v_monthly_used),
            false,
            FORMAT('Monthly limit reached (%s/%s tokens). Resets on the 1st.', v_monthly_used, v_limits.monthly_limit);
        RETURN;
    END IF;

    -- All checks passed
    RETURN QUERY SELECT
        true,
        v_limits.daily_limit - v_daily_used - p_requested_tokens,
        v_limits.monthly_limit - v_monthly_used - p_requested_tokens,
        false,
        NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UNLIMITED USER SETUP
-- ============================================================================

-- Function to grant unlimited access to a user by email
CREATE OR REPLACE FUNCTION public.grant_unlimited_access(p_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Find user by email
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = p_email;

    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;

    -- Insert or update limits
    INSERT INTO public.user_usage_limits (user_id, is_unlimited, daily_token_limit, monthly_token_limit)
    VALUES (v_user_id, true, 999999999, 999999999)
    ON CONFLICT (user_id)
    DO UPDATE SET is_unlimited = true, updated_at = NOW();

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant unlimited access to the specified admin email
-- This runs on migration but can be re-run if user signs up later
DO $$
BEGIN
    PERFORM public.grant_unlimited_access('reimutomonari@gmail.com');
END $$;

-- ============================================================================
-- TRIGGER: Auto-create usage limits for new users
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_user_usage_limits()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if this is the unlimited user
    IF NEW.email = 'reimutomonari@gmail.com' THEN
        INSERT INTO public.user_usage_limits (user_id, is_unlimited, daily_token_limit, monthly_token_limit)
        VALUES (NEW.id, true, 999999999, 999999999)
        ON CONFLICT (user_id) DO NOTHING;
    ELSE
        INSERT INTO public.user_usage_limits (user_id)
        VALUES (NEW.id)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created_usage_limits
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.create_user_usage_limits();

-- ============================================================================
-- CLEANUP: Remove old anonymous usage data (run periodically)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_anonymous_usage()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.anonymous_usage
    WHERE last_seen < NOW() - INTERVAL '7 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPSERT ANONYMOUS USAGE (for edge function)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.upsert_anonymous_usage(
    p_session_id TEXT,
    p_tokens INTEGER,
    p_date DATE
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.anonymous_usage (
        session_id,
        tokens_today,
        total_tokens,
        request_count,
        last_request_date,
        last_seen
    )
    VALUES (
        p_session_id,
        p_tokens,
        p_tokens,
        1,
        p_date,
        NOW()
    )
    ON CONFLICT (session_id) DO UPDATE SET
        tokens_today = CASE
            WHEN anonymous_usage.last_request_date = p_date
            THEN anonymous_usage.tokens_today + p_tokens
            ELSE p_tokens
        END,
        total_tokens = anonymous_usage.total_tokens + p_tokens,
        request_count = anonymous_usage.request_count + 1,
        last_request_date = p_date,
        last_seen = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================
CREATE OR REPLACE TRIGGER update_user_usage_limits_updated_at
    BEFORE UPDATE ON public.user_usage_limits
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
