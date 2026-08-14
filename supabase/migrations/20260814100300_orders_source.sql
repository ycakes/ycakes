-- Distinguish manually-entered offline/Instagram orders from real website
-- orders for reporting (ARCHITECTURE.md "Manual/offline order entry"),
-- while both remain included in analytics by default. Manual entry itself
-- is a later admin-phase feature; this only adds the column now so orders
-- isn't designed assuming every order came through the customer-facing flow.
alter table public.orders add column source text not null default 'website'
  check (source in ('website', 'phone', 'instagram', 'in_person'));

-- The only insert path today is the customer-facing storefront (guest or
-- authenticated customer, per orders_insert RLS), so force 'website'
-- regardless of what the client supplies. Manual/offline entry (Phase 6,
-- admin-only) will need its own privileged insert path and can override
-- this then.
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
  new.source := 'website';
  return new;
end;
$$;
