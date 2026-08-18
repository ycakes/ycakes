import { createClient } from "@/lib/supabase/client";
import type { ContactMethod } from "@/types/auth";
import type { CakeItemFieldsValue } from "@/types/adminCakeItem";

export type ManualOrderItem = {
  key: string;
  cakeId: string | null;
  cakeName: string;
  categoryId: string | null;
  quantity: number;
  price: string;
  customizing: boolean;
  customNotes: string;
  fields: CakeItemFieldsValue;
};

export function emptyFieldsValue(): CakeItemFieldsValue {
  return {
    isFake: false,
    sizeId: null,
    tierId: null,
    flavorId: null,
    fiftyFifty: false,
    secondFlavorId: null,
    shapeId: null,
    fakeSizeCm: "",
    fakeShapeId: null,
    referenceImageUrl: null,
    referenceImagePublicId: null,
    colorIds: [],
    colorArrangementNotes: "",
    topperId: null,
    topperColorId: null,
    textOnCake: "",
    textOnBoard: "",
    notes: "",
  };
}

function itemToPayload(item: ManualOrderItem) {
  const f = item.fields;
  const notes = item.cakeId === null ? item.customNotes || null : f.notes || null;
  return {
    cake_id: item.cakeId,
    size_id: f.isFake ? null : f.sizeId,
    tier_id: f.isFake ? null : f.tierId,
    shape_id: f.isFake ? null : f.shapeId,
    is_fifty_fifty: !f.isFake && f.fiftyFifty,
    topper_id: f.topperId,
    topper_color_id: f.topperColorId,
    text_on_cake: f.textOnCake || null,
    text_on_board: f.textOnBoard || null,
    notes,
    quantity: item.quantity,
    unit_base_price: Number(item.price) || 0,
    is_fake: f.isFake,
    fake_size_cm: f.isFake && f.fakeSizeCm ? Number(f.fakeSizeCm) : null,
    fake_shape_id: f.isFake ? f.fakeShapeId : null,
    reference_image_url: f.referenceImageUrl,
    reference_image_public_id: f.referenceImagePublicId,
    color_arrangement_notes: f.colorIds.length > 1 ? f.colorArrangementNotes || null : null,
    flavor_ids: f.isFake ? [] : [f.flavorId, ...(f.fiftyFifty && f.secondFlavorId ? [f.secondFlavorId] : [])].filter(
      (id): id is string => Boolean(id),
    ),
    color_ids: f.colorIds,
  };
}

export type CreateManualOrderInput = {
  guestName: string;
  contactPhone: string | null;
  contactPhoneMethod: ContactMethod;
  contactPhone2: string | null;
  contactPhone2Method: ContactMethod;
  instagramUsername: string | null;
  email: string | null;
  source: "phone" | "instagram" | "in_person";
  fulfillmentType: "pickup" | "delivery";
  deliveryAreaId: string | null;
  deliveryAddress: string | null;
  fulfillmentDate: string;
  notes: string | null;
  deliveryPrice: number;
  items: ManualOrderItem[];
};

export async function createManualOrder(input: CreateManualOrderInput): Promise<{ id: string; orderNumber: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .rpc("create_manual_order", {
      p_guest_name: input.guestName,
      p_contact_phone: input.contactPhone,
      p_contact_phone_method: input.contactPhone ? input.contactPhoneMethod : null,
      p_contact_phone_2: input.contactPhone2,
      p_contact_phone_2_method: input.contactPhone2 ? input.contactPhone2Method : null,
      p_instagram_username: input.instagramUsername,
      p_email: input.email,
      p_source: input.source,
      p_fulfillment_type: input.fulfillmentType,
      p_delivery_area_id: input.deliveryAreaId,
      p_delivery_address: input.deliveryAddress,
      p_fulfillment_date: input.fulfillmentDate,
      p_notes: input.notes,
      p_delivery_price: input.deliveryPrice,
      p_items: input.items.map(itemToPayload),
    })
    .single();

  if (error) throw error;
  return {
    id: (data as { id: string; order_number: string }).id,
    orderNumber: (data as { order_number: string }).order_number,
  };
}
