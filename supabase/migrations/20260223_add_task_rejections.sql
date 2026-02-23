-- Add rejected_user_ids column to track rejections while keeping tasks open
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS rejected_user_ids UUID[] DEFAULT '{}';

-- Ensure RLS allows users to see tasks they were rejected from (for feedback)
-- The existing policy "Anyone can view projects" or "Users can view open tasks" should already cover this
-- but let's make sure the "open" check doesn't block rejected users.
-- Actually the current policy is:
-- (auth.uid() = user_id) OR (is_open_assignment = true AND assignment_status = 'open') OR admin
-- If rejected, user_id is null and status is 'open', so they can still see it. Correct.
