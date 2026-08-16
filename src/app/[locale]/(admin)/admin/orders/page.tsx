import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/admin/requireAdmin";
import { OrdersListContent } from "@/components/admin/orders/OrdersListContent";
import type { AdminOrderListRow } from "@/types/orders";

const PAGE_SIZE = 20;

// Business is Cairo-based; the Order Date filter's from/to values are plain
// calendar dates picked in the admin's local browser. created_at is
// timestamptz, so a naive "YYYY-MM-DDT00:00:00" string would be parsed in the
// DB session's UTC timezone instead of Cairo's — silently shifting the
// window by 2-3 hours and missing/including the wrong orders. Convert the
// intended Cairo wall-clock instant to its real UTC instant instead.
const CAIRO_TZ = "Africa/Cairo";

function cairoWallTimeToUtcISOString(dateStr: string, timeStr: string): string {
  const naive = new Date(`${dateStr}T${timeStr}Z`);
  const asCairo = new Date(naive.toLocaleString("en-US", { timeZone: CAIRO_TZ }));
  const offsetMs = naive.getTime() - asCairo.getTime();
  return new Date(naive.getTime() + offsetMs).toISOString();
}

export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    status?: string;
    source?: string;
    search?: string;
    orderFrom?: string;
    orderTo?: string;
    deliveryFrom?: string;
    deliveryTo?: string;
    sort?: string;
    dir?: string;
    page?: string;
  }>;
}) {
  const { locale } = await params;
  const profile = await requireStaff(locale);
  const { status, source, search, orderFrom, orderTo, deliveryFrom, deliveryTo, sort, dir, page } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select(
      "id, order_number, customer_id, guest_name, status, fulfillment_type, delivery_address, fulfillment_date, subtotal_estimate, delivery_price, discount_amount, final_price, source, created_at, profiles(first_name, last_name), delivery_areas(name)",
    );

  if (status) query = query.eq("status", status);
  if (source) query = query.eq("source", source);
  if (orderFrom) query = query.gte("created_at", cairoWallTimeToUtcISOString(orderFrom, "00:00:00"));
  if (orderTo) query = query.lte("created_at", cairoWallTimeToUtcISOString(orderTo, "23:59:59.999"));
  if (deliveryFrom) query = query.gte("fulfillment_date", deliveryFrom);
  if (deliveryTo) query = query.lte("fulfillment_date", deliveryTo);

  const sortColumn = sort === "deliveryDate" ? "fulfillment_date" : "created_at";
  query = query.order(sortColumn, { ascending: dir === "asc" });

  const { data: allOrders, error } = await query;
  if (error) throw error;

  const rows = (allOrders ?? []) as unknown as AdminOrderListRow[];

  // Search matches order_number with or without hyphens — strip "-" from
  // both the query and the stored value before comparing.
  const needle = search?.trim().replace(/-/g, "").toLowerCase();
  const filtered = needle ? rows.filter((o) => o.order_number.replace(/-/g, "").toLowerCase().includes(needle)) : rows;

  const currentPage = Math.max(1, Number(page) || 1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageOrders = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <OrdersListContent
      orders={pageOrders}
      totalCount={filtered.length}
      role={profile.role}
      status={status ?? null}
      source={source ?? null}
      search={search ?? ""}
      orderDateRange={{ from: orderFrom ?? null, to: orderTo ?? null }}
      deliveryDateRange={{ from: deliveryFrom ?? null, to: deliveryTo ?? null }}
      sort={sort ?? "orderDate"}
      dir={(dir as "asc" | "desc") ?? "desc"}
      currentPage={currentPage}
      totalPages={totalPages}
    />
  );
}
