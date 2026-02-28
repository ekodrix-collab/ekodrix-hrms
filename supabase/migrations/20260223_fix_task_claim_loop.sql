-- =============================================
-- FIX TASK CLAIM LOOP & PERMISSIONS
-- =============================================

-- 1. Fix trigger function to use SECURITY DEFINER
-- This allows employees to create admin_inbox items despite not having direct table access
CREATE OR REPLACE FUNCTION public.handle_task_claim_inbox()
RETURNS TRIGGER AS $$
DECLARE
    claimer_name TEXT;
BEGIN
    -- Only trigger when status changes to 'pending_approval'
    IF NEW.assignment_status = 'pending_approval' AND (OLD.assignment_status IS NULL OR OLD.assignment_status != 'pending_approval') THEN
        
        -- Get user name
        SELECT full_name INTO claimer_name FROM public.profiles WHERE id = NEW.user_id;

        INSERT INTO public.admin_inbox (
            title,
            description,
            entity_type,
            entity_id,
            priority
        ) VALUES (
            'Task Claim Request',
            COALESCE(claimer_name, 'Unknown Employee') || ' wants to claim task: ' || NEW.title,
            'task_review',
            NEW.id,
            NEW.priority
        );
    END IF;
    
    -- Auto-handle inbox if task is assigned or rejected
    IF NEW.assignment_status != 'pending_approval' AND OLD.assignment_status = 'pending_approval' THEN
        UPDATE public.admin_inbox 
        SET is_handled = true, updated_at = NOW()
        WHERE entity_type = 'task_review' AND entity_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update Tasks RLS to allow employees to claim open tasks
-- They need to be able to set themselves as user_id and change status
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
CREATE POLICY "Users can update own tasks" ON public.tasks
    FOR UPDATE USING (
        (auth.uid() = user_id) OR 
        (is_open_assignment = true AND assignment_status = 'open')
    );

-- 3. Ensure admins can always update everything (safety)
DROP POLICY IF EXISTS "Admins can update any task" ON public.tasks;
CREATE POLICY "Admins can update any task" ON public.tasks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
