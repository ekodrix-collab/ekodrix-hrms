-- Migration: Total Removal of Cycles from Project Finance
-- Created: 2026-03-28

-- 1. Deduplicate project_profit_distribution (Keep only one per project)
DELETE FROM public.project_profit_distribution a
WHERE ctid NOT IN (
  SELECT min(ctid)
  FROM public.project_profit_distribution
  GROUP BY project_id
);

-- 2. Deduplicate project_employee_share (Keep only one per project/employee)
DELETE FROM public.project_employee_share a
WHERE ctid NOT IN (
  SELECT min(ctid)
  FROM public.project_employee_share
  GROUP BY project_id, employee_id
);

-- 3. Modify project_profit_distribution
ALTER TABLE public.project_profit_distribution 
DROP COLUMN IF EXISTS cycle_number;

ALTER TABLE public.project_profit_distribution 
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS net_profit_snapshot NUMERIC DEFAULT 0;

-- Update existing data to be locked
UPDATE public.project_profit_distribution 
SET is_locked = true, 
    net_profit_snapshot = net_profit_pool;

-- Add UNIQUE constraint for project_id only
ALTER TABLE public.project_profit_distribution 
DROP CONSTRAINT IF EXISTS project_profit_distribution_project_id_key,
DROP CONSTRAINT IF EXISTS project_profit_distribution_project_id_cycle_number_key;

ALTER TABLE public.project_profit_distribution 
ADD CONSTRAINT project_profit_distribution_project_id_key 
UNIQUE (project_id);

-- 4. Modify project_employee_share
ALTER TABLE public.project_employee_share 
DROP COLUMN IF EXISTS cycle_number;

ALTER TABLE public.project_employee_share 
ADD COLUMN IF NOT EXISTS paid_status BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Add UNIQUE constraint for project_id and employee_id
ALTER TABLE public.project_employee_share 
DROP CONSTRAINT IF EXISTS project_employee_share_project_id_employee_id_key,
DROP CONSTRAINT IF EXISTS project_employee_share_project_id_employee_id_cycle_number_key;

ALTER TABLE public.project_employee_share 
ADD CONSTRAINT project_employee_share_project_id_employee_id_key 
UNIQUE (project_id, employee_id);
