-- Create social_links table for admin-managed social media links
CREATE TABLE public.social_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;

-- Everyone can view visible social links
CREATE POLICY "Anyone can view visible social links"
ON public.social_links
FOR SELECT
USING (is_visible = true);

-- Admins can view all social links
CREATE POLICY "Admins can view all social links"
ON public.social_links
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage social links
CREATE POLICY "Admins can insert social links"
ON public.social_links
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update social links"
ON public.social_links
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete social links"
ON public.social_links
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_social_links_updated_at
BEFORE UPDATE ON public.social_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default social links
INSERT INTO public.social_links (platform, url, icon, display_order, is_visible) VALUES
('Instagram', 'https://instagram.com/californiafarmsindia', 'instagram', 1, true),
('Facebook', 'https://facebook.com/californiafarmsindia', 'facebook', 2, true),
('YouTube', 'https://youtube.com/@californiafarmsindia', 'youtube', 3, true),
('WhatsApp', 'https://wa.me/918149712801', 'whatsapp', 4, true);

-- Add map_url to site_settings table
ALTER TABLE public.site_settings 
ADD COLUMN map_url TEXT DEFAULT 'https://maps.app.goo.gl/7yhfzXpd9DizTaNE7';

-- Update existing row with map URL
UPDATE public.site_settings SET map_url = 'https://maps.app.goo.gl/7yhfzXpd9DizTaNE7';