-- Migration: Add employee_id to expenses for salary tracking
-- Created: 2026-03-10

-- 1. Add employee_id column to expenses
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_expenses_employee ON public.expenses(employee_id);

-- 3. Update RLS to allow admins to manage this new column (already covered by existing 'Admins can manage' policies usually, but good to ensure)
-- Existing policies in 20240204_add_finance_module.sql and 20260213_add_expense_status.sql should cover this.
