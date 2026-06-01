-- =============================================
-- INVOICE MODULE MIGRATION
-- EKODRIX HRMS - Invoice/Billing Module
-- Run this in Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. INVOICES TABLE
-- =============================================
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Invoice identity
    invoice_number TEXT NOT NULL UNIQUE,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,

    -- Client info (denormalized — no external client table required)
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_phone TEXT,
    client_address TEXT,
    client_company TEXT,

    -- Service details
    service_name TEXT NOT NULL,
    description TEXT,

    -- Financials (no tax — business is not GST registered)
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,

    -- Payment tracking
    payment_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (payment_status IN ('paid', 'pending', 'cancelled')),
    payment_date DATE,
    payment_method TEXT,

    -- Meta
    notes TEXT,
    organization_id UUID,              -- matches org context from profiles
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT true,  -- soft delete flag
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 2. INVOICE ITEMS TABLE
-- =============================================
CREATE TABLE public.invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,

    item_name TEXT NOT NULL,
    description TEXT,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 3. ROW LEVEL SECURITY (Admin-only access)
-- =============================================
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Invoices: Admin only (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can manage invoices" ON public.invoices
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Invoice Items: Admin only
CREATE POLICY "Admins can manage invoice items" ON public.invoice_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =============================================
-- 4. PERFORMANCE INDEXES
-- =============================================
CREATE INDEX idx_invoices_payment_status  ON public.invoices(payment_status);
CREATE INDEX idx_invoices_invoice_date    ON public.invoices(invoice_date DESC);
CREATE INDEX idx_invoices_created_by      ON public.invoices(created_by);
CREATE INDEX idx_invoices_is_active       ON public.invoices(is_active);
CREATE INDEX idx_invoices_org_id          ON public.invoices(organization_id);
CREATE INDEX idx_invoices_number          ON public.invoices(invoice_number);
CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);

-- =============================================
-- 5. UPDATED_AT AUTO-TRIGGER
-- =============================================
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 6. INVOICE NUMBER GENERATOR FUNCTION
-- Format: INV-YYYY-NNNN (e.g. INV-2026-0001)
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    next_seq     INTEGER;
    invoice_num  TEXT;
BEGIN
    current_year := to_char(NOW(), 'YYYY');

    SELECT COALESCE(
        MAX(CAST(SPLIT_PART(invoice_number, '-', 3) AS INTEGER)),
        0
    ) + 1
    INTO next_seq
    FROM public.invoices
    WHERE invoice_number LIKE 'INV-' || current_year || '-%';

    invoice_num := 'INV-' || current_year || '-' || LPAD(next_seq::TEXT, 4, '0');
    RETURN invoice_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- END OF INVOICE MODULE MIGRATION
-- =============================================
