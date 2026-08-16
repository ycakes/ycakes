-- Owner request: a logged-in customer can cancel their own order from
-- Profile > Order History, but only while it's still pending — once an
-- admin has confirmed/completed/cancelled it, the storefront instead shows
-- a "contact us" prompt (WhatsApp/Instagram) rather than a Cancel button.
-- security definer + self-check, same pattern as create_order/
-- update_order_item_customization: no RLS update policy is added for
-- customers on orders, this narrow RPC is the only write path.
create or replace function public.cancel_own_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
  set status = 'cancelled'
  where id = p_order_id
    and customer_id = auth.uid()
    and status = 'pending';

  if not found then
    raise exception 'Order not found, not yours, or no longer pending';
  end if;
end;
$$;

grant execute on function public.cancel_own_order(uuid) to authenticated;
