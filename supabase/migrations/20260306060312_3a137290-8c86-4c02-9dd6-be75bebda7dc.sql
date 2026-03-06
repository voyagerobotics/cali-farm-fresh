ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_latitude numeric NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_longitude numeric NULL;