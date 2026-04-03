-- Migration: Add Transaction Types to Finance Module
-- Created: 2026-03-28

-- 1. Create Transaction Type Enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE transaction_type AS ENUM ('revenue', 'expense', 'distribution', 'payout');
    ELSE
        -- Update existing enum if it exists but is missing 'distribution'
        ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'distribution';
        ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'payout';
    END IF;
END $$;

-- 2. Add transaction_type to expenses
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS transaction_type transaction_type DEFAULT 'expense';

-- 3. Add transaction_type to revenue_logs
ALTER TABLE public.revenue_logs ADD COLUMN IF NOT EXISTS transaction_type transaction_type DEFAULT 'revenue';

-- 4. Initial Migration of Existing Data
-- Expenses: 
-- Categories 'Project Share' and 'Commision / Broker' should be 'payout'
UPDATE public.expenses 
SET transaction_type = 'payout' 
WHERE category IN ('Project Share', 'Commision / Broker');

-- 5. Add Payment Tracking for Distributions
ALTER TABLE public.project_profit_distribution 
ADD COLUMN IF NOT EXISTS is_broker_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS broker_paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_company_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS company_paid_at TIMESTAMPTZ;
