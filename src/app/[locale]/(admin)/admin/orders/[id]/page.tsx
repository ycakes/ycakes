import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/admin/requireAdmin";
import { getCategoryById, getColors, getFlavorsForCategory, getShapes, getSizesWithTiers, getTiers, getToppers } from "@/lib/catalog/queries";
import { OrderDetailContent } from "@/components/admin/orders/OrderDetailContent";
import type { AdminOrderDetail, AdminOrderItemDetail } from "@/types/adminOrderDetail";

const ORDER_ITEM_SELECT = `
  id, cake_id, size_id, tier_id, shape_id, is_fifty_fifty, topper_id, topper_color_id,
  text_on_cake, text_on_board, notes, quantity, unit_base_price, price_modifiers_total, line_estimate,
  is_fake, fake_size_cm, fake_shape_id, reference_image_url, reference_image_public_id, color_arrangement_notes,
  cakes(id, name, primary_image_url, category_id),
  sizes(min_qty, max_qty, unit),
  tiers(tier_count),
  shape:shapes!order_items_shape_id_fkey(id, name),
  fake_shape:shapes!order_items_fake_shape_id_fkey(id, name),
  topper:toppers(id, name, has_color_variants),
  topper_color:colors!order_items_topper_color_id_fkey(id, name, hex_code),
  order_item_flavors(flavor_id, position, flavors(name)),
  order_item_colors(color_id, sort_order, colors(name, hex_code))
`;

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = await params;
  const profile = await requireStaff(locale);
  const supabase = await createClient();

  const [{ data: order, error: orderError }, { data: items, error: itemsError }] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, order_number, customer_id, guest_name, contact_phone, contact_phone_method, status, fulfillment_type, delivery_address, fulfillment_date, notes, subtotal_estimate, delivery_price, discount_amount, final_price, source, created_at, profiles(first_name, last_name), delivery_areas(name)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("order_items").select(ORDER_ITEM_SELECT).eq("order_id", id).order("created_at"),
  ]);

  if (orderError) throw orderError;
  if (itemsError) throw itemsError;
  if (!order) notFound();

  const orderItems = (items ?? []) as unknown as AdminOrderItemDetail[];

  const categoryIds = Array.from(new Set(orderItems.map((item) => item.cakes?.category_id).filter((id): id is string => Boolean(id))));

  const [tiers, colors, shapes] = await Promise.all([getTiers(), getColors(), getShapes()]);

  const catalogByCategoryId: Record<
    string,
    {
      sizes: Awaited<ReturnType<typeof getSizesWithTiers>>;
      tiers: typeof tiers;
      flavors: Awaited<ReturnType<typeof getFlavorsForCategory>>;
      colors: typeof colors;
      shapes: typeof shapes;
      toppers: Awaited<ReturnType<typeof getToppers>>;
      showToppers: boolean;
    }
  > = {};

  await Promise.all(
    categoryIds.map(async (categoryId) => {
      const category = await getCategoryById(categoryId);
      const topLevel = category?.parent_id ? await getCategoryById(category.parent_id) : category;
      const showToppers = topLevel?.slug === "custom";
      const [sizes, flavors, toppers] = await Promise.all([
        getSizesWithTiers(categoryId),
        getFlavorsForCategory(categoryId),
        showToppers ? getToppers() : Promise.resolve([]),
      ]);
      catalogByCategoryId[categoryId] = { sizes, tiers, flavors, colors, shapes, toppers, showToppers };
    }),
  );

  return (
    <OrderDetailContent
      order={order as unknown as AdminOrderDetail}
      items={orderItems}
      role={profile.role}
      locale={locale as "en" | "ar"}
      catalogByCategoryId={catalogByCategoryId}
    />
  );
}
