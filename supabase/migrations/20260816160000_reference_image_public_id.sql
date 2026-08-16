-- Reference images are now uploaded to Cloudinary at selection time (see
-- src/lib/customer/cloudinaryUpload.ts) instead of staying a local blob:
-- URL. Storing the Cloudinary public_id alongside the URL, matching the
-- existing cake_images.public_id / categories.image_public_id /
-- toppers.image_public_id convention, so a future cleanup job can call
-- Cloudinary's destroy API directly instead of parsing it back out of the
-- URL. That cleanup job itself is not built yet — see ARCHITECTURE.md.
alter table public.order_items add column reference_image_public_id text;

create or replace function public.create_order(
  p_customer_id uuid,
  p_guest_name text,
  p_guest_phone text,
  p_fulfillment_type text,
  p_delivery_area_id uuid,
  p_delivery_address text,
  p_fulfillment_date date,
  p_promo_code_id uuid,
  p_subtotal_estimate numeric,
  p_delivery_price numeric,
  p_discount_amount numeric,
  p_notes text,
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
begin
  if p_customer_id is not null and p_customer_id <> auth.uid() then
    raise exception 'customer_id must match the authenticated caller';
  end if;
  if p_customer_id is null and (p_guest_name is null or p_guest_phone is null) then
    raise exception 'guest_name and guest_phone are required for guest orders';
  end if;

  insert into public.orders (
    customer_id, guest_name, guest_phone, fulfillment_type, delivery_area_id,
    delivery_address, fulfillment_date, promo_code_id, subtotal_estimate,
    delivery_price, discount_amount, notes
  ) values (
    p_customer_id, p_guest_name, p_guest_phone, p_fulfillment_type, p_delivery_area_id,
    p_delivery_address, p_fulfillment_date, p_promo_code_id, p_subtotal_estimate,
    p_delivery_price, p_discount_amount, p_notes
  )
  returning public.orders.id, public.orders.order_number into v_order_id, v_order_number;

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
      (v_item->>'cake_id')::uuid,
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
      (v_item->>'price_modifiers_total')::numeric,
      (v_item->>'line_estimate')::numeric,
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

  if p_promo_code_id is not null then
    insert into public.promo_code_redemptions (promo_code_id, order_id)
    values (p_promo_code_id, v_order_id);
  end if;

  return query select v_order_id, v_order_number;
end;
$$;

grant execute on function public.create_order(
  uuid, text, text, text, uuid, text, date, uuid, numeric, numeric, numeric, text, jsonb
) to anon, authenticated;
