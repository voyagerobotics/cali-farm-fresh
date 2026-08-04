ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS menu_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS wishlist jsonb NOT NULL DEFAULT '[]'::jsonb;