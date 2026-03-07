-- =============================================
-- Add project team membership table
-- =============================================

CREATE TABLE IF NOT EXISTS public.project_team_members (
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_team_members_user
    ON public.project_team_members(user_id);

ALTER TABLE public.project_team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view relevant project team membership" ON public.project_team_members;
CREATE POLICY "Users can view relevant project team membership" ON public.project_team_members
    FOR SELECT USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
        OR EXISTS (
            SELECT 1 FROM public.projects pr
            WHERE pr.id = project_id
              AND pr.project_manager_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can manage project team membership" ON public.project_team_members;
CREATE POLICY "Admins can manage project team membership" ON public.project_team_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

