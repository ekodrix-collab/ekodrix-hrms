CREATE TABLE IF NOT EXISTS public.team_chat_reads (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.team_chat_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own team chat read state" ON public.team_chat_reads;
CREATE POLICY "Users can view own team chat read state"
    ON public.team_chat_reads
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own team chat read state" ON public.team_chat_reads;
CREATE POLICY "Users can insert own team chat read state"
    ON public.team_chat_reads
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own team chat read state" ON public.team_chat_reads;
CREATE POLICY "Users can update own team chat read state"
    ON public.team_chat_reads
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_team_chat_reads_updated_at ON public.team_chat_reads;
CREATE TRIGGER update_team_chat_reads_updated_at
    BEFORE UPDATE ON public.team_chat_reads
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
