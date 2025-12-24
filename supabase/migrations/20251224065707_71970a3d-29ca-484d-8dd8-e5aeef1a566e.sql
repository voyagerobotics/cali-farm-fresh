-- Add image_urls column to products table for multiple images (1-4)
ALTER TABLE public.products 
ADD COLUMN image_urls text[] DEFAULT '{}';

-- Migrate existing image_url to image_urls array
UPDATE public.products 
SET image_urls = CASE 
  WHEN image_url IS NOT NULL AND image_url != '' THEN ARRAY[image_url]
  ELSE '{}'
END;

-- Create function to reduce stock after order
CREATE OR REPLACE FUNCTION public.reduce_stock_after_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Reduce stock quantity for the product
  UPDATE public.products
  SET 
    stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - NEW.quantity),
    is_available = CASE 
      WHEN GREATEST(0, COALESCE(stock_quantity, 0) - NEW.quantity) = 0 THEN false 
      ELSE is_available 
    END,
    updated_at = now()
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically reduce stock when order item is created
DROP TRIGGER IF EXISTS on_order_item_created ON public.order_items;
CREATE TRIGGER on_order_item_created
  AFTER INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.reduce_stock_after_order();