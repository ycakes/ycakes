-- Bug fix: create_manual_order's RETURNS TABLE(id uuid, order_number text)
-- introduces an implicit `id` variable in the function's plpgsql namespace.
-- The post-insert `update public.orders set ... where id = v_order_id`
-- referenced that bare `id`, which Postgres can't disambiguate from
-- orders.id ("column reference \"id\" is ambiguous"), so every manual order
-- create failed. Qualify it with the table name, same as the rest of the
-- function already does for orders.id/order_items.id.
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
  where public.orders.id = v_order_id;

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
