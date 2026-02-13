-- =============================================
-- FINANCE MODULE UPDATES
-- =============================================

-- 1. Update Profiles with Salary Info
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS monthly_salary DECIMAL(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';

-- 2. Salary Accruals Table (The "Debt" Ledger)
CREATE TABLE IF NOT EXISTS public.salary_accruals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    month_year DATE NOT NULL, -- First of the month for reference
    status TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partially_paid', 'paid')),
    paid_amount DECIMAL(12, 2) DEFAULT 0.00,
    remaining_amount DECIMAL(12, 2) GENERATED ALWAYS AS (amount - paid_amount) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, month_year)
);

-- 3. Revenue Logs Table
CREATE TABLE IF NOT EXISTS public.revenue_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    amount DECIMAL(12, 2) NOT NULL,
    source TEXT NOT NULL,
    description TEXT,
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Payout History (To track which revenue paid which accrual)
CREATE TABLE IF NOT EXISTS public.payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    accrual_id UUID REFERENCES public.salary_accruals(id) ON DELETE CASCADE,
    revenue_id UUID REFERENCES public.revenue_logs(id) ON DELETE SET NULL,
    amount_paid DECIMAL(12, 2) NOT NULL,
    paid_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

-- 5. RLS Policies
ALTER TABLE public.salary_accruals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- Employees can view their own accruals
CREATE POLICY "Users can view own accruals" ON public.salary_accruals
    FOR SELECT USING (auth.uid() = user_id);

-- Admins can manage everything
CREATE POLICY "Admins can manage accruals" ON public.salary_accruals
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage revenue" ON public.revenue_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage payouts" ON public.payouts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Trigger for updated_at
CREATE TRIGGER update_salary_accruals_updated_at BEFORE UPDATE ON public.salary_accruals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Indexes
CREATE INDEX idx_salary_accruals_user ON public.salary_accruals(user_id);
CREATE INDEX idx_salary_accruals_month ON public.salary_accruals(month_year);
CREATE INDEX idx_revenue_date ON public.revenue_logs(received_date);
CREATE INDEX idx_activity_logs_created ON public.activity_logs(created_at);

-- 7. Seed Startup-Specific Categories
INSERT INTO public.expense_categories (name, color, icon) VALUES
    ('Salary Payments', '#6366f1', 'bank-note'),
    ('Office Rent', '#f43f5e', 'home'),
    ('Electricity', '#eab308', 'zap'),
    ('WiFi & Internet', '#06b6d4', 'wifi'),
    ('Domain & Hosting', '#8b5cf6', 'globe'),
    ('Tea & Snacks', '#d97706', 'coffee'),
    ('Marketing & Ads', '#ec4899', 'megaphone'),
    ('Miscellaneous', '#64748b', 'more-horizontal')
ON CONFLICT (name) DO NOTHING;
