
-- Create table for error logs
CREATE TABLE public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  session_id TEXT,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  error_type TEXT,
  page_path TEXT,
  user_agent TEXT,
  additional_context JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Anyone can log errors
CREATE POLICY "Anyone can log errors" 
ON public.error_logs 
FOR INSERT 
WITH CHECK (true);

-- Only admins can view errors
CREATE POLICY "Admins can view all error logs" 
ON public.error_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete old errors
CREATE POLICY "Admins can delete error logs" 
ON public.error_logs 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for performance
CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX idx_error_logs_user_id ON public.error_logs(user_id);
