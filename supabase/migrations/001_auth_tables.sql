-- Hyokai Auth Migration
-- Creates tables for user authentication and cloud sync

-- ============================================================================
-- USER PROFILES (extends auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT,
    avatar_url TEXT,
    migrated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, display_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- USER PREFERENCES (mode, language, model selection)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    mode TEXT DEFAULT 'coding',
    beginner_mode BOOLEAN DEFAULT true,
    language TEXT DEFAULT 'en',
    selected_model_index INTEGER DEFAULT 0,
    compare_model_indices INTEGER[] DEFAULT ARRAY[0, 1],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences" ON public.user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON public.user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON public.user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- SAVED CONTEXTS (max 10 per user)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.saved_contexts (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_saved_contexts_user_id ON public.saved_contexts(user_id);

ALTER TABLE public.saved_contexts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contexts" ON public.saved_contexts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own contexts" ON public.saved_contexts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contexts" ON public.saved_contexts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own contexts" ON public.saved_contexts
    FOR DELETE USING (auth.uid() = user_id);

-- Trigger to enforce max 10 contexts per user
CREATE OR REPLACE FUNCTION public.enforce_max_contexts()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM public.saved_contexts WHERE user_id = NEW.user_id) >= 10 THEN
        RAISE EXCEPTION 'Maximum of 10 saved contexts per user';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER check_max_contexts
    BEFORE INSERT ON public.saved_contexts
    FOR EACH ROW EXECUTE FUNCTION public.enforce_max_contexts();

-- ============================================================================
-- USER ACTIVE CONTEXT (current context tracker)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_active_context (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    context_id TEXT REFERENCES public.saved_contexts(id) ON DELETE SET NULL,
    current_content TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_active_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own active context" ON public.user_active_context
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own active context" ON public.user_active_context
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own active context" ON public.user_active_context
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- GITHUB CREDENTIALS (encrypted PAT)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.github_credentials (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    encrypted_pat TEXT NOT NULL,
    pat_username TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.github_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credentials" ON public.github_credentials
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own credentials" ON public.github_credentials
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credentials" ON public.github_credentials
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own credentials" ON public.github_credentials
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- GITHUB REPOS (max 5 per user)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.github_repos (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    owner TEXT NOT NULL,
    name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    default_branch TEXT DEFAULT 'main',
    last_refreshed TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, full_name)
);

CREATE INDEX idx_github_repos_user_id ON public.github_repos(user_id);

ALTER TABLE public.github_repos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own repos" ON public.github_repos
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own repos" ON public.github_repos
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own repos" ON public.github_repos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own repos" ON public.github_repos
    FOR DELETE USING (auth.uid() = user_id);

-- Trigger to enforce max 5 repos per user
CREATE OR REPLACE FUNCTION public.enforce_max_repos()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM public.github_repos WHERE user_id = NEW.user_id) >= 5 THEN
        RAISE EXCEPTION 'Maximum of 5 GitHub repos per user';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER check_max_repos
    BEFORE INSERT ON public.github_repos
    FOR EACH ROW EXECUTE FUNCTION public.enforce_max_repos();

-- ============================================================================
-- GITHUB REPO CACHE (tree/files cache)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.github_repo_cache (
    repo_id TEXT PRIMARY KEY REFERENCES public.github_repos(id) ON DELETE CASCADE,
    branch TEXT NOT NULL DEFAULT 'main',
    tree JSONB DEFAULT '[]'::jsonb,
    selected_paths TEXT[] DEFAULT ARRAY[]::TEXT[],
    file_contents JSONB DEFAULT '{}'::jsonb,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    summary TEXT,
    key_files JSONB
);

ALTER TABLE public.github_repo_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own repo cache" ON public.github_repo_cache
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.github_repos
            WHERE github_repos.id = github_repo_cache.repo_id
            AND github_repos.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own repo cache" ON public.github_repo_cache
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.github_repos
            WHERE github_repos.id = github_repo_cache.repo_id
            AND github_repos.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own repo cache" ON public.github_repo_cache
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.github_repos
            WHERE github_repos.id = github_repo_cache.repo_id
            AND github_repos.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own repo cache" ON public.github_repo_cache
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.github_repos
            WHERE github_repos.id = github_repo_cache.repo_id
            AND github_repos.user_id = auth.uid()
        )
    );

-- ============================================================================
-- GITHUB SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.github_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT false,
    auto_include_in_coding BOOLEAN DEFAULT false,
    max_context_tokens INTEGER DEFAULT 4000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.github_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own github settings" ON public.github_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own github settings" ON public.github_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own github settings" ON public.github_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- HISTORY ENTRIES (advanced mode, max 50 per user)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.history_entries (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    input TEXT NOT NULL,
    task_mode TEXT NOT NULL,
    result_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_history_entries_user_id ON public.history_entries(user_id);
CREATE INDEX idx_history_entries_timestamp ON public.history_entries(timestamp DESC);

ALTER TABLE public.history_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own history" ON public.history_entries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history" ON public.history_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own history" ON public.history_entries
    FOR DELETE USING (auth.uid() = user_id);

-- Trigger to enforce max 50 history entries per user (delete oldest)
CREATE OR REPLACE FUNCTION public.enforce_max_history()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.history_entries
    WHERE id IN (
        SELECT id FROM public.history_entries
        WHERE user_id = NEW.user_id
        ORDER BY timestamp DESC
        OFFSET 50
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trim_history_entries
    AFTER INSERT ON public.history_entries
    FOR EACH ROW EXECUTE FUNCTION public.enforce_max_history();

-- ============================================================================
-- SIMPLE HISTORY ENTRIES (beginner mode, max 30 per user)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.simple_history_entries (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    input TEXT NOT NULL,
    output TEXT NOT NULL,
    elapsed_time INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_simple_history_entries_user_id ON public.simple_history_entries(user_id);
CREATE INDEX idx_simple_history_entries_timestamp ON public.simple_history_entries(timestamp DESC);

ALTER TABLE public.simple_history_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own simple history" ON public.simple_history_entries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own simple history" ON public.simple_history_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own simple history" ON public.simple_history_entries
    FOR DELETE USING (auth.uid() = user_id);

-- Trigger to enforce max 30 simple history entries per user (delete oldest)
CREATE OR REPLACE FUNCTION public.enforce_max_simple_history()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.simple_history_entries
    WHERE id IN (
        SELECT id FROM public.simple_history_entries
        WHERE user_id = NEW.user_id
        ORDER BY timestamp DESC
        OFFSET 30
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trim_simple_history_entries
    AFTER INSERT ON public.simple_history_entries
    FOR EACH ROW EXECUTE FUNCTION public.enforce_max_simple_history();

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE OR REPLACE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_saved_contexts_updated_at
    BEFORE UPDATE ON public.saved_contexts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_user_active_context_updated_at
    BEFORE UPDATE ON public.user_active_context
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_github_credentials_updated_at
    BEFORE UPDATE ON public.github_credentials
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_github_repos_updated_at
    BEFORE UPDATE ON public.github_repos
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_github_settings_updated_at
    BEFORE UPDATE ON public.github_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
