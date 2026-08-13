-- The ownership-only checks on these three insert policies let anyone
-- holding a guest order's UUID keep attaching items/redemptions to it
-- indefinitely, including after the admin has confirmed/completed it.
-- Bound the write window: only while the order is still pending and was
-- created within the last hour. Ownership logic is unchanged.

alter policy order_items_insert on public.order_items
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.customer_id is null or o.customer_id = auth.uid())
      and o.status = 'pending'
      and o.created_at > now() - interval '1 hour'
  )
);

alter policy order_item_flavors_insert on public.order_item_flavors
with check (
  exists (
    select 1 from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.id = order_item_id
      and (o.customer_id is null or o.customer_id = auth.uid())
      and o.status = 'pending'
      and o.created_at > now() - interval '1 hour'
  )
);

alter policy promo_code_redemptions_insert on public.promo_code_redemptions
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.customer_id is null or o.customer_id = auth.uid())
      and o.status = 'pending'
      and o.created_at > now() - interval '1 hour'
  )
);
