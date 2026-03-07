-- Migration: Add contract_amount to projects for tracking total contract value
-- Created: 2026-03-07

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contract_amount NUMERIC DEFAULT 0;
