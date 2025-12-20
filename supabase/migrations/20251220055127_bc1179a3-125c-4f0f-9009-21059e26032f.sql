-- Create user_addresses table for saved addresses
CREATE TABLE public.user_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  label TEXT NOT NULL DEFAULT 'Home',
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  pincode TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Nagpur',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_addresses
CREATE POLICY "Users can view their own addresses"
ON public.user_addresses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own addresses"
ON public.user_addresses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own addresses"
ON public.user_addresses FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own addresses"
ON public.user_addresses FOR DELETE
USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_user_addresses_updated_at
BEFORE UPDATE ON public.user_addresses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create delivery_zones table for distance-based pricing
CREATE TABLE public.delivery_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_name TEXT NOT NULL,
  min_distance_km NUMERIC NOT NULL DEFAULT 0,
  max_distance_km NUMERIC NOT NULL,
  delivery_charge NUMERIC NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

-- Anyone can view delivery zones
CREATE POLICY "Anyone can view active delivery zones"
ON public.delivery_zones FOR SELECT
USING (is_active = true);

-- Admins can manage delivery zones
CREATE POLICY "Admins can manage delivery zones"
ON public.delivery_zones FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default delivery zones
INSERT INTO public.delivery_zones (zone_name, min_distance_km, max_distance_km, delivery_charge) VALUES
('Zone A (0-3 km)', 0, 3, 20),
('Zone B (3-5 km)', 3, 5, 30),
('Zone C (5-10 km)', 5, 10, 50),
('Zone D (10-15 km)', 10, 15, 70),
('Zone E (15+ km)', 15, 100, 100);

-- Create order_otp_verifications table
CREATE TABLE public.order_otp_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_otp_verifications ENABLE ROW LEVEL SECURITY;

-- Users can manage their own OTP records
CREATE POLICY "Users can manage their own OTP"
ON public.order_otp_verifications FOR ALL
USING (auth.uid() = user_id);

-- Add UPI payment fields to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS upi_reference TEXT,
ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_screenshot_url TEXT;