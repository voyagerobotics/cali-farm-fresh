-- Drop existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view notifications" ON public.stock_notifications;

-- Recreate with admin-only access
CREATE POLICY "Admins can view all stock notifications"
ON public.stock_notifications
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role));