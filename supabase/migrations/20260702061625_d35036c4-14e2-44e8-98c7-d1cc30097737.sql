GRANT INSERT ON public.farm_visit_bookings TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.farm_visit_bookings TO authenticated;
GRANT ALL ON public.farm_visit_bookings TO service_role;