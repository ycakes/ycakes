-- Phase 6 Order Detail is the first place order status is ever changed
-- post-creation. orders.confirmed_at/completed_at/cancelled_at exist but
-- nothing has ever populated them (normalize_order_on_insert only forces
-- them to null on insert). Stamp each the first time status reaches that
-- value; don't clear an earlier stamp when status later moves on (e.g.
-- confirmed -> completed keeps confirmed_at as a lifecycle record instead
-- of erasing it).
create or replace function public.fn_stamp_order_status_timestamps()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'confirmed' and new.confirmed_at is null then
      new.confirmed_at := now();
    elsif new.status = 'completed' and new.completed_at is null then
      new.completed_at := now();
    elsif new.status = 'cancelled' and new.cancelled_at is null then
      new.cancelled_at := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_stamp_order_status_timestamps
before update on public.orders
for each row execute function public.fn_stamp_order_status_timestamps();
