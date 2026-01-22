-- Table for weekly reminder subscriptions
CREATE TABLE public.weekly_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email)
);

-- Enable RLS
ALTER TABLE public.weekly_subscriptions ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe
CREATE POLICY "Anyone can insert subscriptions"
ON public.weekly_subscriptions
FOR INSERT
WITH CHECK (true);

-- Users can view their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
ON public.weekly_subscriptions
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));

-- Users can update their own subscriptions
CREATE POLICY "Users can update their own subscriptions"
ON public.weekly_subscriptions
FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));

-- Admins can delete subscriptions
CREATE POLICY "Admins can delete subscriptions"
ON public.weekly_subscriptions
FOR DELETE
USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_weekly_subscriptions_updated_at
BEFORE UPDATE ON public.weekly_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Table for admin-created customers
CREATE TABLE public.offline_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  pincode TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.offline_customers ENABLE ROW LEVEL SECURITY;

-- Only admins can manage offline customers
CREATE POLICY "Admins can manage offline customers"
ON public.offline_customers
FOR ALL
USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_offline_customers_updated_at
BEFORE UPDATE ON public.offline_customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add free delivery threshold to site_settings
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS free_delivery_threshold NUMERIC DEFAULT 399,
ADD COLUMN IF NOT EXISTS delivery_rate_per_km NUMERIC DEFAULT 10;