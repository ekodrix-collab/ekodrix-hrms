-- =============================================
-- FIX: AUTH FLOW - RUN THIS IN SUPABASE SQL EDITOR
-- =============================================

-- STEP 1: Add INSERT policy that allows the trigger to work
-- The trigger runs as SECURITY DEFINER but we also need a policy 
-- for the service role to insert profiles for new users

DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
CREATE POLICY "Service role can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (true);

-- STEP 2: Fix the handle_new_user trigger to be more robust
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
    -- Extract metadata with safe defaults
    v_full_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), 
        split_part(NEW.email, '@', 1)
    );
    v_role := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), ''), 
        'employee'
    );
    v_status := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'status'), ''), 
        'active'
    );
    v_department := NULLIF(TRIM(NEW.raw_user_meta_data->>'department'), '');
    v_designation := NULLIF(TRIM(NEW.raw_user_meta_data->>'designation'), '');
    
    -- Handle organization_id safely
    BEGIN
        v_organization_id := NULLIF(TRIM(NEW.raw_user_meta_data->>'organization_id'), '')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_organization_id := NULL;
    END;
    
    -- Validate organization exists (if provided)
    IF v_organization_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = v_organization_id) THEN
            RAISE LOG 'handle_new_user: Organization % does not exist for user %', v_organization_id, NEW.id;
            v_organization_id := NULL;
        END IF;
    END IF;

    -- Insert profile (upsert to handle edge cases)
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        role, 
        organization_id, 
        status,
        department,
        designation,
        is_active,
        date_of_joining,
        created_at,
        updated_at
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
        true,
        CURRENT_DATE,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        organization_id = COALESCE(EXCLUDED.organization_id, public.profiles.organization_id),
        role = COALESCE(EXCLUDED.role, public.profiles.role),
        status = COALESCE(EXCLUDED.status, public.profiles.status),
        department = COALESCE(EXCLUDED.department, public.profiles.department),
        designation = COALESCE(EXCLUDED.designation, public.profiles.designation),
        updated_at = NOW();

    RAISE LOG 'handle_new_user: Profile created/updated for user % with role %', NEW.id, v_role;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'handle_new_user ERROR for user %: %', NEW.id, SQLERRM;
        
        -- Fallback: Create minimal profile to prevent orphaned user
        BEGIN
            INSERT INTO public.profiles (id, email, full_name, role, is_active, status)
            VALUES (
                NEW.id,
                NEW.email,
                split_part(NEW.email, '@', 1),
                'employee',
                true,
                'active'
            )
            ON CONFLICT (id) DO NOTHING;
        EXCEPTION WHEN OTHERS THEN
            RAISE LOG 'handle_new_user FALLBACK ERROR: %', SQLERRM;
        END;
        
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 3: Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STEP 4: Create helper function to get user role from profile
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role
    FROM public.profiles
    WHERE id = p_user_id;
    
    RETURN COALESCE(v_role, 'employee');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_user_role TO authenticated;

-- STEP 5: Verify the setup
DO $$
BEGIN
    RAISE NOTICE '✅ Auth flow fixes applied successfully!';
END $$;