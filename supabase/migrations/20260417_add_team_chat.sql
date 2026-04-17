CREATE TABLE IF NOT EXISTS public.team_chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT team_chat_messages_content_check CHECK (char_length(trim(content)) > 0)
);

ALTER TABLE public.team_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organization members can view team chat messages" ON public.team_chat_messages;
CREATE POLICY "Organization members can view team chat messages"
    ON public.team_chat_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.profiles me
            WHERE me.id = auth.uid()
              AND (
                  me.organization_id = public.team_chat_messages.organization_id
                  OR (me.organization_id IS NULL AND public.team_chat_messages.organization_id IS NULL)
              )
        )
    );

DROP POLICY IF EXISTS "Users can send team chat messages" ON public.team_chat_messages;
CREATE POLICY "Users can send team chat messages"
    ON public.team_chat_messages
    FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1
            FROM public.profiles me
            WHERE me.id = auth.uid()
              AND (
                  me.organization_id = public.team_chat_messages.organization_id
                  OR (me.organization_id IS NULL AND public.team_chat_messages.organization_id IS NULL)
              )
        )
    );

CREATE INDEX IF NOT EXISTS idx_team_chat_messages_org_created
    ON public.team_chat_messages(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_chat_messages_sender_created
    ON public.team_chat_messages(sender_id, created_at DESC);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'team_chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.team_chat_messages;
    END IF;
END $$;
