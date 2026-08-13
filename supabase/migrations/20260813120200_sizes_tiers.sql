create table public.sizes (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id),
  min_qty int not null,
  max_qty int not null,
  unit text not null check (unit in ('servings','quantity','cm')),
  price_modifier numeric(10,2) not null default 0,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (category_id, min_qty, max_qty)
);
create index idx_sizes_category_id on public.sizes(category_id);
alter table public.sizes enable row level security;

create table public.tiers (
  id uuid primary key default gen_random_uuid(),
  tier_count int not null unique check (tier_count between 2 and 6),
  price_modifier numeric(10,2) not null default 0,
  active boolean not null default true
);
alter table public.tiers enable row level security;

create table public.size_tiers (
  size_id uuid not null references public.sizes(id) on delete cascade,
  tier_id uuid not null references public.tiers(id) on delete cascade,
  primary key (size_id, tier_id)
);
alter table public.size_tiers enable row level security;
