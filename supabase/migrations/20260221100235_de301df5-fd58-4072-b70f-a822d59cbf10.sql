
-- Add delivery fields to pre_orders table
ALTER TABLE public.pre_orders 
  ADD COLUMN IF NOT EXISTS delivery_address text,
  ADD COLUMN IF NOT EXISTS delivery_pincode text,
  ADD COLUMN IF NOT EXISTS delivery_charge numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_distance_km numeric DEFAULT 0;
