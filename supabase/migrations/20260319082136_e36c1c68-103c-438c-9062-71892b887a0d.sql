
-- Table to track WhatsApp conversation state and cart
CREATE TABLE public.whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  conversation_state text DEFAULT 'idle',
  cart jsonb DEFAULT '[]'::jsonb,
  delivery_name text,
  delivery_address text,
  delivery_phone text,
  delivery_pincode text,
  payment_method text,
  language text DEFAULT 'en',
  last_order_id uuid,
  user_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(phone_number)
);

ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on whatsapp_conversations"
  ON public.whatsapp_conversations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Table to log WhatsApp messages for context
CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  direction text NOT NULL,
  message_text text,
  message_type text DEFAULT 'text',
  wa_message_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on whatsapp_messages"
  ON public.whatsapp_messages
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_wa_conversations_phone ON public.whatsapp_conversations(phone_number);
CREATE INDEX idx_wa_messages_phone ON public.whatsapp_messages(phone_number);
CREATE INDEX idx_wa_messages_created ON public.whatsapp_messages(created_at DESC);
