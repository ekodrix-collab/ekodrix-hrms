-- Add attendance_breaks table
CREATE TABLE IF NOT EXISTS public.attendance_breaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendance_id UUID NOT NULL REFERENCES public.attendance(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.attendance_breaks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own attendance breaks" ON public.attendance_breaks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.attendance a
            WHERE a.id = attendance_breaks.attendance_id AND a.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all attendance breaks" ON public.attendance_breaks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_attendance_breaks_attendance_id ON public.attendance_breaks(attendance_id);
