-- All 60+ existing policies have no TO clause (default {public}), so every
-- policy -- including admin/accountant checks that can never pass for
-- anon -- is evaluated on every query from every role. This scopes each
-- policy to the roles it can actually apply to, and rewrites bare
-- auth.uid() calls as (select auth.uid()) so it's evaluated once per query
-- (initplan) instead of once per row.

-- admin_all: role check can only ever pass for an authenticated admin.
do $$
declare
  t text;
begin
  foreach t in array array[
    'cake_colors','cake_flavors','cake_images','cake_toppers','cakes',
    'categories','colors','delivery_areas','delivery_calendar_blocks',
    'expense_categories','expenses','flavors','newsletter_subscribers',
    'order_item_flavors','order_items','orders','profiles',
    'promo_code_redemptions','promo_codes','shapes','size_tiers','sizes',
    'tiers','topper_colors','toppers'
  ]
  loop
    execute format('alter policy admin_all on public.%I to authenticated;', t);
  end loop;
end $$;

-- accountant_read / accountant_all: same reasoning, accountant role only.
do $$
declare
  t text;
begin
  foreach t in array array[
    'delivery_areas','order_item_flavors','order_items','orders',
    'promo_code_redemptions','promo_codes'
  ]
  loop
    execute format('alter policy accountant_read on public.%I to authenticated;', t);
  end loop;

  foreach t in array array['expense_categories','expenses']
  loop
    execute format('alter policy accountant_all on public.%I to authenticated;', t);
  end loop;
end $$;

alter policy audit_log_admin_read on public.audit_log to authenticated;

-- Public catalog reads: meant for everyone, guest or logged in.
do $$
declare
  t text;
begin
  foreach t in array array[
    'cakes','categories','colors','delivery_areas','flavors','shapes',
    'sizes','tiers','toppers'
  ]
  loop
    execute format('alter policy public_read_active on public.%I to anon, authenticated;', t);
  end loop;

  foreach t in array array[
    'cake_colors','cake_flavors','cake_images','cake_toppers',
    'delivery_calendar_blocks','size_tiers','topper_colors'
  ]
  loop
    execute format('alter policy public_read_all on public.%I to anon, authenticated;', t);
  end loop;
end $$;

-- Own-row read/update policies already require auth.uid() IS NOT NULL in
-- their logic; scoping the role too removes them from the anon evaluation
-- path entirely. Rewrite their auth.uid() calls to (select auth.uid()) at
-- the same time.
alter policy orders_select_own on public.orders
to authenticated
using (
  (select auth.uid()) is not null and customer_id = (select auth.uid())
);

alter policy order_items_select_own on public.order_items
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (select auth.uid()) is not null
      and o.customer_id = (select auth.uid())
  )
);

alter policy order_item_flavors_select_own on public.order_item_flavors
to authenticated
using (
  exists (
    select 1 from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.id = order_item_id
      and (select auth.uid()) is not null
      and o.customer_id = (select auth.uid())
  )
);

alter policy profiles_select_own on public.profiles
to authenticated
using ((select auth.uid()) = id);

alter policy profiles_update_own on public.profiles
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Guest + logged-in customer write paths. order_items_insert,
-- order_item_flavors_insert and promo_code_redemptions_insert carry the
-- pending/1-hour window added in 20260814090100_guest_order_write_window.sql
-- -- preserved here while wrapping auth.uid().
alter policy orders_insert on public.orders
to anon, authenticated
with check (
  customer_id is null or customer_id = (select auth.uid())
);

alter policy order_items_insert on public.order_items
to anon, authenticated
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.customer_id is null or o.customer_id = (select auth.uid()))
      and o.status = 'pending'
      and o.created_at > now() - interval '1 hour'
  )
);

alter policy order_item_flavors_insert on public.order_item_flavors
to anon, authenticated
with check (
  exists (
    select 1 from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.id = order_item_id
      and (o.customer_id is null or o.customer_id = (select auth.uid()))
      and o.status = 'pending'
      and o.created_at > now() - interval '1 hour'
  )
);

alter policy promo_code_redemptions_insert on public.promo_code_redemptions
to anon, authenticated
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.customer_id is null or o.customer_id = (select auth.uid()))
      and o.status = 'pending'
      and o.created_at > now() - interval '1 hour'
  )
);

alter policy newsletter_insert on public.newsletter_subscribers
to anon, authenticated
with check (true);
