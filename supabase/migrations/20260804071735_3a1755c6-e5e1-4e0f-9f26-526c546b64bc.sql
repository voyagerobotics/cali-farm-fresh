
CREATE TABLE public.whatsapp_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  order_number text,
  phone_number text NOT NULL,
  direction text NOT NULL DEFAULT 'outbound',
  event_type text NOT NULL DEFAULT 'status_update',
  status text,
  channel text,
  language text DEFAULT 'en',
  template_name text,
  button_id text,
  body text,
  success boolean NOT NULL DEFAULT true,
  error text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX idx_wa_activity_order ON public.whatsapp_activity_log(order_number, created_at DESC);
CREATE INDEX idx_wa_activity_phone ON public.whatsapp_activity_log(phone_number, created_at DESC);
GRANT SELECT ON public.whatsapp_activity_log TO authenticated;
GRANT ALL ON public.whatsapp_activity_log TO service_role;
ALTER TABLE public.whatsapp_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view whatsapp activity" ON public.whatsapp_activity_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status_key text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  template_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  is_approved boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (status_key, language)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_templates TO authenticated;
GRANT ALL ON public.whatsapp_templates TO service_role;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage whatsapp templates" ON public.whatsapp_templates
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_whatsapp_templates_updated_at BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.whatsapp_opt_outs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL UNIQUE,
  opted_out boolean NOT NULL DEFAULT true,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_opt_outs TO authenticated;
GRANT ALL ON public.whatsapp_opt_outs TO service_role;
ALTER TABLE public.whatsapp_opt_outs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage whatsapp opt outs" ON public.whatsapp_opt_outs
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_whatsapp_opt_outs_updated_at BEFORE UPDATE ON public.whatsapp_opt_outs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS whatsapp_opt_out boolean NOT NULL DEFAULT false;

INSERT INTO public.whatsapp_templates (status_key, language, template_name, is_approved) VALUES
  ('confirmed','en','order_confirmed',true),
  ('preparing','en','order_packed',true),
  ('out_for_delivery','en','order_out_for_delivery',true),
  ('delivered','en','order_delivered',true);
