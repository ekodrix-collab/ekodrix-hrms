-- Migration: Fix Ledger Visibility for Company Treasury
-- Created: 2026-04-02

-- 1. Extend transaction_type enum to include 'company_profit'
-- Note: PostgreSQL doesn't allow adding values to an enum inside a transaction easily (unless it's the same transaction that created it).
-- However, we can use ALTER TYPE.
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'company_profit';

-- 2. Add ledger_source and ledger_visibility to expenses
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS ledger_source TEXT CHECK (ledger_source IN ('project', 'company')),
ADD COLUMN IF NOT EXISTS ledger_visibility TEXT CHECK (ledger_visibility IN ('company', 'project_only'));

-- 3. Add ledger_source and ledger_visibility to revenue_logs
ALTER TABLE public.revenue_logs 
ADD COLUMN IF NOT EXISTS ledger_source TEXT CHECK (ledger_source IN ('project', 'company')),
ADD COLUMN IF NOT EXISTS ledger_visibility TEXT CHECK (ledger_visibility IN ('company', 'project_only'));

-- 4. Initial Migration of Existing Data for revenue_logs
-- Project revenues
UPDATE public.revenue_logs
SET ledger_source = 'project',
    ledger_visibility = 'project_only'
WHERE project_id IS NOT NULL AND ledger_source IS NULL;

-- General company revenues
UPDATE public.revenue_logs
SET ledger_source = 'company',
    ledger_visibility = 'company'
WHERE project_id IS NULL AND ledger_source IS NULL;

-- 5. Initial Migration of Existing Data for expenses
-- Project distributions (Shares, Broker fees)
UPDATE public.expenses
SET ledger_source = 'project',
    ledger_visibility = 'project_only'
WHERE project_id IS NOT NULL 
  AND category IN ('Project Share', 'Commision / Broker')
  AND ledger_source IS NULL;

-- Project direct expenses
UPDATE public.expenses
SET ledger_source = 'project',
    ledger_visibility = 'project_only'
WHERE project_id IS NOT NULL 
  AND category NOT IN ('Project Share', 'Commision / Broker')
  AND ledger_source IS NULL;

-- General company expenses (including Salary)
UPDATE public.expenses
SET ledger_source = 'company',
    ledger_visibility = 'company'
WHERE project_id IS NULL AND ledger_source IS NULL;

-- 6. SPECIAL CASE: Company Profit Payouts
-- These should be visible in company treasury.
UPDATE public.expenses
SET ledger_source = 'project',
    transaction_type = 'company_profit',
    ledger_visibility = 'company'
WHERE description LIKE '%Company Profit Payout%'
   OR description LIKE '%Company Profit distributed%';

-- 7. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_ledger_visibility ON public.expenses(ledger_visibility);
CREATE INDEX IF NOT EXISTS idx_revenue_ledger_visibility ON public.revenue_logs(ledger_visibility);
CREATE INDEX IF NOT EXISTS idx_expenses_ledger_source ON public.expenses(ledger_source);
CREATE INDEX IF NOT EXISTS idx_revenue_ledger_source ON public.revenue_logs(ledger_source);
