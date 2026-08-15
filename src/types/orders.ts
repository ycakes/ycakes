import type { ContactMethod } from "./auth";
import type { Bilingual } from "./catalog";

export type OrderStatus = "pending" | "confirmed" | "completed" | "cancelled";

export type OrderHistoryRow = {
  id: string;
  order_number: string;
  status: OrderStatus;
  created_at: string;
  subtotal_estimate: number;
  final_price: number | null;
  order_items: { quantity: number; cakes: { name: Bilingual } | null }[];
};

export type OrderDetailItem = {
  quantity: number;
  line_estimate: number;
  is_fake: boolean;
  fake_size_cm: number | null;
  text_on_cake: string | null;
  text_on_board: string | null;
  notes: string | null;
  reference_image_url: string | null;
  color_arrangement_notes: string | null;
  cakes: { name: Bilingual; primary_image_url: string | null } | null;
  sizes: { min_qty: number; max_qty: number; unit: "servings" | "quantity" | "cm" } | null;
  tiers: { tier_count: number } | null;
  shape: { name: Bilingual } | null;
  fake_shape: { name: Bilingual } | null;
  topper: { name: Bilingual } | null;
  order_item_flavors: { flavors: { name: Bilingual } }[];
  order_item_colors: { colors: { name: Bilingual } }[];
};

export type OrderDetail = {
  order_number: string;
  status: OrderStatus;
  created_at: string;
  fulfillment_type: "pickup" | "delivery";
  delivery_address: string | null;
  fulfillment_date: string;
  notes: string | null;
  subtotal_estimate: number;
  delivery_price: number;
  discount_amount: number;
  final_price: number | null;
  delivery_areas: { name: Bilingual } | null;
  order_items: OrderDetailItem[];
};

// What Order Confirmation renders. Guests have no DB read access to their
// own order (ARCHITECTURE.md: "visible only to admin"), so this is built
// from what Checkout already knows at submission time and handed off via
// sessionStorage — never re-fetched, for guests or logged-in customers
// alike (one code path instead of two).
export type OrderConfirmationSnapshot = {
  orderNumber: string;
  lineItems: {
    name: string;
    image: string | null;
    attributesSummary: string;
    quantity: number;
    lineEstimate: number;
  }[];
  fulfillmentMethod: "pickup" | "delivery";
  deliveryAreaName: string | null;
  fulfillmentDate: string;
  contactName: string;
  phone: string;
  phoneMethod: ContactMethod;
  address: string;
  total: number;
};
