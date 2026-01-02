-- Drop existing policy that allows full access including SELECT
DROP POLICY IF EXISTS "Users can manage their own OTP" ON public.order_otp_verifications;

-- Create restrictive policies - users should NOT be able to read OTP codes
-- Edge functions use service role and bypass RLS, so they can still operate

-- Users can only INSERT (initiate OTP request) - but not read the code back
CREATE POLICY "Users can create their own OTP requests"
ON public.order_otp_verifications
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Users can delete their own expired OTP records for cleanup
CREATE POLICY "Users can delete their own expired OTP records"
ON public.order_otp_verifications
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id AND expires_at < now());

-- No SELECT policy - users cannot read OTP codes
-- No UPDATE policy - verification is done server-side via edge function with service role