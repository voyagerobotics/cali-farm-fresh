GRANT INSERT ON public.farm_visit_bookings TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.farm_visit_bookings TO authenticated;
GRANT ALL ON public.farm_visit_bookings TO service_role;

DROP POLICY IF EXISTS "Anyone can submit a farm visit booking" ON public.farm_visit_bookings;

CREATE POLICY "Anyone can submit a farm visit booking"
ON public.farm_visit_bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (true);