-- Conversation: remembered profile, language, coordinates, inbox state
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS delivery_latitude numeric,
  ADD COLUMN IF NOT EXISTS delivery_longitude numeric,
  ADD COLUMN IF NOT EXISTS delivery_city text,
  ADD COLUMN IF NOT EXISTS delivery_label text,
  ADD COLUMN IF NOT EXISTS profile_complete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_starred boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inbox_status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS unread_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_message_text text;

-- Staff-only notes on a WhatsApp customer
CREATE TABLE IF NOT EXISTS public.whatsapp_customer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  note text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_customer_notes TO authenticated;
GRANT ALL ON public.whatsapp_customer_notes TO service_role;
ALTER TABLE public.whatsapp_customer_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage customer notes" ON public.whatsapp_customer_notes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_whatsapp_customer_notes_updated_at
  BEFORE UPDATE ON public.whatsapp_customer_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Broadcast campaigns
CREATE TABLE IF NOT EXISTS public.whatsapp_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  message_text text NOT NULL,
  media_url text,
  media_type text,
  buttons jsonb NOT NULL DEFAULT '[]'::jsonb,
  coupon_code text,
  product_ids uuid[] NOT NULL DEFAULT '{}',
  audience jsonb NOT NULL DEFAULT '{}'::jsonb,
  template_name text,
  status text NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz,
  sent_at timestamptz,
  total_recipients integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_broadcasts TO authenticated;
GRANT ALL ON public.whatsapp_broadcasts TO service_role;
ALTER TABLE public.whatsapp_broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage broadcasts" ON public.whatsapp_broadcasts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_whatsapp_broadcasts_updated_at
  BEFORE UPDATE ON public.whatsapp_broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.whatsapp_broadcast_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid NOT NULL REFERENCES public.whatsapp_broadcasts(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_broadcast_recipients TO authenticated;
GRANT ALL ON public.whatsapp_broadcast_recipients TO service_role;
ALTER TABLE public.whatsapp_broadcast_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage broadcast recipients" ON public.whatsapp_broadcast_recipients
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Delivery zones: richer admin controls
ALTER TABLE public.delivery_zones
  ADD COLUMN IF NOT EXISTS min_order_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_delivery_threshold numeric,
  ADD COLUMN IF NOT EXISTS eta_minutes integer;

CREATE INDEX IF NOT EXISTS idx_wa_conv_last_message ON public.whatsapp_conversations (last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_messages_phone_created ON public.whatsapp_messages (phone_number, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_notes_phone ON public.whatsapp_customer_notes (phone_number);