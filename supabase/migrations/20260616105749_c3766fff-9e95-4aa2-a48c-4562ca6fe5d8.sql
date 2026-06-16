
CREATE TABLE public.uptime_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  status_code INTEGER,
  error_message TEXT,
  duration_seconds INTEGER,
  alert_sent_at TIMESTAMPTZ,
  recovery_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.uptime_incidents TO authenticated;
GRANT ALL ON public.uptime_incidents TO service_role;
ALTER TABLE public.uptime_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view uptime incidents" ON public.uptime_incidents
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.uptime_monitor_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  url TEXT NOT NULL,
  is_down BOOLEAN NOT NULL DEFAULT false,
  down_since TIMESTAMPTZ,
  current_incident_id UUID REFERENCES public.uptime_incidents(id) ON DELETE SET NULL,
  last_status_code INTEGER,
  last_error TEXT,
  last_checked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);
GRANT SELECT ON public.uptime_monitor_state TO authenticated;
GRANT ALL ON public.uptime_monitor_state TO service_role;
ALTER TABLE public.uptime_monitor_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view monitor state" ON public.uptime_monitor_state
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.uptime_monitor_state (id, url) VALUES (1, 'https://zomical.com');

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
