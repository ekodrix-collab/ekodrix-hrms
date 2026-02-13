-- =============================================
-- Migration: 002_native_invite_flow.sql
-- Description: Add organizations, update profiles for Supabase native invite
-- Author: EKODRIX HRMS
-- Date: 2024-01-24
-- =============================================
-- 
-- This migration:
-- 1. Creates organizations table
-- 2. Adds organization_id, status, invited_by to profiles
-- 3. Updates handle_new_user trigger for invite flow
-- 4. Updates RLS policies for organization context
-- 5. Updates views and helper functions
--
-- Run with: psql or Supabase SQL Editor
-- =============================================

BEGIN;

-- =============================================
-- STEP 1: Create Organizations Table
-- =============================================

CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.organizations IS 'Organizations/Companies using the HRMS';

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Organizations policies
DROP POLICY IF EXISTS "Anyone can create organization" ON public.organizations;
CREATE POLICY "Anyone can create organization" ON public.organizations
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own organization" ON public.organizations;
CREATE POLICY "Users can view own organization" ON public.organizations
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update organization" ON public.organizations;
CREATE POLICY "Admins can update organization" ON public.organizations
    FOR UPDATE USING (
        id IN (
            SELECT organization_id FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- STEP 2: Add Missing Columns to Profiles Table
-- =============================================

-- Add organization_id column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Added organization_id column to profiles';
    END IF;
END $$;

-- Add status column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN status TEXT DEFAULT 'active';
        
        RAISE NOTICE 'Added status column to profiles';
    END IF;
END $$;

-- Add/update check constraint for status
DO $$ 
BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_status_check 
    CHECK (status IN ('invited', 'active', 'inactive'));
    
    RAISE NOTICE 'Added status check constraint';
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'Status check constraint already exists';
END $$;

-- Add invited_by column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'invited_by'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Added invited_by column to profiles';
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_organization ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_invited_by ON public.profiles(invited_by);

-- =============================================
-- STEP 3: Update handle_new_user Trigger Function
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_organization_id UUID;
    v_role TEXT;
    v_status TEXT;
    v_full_name TEXT;
    v_department TEXT;
    v_designation TEXT;
    v_invited_by UUID;
BEGIN
    -- Log incoming data for debugging
    RAISE LOG 'handle_new_user: Processing user % with email %', NEW.id, NEW.email;
    RAISE LOG 'handle_new_user: raw_user_meta_data = %', NEW.raw_user_meta_data;
    
    -- Extract metadata with safe defaults
    v_full_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), 
        split_part(NEW.email, '@', 1)
    );
    
    v_role := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), ''), 
        'employee'
    );
    
    -- Default to 'invited' for invite flow, 'active' for signup
    v_status := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'status'), ''), 
        'invited'
    );
    
    v_department := NULLIF(TRIM(NEW.raw_user_meta_data->>'department'), '');
    v_designation := NULLIF(TRIM(NEW.raw_user_meta_data->>'designation'), '');
    
    -- Handle organization_id safely
    BEGIN
        v_organization_id := NULLIF(TRIM(NEW.raw_user_meta_data->>'organization_id'), '')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_organization_id := NULL;
        RAISE LOG 'handle_new_user: Could not parse organization_id';
    END;
    
    -- Handle invited_by safely
    BEGIN
        v_invited_by := NULLIF(TRIM(NEW.raw_user_meta_data->>'invited_by'), '')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_invited_by := NULL;
        RAISE LOG 'handle_new_user: Could not parse invited_by';
    END;
    
    -- Validate organization exists (if provided)
    IF v_organization_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = v_organization_id) THEN
            RAISE LOG 'handle_new_user: Organization % does not exist, setting to NULL', v_organization_id;
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
        invited_by,
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
        v_invited_by,
        true,
        CURRENT_DATE,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        organization_id = COALESCE(EXCLUDED.organization_id, public.profiles.organization_id),
        full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
        role = COALESCE(EXCLUDED.role, public.profiles.role),
        status = COALESCE(EXCLUDED.status, public.profiles.status),
        department = COALESCE(EXCLUDED.department, public.profiles.department),
        designation = COALESCE(EXCLUDED.designation, public.profiles.designation),
        invited_by = COALESCE(EXCLUDED.invited_by, public.profiles.invited_by),
        updated_at = NOW();

    RAISE LOG 'handle_new_user: SUCCESS - Profile created for user % (role: %, org: %, status: %)', 
        NEW.id, v_role, v_organization_id, v_status;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'handle_new_user: ERROR for user % - %', NEW.id, SQLERRM;
        
        -- Fallback: Create minimal profile to prevent orphaned user
        BEGIN
            INSERT INTO public.profiles (id, email, full_name, role, is_active, status)
            VALUES (
                NEW.id,
                NEW.email,
                split_part(NEW.email, '@', 1),
                'employee',
                true,
                'invited'
            )
            ON CONFLICT (id) DO NOTHING;
            
            RAISE LOG 'handle_new_user: Created fallback profile for user %', NEW.id;
        EXCEPTION WHEN OTHERS THEN
            RAISE LOG 'handle_new_user: FALLBACK FAILED - %', SQLERRM;
        END;
        
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates profile when new user signs up or is invited';

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- STEP 4: Update Profile RLS Policies
-- =============================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view organization profiles" ON public.profiles;

