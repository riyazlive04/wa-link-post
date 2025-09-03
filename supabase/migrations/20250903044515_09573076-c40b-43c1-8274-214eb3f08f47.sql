-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the process-scheduled-posts function to run every 15 minutes
SELECT cron.schedule(
  'process-scheduled-posts',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT
    net.http_post(
      url := 'https://wmclgyqfocssfmdfkzne.supabase.co/functions/v1/process-scheduled-posts',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtY2xneXFmb2Nzc2ZtZGZrem5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNDgzODQsImV4cCI6MjA3MTgyNDM4NH0.3Hh9-in8v3N3vxoO84iruiqBd8DHd9RA3S94drwuqCQ"}'::jsonb,
      body := '{"scheduled_run": true}'::jsonb
    ) AS request_id;
  $$
);

-- Verify the cron job was created
SELECT * FROM cron.job WHERE jobname = 'process-scheduled-posts';