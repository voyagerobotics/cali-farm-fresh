-- Add explicit SELECT policy that denies all user access to OTP records
-- OTP verification is handled by edge functions using service role
CREATE POLICY "No user access to OTP records" 
ON public.order_otp_verifications 
FOR SELECT 
USING (false);