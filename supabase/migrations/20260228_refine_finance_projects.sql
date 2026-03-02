-- Migration: Refine Finance Module for Project Tracking
-- Created: 2026-02-28

-- 1. Add project_id to revenue_logs and expenses
ALTER TABLE public.revenue_logs ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_revenue_project ON public.revenue_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_project ON public.expenses(project_id);

-- 3. Create Finance Verdicts Table
CREATE TABLE IF NOT EXISTS public.finance_verdicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS for Verdicts
ALTER TABLE public.finance_verdicts ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists to make it idempotent
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'finance_verdicts' AND policyname = 'Anyone can view finance verdicts'
    ) THEN
        CREATE POLICY "Anyone can view finance verdicts" ON public.finance_verdicts FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'finance_verdicts' AND policyname = 'Admins can manage finance verdicts'
    ) THEN
        CREATE POLICY "Admins can manage finance verdicts" ON public.finance_verdicts FOR ALL USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;
END $$;

-- 5. Trigger for updated_at on finance_verdicts
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_finance_verdicts_updated_at') THEN
        CREATE TRIGGER update_finance_verdicts_updated_at BEFORE UPDATE ON public.finance_verdicts
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;
