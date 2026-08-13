create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('fixed','percentage')),
  discount_value numeric(10,2) not null,
  min_order_amount numeric(10,2),
  expiry_date date,
  redemption_cap int,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.promo_codes enable row level security;
