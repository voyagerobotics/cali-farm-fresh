
-- Add payment configuration to promotional banners
ALTER TABLE public.promotional_banners
ADD COLUMN payment_required boolean NOT NULL DEFAULT false;

-- Add payment fields to pre_orders
ALTER TABLE public.pre_orders
ADD COLUMN payment_status text NOT NULL DEFAULT 'not_required',
ADD COLUMN payment_amount numeric DEFAULT 0,
ADD COLUMN razorpay_payment_id text;

-- Create pre_order_notifications table for in-app notifications
CREATE TABLE public.pre_order_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pre_order_id UUID REFERENCES public.pre_orders(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pre_order_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.pre_order_notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.pre_order_notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all notifications"
ON public.pre_order_notifications FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for pre_order_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.pre_order_notifications;
