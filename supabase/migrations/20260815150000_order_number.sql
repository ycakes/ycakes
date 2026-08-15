-- Human-friendly order number (Figma Order Confirmation mockup: format
-- YC-YYYYMMDD-####) — orders previously only had a uuid id. A real
-- sequence (not a same-day row count) avoids race conditions between
-- concurrent checkouts.

create sequence public.orders_order_number_seq;

alter table public.orders add column order_number text;

create or replace function public.set_order_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.order_number := 'YC-' || to_char(now(), 'YYYYMMDD') || '-' ||
    lpad(nextval('public.orders_order_number_seq')::text, 4, '0');
  return new;
end;
$$;

create trigger trg_set_order_number
before insert on public.orders
for each row execute function public.set_order_number();

alter table public.orders alter column order_number set not null;
alter table public.orders add constraint orders_order_number_unique unique (order_number);
