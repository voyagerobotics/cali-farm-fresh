select cron.schedule(
  'check-pending-payments-every-15min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://tawtsykkppopmyxhqkbw.supabase.co/functions/v1/check-pending-payments',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhd3RzeWtrcHBvcG15eGhxa2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwOTA0MjAsImV4cCI6MjA4MTY2NjQyMH0.atNVMEIacMT9uEA0JjoGe2Z3N5nnMaU62044Hqsel7o"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);