-- Add employee_id to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS employee_id TEXT UNIQUE;

-- Update CEO seed user with employee_id
UPDATE public.users
SET employee_id = 'CEO00001'
WHERE id = 'f006ed9e-6fe2-43f6-b411-88867433afc8';

-- Create index for fast employee_id lookup at login
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON public.users (employee_id);
