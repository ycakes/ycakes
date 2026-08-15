create table public.cakes (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id),
  name jsonb not null,
  description jsonb,
  base_price numeric(10,2) not null default 0,
  primary_image_url text,
  featured boolean not null default false,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_cakes_category_id on public.cakes(category_id);
alter table public.cakes enable row level security;

create table public.cake_images (
  id uuid primary key default gen_random_uuid(),
  cake_id uuid not null references public.cakes(id) on delete cascade,
  url text not null,
  sort_order int not null default 0
);
alter table public.cake_images enable row level security;

create table public.cake_flavors (
  cake_id uuid not null references public.cakes(id) on delete cascade,
  flavor_id uuid not null references public.flavors(id) on delete cascade,
  primary key (cake_id, flavor_id)
);
alter table public.cake_flavors enable row level security;

create table public.cake_colors (
  cake_id uuid not null references public.cakes(id) on delete cascade,
  color_id uuid not null references public.colors(id) on delete cascade,
  primary key (cake_id, color_id)
);
alter table public.cake_colors enable row level security;

create table public.cake_toppers (
  cake_id uuid not null references public.cakes(id) on delete cascade,
  topper_id uuid not null references public.toppers(id) on delete cascade,
  primary key (cake_id, topper_id)
);
alter table public.cake_toppers enable row level security;
