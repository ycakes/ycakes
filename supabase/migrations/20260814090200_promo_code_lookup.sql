-- public_read_active_promo let anyone enumerate every active promo code and
-- its discount terms via GET /rest/v1/promo_codes?select=*. Checkout only
-- ever needs to validate one specific code the customer typed in, so
-- replace the broad SELECT policy with a narrow, exact-match RPC.

drop policy public_read_active_promo on public.promo_codes;

create or replace function public.validate_promo_code(p_code text)
returns table (
  id uuid,
  discount_type text,
  discount_value numeric,
  min_order_amount numeric
)
language sql
security definer
set search_path = public
stable
as $$
  select id, discount_type, discount_value, min_order_amount
  from public.promo_codes
  where code = p_code
    and active = true
    and (expiry_date is null or expiry_date >= current_date)
$$;

grant execute on function public.validate_promo_code(text) to anon, authenticated;
