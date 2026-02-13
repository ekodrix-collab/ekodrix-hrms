-- =============================================
-- AUTH SYSTEM MIGRATION (FIXED ORDER)
-- =============================================

-- STEP 1: Create Organizations Table FIRST (without policies)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- STEP 2: Add columns to Profiles table BEFORE creating policies
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add check constraint separately (avoids issues if column exists)
DO $$ 
BEGIN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_status_check 
    CHECK (status IN ('invited', 'active', 'inactive'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_organization ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- STEP 3: NOW create Organizations policies (after organization_id exists in profiles)
DROP POLICY IF EXISTS "Anyone can create organization" ON public.organizations;
CREATE POLICY "Anyone can create organization" ON public.organizations
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own organization" ON public.organizations;
CREATE POLICY "Users can view own organization" ON public.organizations
    FOR SELECT USING (
        id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        OR auth.uid() IS NULL
    );

DROP POLICY IF EXISTS "Admins can update organization" ON public.organizations;
CREATE POLICY "Admins can update organization" ON public.organizations
    FOR UPDATE USING (
        id IN (
            SELECT organization_id FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- STEP 4: Create Invitations Table
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    department TEXT,
    designation TEXT,
    role TEXT DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
    token TEXT UNIQUE NOT NULL,
    invited_by UUID REFERENCES public.profiles(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- STEP 5: Invitations Policies
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.invitations;
CREATE POLICY "Admins can manage invitations" ON public.invitations
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.invitations;
CREATE POLICY "Anyone can view invitation by token" ON public.invitations
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can update invitation status" ON public.invitations;
CREATE POLICY "Anyone can update invitation status" ON public.invitations
    FOR UPDATE USING (true)
    WITH CHECK (status IN ('accepted', 'expired'));

-- Indexes for invitations
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_org ON public.invitations(organization_id);

-- STEP 6: Updated handle_new_user Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_organization_id UUID;
    v_role TEXT;
    v_status TEXT;
    v_full_name TEXT;
    v_department TEXT;
    v_designation TEXT;
BEGIN
    -- Safely extract metadata
    v_organization_id := NULLIF(NEW.raw_user_meta_data->>'organization_id', '')::UUID;
    v_role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'employee');
    v_status := COALESCE(NULLIF(NEW.raw_user_meta_data->>'status', ''), 'active');
    v_full_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1));
    v_department := NULLIF(NEW.raw_user_meta_data->>'department', '');
    v_designation := NULLIF(NEW.raw_user_meta_data->>'designation', '');
    
    -- Validate organization exists (if provided)
    IF v_organization_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = v_organization_id) THEN
            RAISE WARNING 'Organization % does not exist, setting to NULL', v_organization_id;
            v_organization_id := NULL;
        END IF;
    END IF;

    -- Insert profile
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        role, 
        organization_id, 
        status,
        department,
        designation,
        is_active
    )
    VALUES (
        NEW.id,
        NEW.email,
        v_full_name,
        v_role,
        v_organization_id,
        v_status,
        v_department,
        v_designation,
        true
    )
    ON CONFLICT (id) DO UPDATE SET
        organization_id = COALESCE(EXCLUDED.organization_id, public.profiles.organization_id),
        status = EXCLUDED.status,
        department = COALESCE(EXCLUDED.department, public.profiles.department),
        designation = COALESCE(EXCLUDED.designation, public.profiles.designation),
        updated_at = NOW();

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        
        -- Create minimal profile to prevent orphaned user
        INSERT INTO public.profiles (id, email, full_name, role, is_active)
        VALUES (
            NEW.id,
            NEW.email,
            split_part(NEW.email, '@', 1),
            'employee',
            true
        )
        ON CONFLICT (id) DO NOTHING;
        
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 7: Helper Functions
CREATE OR REPLACE FUNCTION public.create_organization_with_admin(
    p_org_name TEXT,
    p_org_slug TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_org_id UUID;
BEGIN
    INSERT INTO public.organizations (name, slug)
    VALUES (p_org_name, p_org_slug)
    RETURNING id INTO v_org_id;
    
    RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.link_user_to_organization(
    p_user_id UUID,
    p_organization_id UUID,
    p_role TEXT DEFAULT 'admin'
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.profiles
    SET 
        organization_id = p_organization_id,
        role = p_role,
        status = 'active',
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.accept_invitation(
    p_token TEXT,
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_invitation RECORD;
BEGIN
    SELECT * INTO v_invitation
    FROM public.invitations
    WHERE token = p_token 
      AND status = 'pending'
      AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
    END IF;
    
    UPDATE public.profiles
    SET 
        organization_id = v_invitation.organization_id,
        department = COALESCE(v_invitation.department, department),
        designation = COALESCE(v_invitation.designation, designation),
        role = COALESCE(v_invitation.role, 'employee'),
        status = 'active',
        invited_by = v_invitation.invited_by,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    UPDATE public.invitations
    SET 
        status = 'accepted',
        accepted_at = NOW()
    WHERE id = v_invitation.id;
    
    RETURN jsonb_build_object(
        'success', true, 
        'organization_id', v_invitation.organization_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 8: Updated View
DROP VIEW IF EXISTS public.today_attendance;
CREATE VIEW public.today_attendance AS
SELECT 
    p.id as user_id,
    p.full_name,
    p.avatar_url,
    p.department,
    p.organization_id,
    a.punch_in,
    a.punch_out,
    a.total_hours,
    CASE 
        WHEN a.punch_in IS NOT NULL AND a.punch_out IS NULL THEN 'working'
        WHEN a.punch_in IS NOT NULL AND a.punch_out IS NOT NULL THEN 'completed'
        ELSE 'not_started'
    END as work_status
FROM public.profiles p
LEFT JOIN public.attendance a ON p.id = a.user_id AND a.date = CURRENT_DATE
WHERE p.is_active = true 
  AND p.role = 'employee' 
  AND COALESCE(p.status, 'active') = 'active';

-- STEP 9: Trigger for updated_at
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- STEP 10: Grant permissions
GRANT EXECUTE ON FUNCTION public.create_organization_with_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_organization_with_admin TO anon;
GRANT EXECUTE ON FUNCTION public.link_user_to_organization TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation TO authenticated;

-- STEP 11: Verify setup
DO $$
BEGIN
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE 'Tables created: organizations, invitations';
    RAISE NOTICE 'Columns added to profiles: organization_id, status, invited_by';
    RAISE NOTICE 'Functions created: create_organization_with_admin, link_user_to_organization, accept_invitation';
END $$;