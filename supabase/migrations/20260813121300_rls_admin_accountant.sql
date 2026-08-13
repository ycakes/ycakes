-- Admins have full CRUD on every table except audit_log (append-only,
-- trigger-populated — no policy grants direct writes to it for anyone).
do $$
declare
  t text;
begin
  foreach t in array array[
    'categories','sizes','tiers','size_tiers','flavors','colors','shapes',
    'toppers','topper_colors','cakes','cake_images','cake_flavors','cake_colors','cake_toppers',
    'delivery_areas','delivery_calendar_blocks','promo_codes','promo_code_redemptions',
    'orders','order_items','order_item_flavors','expense_categories','expenses',
    'newsletter_subscribers','profiles'
  ]
  loop
    execute format(
      'create policy admin_all on public.%1$s for all using (public.current_profile_role() = %2$L) with check (public.current_profile_role() = %2$L);',
      t, 'admin'
    );
  end loop;
end $$;

-- Accountants: read-only on orders and money-adjacent catalog context,
-- full control of expenses (their actual domain). No catalog write access,
-- per ARCHITECTURE.md's role definition.
do $$
declare
  t text;
begin
  foreach t in array array[
    'orders','order_items','order_item_flavors',
    'promo_codes','promo_code_redemptions','delivery_areas'
  ]
  loop
    execute format(
      'create policy accountant_read on public.%1$s for select using (public.current_profile_role() = %2$L);',
      t, 'accountant'
    );
  end loop;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array['expense_categories','expenses']
  loop
    execute format(
      'create policy accountant_all on public.%1$s for all using (public.current_profile_role() = %2$L) with check (public.current_profile_role() = %2$L);',
      t, 'accountant'
    );
  end loop;
end $$;

-- Audit log: admin can read history; nobody (including admin) writes to it
-- directly — only fn_audit_log(), running as the migration owner, does.
create policy audit_log_admin_read on public.audit_log
for select
using (public.current_profile_role() = 'admin');
