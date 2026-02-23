-- =============================================
-- FIX TASK DEPLOYMENT (Marketplace & RLS)
-- =============================================

-- 1. DROP NOT NULL from user_id to allow Marketplace tasks
ALTER TABLE public.tasks ALTER COLUMN user_id DROP NOT NULL;

-- 2. Update RLS policies to be more explicit for Marketplace/Admin operations
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can view all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can manage own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can create tasks for employees" ON public.tasks;
DROP POLICY IF EXISTS "Admins can update any task" ON public.tasks;

-- Select policy
CREATE POLICY "Anyone can view open tasks" ON public.tasks
    FOR SELECT USING (
        (auth.uid() = user_id) OR 
        (is_open_assignment = true AND assignment_status = 'open') OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Insert policy
CREATE POLICY "Users can create own tasks" ON public.tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can create any task" ON public.tasks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Update policy
CREATE POLICY "Users can update own tasks" ON public.tasks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any task" ON public.tasks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Delete policy
CREATE POLICY "Users can delete own tasks" ON public.tasks
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any task" ON public.tasks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
