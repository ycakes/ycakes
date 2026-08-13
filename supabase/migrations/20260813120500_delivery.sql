create table public.delivery_areas (
  id uuid primary key default gen_random_uuid(),
  name jsonb not null,
  price numeric(10,2) not null default 0,
  active boolean not null default true,
  sort_order int not null default 0
);
alter table public.delivery_areas enable row level security;

create table public.delivery_calendar_blocks (
  id uuid primary key default gen_random_uuid(),
  blocked_date date not null unique,
  reason text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.delivery_calendar_blocks enable row level security;
