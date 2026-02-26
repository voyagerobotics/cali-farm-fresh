-- Add email column to user_passwords for direct O(1) lookup instead of scanning all auth users
ALTER TABLE public.user_passwords ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_user_passwords_email ON public.user_passwords(email);

-- Backfill email from auth.users for existing records
UPDATE public.user_passwords up
SET email = au.email
FROM auth.users au
WHERE up.user_id = au.id AND up.email IS NULL;