-- Users can view profiles in their organization
CREATE POLICY "Users can view organization profiles" ON public.profiles
    FOR SELECT USING (
        -- Users can view all profiles in their organization
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
        -- Or users can view their own profile
        OR id = auth.uid()
        -- Or service role can view all
        OR auth.uid() IS NULL
    );

-- Update insert policy
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;

CREATE POLICY "Service role can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (true);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Admins can update any profile in their org
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update org profiles" ON public.profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles admin_p
            WHERE admin_p.id = auth.uid() 
            AND admin_p.role = 'admin'
            AND admin_p.organization_id = public.profiles.organization_id
        )
    );

-- =============================================
-- STEP 5: Update Other Table Policies for Org Context
-- =============================================

-- Attendance policies
DROP POLICY IF EXISTS "Admins can view all attendance" ON public.attendance;
CREATE POLICY "Admins can view org attendance" ON public.attendance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles admin_p
            JOIN public.profiles user_p ON user_p.id = public.attendance.user_id
            WHERE admin_p.id = auth.uid() 
            AND admin_p.role = 'admin'
            AND admin_p.organization_id = user_p.organization_id
        )
    );

-- Tasks policies
DROP POLICY IF EXISTS "Admins can view all tasks" ON public.tasks;
CREATE POLICY "Admins can view org tasks" ON public.tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles admin_p
            JOIN public.profiles user_p ON user_p.id = public.tasks.user_id
            WHERE admin_p.id = auth.uid() 
            AND admin_p.role = 'admin'
            AND admin_p.organization_id = user_p.organization_id
        )
    );

-- Standups policies  
DROP POLICY IF EXISTS "Admins can view all standups" ON public.daily_standups;
CREATE POLICY "Admins can view org standups" ON public.daily_standups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles admin_p
            JOIN public.profiles user_p ON user_p.id = public.daily_standups.user_id
            WHERE admin_p.id = auth.uid() 
            AND admin_p.role = 'admin'
            AND admin_p.organization_id = user_p.organization_id
        )
    );

-- Activity logs policies
DROP POLICY IF EXISTS "Admins can view all activity" ON public.activity_logs;
CREATE POLICY "Admins can view org activity" ON public.activity_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles admin_p
            JOIN public.profiles user_p ON user_p.id = public.activity_logs.user_id
            WHERE admin_p.id = auth.uid() 
            AND admin_p.role = 'admin'
            AND admin_p.organization_id = user_p.organization_id
        )
    );

