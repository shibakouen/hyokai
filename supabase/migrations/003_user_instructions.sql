-- User Instructions Migration
-- Creates table for saved custom instructions that users can append to transformed prompts

-- ============================================================================
-- USER INSTRUCTIONS (saved instruction templates)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_instructions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT user_instructions_name_length CHECK (char_length(name) <= 50),
    CONSTRAINT user_instructions_content_length CHECK (char_length(content) <= 2000)
);

-- Create index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_user_instructions_user_id ON public.user_instructions(user_id);

-- Create index for ordering by creation time
CREATE INDEX IF NOT EXISTS idx_user_instructions_created_at ON public.user_instructions(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.user_instructions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own instructions
CREATE POLICY "Users can view own instructions" ON public.user_instructions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own instructions" ON public.user_instructions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own instructions" ON public.user_instructions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own instructions" ON public.user_instructions
    FOR DELETE USING (auth.uid() = user_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_user_instructions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on changes
CREATE TRIGGER update_user_instructions_timestamp
    BEFORE UPDATE ON public.user_instructions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_instructions_updated_at();

-- Ensure only one instruction per user can be marked as default
CREATE OR REPLACE FUNCTION public.ensure_single_default_instruction()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE public.user_instructions
        SET is_default = false
        WHERE user_id = NEW.user_id
          AND id != NEW.id
          AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default
    BEFORE INSERT OR UPDATE ON public.user_instructions
    FOR EACH ROW
    WHEN (NEW.is_default = true)
    EXECUTE FUNCTION public.ensure_single_default_instruction();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.user_instructions IS 'Saved custom instructions that users can append to transformed prompts';
COMMENT ON COLUMN public.user_instructions.id IS 'Unique instruction ID';
COMMENT ON COLUMN public.user_instructions.user_id IS 'Owner user ID (references auth.users)';
COMMENT ON COLUMN public.user_instructions.name IS 'User-defined label for the instruction (max 50 chars)';
COMMENT ON COLUMN public.user_instructions.content IS 'The instruction text to append (max 2000 chars)';
COMMENT ON COLUMN public.user_instructions.is_default IS 'If true, this instruction is automatically selected for new transformations';
