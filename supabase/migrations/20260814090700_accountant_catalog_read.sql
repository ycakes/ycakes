-- Product decision: accountants get read-only access to the catalog so
-- analytics can join order_items/order_item_flavors down to human-readable
-- names (cake, category, size, flavor, color, shape, topper) instead of
-- bare IDs. Deliberately unfiltered by `active` (unlike the public
-- read policy) so historical orders referencing a since-disabled or
-- since-deleted-from-sale item still resolve to a name in reporting --
-- same reasoning already applied to delivery_areas in
-- 20260813121300_rls_admin_accountant.sql. No write access: catalog
-- management stays admin-only per ARCHITECTURE.md's role definition.
do $$
declare
  t text;
begin
  foreach t in array array[
    'categories','sizes','tiers','size_tiers','flavors','colors','shapes',
    'toppers','topper_colors','cakes','cake_images','cake_flavors',
    'cake_colors','cake_toppers'
  ]
  loop
    execute format(
      'create policy accountant_read on public.%1$s for select to authenticated using (public.current_profile_role() = %2$L);',
      t, 'accountant'
    );
  end loop;
end $$;
