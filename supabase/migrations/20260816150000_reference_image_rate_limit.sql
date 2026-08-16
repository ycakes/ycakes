-- Rate limiting for the customer-facing reference-image upload endpoint
-- (Cake Detail's "Fake Cake" / any-order-item reference photo). That
-- endpoint has no auth requirement (guests can order too), so it's rate
-- limited by IP via this table + RPC rather than by user identity.
create table public.reference_image_upload_log (
  id uuid primary key default gen_random_uuid(),
  ip_address text not null,
  created_at timestamptz not null default now()
);

create index reference_image_upload_log_ip_created_idx
  on public.reference_image_upload_log (ip_address, created_at);

-- No direct table access for anon/authenticated — only the RPC below,
-- which runs as security definer, may read or write it.
revoke all on public.reference_image_upload_log from anon, authenticated;

-- Atomically checks + records one upload attempt for an IP. Returns false
-- (caller should reject with 429) once an IP has made 8+ attempts in the
-- last 10 minutes. Also opportunistically prunes rows older than a day so
-- the table doesn't grow unbounded (no cron/scheduled job exists in this
-- project yet — see ARCHITECTURE.md's flagged follow-up for a proper
-- retention/cleanup job).
create or replace function public.check_reference_image_upload_rate_limit(p_ip text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count int;
begin
  delete from reference_image_upload_log where created_at < now() - interval '1 day';

  select count(*) into recent_count
  from reference_image_upload_log
  where ip_address = p_ip and created_at > now() - interval '10 minutes';

  if recent_count >= 8 then
    return false;
  end if;

  insert into reference_image_upload_log (ip_address) values (p_ip);
  return true;
end;
$$;

grant execute on function public.check_reference_image_upload_rate_limit(text) to anon, authenticated;
