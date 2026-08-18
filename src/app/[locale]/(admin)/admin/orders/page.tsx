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
//
// This must not rely on the host process's own default timezone (e.g. via
// `new Date(someLocaleString)`, which re-parses using the *local* TZ and
// silently cancels out or doubles the correction depending on what that
// happens to be — broken on a Cairo-based dev machine, fine on a UTC
// server). Intl.DateTimeFormat's `timeZone` option is explicit and doesn't
// depend on host TZ, so we use it to measure Cairo's offset directly.
const CAIRO_TZ = "Africa/Cairo";

function cairoOffsetMs(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CAIRO_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(instant)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});
  const wallClockAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return wallClockAsUtc - instant.getTime();
}

function cairoWallTimeToUtcISOString(dateStr: string, timeStr: string): string {
  // First guess: treat the wall-clock digits as if they were UTC.
  const naiveUtc = new Date(`${dateStr}T${timeStr}Z`);
  // Cairo's offset barely changes across a single day, so using the guess's
  // offset to correct the guess itself is accurate enough here.
  const offset = cairoOffsetMs(naiveUtc);
  return new Date(naiveUtc.getTime() - offset).toISOString();
}

export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    status?: string;
    source?: string;
    fulfillmentType?: string;
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
  const { status, source, fulfillmentType, search, orderFrom, orderTo, deliveryFrom, deliveryTo, sort, dir, page } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select(
      "id, order_number, customer_id, guest_name, status, fulfillment_type, delivery_address, fulfillment_date, subtotal_estimate, delivery_price, discount_amount, final_price, source, created_at, profiles(first_name, last_name), delivery_areas(name)",
    );

  if (status) query = query.eq("status", status);
  if (source) query = query.eq("source", source);
  if (fulfillmentType) query = query.eq("fulfillment_type", fulfillmentType);
  if (orderFrom) query = query.gte("created_at", cairoWallTimeToUtcISOString(orderFrom, "00:00:00"));
  if (orderTo) query = query.lte("created_at", cairoWallTimeToUtcISOString(orderTo, "23:59:59.999"));
  if (deliveryFrom) query = query.gte("fulfillment_date", deliveryFrom);
  if (deliveryTo) query = query.lte("fulfillment_date", deliveryTo);

  const sortColumn = sort === "deliveryDate" ? "fulfillment_date" : "created_at";
  query = query.order(sortColumn, { ascending: dir === "asc" });

  const { data: allOrders, error } = await query;
  if (error) throw error;

  const rows = (allOrders ?? []) as unknown as AdminOrderListRow[];

  // Search matches order_number (with or without hyphens — strip "-" from
  // both the query and the stored value before comparing) OR customer name
  // (account holder's first/last name, or the guest name for guest orders).
  const needle = search?.trim().replace(/-/g, "").toLowerCase();
  const nameNeedle = search?.trim().toLowerCase();
  const filtered = needle
    ? rows.filter((o) => {
        if (o.order_number.replace(/-/g, "").toLowerCase().includes(needle)) return true;
        const customerName = o.profiles
          ? [o.profiles.first_name, o.profiles.last_name].filter(Boolean).join(" ")
          : (o.guest_name ?? "");
        return customerName.toLowerCase().includes(nameNeedle!);
      })
    : rows;

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
      fulfillmentType={fulfillmentType ?? null}
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
