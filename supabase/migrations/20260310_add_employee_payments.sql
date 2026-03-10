-- Migration: Create employee_payments table for consolidated income tracking
-- Created: 2026-03-10

-- 1. Create enum for payment types if not already exists (optional, using text for flexibility)
-- CREATE TYPE payment_type AS ENUM ('salary', 'project_share', 'commission', 'bonus', 'reimbursement');

-- 2. Create employee_payments table
CREATE TABLE IF NOT EXISTS public.employee_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('salary', 'project_share', 'commission', 'bonus', 'reimbursement')),
    amount DECIMAL(12, 2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add RLS Policies
ALTER TABLE public.employee_payments ENABLE ROW LEVEL SECURITY;

-- Employees can view their own payments
CREATE POLICY "Users can view own payments" ON public.employee_payments
    FOR SELECT USING (auth.uid() = employee_id);

-- Admins can manage everything
CREATE POLICY "Admins can manage payments" ON public.employee_payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_employee_payments_employee ON public.employee_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_payments_project ON public.employee_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_employee_payments_date ON public.employee_payments(date);

-- 5. Trigger for updated_at
CREATE TRIGGER update_employee_payments_updated_at BEFORE UPDATE ON public.employee_payments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
