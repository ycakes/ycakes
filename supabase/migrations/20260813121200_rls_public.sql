-- Catalog tables with an `active` flag: readers see only active rows.
do $$
declare
  t text;
begin
  foreach t in array array[
    'categories','sizes','tiers','flavors','colors','shapes','toppers','cakes','delivery_areas'
  ]
  loop
    execute format(
      'create policy public_read_active on public.%1$s for select using (active = true);',
      t
    );
  end loop;
end $$;

-- Join/detail tables have no active flag of their own; the parent row
-- already governs relevance, so allow open reads here.
do $$
declare
  t text;
begin
  foreach t in array array[
    'size_tiers','cake_images','cake_flavors','cake_colors','cake_toppers',
    'topper_colors','delivery_calendar_blocks'
  ]
  loop
    execute format(
      'create policy public_read_all on public.%1$s for select using (true);',
      t
    );
  end loop;
end $$;

-- Promo codes: anyone can look up an active, unexpired code to validate it
-- at checkout (addition beyond the original spec RLS section — see plan's
-- Global Constraints note).
create policy public_read_active_promo on public.promo_codes
for select
using (active = true and (expiry_date is null or expiry_date >= current_date));

-- Orders: guests (customer_id null) and authenticated customers (their own
-- customer_id) may create orders. Nobody but admin/accountant can read
-- them here — that grant lands in the next migration.
create policy orders_insert on public.orders
for insert
with check (customer_id is null or customer_id = auth.uid());

create policy orders_select_own on public.orders
for select
using (auth.uid() is not null and customer_id = auth.uid());

create policy order_items_insert on public.order_items
for insert
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.customer_id is null or o.customer_id = auth.uid())
  )
);

create policy order_items_select_own on public.order_items
for select
using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and auth.uid() is not null
      and o.customer_id = auth.uid()
  )
);

create policy order_item_flavors_insert on public.order_item_flavors
for insert
with check (
  exists (
    select 1 from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.id = order_item_id
      and (o.customer_id is null or o.customer_id = auth.uid())
  )
);

create policy order_item_flavors_select_own on public.order_item_flavors
for select
using (
  exists (
    select 1 from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.id = order_item_id
      and auth.uid() is not null
      and o.customer_id = auth.uid()
  )
);

create policy promo_code_redemptions_insert on public.promo_code_redemptions
for insert
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.customer_id is null or o.customer_id = auth.uid())
  )
);

-- Newsletter: anyone can subscribe; nobody can read the list back here.
create policy newsletter_insert on public.newsletter_subscribers
for insert
with check (true);

-- Profiles: any authenticated user manages only their own row. Role
-- changes are additionally guarded by trg_prevent_self_role_change.
create policy profiles_select_own on public.profiles
for select
using (auth.uid() = id);

create policy profiles_update_own on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);
