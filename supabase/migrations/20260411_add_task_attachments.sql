-- =============================================
-- Migration: Add Task Attachments
-- Created At: 2026-04-11
-- =============================================

-- Create task_attachments table
CREATE TABLE IF NOT EXISTS public.task_attachments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id     UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    image_url   TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON public.task_attachments(task_id);

-- Enable RLS
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can read attachments"
    ON public.task_attachments FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can delete attachments"
    ON public.task_attachments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Authenticated users can insert attachments"
    ON public.task_attachments FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- =============================================
-- Storage Policies (for task-attachments bucket)
-- =============================================

-- Ensure bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public read access to objects in the bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'task-attachments' );

-- Policy to allow authenticated users to upload objects
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'task-attachments' 
    AND auth.role() = 'authenticated'
);

-- Policy to allow admins to delete objects
CREATE POLICY "Admin Delete"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'task-attachments' 
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);
