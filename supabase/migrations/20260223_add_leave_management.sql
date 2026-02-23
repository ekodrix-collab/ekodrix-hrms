-- =============================================
-- EKODRIX HRMS - LEAVE MANAGEMENT SYSTEM
-- =============================================

-- 1. LEAVE TYPES
CREATE TABLE public.leave_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    total_days DECIMAL(4,1) NOT NULL,
    color TEXT DEFAULT '#3b82f6',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. LEAVE REQUESTS
CREATE TABLE public.leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(4,1) NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

-- 3. LEAVE BALANCES
CREATE TABLE public.leave_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    entitlement DECIMAL(4,1) NOT NULL,
    used DECIMAL(4,1) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, leave_type_id, year)
);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

-- LEAVE TYPES
CREATE POLICY "Anyone can view active leave types" ON public.leave_types
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage leave types" ON public.leave_types
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- LEAVE REQUESTS
CREATE POLICY "Users can view own leave requests" ON public.leave_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all leave requests" ON public.leave_requests
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Users can insert own leave requests" ON public.leave_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel own pending requests" ON public.leave_requests
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending')
    WITH CHECK (status = 'cancelled');

CREATE POLICY "Admins can update any leave request" ON public.leave_requests
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- LEAVE BALANCES
CREATE POLICY "Users can view own leave balances" ON public.leave_balances
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all leave balances" ON public.leave_balances
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can manage leave balances" ON public.leave_balances
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Seed default leave types
INSERT INTO public.leave_types (name, total_days, color, description) VALUES
    ('Sick Leave', 12.0, '#ef4444', 'Medical related leaves'),
    ('Casual Leave', 12.0, '#f59e0b', 'Unplanned personal leaves'),
    ('Earned Leave', 18.0, '#3b82f6', 'Planned vacation leaves');

-- Trigger to update updated_at
CREATE TRIGGER update_leave_types_updated_at BEFORE UPDATE ON public.leave_types
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_balances_updated_at BEFORE UPDATE ON public.leave_balances
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to initialize leave balances for new users or existing users when leave types are added
CREATE OR REPLACE FUNCTION public.initialize_leave_balances()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.leave_balances (user_id, leave_type_id, entitlement)
    SELECT NEW.id, lt.id, lt.total_days
    FROM public.leave_types lt
    WHERE lt.is_active = true
    ON CONFLICT (user_id, leave_type_id, year) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created_init_leaves
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.initialize_leave_balances();

-- Function to handle balance updates on leave approval
CREATE OR REPLACE FUNCTION public.handle_leave_approval()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'approved' AND OLD.status = 'pending') THEN
        UPDATE public.leave_balances
        SET used = used + NEW.total_days
        WHERE user_id = NEW.user_id 
          AND leave_type_id = NEW.leave_type_id
          AND year = EXTRACT(YEAR FROM NEW.start_date);
    ELSIF (NEW.status = 'cancelled' AND OLD.status = 'approved') THEN
        UPDATE public.leave_balances
        SET used = used - NEW.total_days
        WHERE user_id = NEW.user_id 
          AND leave_type_id = NEW.leave_type_id
          AND year = EXTRACT(YEAR FROM NEW.start_date);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_leave_request_status_change
    AFTER UPDATE ON public.leave_requests
    FOR EACH ROW EXECUTE FUNCTION public.handle_leave_approval();
