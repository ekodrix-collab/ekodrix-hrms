-- =============================================
-- 1. PROJECTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold', 'planned')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
    deadline DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

-- RLS for Projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view projects" ON public.projects
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage projects" ON public.projects
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =============================================
-- 2. UPDATE TASKS TABLE
-- =============================================
DO $$ 
BEGIN 
    -- Add project_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='project_id') THEN
        ALTER TABLE public.tasks ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
    END IF;

    -- Add assignment flags
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='is_open_assignment') THEN
        ALTER TABLE public.tasks ADD COLUMN is_open_assignment BOOLEAN DEFAULT false;
    END IF;

    -- Add assignment status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='assignment_status') THEN
        ALTER TABLE public.tasks ADD COLUMN assignment_status TEXT DEFAULT 'assigned' CHECK (assignment_status IN ('assigned', 'open', 'pending_approval'));
    END IF;

    -- Ensure subtasks column exists (it should from previous edits, but let's be safe)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='subtasks') THEN
        ALTER TABLE public.tasks ADD COLUMN subtasks JSONB DEFAULT '[]';
    END IF;
END $$;

-- Update indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_open_assignment ON public.tasks(is_open_assignment, assignment_status);

-- =============================================
-- 3. UPDATED_AT TRIGGER FOR PROJECTS
-- =============================================
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 4. INBOX TRIGGER FOR TASK CLAIMING
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_task_claim_inbox()
RETURNS TRIGGER AS $$
DECLARE
    claimer_name TEXT;
BEGIN
    -- Only trigger when status changes to 'pending_approval'
    IF NEW.assignment_status = 'pending_approval' AND OLD.assignment_status != 'pending_approval' THEN
        
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
            claimer_name || ' wants to claim task: ' || NEW.title,
            'task_review',
            NEW.id,
            NEW.priority
        );
    END IF;
    
    -- Auto-handle inbox if task is assigned or deleted
    IF NEW.assignment_status = 'assigned' AND OLD.assignment_status = 'pending_approval' THEN
        UPDATE public.admin_inbox 
        SET is_handled = true 
        WHERE entity_type = 'task_review' AND entity_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_task_claim_status_change
    AFTER UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.handle_task_claim_inbox();
