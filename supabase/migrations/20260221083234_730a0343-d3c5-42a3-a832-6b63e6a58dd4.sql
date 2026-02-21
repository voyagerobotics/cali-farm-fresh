
-- Coming Soon / Promotional Banners table
CREATE TABLE public.promotional_banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Coming Soon',
  subtitle TEXT,
  description TEXT,
  product_name TEXT NOT NULL,
  image_url TEXT,
  badge_text TEXT DEFAULT 'Coming Soon',
  cta_text TEXT DEFAULT 'Pre-Order Now',
  cta_link TEXT,
  background_color TEXT DEFAULT '#FEF3C7',
  text_color TEXT DEFAULT '#92400E',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.promotional_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active banners" ON public.promotional_banners
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can view all banners" ON public.promotional_banners
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage banners" ON public.promotional_banners
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_promotional_banners_updated_at
  BEFORE UPDATE ON public.promotional_banners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert a default watermelon banner
INSERT INTO public.promotional_banners (title, subtitle, description, product_name, badge_text, cta_text, background_color, text_color)
VALUES (
  '🍉 Watermelon Season is Here!',
  'Fresh & Juicy Watermelons',
  'Pre-order our farm-fresh watermelons. Sweet, seedless varieties available for delivery.',
  'Watermelon',
  'Coming Soon',
  'Pre-Order Now',
  '#FEF3C7',
  '#92400E'
);

-- Pre-orders table
CREATE TABLE public.pre_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  banner_id UUID REFERENCES public.promotional_banners(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'fulfilled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pre_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pre-orders" ON public.pre_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pre-orders" ON public.pre_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all pre-orders" ON public.pre_orders
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all pre-orders" ON public.pre_orders
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_pre_orders_updated_at
  BEFORE UPDATE ON public.pre_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
