-- Enable realtime for orders table so admin can see new orders immediately
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;