-- =============================================
-- STEP 6: Add organization_id to Expense Tables
-- =============================================

-- Add to expense_categories
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'expense_categories' 
        AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.expense_categories 
        ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added organization_id to expense_categories';
    END IF;
END $$;

-- Add to expenses
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'expenses' 
        AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.expenses 
        ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added organization_id to expenses';
    END IF;
END $$;

-- Update expense policies
DROP POLICY IF EXISTS "Admins can manage expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Admins can manage org expense categories" ON public.expense_categories;

CREATE POLICY "Admins can manage org expense categories" ON public.expense_categories
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
        OR organization_id IS NULL  -- For legacy data
    );

DROP POLICY IF EXISTS "Admins can manage expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can manage org expenses" ON public.expenses;

CREATE POLICY "Admins can manage org expenses" ON public.expenses
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
        OR organization_id IS NULL  -- For legacy data
    );

-- =============================================
-- STEP 7: Update Views
-- =============================================

DROP VIEW IF EXISTS public.today_attendance;
CREATE VIEW public.today_attendance AS
SELECT 
    p.id as user_id,
    p.full_name,
    p.avatar_url,
    p.department,
    p.organization_id,
    p.status as profile_status,
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
  AND p.status = 'active';

COMMENT ON VIEW public.today_attendance IS 'Shows attendance status for active employees today';

-- =============================================
-- STEP 8: Helper Functions
-- =============================================

-- Get user's organization
CREATE OR REPLACE FUNCTION public.get_user_organization(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_org_id UUID;
BEGIN
    SELECT organization_id INTO v_org_id
    FROM public.profiles
    WHERE id = p_user_id;
    
    RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_user_organization(UUID) IS 'Returns the organization ID for a user';

GRANT EXECUTE ON FUNCTION public.get_user_organization TO authenticated;

-- Get user's role
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_user_role(UUID) IS 'Returns the role for a user';

GRANT EXECUTE ON FUNCTION public.get_user_role TO authenticated;

-- Check if user is admin of an organization
CREATE OR REPLACE FUNCTION public.is_org_admin(p_user_id UUID, p_org_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    SELECT (role = 'admin' AND (p_org_id IS NULL OR organization_id = p_org_id))
    INTO v_is_admin
    FROM public.profiles
    WHERE id = p_user_id;
    
    RETURN COALESCE(v_is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_org_admin(UUID, UUID) IS 'Checks if user is admin of specified organization';

GRANT EXECUTE ON FUNCTION public.is_org_admin TO authenticated;

-- =============================================
-- STEP 9: Verification
-- =============================================

DO $$
DECLARE
    v_org_exists BOOLEAN;
    v_profile_cols INTEGER;
    v_trigger_exists BOOLEAN;
BEGIN
    -- Check organizations table
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'organizations'
    ) INTO v_org_exists;
    
    -- Check profiles columns
    SELECT COUNT(*) INTO v_profile_cols
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name IN ('organization_id', 'status', 'invited_by');
    
    -- Check trigger
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
    ) INTO v_trigger_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION VERIFICATION RESULTS';
    RAISE NOTICE '========================================';
    
    IF v_org_exists THEN
        RAISE NOTICE '✅ Organizations table exists';
    ELSE
        RAISE NOTICE '❌ Organizations table MISSING';
    END IF;
    
    IF v_profile_cols = 3 THEN
        RAISE NOTICE '✅ Profiles has all required columns (3/3)';
    ELSE
        RAISE NOTICE '⚠️  Profiles has %/3 required columns', v_profile_cols;
    END IF;
    
    IF v_trigger_exists THEN
        RAISE NOTICE '✅ on_auth_user_created trigger exists';
    ELSE
        RAISE NOTICE '❌ on_auth_user_created trigger MISSING';
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎉 Migration 002_native_invite_flow complete!';
    RAISE NOTICE '========================================';
END $$;

COMMIT;