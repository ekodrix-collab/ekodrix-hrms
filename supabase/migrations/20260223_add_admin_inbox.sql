-- =============================================
-- ADMIN ACTION INBOX SYSTEM
-- =============================================

-- 1. Create the admin_inbox table
CREATE TABLE IF NOT EXISTS public.admin_inbox (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    entity_type TEXT NOT NULL, -- 'leave_request', 'expense', 'task_review'
    entity_id UUID NOT NULL,
    is_handled BOOLEAN DEFAULT false,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- 2. Enable RLS
ALTER TABLE public.admin_inbox ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Admins can manage inbox" ON public.admin_inbox;
CREATE POLICY "Admins can manage inbox" ON public.admin_inbox
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 4. Trigger Function to create inbox items
CREATE OR REPLACE FUNCTION public.create_admin_inbox_item()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name TEXT;
    v_title TEXT;
    v_desc TEXT;
BEGIN
    -- Get user name from profiles
    SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;
    
    IF (TG_TABLE_NAME = 'leave_requests') THEN
        v_title := 'Leave Request: ' || COALESCE(v_user_name, 'Unknown Employee');
        v_desc := NEW.total_days || ' days starting ' || NEW.start_date;
        
        INSERT INTO public.admin_inbox (title, description, entity_type, entity_id, priority)
        VALUES (v_title, v_desc, 'leave_request', NEW.id, 'medium');
        
    ELSIF (TG_TABLE_NAME = 'expenses') THEN
        -- Link paid_by to profile name
        SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.paid_by;
        v_title := 'Expense Approval: ' || COALESCE(v_user_name, 'Unknown Employee');
        v_desc := 'Amount: ' || NEW.amount || ' for ' || NEW.description;
        
        INSERT INTO public.admin_inbox (title, description, entity_type, entity_id, priority)
        VALUES (v_title, v_desc, 'expense', NEW.id, 'medium');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger Function to sync "Handled" status
CREATE OR REPLACE FUNCTION public.sync_admin_inbox_on_entity_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_TABLE_NAME = 'leave_requests') THEN
        IF (NEW.status != 'pending') THEN
            UPDATE public.admin_inbox 
            SET is_handled = true, updated_at = NOW() 
            WHERE entity_id = NEW.id AND entity_type = 'leave_request';
        END IF;
    ELSIF (TG_TABLE_NAME = 'expenses') THEN
        IF (NEW.status != 'pending') THEN
            UPDATE public.admin_inbox 
            SET is_handled = true, updated_at = NOW() 
            WHERE entity_id = NEW.id AND entity_type = 'expense';
        END IF;
    ELSIF (TG_TABLE_NAME = 'tasks') THEN
        IF (NEW.status = 'done') THEN
            UPDATE public.admin_inbox 
            SET is_handled = true, updated_at = NOW() 
            WHERE entity_id = NEW.id AND entity_type = 'task_review';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Attach Triggers
DROP TRIGGER IF EXISTS tr_create_leave_inbox_item ON public.leave_requests;
CREATE TRIGGER tr_create_leave_inbox_item
    AFTER INSERT ON public.leave_requests
    FOR EACH ROW EXECUTE FUNCTION public.create_admin_inbox_item();

DROP TRIGGER IF EXISTS tr_sync_leave_inbox ON public.leave_requests;
CREATE TRIGGER tr_sync_leave_inbox
    AFTER UPDATE ON public.leave_requests
    FOR EACH ROW EXECUTE FUNCTION public.sync_admin_inbox_on_entity_change();

-- Expenses (assuming table exists)
DROP TRIGGER IF EXISTS tr_create_expense_inbox_item ON public.expenses;
CREATE TRIGGER tr_create_expense_inbox_item
    AFTER INSERT ON public.expenses
    FOR EACH ROW WHEN (NEW.status = 'pending')
    EXECUTE FUNCTION public.create_admin_inbox_item();

DROP TRIGGER IF EXISTS tr_sync_expense_inbox ON public.expenses;
CREATE TRIGGER tr_sync_expense_inbox
    AFTER UPDATE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.sync_admin_inbox_on_entity_change();

-- 7. Seed current pending items into inbox
INSERT INTO public.admin_inbox (title, description, entity_type, entity_id, priority)
SELECT 
    'Leave Request: ' || p.full_name,
    lr.total_days || ' days starting ' || lr.start_date,
    'leave_request',
    lr.id,
    'medium'
FROM public.leave_requests lr
JOIN public.profiles p ON lr.user_id = p.id
WHERE lr.status = 'pending'
ON CONFLICT DO NOTHING;
