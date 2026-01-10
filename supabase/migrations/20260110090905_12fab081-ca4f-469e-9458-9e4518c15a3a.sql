-- Create site settings table for managing visibility of sections
CREATE TABLE public.site_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  show_seasonal_box BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default settings
INSERT INTO public.site_settings (id, show_seasonal_box) VALUES ('default', true);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can view site settings"
ON public.site_settings
FOR SELECT
USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update site settings"
ON public.site_settings
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_site_settings_updated_at
BEFORE UPDATE ON public.site_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();