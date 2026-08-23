CREATE TABLE public.nav_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label text NOT NULL,
  link_type text NOT NULL DEFAULT 'scroll',
  link_value text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  open_in_new_tab boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.nav_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nav_links TO authenticated;
GRANT ALL ON public.nav_links TO service_role;
ALTER TABLE public.nav_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nav_links_public_read" ON public.nav_links FOR SELECT USING (true);
CREATE POLICY "nav_links_admin_all" ON public.nav_links FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_nav_links_updated_at BEFORE UPDATE ON public.nav_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.nav_links (label, link_type, link_value, display_order) VALUES
  ('About', 'scroll', 'about', 1),
  ('Products', 'scroll', 'products', 2),
  ('Why Us', 'scroll', 'benefits', 3),
  ('Contact', 'scroll', 'contact', 5);

CREATE TABLE public.farmer_enquiries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  location text,
  interest text,
  message text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.farmer_enquiries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.farmer_enquiries TO authenticated;
GRANT ALL ON public.farmer_enquiries TO service_role;
ALTER TABLE public.farmer_enquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "farmer_enquiries_public_insert" ON public.farmer_enquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "farmer_enquiries_admin_read" ON public.farmer_enquiries FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "farmer_enquiries_admin_update" ON public.farmer_enquiries FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "farmer_enquiries_admin_delete" ON public.farmer_enquiries FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_farmer_enquiries_updated_at BEFORE UPDATE ON public.farmer_enquiries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();