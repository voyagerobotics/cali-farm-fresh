-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Package',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subcategories table
CREATE TABLE public.subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- Public can view non-hidden categories
CREATE POLICY "Anyone can view visible categories"
ON public.categories FOR SELECT
USING (is_hidden = false);

-- Admins can view all categories
CREATE POLICY "Admins can view all categories"
ON public.categories FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage categories
CREATE POLICY "Admins can manage categories"
ON public.categories FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Public can view non-hidden subcategories
CREATE POLICY "Anyone can view visible subcategories"
ON public.subcategories FOR SELECT
USING (is_hidden = false);

-- Admins can view all subcategories
CREATE POLICY "Admins can view all subcategories"
ON public.subcategories FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage subcategories
CREATE POLICY "Admins can manage subcategories"
ON public.subcategories FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at triggers
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subcategories_updated_at
BEFORE UPDATE ON public.subcategories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial categories from existing data
INSERT INTO public.categories (slug, name, icon, display_order) VALUES
('fruits', 'Fruits', 'Apple', 1),
('vegetables', 'Vegetables', 'Carrot', 2),
('leafy', 'Leafy Greens', 'Leaf', 3),
('herbs', 'Herbs', 'Sprout', 4),
('combos', 'Organic Combos', 'Package', 5);

-- Seed subcategories
INSERT INTO public.subcategories (slug, name, category_id, display_order)
SELECT 'seasonal-fruits', 'Seasonal Fruits', id, 1 FROM public.categories WHERE slug = 'fruits'
UNION ALL
SELECT 'citrus-fruits', 'Citrus Fruits', id, 2 FROM public.categories WHERE slug = 'fruits'
UNION ALL
SELECT 'exotic-fruits', 'Exotic Fruits', id, 3 FROM public.categories WHERE slug = 'fruits'
UNION ALL
SELECT 'berries', 'Berries', id, 4 FROM public.categories WHERE slug = 'fruits';

INSERT INTO public.subcategories (slug, name, category_id, display_order)
SELECT 'root-vegetables', 'Root Vegetables', id, 1 FROM public.categories WHERE slug = 'vegetables'
UNION ALL
SELECT 'cruciferous', 'Cruciferous Vegetables', id, 2 FROM public.categories WHERE slug = 'vegetables'
UNION ALL
SELECT 'gourds-squash', 'Gourds & Squash', id, 3 FROM public.categories WHERE slug = 'vegetables'
UNION ALL
SELECT 'beans-peas', 'Beans & Peas', id, 4 FROM public.categories WHERE slug = 'vegetables';

INSERT INTO public.subcategories (slug, name, category_id, display_order)
SELECT 'spinach-varieties', 'Spinach Varieties', id, 1 FROM public.categories WHERE slug = 'leafy'
UNION ALL
SELECT 'lettuce-salad', 'Lettuce & Salad Greens', id, 2 FROM public.categories WHERE slug = 'leafy'
UNION ALL
SELECT 'indigenous-leafy', 'Indigenous Leafy Greens', id, 3 FROM public.categories WHERE slug = 'leafy';

INSERT INTO public.subcategories (slug, name, category_id, display_order)
SELECT 'cooking-herbs', 'Fresh Cooking Herbs', id, 1 FROM public.categories WHERE slug = 'herbs'
UNION ALL
SELECT 'medicinal-herbs', 'Medicinal Herbs', id, 2 FROM public.categories WHERE slug = 'herbs'
UNION ALL
SELECT 'aromatic-herbs', 'Aromatic Herbs', id, 3 FROM public.categories WHERE slug = 'herbs';

INSERT INTO public.subcategories (slug, name, category_id, display_order)
SELECT 'weekly-basket', 'Weekly Veggie Basket', id, 1 FROM public.categories WHERE slug = 'combos'
UNION ALL
SELECT 'detox-pack', 'Detox Greens Pack', id, 2 FROM public.categories WHERE slug = 'combos'
UNION ALL
SELECT 'immunity-pack', 'Immunity Boost Pack', id, 3 FROM public.categories WHERE slug = 'combos';