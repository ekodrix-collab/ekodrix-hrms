-- Migration: Add tasks_completed and tasks_planned to daily_standups
ALTER TABLE public.daily_standups 
ADD COLUMN IF NOT EXISTS tasks_completed TEXT,
ADD COLUMN IF NOT EXISTS tasks_planned TEXT;
