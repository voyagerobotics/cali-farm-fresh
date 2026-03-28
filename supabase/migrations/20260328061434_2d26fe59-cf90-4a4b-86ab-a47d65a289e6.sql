ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_source text NOT NULL DEFAULT 'website';

COMMENT ON COLUMN public.orders.order_source IS 'Source of the order: website or whatsapp';