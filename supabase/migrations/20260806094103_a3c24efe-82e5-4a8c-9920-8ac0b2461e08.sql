-- Data API access for the admin console (previously missing → admin UI could not read chats)
GRANT SELECT, UPDATE ON public.whatsapp_conversations TO authenticated;
GRANT ALL ON public.whatsapp_conversations TO service_role;
GRANT SELECT ON public.whatsapp_messages TO authenticated;
GRANT ALL ON public.whatsapp_messages TO service_role;

-- Tighten the existing wide-open policies and add explicit admin access
DROP POLICY IF EXISTS "Service role full access on whatsapp_conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Service role full access on whatsapp_messages" ON public.whatsapp_messages;

CREATE POLICY "Service role manages conversations"
ON public.whatsapp_conversations FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins read conversations"
ON public.whatsapp_conversations FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update conversations"
ON public.whatsapp_conversations FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages messages"
ON public.whatsapp_messages FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins read messages"
ON public.whatsapp_messages FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));