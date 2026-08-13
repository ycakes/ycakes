create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  name jsonb not null,
  slug text not null unique,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_categories_parent_id on public.categories(parent_id);
alter table public.categories enable row level security;
