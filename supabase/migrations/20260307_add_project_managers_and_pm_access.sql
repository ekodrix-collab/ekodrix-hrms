-- =============================================
-- Add project-level Project Manager assignment
-- and scoped access for project/task management
-- =============================================

-- 1) Add project_manager_id on projects
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS project_manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_project_manager_id
    ON public.projects(project_manager_id);

-- 2) Helper function: whether a user is PM of a project
CREATE OR REPLACE FUNCTION public.is_project_manager(
    p_project_id UUID,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id = p_project_id
          AND p.project_manager_id = p_user_id
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_project_manager(UUID, UUID) TO authenticated;

-- 3) Project RLS: scoped visibility + admin management
DROP POLICY IF EXISTS "Anyone can view projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view relevant projects" ON public.projects;

CREATE POLICY "Users can view relevant projects" ON public.projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.profiles me
            WHERE me.id = auth.uid()
              AND me.role = 'admin'
        )
        OR public.projects.project_manager_id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.tasks t
            WHERE t.project_id = public.projects.id
              AND t.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can manage projects" ON public.projects;
CREATE POLICY "Admins can manage projects" ON public.projects
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 4) Task RLS: allow PM management in assigned projects only
DROP POLICY IF EXISTS "Anyone can view open tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can create any task" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can update any task" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can delete any task" ON public.tasks;

CREATE POLICY "Users can view open tasks" ON public.tasks
    FOR SELECT USING (
        auth.uid() = user_id
        OR (is_open_assignment = true AND assignment_status = 'open')
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
        OR (
            project_id IS NOT NULL
            AND public.is_project_manager(project_id, auth.uid())
        )
    );

CREATE POLICY "Users can create own tasks" ON public.tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can create any task" ON public.tasks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Project managers can create project tasks" ON public.tasks
    FOR INSERT WITH CHECK (
        project_id IS NOT NULL
        AND public.is_project_manager(project_id, auth.uid())
    );

CREATE POLICY "Users can update own tasks" ON public.tasks
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any task" ON public.tasks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Project managers can update project tasks" ON public.tasks
    FOR UPDATE USING (
        project_id IS NOT NULL
        AND public.is_project_manager(project_id, auth.uid())
    )
    WITH CHECK (
        project_id IS NOT NULL
        AND public.is_project_manager(project_id, auth.uid())
    );

CREATE POLICY "Users can delete own tasks" ON public.tasks
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any task" ON public.tasks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Project managers can delete project tasks" ON public.tasks
    FOR DELETE USING (
        project_id IS NOT NULL
        AND public.is_project_manager(project_id, auth.uid())
    );
