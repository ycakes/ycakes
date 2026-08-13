-- Client-supplied INSERTs on orders/order_items currently pass through
-- ownership-only RLS checks unchecked: an anon caller could set
-- status='completed', final_price, or lifecycle timestamps directly, and
-- nothing enforced that a chosen tier_id is actually valid for the chosen
-- size_id. This migration closes both gaps.

-- Force admin/lifecycle-authority fields on every insert, regardless of
-- what the client supplied. subtotal_estimate/delivery_price/discount_amount
-- are left untouched — those remain client-computed estimates by design.
create or replace function public.normalize_order_on_insert()
returns trigger
language plpgsql
as $$
begin
  new.status := 'pending';
  new.final_price := null;
  new.confirmed_at := null;
  new.completed_at := null;
  new.cancelled_at := null;
  return new;
end;
$$;

create trigger trg_normalize_order_on_insert
before insert on public.orders
for each row execute function public.normalize_order_on_insert();

-- A chosen tier must actually be valid for the chosen size per size_tiers.
-- MATCH SIMPLE (default) exempts a NULL tier_id from the check, which is
-- correct: no tier chosen is always valid.
alter table public.order_items
  add constraint order_items_size_tier_fkey
  foreign key (size_id, tier_id) references public.size_tiers(size_id, tier_id);

-- Prevent the same flavor occupying both halves of a 50/50 split.
alter table public.order_item_flavors
  add constraint order_item_flavors_unique_flavor
  unique (order_item_id, flavor_id);
