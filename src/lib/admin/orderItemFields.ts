import type { CakeItemFieldsValue } from "@/types/adminCakeItem";
import type { AdminOrderItemDetail } from "@/types/adminOrderDetail";

export function orderItemToFieldsValue(item: AdminOrderItemDetail): CakeItemFieldsValue {
  const sortedFlavors = [...item.order_item_flavors].sort((a, b) => a.position - b.position);
  const sortedColors = [...item.order_item_colors].sort((a, b) => a.sort_order - b.sort_order);

  return {
    isFake: item.is_fake,
    sizeId: item.size_id,
    tierId: item.tier_id,
    flavorId: sortedFlavors[0]?.flavor_id ?? null,
    fiftyFifty: sortedFlavors.length > 1,
    secondFlavorId: sortedFlavors[1]?.flavor_id ?? null,
    shapeId: item.shape_id,
    fakeSizeCm: item.fake_size_cm != null ? String(item.fake_size_cm) : "",
    fakeShapeId: item.fake_shape_id,
    referenceImageUrl: item.reference_image_url,
    referenceImagePublicId: item.reference_image_public_id,
    colorIds: sortedColors.map((c) => c.color_id),
    colorArrangementNotes: item.color_arrangement_notes ?? "",
    topperId: item.topper_id,
    topperColorId: item.topper_color_id,
    textOnCake: item.text_on_cake ?? "",
    textOnBoard: item.text_on_board ?? "",
    notes: item.notes ?? "",
  };
}

export function buildUpdateOrderItemParams(orderItemId: string, value: CakeItemFieldsValue) {
  return {
    p_order_item_id: orderItemId,
    p_size_id: value.isFake ? null : value.sizeId,
    p_tier_id: value.isFake ? null : value.tierId,
    p_shape_id: value.isFake ? null : value.shapeId,
    p_is_fifty_fifty: !value.isFake && value.fiftyFifty,
    p_topper_id: value.topperId,
    p_topper_color_id: value.topperColorId,
    p_text_on_cake: value.textOnCake || null,
    p_text_on_board: value.textOnBoard || null,
    p_notes: value.notes || null,
    p_is_fake: value.isFake,
    p_fake_size_cm: value.isFake && value.fakeSizeCm ? Number(value.fakeSizeCm) : null,
    p_fake_shape_id: value.isFake ? value.fakeShapeId : null,
    p_reference_image_url: value.referenceImageUrl,
    p_reference_image_public_id: value.referenceImagePublicId,
    p_color_arrangement_notes: value.colorIds.length > 1 ? value.colorArrangementNotes || null : null,
    p_flavor_ids: value.isFake ? [] : [value.flavorId, ...(value.fiftyFifty && value.secondFlavorId ? [value.secondFlavorId] : [])].filter(
      (id): id is string => Boolean(id),
    ),
    p_color_ids: value.colorIds,
  };
}
