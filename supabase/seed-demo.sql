-- Demo admin user metadata (create user via Supabase Auth UI or CLI,
-- then run an update to set role = 'admin' in profiles table).

-- Example: after creating auth user with email admin@demo.com
-- UPDATE public.profiles SET role = 'admin', full_name = 'Admin User'
-- WHERE email = 'admin@demo.com';

-- Demo employees (create auth users, then adjust profiles):
-- UPDATE public.profiles SET full_name = 'Ravi Kumar', department = 'Engineering', designation = 'Senior Developer' WHERE email = 'ravi@demo.com';
-- UPDATE public.profiles SET full_name = 'Priya Sharma', department = 'Design', designation = 'Product Designer' WHERE email = 'priya@demo.com';
-- UPDATE public.profiles SET full_name = 'Arjun Singh', department = 'QA', designation = 'QA Engineer' WHERE email = 'arjun@demo.com';
-- UPDATE public.profiles SET full_name = 'Kiran Patel', department = 'Engineering', designation = 'Backend Developer' WHERE email = 'kiran@demo.com';
-- UPDATE public.profiles SET full_name = 'Meera Gupta', department = 'Marketing', designation = 'Marketing Manager' WHERE email = 'meera@demo.com';

-- Example tasks for one employee (replace :user_id with actual UUID):
-- INSERT INTO public.tasks (user_id, title, status, priority, is_today_focus, position) VALUES
-- (:user_id, 'Build login API', 'in_progress', 'high', true, 0),
-- (:user_id, 'Fix navbar bug', 'todo', 'medium', true, 1),
-- (:user_id, 'Setup database', 'todo', 'medium', false, 2),
-- (:user_id, 'Write unit tests', 'todo', 'low', false, 3);

-- Example expenses (replace :admin_id and category IDs accordingly):
-- INSERT INTO public.expenses (category_id, paid_by, amount, description, expense_date, payment_method, created_by) VALUES
-- (:supplies_category_id, :admin_id, 2500, 'Office chairs', CURRENT_DATE, 'card', :admin_id),
-- (:software_category_id, :admin_id, 1200, 'Design tool subscription', CURRENT_DATE, 'card', :admin_id);

