-- Create product_variants table for weight/piece options
CREATE TABLE public.product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "250 gm", "500 gm", "1 kg", "per piece"
  price NUMERIC NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add discount fields to products table
ALTER TABLE public.products
ADD COLUMN discount_type TEXT DEFAULT NULL CHECK (discount_type IN ('percentage', 'flat', NULL)),
ADD COLUMN discount_value NUMERIC DEFAULT NULL,
ADD COLUMN discount_enabled BOOLEAN DEFAULT false;

-- Enable RLS on product_variants
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_variants
CREATE POLICY "Anyone can view variants of available products"
ON public.product_variants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.products 
    WHERE products.id = product_variants.product_id 
    AND products.is_hidden = false
  )
);

CREATE POLICY "Admins can view all variants"
ON public.product_variants
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage variants"
ON public.product_variants
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at on product_variants
CREATE TRIGGER update_product_variants_updated_at
BEFORE UPDATE ON public.product_variants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster variant lookups
CREATE INDEX idx_product_variants_product_id ON public.product_variants(product_id);

-- Enable realtime for product_variants
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_variants;