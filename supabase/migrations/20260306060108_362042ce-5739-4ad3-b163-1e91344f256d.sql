ALTER TABLE public.user_addresses ADD COLUMN IF NOT EXISTS latitude numeric NULL;
ALTER TABLE public.user_addresses ADD COLUMN IF NOT EXISTS longitude numeric NULL;