-- Migration: Add Manual Overrides and Payment Tracking to Employee Shares
-- Date: 2026-03-12

ALTER TABLE project_employee_share
ADD COLUMN IF NOT EXISTS is_manual_override BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS manual_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL;
