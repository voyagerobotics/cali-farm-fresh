-- Drop admin-only policy
DROP POLICY IF EXISTS "Admins can view all stock notifications" ON public.stock_notifications;

-- Recreate policy allowing all authenticated users to view notifications
CREATE POLICY "Authenticated users can view stock notifications"
ON public.stock_notifications
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);