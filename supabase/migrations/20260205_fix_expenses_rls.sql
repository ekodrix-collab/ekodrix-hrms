-- FIX: RLS Policy for Expenses
-- Run this in Supabase SQL Editor

-- 1. Drop the old policy (it might be too restrictive or malformed)
DROP POLICY IF EXISTS "Admins can manage expenses" ON public.expenses;

-- 2. Create a new, explicit policy for Admins
CREATE POLICY "Admins can manage expenses" ON public.expenses
    FOR ALL 
    USING (
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

-- 3. (Optional) Allow Employees to VIEW (SELECT) expenses if needed (e.g. for transparency)
CREATE POLICY "Everyone can view expenses" ON public.expenses
    FOR SELECT USING (true);
