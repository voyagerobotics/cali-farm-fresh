-- Create table for storing custom password hashes
CREATE TABLE public.user_passwords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_passwords ENABLE ROW LEVEL SECURITY;

-- Only edge functions (service role) can access this table - no user access
CREATE POLICY "Service role only" ON public.user_passwords
  FOR ALL USING (false);

-- Create trigger for updated_at
CREATE TRIGGER update_user_passwords_updated_at
  BEFORE UPDATE ON public.user_passwords
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();