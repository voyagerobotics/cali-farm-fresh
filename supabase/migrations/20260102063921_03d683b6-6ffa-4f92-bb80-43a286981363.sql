-- Drop existing ALL policy
DROP POLICY IF EXISTS "Users can manage their notification preferences" ON public.user_notification_preferences;

-- Create separate policies for each operation
CREATE POLICY "Users can view their notification preferences"
ON public.user_notification_preferences
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can insert their notification preferences"
ON public.user_notification_preferences
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update their notification preferences"
ON public.user_notification_preferences
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can delete their notification preferences"
ON public.user_notification_preferences
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);