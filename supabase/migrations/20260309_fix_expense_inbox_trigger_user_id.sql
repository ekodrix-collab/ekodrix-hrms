-- Fix admin inbox trigger for expenses.
-- The shared trigger function previously tried to read NEW.user_id before checking
-- which table fired it. Expenses use paid_by, not user_id, which caused inserts to fail.

CREATE OR REPLACE FUNCTION public.create_admin_inbox_item()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name TEXT;
    v_title TEXT;
    v_desc TEXT;
BEGIN
    IF (TG_TABLE_NAME = 'leave_requests') THEN
        SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;
        v_title := 'Leave Request: ' || COALESCE(v_user_name, 'Unknown Employee');
        v_desc := NEW.total_days || ' days starting ' || NEW.start_date;

        INSERT INTO public.admin_inbox (title, description, entity_type, entity_id, priority)
        VALUES (v_title, v_desc, 'leave_request', NEW.id, 'medium');

    ELSIF (TG_TABLE_NAME = 'expenses') THEN
        SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.paid_by;
        v_title := 'Expense Approval: ' || COALESCE(v_user_name, 'Unknown Employee');
        v_desc := 'Amount: ' || NEW.amount || ' for ' || NEW.description;

        INSERT INTO public.admin_inbox (title, description, entity_type, entity_id, priority)
        VALUES (v_title, v_desc, 'expense', NEW.id, 'medium');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
