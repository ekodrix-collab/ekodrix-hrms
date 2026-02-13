-- Refactor Expenses to remove category relation
-- Run this in Supabase SQL Editor

-- 1. Add 'category' text column to expenses
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS category TEXT;

-- 2. (Optional) If you want to keep existing data map it over (otherwise skip)
-- UPDATE public.expenses e SET category = ec.name FROM public.expense_categories ec WHERE e.category_id = ec.id;

-- 3. Drop the foreign key and the old column
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_category_id_fkey;
ALTER TABLE public.expenses DROP COLUMN IF EXISTS category_id;

-- 4. Drop the categories table
DROP TABLE IF EXISTS public.expense_categories;

-- 5. Drop the view that used the category relation
DROP VIEW IF EXISTS public.monthly_expense_summary;

-- 6. Re-create the view without the join
CREATE OR REPLACE VIEW public.monthly_expense_summary AS
SELECT 
    DATE_TRUNC('month', expense_date) as month,
    category as category_name,
    SUM(amount) as total_amount,
    COUNT(*) as transaction_count
FROM public.expenses
GROUP BY DATE_TRUNC('month', expense_date), category
ORDER BY month DESC, total_amount DESC;
