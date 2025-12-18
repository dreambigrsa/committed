-- Enable automatic status lifecycle cleanup (archive expired statuses + delete old statuses)
-- by calling the `status-lifecycle` Edge Function hourly via pg_cron + pg_net.
--
-- Requirements:
-- 1) Deploy the Edge Function:
--    supabase functions deploy status-lifecycle
-- 2) (Recommended) Set an Edge Function secret in Supabase Dashboard:
--    STATUS_LIFECYCLE_SECRET = <some strong secret>
-- 3) Store these secrets in Supabase Vault (run the two create_secret statements below):
--    - status_lifecycle_url: public URL of the Edge Function
--    - status_lifecycle_secret: must match STATUS_LIFECYCLE_SECRET (or omit header if you keep it open)
--
-- Notes:
-- - This uses extensions.net.http_post (pg_net) from a scheduled job (pg_cron).
-- - Do NOT commit your real secret values.

-- Extensions
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;
create extension if not exists vault with schema extensions;

-- =============
-- Vault secrets
-- =============
-- Replace the URL project ref if needed.
do $$
begin
  if not exists (
    select 1
    from extensions.vault.secrets
    where name = 'status_lifecycle_url'
  ) then
    perform extensions.vault.create_secret(
      'status_lifecycle_url',
      'https://<YOUR_PROJECT_REF>.functions.supabase.co/status-lifecycle'
    );
  end if;
end;
$$;

-- IMPORTANT: Replace <STATUS_LIFECYCLE_SECRET> with the same value you set in Edge Function secrets.
-- Run manually in SQL Editor; do NOT commit your real secret:
-- select extensions.vault.create_secret('status_lifecycle_secret', '<PUT_YOUR_STATUS_LIFECYCLE_SECRET_HERE>');

-- Helper to read a decrypted vault secret
create or replace function public._get_vault_secret(secret_name text)
returns text
language sql
stable
as $$
  select (select decrypted_secret
          from extensions.vault.decrypted_secrets
          where name = secret_name
          limit 1);
$$;

-- Callable function for cron to trigger the Edge Function
create or replace function public.run_status_lifecycle_job()
returns void
language plpgsql
security definer
as $$
declare
  url text;
  secret text;
begin
  url := public._get_vault_secret('status_lifecycle_url');
  secret := public._get_vault_secret('status_lifecycle_secret');

  if url is null then
    -- Not configured; do nothing.
    return;
  end if;

  perform extensions.net.http_post(
    url,
    '{}'::jsonb,
    case
      when secret is null then jsonb_build_object('Content-Type', 'application/json')
      else jsonb_build_object('Content-Type', 'application/json', 'x-status-lifecycle-secret', secret)
    end
  );
end;
$$;

-- Schedule hourly (at minute 0). Adjust as desired.
select
  cron.schedule(
    'status_lifecycle_hourly',
    '0 * * * *',
    $$select public.run_status_lifecycle_job();$$
  )
;


