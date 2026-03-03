-- Migration: Document Vault for Project Credentials and Shared Assets
-- Created: 2026-03-02

-- 1) Vaults (project-specific + organization common vault)
CREATE TABLE IF NOT EXISTS public.project_vaults (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    vault_scope TEXT NOT NULL DEFAULT 'project' CHECK (vault_scope IN ('project', 'common')),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT project_vault_scope_guard CHECK (
        (vault_scope = 'project' AND project_id IS NOT NULL)
        OR
        (vault_scope = 'common' AND project_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_project_vaults_org ON public.project_vaults(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_vaults_project ON public.project_vaults(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_project_vault_per_project
    ON public.project_vaults(project_id)
    WHERE project_id IS NOT NULL AND vault_scope = 'project';
CREATE UNIQUE INDEX IF NOT EXISTS uniq_common_vault_per_org
    ON public.project_vaults(organization_id)
    WHERE vault_scope = 'common';

-- 2) Vault Members (access grants)
CREATE TABLE IF NOT EXISTS public.project_vault_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vault_id UUID NOT NULL REFERENCES public.project_vaults(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    can_edit BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(vault_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_vault_members_vault ON public.project_vault_members(vault_id);
CREATE INDEX IF NOT EXISTS idx_project_vault_members_user ON public.project_vault_members(user_id);

-- 3) Vault Entries (credentials, notes, image/file references)
CREATE TABLE IF NOT EXISTS public.project_vault_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vault_id UUID NOT NULL REFERENCES public.project_vaults(id) ON DELETE CASCADE,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('credential', 'shared_note', 'image', 'file')),
    title TEXT NOT NULL,
    platform TEXT,
    username TEXT,
    secret TEXT,
    url TEXT,
    details TEXT,
    attachment_url TEXT,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_vault_entries_vault ON public.project_vault_entries(vault_id);
CREATE INDEX IF NOT EXISTS idx_project_vault_entries_vault_created ON public.project_vault_entries(vault_id, created_at DESC);

-- 4) RLS
ALTER TABLE public.project_vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_vault_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_vault_entries ENABLE ROW LEVEL SECURITY;

-- 4.1) Helper functions to avoid policy recursion across vault tables
-- IMPORTANT: SECURITY DEFINER is used intentionally so these checks do not
-- recursively trigger RLS on the same relations.
CREATE OR REPLACE FUNCTION public.is_admin_for_org(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles me
        WHERE me.id = p_user_id
          AND me.role = 'admin'
          AND (me.organization_id = p_org_id OR p_org_id IS NULL)
    );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_for_vault(p_vault_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.project_vaults v
        JOIN public.profiles me ON me.id = p_user_id
        WHERE v.id = p_vault_id
          AND me.role = 'admin'
          AND (me.organization_id = v.organization_id OR v.organization_id IS NULL)
    );
$$;

CREATE OR REPLACE FUNCTION public.is_vault_member(p_vault_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.project_vault_members vm
        WHERE vm.vault_id = p_vault_id
          AND vm.user_id = p_user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_vault(p_vault_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        public.is_admin_for_vault(p_vault_id, p_user_id)
        OR EXISTS (
            SELECT 1
            FROM public.project_vault_members vm
            WHERE vm.vault_id = p_vault_id
              AND vm.user_id = p_user_id
              AND vm.can_edit = TRUE
        );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_for_org(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_for_vault(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_vault_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_vault(UUID, UUID) TO authenticated;

-- Vault policies
DROP POLICY IF EXISTS "Vault members and admins can view vaults" ON public.project_vaults;
CREATE POLICY "Vault members and admins can view vaults" ON public.project_vaults
    FOR SELECT USING (
        public.is_admin_for_vault(public.project_vaults.id, auth.uid())
        OR public.is_vault_member(public.project_vaults.id, auth.uid())
    );

DROP POLICY IF EXISTS "Admins can create vaults" ON public.project_vaults;
CREATE POLICY "Admins can create vaults" ON public.project_vaults
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.profiles me
            WHERE me.id = auth.uid()
              AND me.role = 'admin'
              AND (
                    me.organization_id = public.project_vaults.organization_id
                    OR (
                        me.organization_id IS NULL
                        AND public.project_vaults.organization_id IS NULL
                    )
              )
        )
    );

DROP POLICY IF EXISTS "Admins can update vaults" ON public.project_vaults;
CREATE POLICY "Admins can update vaults" ON public.project_vaults
    FOR UPDATE USING (
        public.is_admin_for_vault(public.project_vaults.id, auth.uid())
    );

DROP POLICY IF EXISTS "Admins can delete vaults" ON public.project_vaults;
CREATE POLICY "Admins can delete vaults" ON public.project_vaults
    FOR DELETE USING (
        public.is_admin_for_vault(public.project_vaults.id, auth.uid())
    );

-- Vault member policies
DROP POLICY IF EXISTS "Users can view own vault membership and admins can view all" ON public.project_vault_members;
CREATE POLICY "Users can view own vault membership and admins can view all" ON public.project_vault_members
    FOR SELECT USING (
        user_id = auth.uid()
        OR public.is_admin_for_vault(public.project_vault_members.vault_id, auth.uid())
    );

DROP POLICY IF EXISTS "Admins can manage vault members" ON public.project_vault_members;
CREATE POLICY "Admins can manage vault members" ON public.project_vault_members
    FOR ALL USING (
        public.is_admin_for_vault(public.project_vault_members.vault_id, auth.uid())
    )
    WITH CHECK (
        public.is_admin_for_vault(public.project_vault_members.vault_id, auth.uid())
    );

-- Vault entry policies
DROP POLICY IF EXISTS "Vault members and admins can view entries" ON public.project_vault_entries;
CREATE POLICY "Vault members and admins can view entries" ON public.project_vault_entries
    FOR SELECT USING (
        public.is_admin_for_vault(public.project_vault_entries.vault_id, auth.uid())
        OR public.is_vault_member(public.project_vault_entries.vault_id, auth.uid())
    );

DROP POLICY IF EXISTS "Editors and admins can insert entries" ON public.project_vault_entries;
CREATE POLICY "Editors and admins can insert entries" ON public.project_vault_entries
    FOR INSERT WITH CHECK (
        public.can_edit_vault(public.project_vault_entries.vault_id, auth.uid())
    );

DROP POLICY IF EXISTS "Editors and admins can update entries" ON public.project_vault_entries;
CREATE POLICY "Editors and admins can update entries" ON public.project_vault_entries
    FOR UPDATE USING (
        public.can_edit_vault(public.project_vault_entries.vault_id, auth.uid())
    );

DROP POLICY IF EXISTS "Editors and admins can delete entries" ON public.project_vault_entries;
CREATE POLICY "Editors and admins can delete entries" ON public.project_vault_entries
    FOR DELETE USING (
        public.can_edit_vault(public.project_vault_entries.vault_id, auth.uid())
    );

-- 5) updated_at triggers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_project_vaults_updated_at') THEN
        CREATE TRIGGER update_project_vaults_updated_at
            BEFORE UPDATE ON public.project_vaults
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_project_vault_members_updated_at') THEN
        CREATE TRIGGER update_project_vault_members_updated_at
            BEFORE UPDATE ON public.project_vault_members
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_project_vault_entries_updated_at') THEN
        CREATE TRIGGER update_project_vault_entries_updated_at
            BEFORE UPDATE ON public.project_vault_entries
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;
