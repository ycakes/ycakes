-- Admin Order Detail: editing a line item's customization (Phase 6). Mirrors
-- fn_replace_topper_colors' reasoning (20260816110000) — the flavor/color
-- join rows need a delete+reinsert alongside the order_items row update, and
-- doing that as two separate client calls risks a partial write if the
-- second fails. SECURITY DEFINER so it can write order_item_flavors/
-- order_item_colors regardless of their RLS (customer-write-window scoped,
-- not meant for admin use) — self-checks the caller is admin instead, same
-- pattern create_order() uses for its own authorization.
create or replace function public.update_order_item_customization(
  p_order_item_id uuid,
  p_size_id uuid,
  p_tier_id uuid,
  p_shape_id uuid,
  p_is_fifty_fifty boolean,
  p_topper_id uuid,
  p_topper_color_id uuid,
  p_text_on_cake text,
  p_text_on_board text,
  p_notes text,
  p_is_fake boolean,
  p_fake_size_cm numeric,
  p_fake_shape_id uuid,
  p_reference_image_url text,
  p_reference_image_public_id text,
  p_color_arrangement_notes text,
  p_flavor_ids uuid[],
  p_color_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pos smallint;
  v_flavor_id uuid;
  v_color_id uuid;
begin
  if public.current_profile_role() <> 'admin' then
    raise exception 'Only admins can edit order item customization';
  end if;

  update public.order_items set
    size_id = p_size_id,
    tier_id = p_tier_id,
    shape_id = p_shape_id,
    is_fifty_fifty = p_is_fifty_fifty,
    topper_id = p_topper_id,
    topper_color_id = p_topper_color_id,
    text_on_cake = p_text_on_cake,
    text_on_board = p_text_on_board,
    notes = p_notes,
    is_fake = p_is_fake,
    fake_size_cm = p_fake_size_cm,
    fake_shape_id = p_fake_shape_id,
    reference_image_url = p_reference_image_url,
    reference_image_public_id = p_reference_image_public_id,
    color_arrangement_notes = p_color_arrangement_notes
  where id = p_order_item_id;

  delete from public.order_item_flavors where order_item_id = p_order_item_id;
  v_pos := 1;
  for v_flavor_id in select unnest(p_flavor_ids)
  loop
    insert into public.order_item_flavors (order_item_id, flavor_id, position)
    values (p_order_item_id, v_flavor_id, v_pos);
    v_pos := v_pos + 1;
  end loop;

  delete from public.order_item_colors where order_item_id = p_order_item_id;
  v_pos := 1;
  for v_color_id in select unnest(p_color_ids)
  loop
    insert into public.order_item_colors (order_item_id, color_id, sort_order)
    values (p_order_item_id, v_color_id, v_pos);
    v_pos := v_pos + 1;
  end loop;
end;
$$;

grant execute on function public.update_order_item_customization(
  uuid, uuid, uuid, uuid, boolean, uuid, uuid, text, text, text, boolean, numeric, uuid, text, text, text, uuid[], uuid[]
) to authenticated;
