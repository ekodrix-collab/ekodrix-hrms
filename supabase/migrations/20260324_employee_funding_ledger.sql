CREATE TABLE IF NOT EXISTS public.employee_funding_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('GIVEN', 'RETURNED')),
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.employee_funding_ledger ENABLE ROW LEVEL SECURITY;

-- Admins and founders can see all funding in their organization
CREATE POLICY "Admins and founders can view all funding in their org" ON public.employee_funding_ledger
    FOR SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.organization_id = employee_funding_ledger.organization_id
            AND profiles.role IN ('admin', 'founder')
        )
    );

-- Admins and founders can insert/update all funding in their organization
CREATE POLICY "Admins and founders can manage all funding in their org" ON public.employee_funding_ledger
    FOR ALL USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.organization_id = employee_funding_ledger.organization_id
            AND profiles.role IN ('admin', 'founder')
        )
    );

-- Employees can view their own funding records
CREATE POLICY "Users can view their own funding" ON public.employee_funding_ledger
    FOR SELECT USING (
        auth.uid() = employee_id
    );

CREATE INDEX idx_emp_funding_employee_id ON public.employee_funding_ledger(employee_id);
CREATE INDEX idx_emp_funding_org_id ON public.employee_funding_ledger(organization_id);
CREATE INDEX idx_emp_funding_created_at ON public.employee_funding_ledger(created_at);
