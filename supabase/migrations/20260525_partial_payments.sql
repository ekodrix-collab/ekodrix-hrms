-- =============================================
-- PARTIAL PAYMENT AND BALANCE DUE SUPPORT
-- EKODRIX HRMS - Invoice/Billing Module
-- Run this in Supabase SQL Editor or migration runner
-- =============================================

-- 1. Update check constraint on public.invoices to allow 'partially_paid' status
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_payment_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_payment_status_check 
    CHECK (payment_status IN ('paid', 'pending', 'partially_paid', 'cancelled'));

-- 2. Add paid_amount and balance_due fields to public.invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS balance_due DECIMAL(12, 2) NOT NULL DEFAULT 0.00;

-- 3. Initialize paid_amount and balance_due for existing invoices
UPDATE public.invoices 
SET paid_amount = CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0.00 END,
    balance_due = CASE WHEN payment_status = 'paid' THEN 0.00 ELSE total_amount END;

-- 4. Create public.payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    amount_paid DECIMAL(12, 2) NOT NULL CHECK (amount_paid > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL,
    transaction_reference TEXT,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_is_active ON public.payments(is_active);

-- 6. Enable Row Level Security (RLS) on payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 7. Add Policy for Admin-only access to payments
CREATE POLICY "Admins can manage payments" ON public.payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 8. Trigger function to auto-update invoice payment totals
CREATE OR REPLACE FUNCTION public.update_invoice_payment_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_id UUID;
    v_total_amount DECIMAL(12,2);
    v_paid_amount DECIMAL(12,2);
    v_balance_due DECIMAL(12,2);
    v_status TEXT;
BEGIN
    -- Determine which invoice_id to update
    IF TG_OP = 'DELETE' THEN
        v_invoice_id := OLD.invoice_id;
    ELSE
        v_invoice_id := NEW.invoice_id;
    END IF;

    -- Fetch the total amount of the invoice
    SELECT total_amount, payment_status 
    INTO v_total_amount, v_status
    FROM public.invoices 
    WHERE id = v_invoice_id;

    IF v_total_amount IS NULL THEN
        RETURN NULL;
    END IF;

    -- Sum up all active payments
    SELECT COALESCE(SUM(amount_paid), 0)
    INTO v_paid_amount
    FROM public.payments
    WHERE invoice_id = v_invoice_id AND is_active = true;

    v_balance_due := v_total_amount - v_paid_amount;
    
    -- Determine status
    IF v_paid_amount >= v_total_amount THEN
        v_status := 'paid';
    ELSIF v_paid_amount > 0 THEN
        v_status := 'partially_paid';
    ELSE
        IF v_status <> 'cancelled' THEN
            v_status := 'pending';
        END IF;
    END IF;

    -- Update invoices table
    UPDATE public.invoices
    SET paid_amount = v_paid_amount,
        balance_due = v_balance_due,
        payment_status = v_status,
        payment_date = CASE WHEN v_status = 'paid' THEN COALESCE((SELECT MAX(payment_date) FROM public.payments WHERE invoice_id = v_invoice_id AND is_active = true), CURRENT_DATE) ELSE NULL END,
        payment_method = CASE WHEN v_status = 'paid' THEN (SELECT payment_method FROM public.payments WHERE invoice_id = v_invoice_id AND is_active = true ORDER BY payment_date DESC, created_at DESC LIMIT 1) ELSE payment_method END
    WHERE id = v_invoice_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on payments table
DROP TRIGGER IF EXISTS update_invoice_payment_totals_trg ON public.payments;
CREATE TRIGGER update_invoice_payment_totals_trg
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.update_invoice_payment_totals();

-- 9. Trigger function to handle updates directly to invoice (e.g., invoice total changes)
CREATE OR REPLACE FUNCTION public.update_invoice_totals_from_self()
RETURNS TRIGGER AS $$
BEGIN
    -- Only recalculate balance due and update status if total_amount or paid_amount changed
    IF NEW.total_amount <> OLD.total_amount OR NEW.paid_amount <> OLD.paid_amount THEN
        NEW.balance_due := NEW.total_amount - NEW.paid_amount;
        IF NEW.paid_amount >= NEW.total_amount THEN
            NEW.payment_status := 'paid';
        ELSIF NEW.paid_amount > 0 THEN
            NEW.payment_status := 'partially_paid';
        ELSE
            IF NEW.payment_status <> 'cancelled' THEN
                NEW.payment_status := 'pending';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on invoices table
DROP TRIGGER IF EXISTS update_invoice_totals_from_self_trg ON public.invoices;
CREATE TRIGGER update_invoice_totals_from_self_trg
BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.update_invoice_totals_from_self();
