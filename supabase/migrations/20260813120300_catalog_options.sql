create table public.flavors (
  id uuid primary key default gen_random_uuid(),
  name jsonb not null,
  price_modifier numeric(10,2) not null default 0,
  active boolean not null default true,
  sort_order int not null default 0
);
alter table public.flavors enable row level security;

create table public.colors (
  id uuid primary key default gen_random_uuid(),
  name jsonb not null,
  hex_code text,
  active boolean not null default true,
  sort_order int not null default 0
);
alter table public.colors enable row level security;

create table public.shapes (
  id uuid primary key default gen_random_uuid(),
  name jsonb not null,
  active boolean not null default true,
  sort_order int not null default 0
);
alter table public.shapes enable row level security;

create table public.toppers (
  id uuid primary key default gen_random_uuid(),
  name jsonb not null,
  price_modifier numeric(10,2) not null default 0,
  has_color_variants boolean not null default false,
  active boolean not null default true,
  sort_order int not null default 0
);
alter table public.toppers enable row level security;

create table public.topper_colors (
  topper_id uuid not null references public.toppers(id) on delete cascade,
  color_id uuid not null references public.colors(id) on delete cascade,
  primary key (topper_id, color_id)
);
alter table public.topper_colors enable row level security;
