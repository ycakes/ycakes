-- Phase 6 New Order (manual/offline entry): admin registers orders placed
-- by phone/Instagram DM/in-person directly into the dashboard.
--
-- Three schema changes this needs, plus a dedicated privileged insert RPC:
--
-- 1. order_items.cake_id becomes nullable — New Order's "Custom / Other
--    (describe in notes)" option has no real cakes row to reference; the
--    admin describes it in the line item's existing `notes` field instead
--    of adding a new column.
-- 2. order_items_fake_cake_fields relaxed: it used to require size_id AND
--    shape_id on every non-fake item, which assumed every order_item came
--    through the storefront's CakeCustomizer (which always sets them
--    before allowing add-to-cart). New Order's "+ Add customization
--    details" is optional/expandable per the Figma annotation — a quick
--    cake + qty + price entry with no further detail must be insertable.
--    The mutual-exclusivity rule (a non-fake item can't carry fake fields,
--    a fake item must carry its own required fields) is unchanged.
-- 3. orders.email — New Order's Customer Details has an optional Email
--    field with nowhere to go (no existing column captures it for a
--    guest-shaped order).
alter table public.order_items alter column cake_id drop not null;

alter table public.order_items drop constraint order_items_fake_cake_fields;
alter table public.order_items add constraint order_items_fake_cake_fields check (
  (
    is_fake = false
    and fake_size_cm is null
    and fake_shape_id is null
  ) or (
    is_fake = true
    and size_id is null
    and shape_id is null
    and tier_id is null
    and is_fifty_fifty = false
    and fake_size_cm is not null
    and fake_shape_id is not null
  )
);

alter table public.orders add column email text;

-- SECURITY DEFINER, admin-only (self-checked, same pattern as create_order/
-- update_order_item_customization): normalize_order_on_insert forces
-- status='pending', final_price=null, source='website' on every insert
-- into orders regardless of caller, since the only insert path before this
-- was the customer-facing storefront flow. Rather than special-case that
-- trigger, this function inserts normally (letting it force those
-- defaults same as any other insert) then immediately updates source and
-- final_price on the same row — final_price is set directly, not left as
-- an estimate, since these prices were already agreed with the customer
-- over the call/DM, unlike a website order awaiting admin confirmation.
create or replace function public.create_manual_order(
  p_guest_name text,
  p_contact_phone text,
  p_contact_phone_method text,
  p_email text,
  p_source text,
  p_fulfillment_type text,
  p_delivery_area_id uuid,
  p_delivery_address text,
  p_fulfillment_date date,
  p_notes text,
  p_delivery_price numeric,
  p_items jsonb
)
returns table (id uuid, order_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_item_id uuid;
  v_flavor_id uuid;
  v_color_id uuid;
  v_pos smallint;
  v_subtotal numeric := 0;
begin
  if public.current_profile_role() <> 'admin' then
    raise exception 'Only admins can create manual orders';
  end if;
  if p_source not in ('phone', 'instagram', 'in_person') then
    raise exception 'Manual orders must have source phone, instagram, or in_person';
  end if;
  if p_guest_name is null or p_contact_phone is null then
    raise exception 'Customer name and phone are required';
  end if;

  select coalesce(sum((v->>'unit_base_price')::numeric * (v->>'quantity')::int), 0)
  into v_subtotal
  from jsonb_array_elements(p_items) v;

  insert into public.orders (
    customer_id, guest_name, contact_phone, contact_phone_method, email,
    fulfillment_type, delivery_area_id, delivery_address, fulfillment_date,
    subtotal_estimate, delivery_price, discount_amount, notes
  ) values (
    null, p_guest_name, p_contact_phone, p_contact_phone_method, p_email,
    p_fulfillment_type, p_delivery_area_id, p_delivery_address, p_fulfillment_date,
    v_subtotal, p_delivery_price, 0, p_notes
  )
  returning public.orders.id, public.orders.order_number into v_order_id, v_order_number;

  update public.orders
  set source = p_source, final_price = v_subtotal + p_delivery_price
  where id = v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.order_items (
      order_id, cake_id, size_id, tier_id, shape_id, is_fifty_fifty,
      topper_id, topper_color_id, text_on_cake, text_on_board, notes,
      quantity, unit_base_price, price_modifiers_total, line_estimate,
      is_fake, fake_size_cm, fake_shape_id, reference_image_url,
      reference_image_public_id, color_arrangement_notes
    ) values (
      v_order_id,
      nullif(v_item->>'cake_id', '')::uuid,
      nullif(v_item->>'size_id', '')::uuid,
      nullif(v_item->>'tier_id', '')::uuid,
      nullif(v_item->>'shape_id', '')::uuid,
      coalesce((v_item->>'is_fifty_fifty')::boolean, false),
      nullif(v_item->>'topper_id', '')::uuid,
      nullif(v_item->>'topper_color_id', '')::uuid,
      nullif(v_item->>'text_on_cake', ''),
      nullif(v_item->>'text_on_board', ''),
      nullif(v_item->>'notes', ''),
      (v_item->>'quantity')::int,
      (v_item->>'unit_base_price')::numeric,
      0,
      (v_item->>'unit_base_price')::numeric * (v_item->>'quantity')::int,
      coalesce((v_item->>'is_fake')::boolean, false),
      nullif(v_item->>'fake_size_cm', '')::numeric,
      nullif(v_item->>'fake_shape_id', '')::uuid,
      nullif(v_item->>'reference_image_url', ''),
      nullif(v_item->>'reference_image_public_id', ''),
      nullif(v_item->>'color_arrangement_notes', '')
    )
    returning public.order_items.id into v_item_id;

    v_pos := 1;
    for v_flavor_id in
      select (jsonb_array_elements_text(coalesce(v_item->'flavor_ids', '[]'::jsonb)))::uuid
    loop
      insert into public.order_item_flavors (order_item_id, flavor_id, position)
      values (v_item_id, v_flavor_id, v_pos);
      v_pos := v_pos + 1;
    end loop;

    v_pos := 1;
    for v_color_id in
      select (jsonb_array_elements_text(coalesce(v_item->'color_ids', '[]'::jsonb)))::uuid
    loop
      insert into public.order_item_colors (order_item_id, color_id, sort_order)
      values (v_item_id, v_color_id, v_pos);
      v_pos := v_pos + 1;
    end loop;
  end loop;

  return query select v_order_id, v_order_number;
end;
$$;

grant execute on function public.create_manual_order(
  text, text, text, text, text, text, uuid, text, date, text, numeric, jsonb
) to authenticated;
