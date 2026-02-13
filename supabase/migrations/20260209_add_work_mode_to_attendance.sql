-- 1. Add work_mode column to attendance table
ALTER TABLE public.attendance
ADD COLUMN IF NOT EXISTS work_mode TEXT DEFAULT 'office'
CHECK (work_mode IN ('office', 'home'));

-- 2. Drop the existing view (required when columns change)
DROP VIEW IF EXISTS public.today_attendance;

-- 3. Recreate the view with work_mode included
CREATE VIEW public.today_attendance AS
SELECT 
    p.id AS user_id,
    p.full_name,
    p.avatar_url,
    p.department,
    a.punch_in,
    a.punch_out,
    a.total_hours,
    CASE 
        WHEN a.punch_in IS NOT NULL AND a.punch_out IS NULL THEN 'working'
        WHEN a.punch_in IS NOT NULL AND a.punch_out IS NOT NULL THEN 'completed'
        ELSE 'not_started'
    END AS work_status,
    COALESCE(a.work_mode, 'office') AS work_mode
FROM public.profiles p
LEFT JOIN public.attendance a 
    ON p.id = a.user_id
   AND a.date = CURRENT_DATE
WHERE p.is_active = true
  AND p.role = 'employee';
