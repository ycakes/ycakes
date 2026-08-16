import { createClient } from "@/lib/supabase/client";
import type { CartItem } from "@/types/cart";

export type CreateOrderInput = {
  customerId: string | null;
  guestName: string | null;
  guestPhone: string | null;
  fulfillmentType: "pickup" | "delivery";
  deliveryAreaId: string | null;
  deliveryAddress: string;
  fulfillmentDate: string;
  promoCodeId: string | null;
  subtotalEstimate: number;
  deliveryPrice: number;
  discountAmount: number;
  notes: string | null;
  items: CartItem[];
};

function itemToPayload(item: CartItem) {
  return {
    cake_id: item.cakeId,
    size_id: item.sizeId,
    tier_id: item.tierId,
    shape_id: item.shapeId,
    is_fifty_fifty: item.isFiftyFifty,
    topper_id: item.topperId,
    topper_color_id: item.topperColorId,
    text_on_cake: item.textOnCake,
    text_on_board: item.textOnBoard,
    notes: item.notes,
    quantity: item.quantity,
    unit_base_price: item.unitBasePrice,
    price_modifiers_total: item.priceModifiersTotal,
    line_estimate: item.lineEstimate,
    is_fake: item.isFake,
    fake_size_cm: item.fakeSizeCm,
    fake_shape_id: item.fakeShapeId,
    reference_image_url: item.referenceImageUrl,
    reference_image_public_id: item.referenceImagePublicId,
    color_arrangement_notes: item.colorArrangementNotes,
    flavor_ids: item.flavorIds,
    color_ids: item.colorIds,
  };
}

/** Calls the create_order RPC — one atomic transaction across orders/order_items/
 * order_item_flavors/order_item_colors/promo_code_redemptions. See
 * 20260815150100_create_order_rpc.sql for why this isn't several sequential
 * client-side inserts. */
export async function createOrder(input: CreateOrderInput): Promise<{ id: string; orderNumber: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .rpc("create_order", {
      p_customer_id: input.customerId,
      p_guest_name: input.guestName,
      p_guest_phone: input.guestPhone,
      p_fulfillment_type: input.fulfillmentType,
      p_delivery_area_id: input.deliveryAreaId,
      p_delivery_address: input.deliveryAddress,
      p_fulfillment_date: input.fulfillmentDate,
      p_promo_code_id: input.promoCodeId,
      p_subtotal_estimate: input.subtotalEstimate,
      p_delivery_price: input.deliveryPrice,
      p_discount_amount: input.discountAmount,
      p_notes: input.notes,
      p_items: input.items.map(itemToPayload),
    })
    .single();

  if (error) throw error;
  return {
    id: (data as { id: string; order_number: string }).id,
    orderNumber: (data as { order_number: string }).order_number,
  };
}
