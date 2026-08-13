create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.profiles(id),
  guest_name text,
  guest_phone text,
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled','completed')),
  fulfillment_type text not null check (fulfillment_type in ('delivery','pickup')),
  delivery_area_id uuid references public.delivery_areas(id),
  delivery_address text,
  fulfillment_date date not null,
  promo_code_id uuid references public.promo_codes(id),
  subtotal_estimate numeric(10,2) not null default 0,
  delivery_price numeric(10,2) not null default 0,
  discount_amount numeric(10,2) not null default 0,
  final_price numeric(10,2),
  notes text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  check (customer_id is not null or (guest_name is not null and guest_phone is not null))
);
create index idx_orders_status on public.orders(status);
create index idx_orders_fulfillment_date on public.orders(fulfillment_date);
alter table public.orders enable row level security;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  cake_id uuid not null references public.cakes(id) on delete restrict,
  size_id uuid not null references public.sizes(id),
  tier_id uuid references public.tiers(id),
  shape_id uuid not null references public.shapes(id),
  color_id uuid not null references public.colors(id),
  is_fifty_fifty boolean not null default false,
  topper_id uuid references public.toppers(id),
  topper_color_id uuid references public.colors(id),
  text_on_cake text,
  text_on_board text,
  notes text,
  quantity int not null default 1,
  unit_base_price numeric(10,2) not null,
  price_modifiers_total numeric(10,2) not null default 0,
  line_estimate numeric(10,2) not null,
  created_at timestamptz not null default now()
);
create index idx_order_items_order_id on public.order_items(order_id);
create index idx_order_items_cake_id on public.order_items(cake_id);
alter table public.order_items enable row level security;

create table public.order_item_flavors (
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  flavor_id uuid not null references public.flavors(id),
  position smallint not null default 1 check (position in (1,2)),
  primary key (order_item_id, position)
);
create index idx_order_item_flavors_order_item_id on public.order_item_flavors(order_item_id);
alter table public.order_item_flavors enable row level security;
