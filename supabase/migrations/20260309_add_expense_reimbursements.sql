-- Support partial reimbursements for employee expense claims.

ALTER TABLE public.expenses
DROP CONSTRAINT IF EXISTS expenses_status_check;

ALTER TABLE public.expenses
ADD CONSTRAINT expenses_status_check
CHECK (status IN ('pending', 'approved', 'partially_paid', 'rejected', 'paid'));

CREATE TABLE IF NOT EXISTS public.expense_reimbursements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'upi', 'bank_transfer', 'other')),
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    note TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.expense_reimbursements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage expense reimbursements" ON public.expense_reimbursements;
CREATE POLICY "Admins can manage expense reimbursements" ON public.expense_reimbursements
    FOR ALL USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can view own expense reimbursements" ON public.expense_reimbursements;
CREATE POLICY "Users can view own expense reimbursements" ON public.expense_reimbursements
    FOR SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.expenses e
            WHERE e.id = expense_id AND e.paid_by = auth.uid()
        )
        OR EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE INDEX IF NOT EXISTS idx_expense_reimbursements_expense_id ON public.expense_reimbursements(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_reimbursements_paid_at ON public.expense_reimbursements(paid_at);
