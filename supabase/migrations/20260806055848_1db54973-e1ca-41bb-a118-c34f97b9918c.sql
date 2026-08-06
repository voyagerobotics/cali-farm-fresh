
-- 1. Bot settings (single row config)
CREATE TABLE public.whatsapp_bot_settings (
  id TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
  business_name TEXT NOT NULL DEFAULT 'California Farms India',
  business_logo_url TEXT,
  business_description TEXT DEFAULT 'Farm fresh organic produce delivered to your door.',
  business_address TEXT DEFAULT '',
  business_phones TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  business_email TEXT DEFAULT '',
  business_website TEXT DEFAULT 'https://zomical.com',
  business_hours TEXT DEFAULT 'Mon-Sun, 8:00 AM - 8:00 PM IST',
  support_number TEXT DEFAULT '',
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  greeting_message TEXT DEFAULT 'Namaste! Welcome to California Farms India.',
  away_message TEXT DEFAULT 'We are away right now. We will reply as soon as we are back!',
  working_hours_message TEXT DEFAULT 'Our team is available 8:00 AM - 8:00 PM IST.',
  ai_personality TEXT DEFAULT 'Friendly, warm and helpful farm-store assistant.',
  ai_tone TEXT DEFAULT 'friendly',
  ai_greeting_style TEXT DEFAULT 'warm',
  default_language TEXT NOT NULL DEFAULT 'en',
  fallback_message TEXT DEFAULT 'Sorry, I did not catch that. Type MENU to see what we have.',
  recommendation_rules TEXT DEFAULT '',
  upsell_rules TEXT DEFAULT '',
  cross_sell_rules TEXT DEFAULT '',
  notify_new_order BOOLEAN NOT NULL DEFAULT true,
  notify_new_customer BOOLEAN NOT NULL DEFAULT true,
  notify_payment_received BOOLEAN NOT NULL DEFAULT true,
  notify_payment_failed BOOLEAN NOT NULL DEFAULT true,
  notify_low_stock BOOLEAN NOT NULL DEFAULT true,
  notify_cancelled_order BOOLEAN NOT NULL DEFAULT true,
  notify_abandoned_cart BOOLEAN NOT NULL DEFAULT false,
  theme TEXT NOT NULL DEFAULT 'light',
  primary_color TEXT NOT NULL DEFAULT '#2E7D32',
  accent_color TEXT NOT NULL DEFAULT '#F59E0B',
  button_style TEXT NOT NULL DEFAULT 'rounded',
  font_family TEXT NOT NULL DEFAULT 'default',
  emoji_style TEXT NOT NULL DEFAULT 'standard',
  date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  currency TEXT NOT NULL DEFAULT 'INR',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_bot_settings TO authenticated;
GRANT ALL ON public.whatsapp_bot_settings TO service_role;
ALTER TABLE public.whatsapp_bot_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage bot settings" ON public.whatsapp_bot_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_whatsapp_bot_settings_updated_at
  BEFORE UPDATE ON public.whatsapp_bot_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.whatsapp_bot_settings (id) VALUES ('default');

-- 2. Menu items
CREATE TABLE public.whatsapp_menu_items (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.whatsapp_menu_items(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🌿',
  action_type TEXT NOT NULL DEFAULT 'category',
  action_value TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_menu_items TO authenticated;
GRANT ALL ON public.whatsapp_menu_items TO service_role;
ALTER TABLE public.whatsapp_menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage bot menu" ON public.whatsapp_menu_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_whatsapp_menu_items_updated_at
  BEFORE UPDATE ON public.whatsapp_menu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Bot content (welcome / quick replies / seasonal)
CREATE TABLE public.whatsapp_bot_content (
  id TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
  welcome_text TEXT NOT NULL DEFAULT 'Welcome to California Farms India! Fresh from our farm to your home.',
  welcome_greeting TEXT NOT NULL DEFAULT 'Namaste 🙏',
  banner_image_url TEXT,
  quick_replies JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggested_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  festival_greetings JSONB NOT NULL DEFAULT '[]'::jsonb,
  seasonal_greetings JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_bot_content TO authenticated;
GRANT ALL ON public.whatsapp_bot_content TO service_role;
ALTER TABLE public.whatsapp_bot_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage bot content" ON public.whatsapp_bot_content
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_whatsapp_bot_content_updated_at
  BEFORE UPDATE ON public.whatsapp_bot_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.whatsapp_bot_content (id) VALUES ('default');

-- 4. FAQ / knowledge base
CREATE TABLE public.whatsapp_faqs (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_faqs TO authenticated;
GRANT ALL ON public.whatsapp_faqs TO service_role;
ALTER TABLE public.whatsapp_faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage bot faqs" ON public.whatsapp_faqs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_whatsapp_faqs_updated_at
  BEFORE UPDATE ON public.whatsapp_faqs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
