create table public.promo_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes(id),
  order_id uuid not null references public.orders(id),
  created_at timestamptz not null default now(),
  unique (order_id)
);
create index idx_promo_code_redemptions_promo_code_id on public.promo_code_redemptions(promo_code_id);
alter table public.promo_code_redemptions enable row level security;

create or replace function public.check_promo_redemption_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promo record;
  v_count int;
begin
  select * into v_promo from public.promo_codes where id = new.promo_code_id for update;

  if not found then
    raise exception 'Promo code % not found', new.promo_code_id;
  end if;

  if not v_promo.active then
    raise exception 'Promo code % is not active', v_promo.code;
  end if;

  if v_promo.expiry_date is not null and v_promo.expiry_date < current_date then
    raise exception 'Promo code % has expired', v_promo.code;
  end if;

  if v_promo.redemption_cap is not null then
    select count(*) into v_count
    from public.promo_code_redemptions
    where promo_code_id = new.promo_code_id;

    if v_count >= v_promo.redemption_cap then
      raise exception 'Promo code % has reached its redemption cap', v_promo.code;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_check_promo_redemption_cap
before insert on public.promo_code_redemptions
for each row execute function public.check_promo_redemption_cap();
