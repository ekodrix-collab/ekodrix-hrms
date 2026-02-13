-- Add status and receipt_url to expenses table
-- Run this in Supabase SQL Editor

-- 1. Add status column with default 'pending'
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'
CHECK (status IN ('pending', 'approved', 'rejected', 'paid'));

-- 2. Add receipt_url column for attachments
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- 3. Add rejection_reason column for feedback
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 4. Update RLS policies to allow employees to insert their own expenses
DROP POLICY IF EXISTS "Employees can insert own expenses" ON public.expenses;
CREATE POLICY "Employees can insert own expenses" ON public.expenses
    FOR INSERT 
    WITH CHECK (auth.uid() = paid_by);

-- 5. Update RLS to allow employees to see their own expenses
DROP POLICY IF EXISTS "Employees can view own expenses" ON public.expenses;
CREATE POLICY "Employees can view own expenses" ON public.expenses
    FOR SELECT
    USING (auth.uid() = paid_by OR 
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
