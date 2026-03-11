-- Rename legacy role value to founder.
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

UPDATE public.profiles
SET role = 'founder'
WHERE role = 'employee_founder';

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('admin', 'employee', 'founder'));
