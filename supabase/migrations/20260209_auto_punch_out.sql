-- Function to auto-punch out sessions that were forgotten
CREATE OR REPLACE FUNCTION public.auto_punch_out_forgotten_sessions()
RETURNS void AS $$
DECLARE
    rec RECORD;
    punch_out_time TIMESTAMPTZ;
BEGIN
    -- Find all attendance records where punch_out is NULL and the date is before today
    FOR rec IN 
        SELECT id, date, punch_in 
        FROM public.attendance 
        WHERE punch_out IS NULL 
        AND date < CURRENT_DATE
    LOOP
        -- Set punch out to 11:55 PM of that day (using Asia/Kolkata timezone as per project overview)
        punch_out_time := (rec.date + time '23:55:00')::timestamp AT TIME ZONE 'Asia/Kolkata';
        
        UPDATE public.attendance 
        SET 
            punch_out = punch_out_time,
            total_hours = EXTRACT(EPOCH FROM (punch_out_time - punch_in)) / 3600,
            notes = COALESCE(notes, '') || ' [System: Auto Punch-out]'
        WHERE id = rec.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Note: In a production environment, this function should be called by a cron job (e.g., pg_cron or an external scheduler) 
-- every night at 11:55 PM or shortly after midnight.
