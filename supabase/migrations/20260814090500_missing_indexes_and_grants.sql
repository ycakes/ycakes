-- Foreign-key columns used in RLS EXISTS subqueries / join filters but
-- never indexed.
create index if not exists idx_orders_customer_id on public.orders(customer_id);
create index if not exists idx_orders_delivery_area_id on public.orders(delivery_area_id);
create index if not exists idx_orders_promo_code_id on public.orders(promo_code_id);
create index if not exists idx_expenses_created_by on public.expenses(created_by);
create index if not exists idx_cake_flavors_flavor_id on public.cake_flavors(flavor_id);
create index if not exists idx_cake_colors_color_id on public.cake_colors(color_id);
create index if not exists idx_cake_toppers_topper_id on public.cake_toppers(topper_id);

-- Revoke stray default grants PostgREST doesn't need and RLS doesn't
-- govern (TRUNCATE bypasses RLS entirely; REFERENCES/TRIGGER are DDL-ish
-- privileges anon/authenticated have no business holding).
do $$
declare
  t text;
begin
  foreach t in array (select array_agg(tablename) from pg_tables where schemaname = 'public')
  loop
    execute format('revoke truncate, references, trigger on public.%I from anon, authenticated;', t);
  end loop;
end $$;
