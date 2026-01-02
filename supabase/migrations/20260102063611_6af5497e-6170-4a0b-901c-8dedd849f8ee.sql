-- Add failed_attempts column to order_otp_verifications table
ALTER TABLE public.order_otp_verifications 
ADD COLUMN IF NOT EXISTS failed_attempts INTEGER NOT NULL DEFAULT 0;

-- Create index for efficient queries on user_id and verified status
CREATE INDEX IF NOT EXISTS idx_otp_user_verified 
ON public.order_otp_verifications(user_id, verified) 
WHERE verified = false;

-- Clean up old expired OTP records to prevent table bloat
DELETE FROM public.order_otp_verifications 
WHERE expires_at < now() - INTERVAL '7 days';