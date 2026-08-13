create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  opted_in_at timestamptz not null default now(),
  active boolean not null default true
);
alter table public.newsletter_subscribers enable row level security;
