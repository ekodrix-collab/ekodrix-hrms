-- Add explicit finance lifecycle timestamps for expense claims and reimbursements.
-- This supports month-by-month treasury reporting with stable approval/payment dates.

ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reimbursed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reimbursed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reimbursement_method TEXT
CHECK (reimbursement_method IN ('cash', 'card', 'upi', 'bank_transfer', 'other'));

UPDATE public.expenses
SET approved_at = COALESCE(approved_at, updated_at, created_at)
WHERE status IN ('approved', 'paid')
  AND approved_at IS NULL;

UPDATE public.expenses
SET reimbursed_at = COALESCE(reimbursed_at, updated_at, approved_at, created_at)
WHERE status = 'paid'
  AND reimbursed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_approved_at ON public.expenses(approved_at);
CREATE INDEX IF NOT EXISTS idx_expenses_reimbursed_at ON public.expenses(reimbursed_at);
CREATE INDEX IF NOT EXISTS idx_expenses_status_expense_date ON public.expenses(status, expense_date);
