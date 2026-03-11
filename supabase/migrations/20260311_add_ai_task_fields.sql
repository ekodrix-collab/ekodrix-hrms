-- =============================================
-- Add AI-generated fields to tasks table
-- =============================================
DO $$
BEGIN
    -- estimated_hours: how long the task is expected to take
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='estimated_hours') THEN
        ALTER TABLE public.tasks ADD COLUMN estimated_hours NUMERIC(5, 1) DEFAULT NULL;
    END IF;

    -- difficulty_score: 1 (simple) to 5 (major feature), used for profit distribution
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='difficulty_score') THEN
        ALTER TABLE public.tasks ADD COLUMN difficulty_score SMALLINT DEFAULT NULL CHECK (difficulty_score BETWEEN 1 AND 5);
    END IF;

    -- task_type: Feature | Bug Fix | Improvement | Refactor
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='task_type') THEN
        ALTER TABLE public.tasks ADD COLUMN task_type TEXT DEFAULT NULL CHECK (task_type IN ('Feature', 'Bug Fix', 'Improvement', 'Refactor'));
    END IF;
END $$;
