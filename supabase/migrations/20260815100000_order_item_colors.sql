-- Multi-select icing colors (owner request): a cake can now have any number
-- of icing colors per order_item, ordered by selection order (mirrors the
-- existing order_item_flavors pattern rather than a single required FK).
-- No orders exist yet, so this is a straight column drop + new table, no
-- backfill needed.

create table public.order_item_colors (
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  color_id uuid not null references public.colors(id),
  sort_order smallint not null default 1,
  primary key (order_item_id, color_id)
);
create index idx_order_item_colors_order_item_id on public.order_item_colors(order_item_id);
alter table public.order_item_colors enable row level security;

alter table public.order_items drop column color_id;

-- RLS: same shape as order_item_flavors (public.rls_public /
-- rls_performance / rls_admin_accountant), written directly in the
-- role-scoped + (select auth.uid()) optimized form since this table is
-- created after that optimization pass.
create policy order_item_colors_insert on public.order_item_colors
for insert
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

create policy order_item_colors_select_own on public.order_item_colors
for select
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

create policy admin_all on public.order_item_colors
for all
to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

create policy accountant_read on public.order_item_colors
for select
to authenticated
using (public.current_profile_role() = 'accountant');

create trigger trg_audit_order_item_colors
after insert or update or delete on public.order_item_colors
for each row execute function public.fn_audit_log();
