
-- 1. Extend site_settings with farm-visit configuration
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS farm_visit_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS farm_visit_period TEXT NOT NULL DEFAULT '15 July to 15 February',
  ADD COLUMN IF NOT EXISTS farm_visit_hours TEXT NOT NULL DEFAULT '8:00 AM to 11:00 AM',
  ADD COLUMN IF NOT EXISTS farm_visit_days TEXT NOT NULL DEFAULT 'Monday to Friday',
  ADD COLUMN IF NOT EXISTS farm_visit_max_primary INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS farm_visit_max_secondary INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS farm_visit_max_college INTEGER NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS farm_visit_price_school INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS farm_visit_price_college INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS farm_visit_notes TEXT;

-- 2. farm_visit_bookings table
CREATE TABLE IF NOT EXISTS public.farm_visit_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  grade_level TEXT NOT NULL,
  student_count INTEGER NOT NULL,
  preferred_date DATE NOT NULL,
  notes TEXT,
  estimated_charge INTEGER NOT NULL DEFAULT 0,
  per_student_charge INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.farm_visit_bookings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.farm_visit_bookings TO authenticated;
GRANT ALL ON public.farm_visit_bookings TO service_role;

ALTER TABLE public.farm_visit_bookings ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a booking (public form)
CREATE POLICY "Anyone can submit a farm visit booking"
  ON public.farm_visit_bookings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read/update/delete bookings
CREATE POLICY "Admins can view all farm visit bookings"
  ON public.farm_visit_bookings
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update farm visit bookings"
  ON public.farm_visit_bookings
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete farm visit bookings"
  ON public.farm_visit_bookings
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger (uses existing helper if available, otherwise create)
CREATE OR REPLACE FUNCTION public.update_farm_visit_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_farm_visit_bookings_updated_at ON public.farm_visit_bookings;
CREATE TRIGGER trg_farm_visit_bookings_updated_at
  BEFORE UPDATE ON public.farm_visit_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_farm_visit_updated_at();

CREATE INDEX IF NOT EXISTS idx_farm_visit_bookings_status ON public.farm_visit_bookings(status);
CREATE INDEX IF NOT EXISTS idx_farm_visit_bookings_created_at ON public.farm_visit_bookings(created_at DESC);
