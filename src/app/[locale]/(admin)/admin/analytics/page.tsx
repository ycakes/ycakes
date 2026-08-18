import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/admin/requireAdmin";
import { resolvePeriod, toISODate, type AnalyticsPeriod } from "@/lib/admin/analyticsPeriod";
import { AnalyticsShell, type AnalyticsTabKey } from "@/components/admin/analytics/AnalyticsShell";
import { RevenueProfitTab, RevenueProfitExportButton, type RevenueProfitData } from "@/components/admin/analytics/RevenueProfitTab";
import {
  OrdersFulfillmentTab,
  OrdersFulfillmentExportButton,
  type OrdersFulfillmentData,
  type CancelledOrderRow,
} from "@/components/admin/analytics/OrdersFulfillmentTab";
import {
  CatalogPerformanceTab,
  CatalogPerformanceExportButton,
  type CatalogPerformanceData,
  type MostOrderedCakeRow,
  type NeverOrderedCakeRow,
} from "@/components/admin/analytics/CatalogPerformanceTab";
import { CustomersTab, CustomersExportButton, type CustomersData, type TopCustomerRow } from "@/components/admin/analytics/CustomersTab";
import {
  PromoCodesTab,
  PromoCodesExportButton,
  type PromoCodesData,
  type PromoCodeRow,
  type PromoRedemptionRow,
} from "@/components/admin/analytics/PromoCodesTab";
import type { Bilingual } from "@/types/catalog";
import type { OrderSource } from "@/types/orders";

const VALID_TABS: AnalyticsTabKey[] = ["revenue", "orders", "catalog", "customers", "promo"];
const VALID_PERIODS: AnalyticsPeriod[] = ["day", "week", "month", "year", "custom", "all"];

async function sumFinalPrice(
  supabase: Awaited<ReturnType<typeof createClient>>,
  from: Date | null,
  to: Date,
): Promise<{ total: number; count: number }> {
  let query = supabase.from("orders").select("final_price").eq("status", "completed").lt("created_at", to.toISOString());
  if (from) query = query.gte("created_at", from.toISOString());
  const { data } = await query;
  const rows = (data ?? []) as { final_price: number | null }[];
  return { total: rows.reduce((sum, r) => sum + (r.final_price ?? 0), 0), count: rows.length };
}

/** Pending/confirmed orders often don't have final_price set yet (the admin
 * hasn't priced/confirmed them over WhatsApp/phone) — same subtotal +
 * delivery - discount fallback already used for a completed order's spend
 * elsewhere on this page (see the Customers aggregate below). */
async function sumOrderValueByStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  status: "pending" | "confirmed",
  from: Date | null,
  to: Date,
): Promise<{ total: number; count: number }> {
  let query = supabase
    .from("orders")
    .select("final_price, subtotal_estimate, delivery_price, discount_amount")
    .eq("status", status)
    .lt("created_at", to.toISOString());
  if (from) query = query.gte("created_at", from.toISOString());
  const { data } = await query;
  const rows = (data ?? []) as {
    final_price: number | null;
    subtotal_estimate: number;
    delivery_price: number;
    discount_amount: number;
  }[];
  return {
    total: rows.reduce((sum, r) => sum + (r.final_price ?? r.subtotal_estimate + r.delivery_price - r.discount_amount), 0),
    count: rows.length,
  };
}

async function sumExpenses(
  supabase: Awaited<ReturnType<typeof createClient>>,
  from: Date | null,
  to: Date,
): Promise<number> {
  let query = supabase.from("expenses").select("amount").lt("expense_date", toISODate(to));
  if (from) query = query.gte("expense_date", toISODate(from));
  const { data } = await query;
  return ((data ?? []) as { amount: number }[]).reduce((sum, r) => sum + r.amount, 0);
}

export default async function AdminAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; period?: string; from?: string; to?: string }>;
}) {
  const { locale } = await params;
  await requireStaff(locale);
  const supabase = await createClient();

  const sp = await searchParams;
  const tab: AnalyticsTabKey = VALID_TABS.includes(sp.tab as AnalyticsTabKey) ? (sp.tab as AnalyticsTabKey) : "revenue";
  const period: AnalyticsPeriod = VALID_PERIODS.includes(sp.period as AnalyticsPeriod) ? (sp.period as AnalyticsPeriod) : "month";
  const customFrom = sp.from ?? null;
  const customTo = sp.to ?? null;

  const resolved = resolvePeriod(period, customFrom, customTo);

  let exportButton: React.ReactNode = null;
  let tabContent: React.ReactNode = null;

  if (tab === "revenue") {
    const [
      { total: totalRevenue, count: completedOrdersCount },
      totalExpenses,
      prevRevenue,
      prevExpenses,
      pendingRevenue,
      confirmedRevenue,
    ] = await Promise.all([
      sumFinalPrice(supabase, resolved.from, resolved.to),
      sumExpenses(supabase, resolved.from, resolved.to),
      resolved.previousFrom ? sumFinalPrice(supabase, resolved.previousFrom, resolved.previousTo!) : Promise.resolve({ total: 0, count: 0 }),
      resolved.previousFrom ? sumExpenses(supabase, resolved.previousFrom, resolved.previousTo!) : Promise.resolve(0),
      sumOrderValueByStatus(supabase, "pending", resolved.from, resolved.to),
      sumOrderValueByStatus(supabase, "confirmed", resolved.from, resolved.to),
    ]);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);
    const { data: last6MonthsOrders } = await supabase
      .from("orders")
      .select("final_price, created_at")
      .eq("status", "completed")
      .gte("created_at", sixMonthsAgo.toISOString());

    const monthBuckets: { label: string; amount: number; key: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      monthBuckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: new Intl.DateTimeFormat(locale, { month: "short" }).format(d),
        amount: 0,
      });
    }
    for (const row of (last6MonthsOrders ?? []) as { final_price: number | null; created_at: string }[]) {
      const d = new Date(row.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = monthBuckets.find((b) => b.key === key);
      if (bucket) bucket.amount += row.final_price ?? 0;
    }

    let expensesQuery = supabase
      .from("expenses")
      .select("amount, category_id, expense_categories(name)")
      .lt("expense_date", toISODate(resolved.to));
    if (resolved.from) expensesQuery = expensesQuery.gte("expense_date", toISODate(resolved.from));
    const { data: expenseRows } = await expensesQuery;

    const byCategory = new Map<string, { name: Bilingual; amount: number }>();
    for (const row of (expenseRows ?? []) as unknown as { amount: number; category_id: string; expense_categories: { name: Bilingual } | null }[]) {
      const name = row.expense_categories?.name ?? { en: "—", ar: "—" };
      const existing = byCategory.get(row.category_id);
      if (existing) existing.amount += row.amount;
      else byCategory.set(row.category_id, { name, amount: row.amount });
    }
    const expensesByCategory = [...byCategory.values()].sort((a, b) => b.amount - a.amount);

    const data: RevenueProfitData = {
      totalRevenue,
      totalExpenses,
      previousRevenue: prevRevenue.total,
      previousExpenses: prevExpenses,
      completedOrdersCount,
      pendingRevenue: pendingRevenue.total,
      pendingOrdersCount: pendingRevenue.count,
      confirmedRevenue: confirmedRevenue.total,
      confirmedOrdersCount: confirmedRevenue.count,
      last6Months: monthBuckets.map(({ label, amount }) => ({ label, amount })),
      expensesByCategory,
      trendLabelKey: resolved.trendLabelKey,
      period,
      from: customFrom,
      to: customTo,
    };

    exportButton = <RevenueProfitExportButton data={data} />;
    tabContent = <RevenueProfitTab data={data} locale={locale as "en" | "ar"} />;
  } else if (tab === "orders") {
    let ordersQuery = supabase
      .from("orders")
      .select(
        "id, order_number, created_at, guest_name, status, fulfillment_type, source, final_price, subtotal_estimate, delivery_price, discount_amount, profiles(first_name, last_name), delivery_areas(name)",
      )
      .lt("created_at", resolved.to.toISOString());
    if (resolved.from) ordersQuery = ordersQuery.gte("created_at", resolved.from.toISOString());
    const { data: periodOrders } = await ordersQuery;

    const rows = (periodOrders ?? []) as unknown as {
      id: string;
      order_number: string;
      created_at: string;
      guest_name: string | null;
      status: string;
      fulfillment_type: "delivery" | "pickup";
      source: OrderSource;
      final_price: number | null;
      subtotal_estimate: number;
      delivery_price: number;
      discount_amount: number;
      profiles: { first_name: string | null; last_name: string | null } | null;
      delivery_areas: { name: Bilingual } | null;
    }[];

    const totalOrders = rows.length;
    const pendingOrders = rows.filter((r) => r.status === "pending").length;
    const cancelledOrders = rows.filter((r) => r.status === "cancelled").length;
    const deliveryOrders = rows.filter((r) => r.fulfillment_type === "delivery").length;
    const pickupOrders = rows.filter((r) => r.fulfillment_type === "pickup").length;

    const sourceCounts = new Map<OrderSource, number>();
    for (const r of rows) sourceCounts.set(r.source, (sourceCounts.get(r.source) ?? 0) + 1);
    const sourceBreakdown = [...sourceCounts.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    const areaCounts = new Map<string, { name: Bilingual; count: number }>();
    for (const r of rows) {
      if (r.fulfillment_type !== "delivery" || !r.delivery_areas) continue;
      const key = r.delivery_areas.name.en;
      const existing = areaCounts.get(key);
      if (existing) existing.count += 1;
      else areaCounts.set(key, { name: r.delivery_areas.name, count: 1 });
    }
    const areaBreakdown = [...areaCounts.values()].sort((a, b) => b.count - a.count);

    const cancelledRows: CancelledOrderRow[] = rows
      .filter((r) => r.status === "cancelled")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map((r) => ({
        id: r.id,
        order_number: r.order_number,
        created_at: r.created_at,
        customerName:
          [r.profiles?.first_name, r.profiles?.last_name].filter(Boolean).join(" ").trim() || r.guest_name || "—",
        total: r.final_price ?? r.subtotal_estimate + r.delivery_price - r.discount_amount,
      }));

    const data: OrdersFulfillmentData = {
      totalOrders,
      pendingOrders,
      cancelledOrders,
      deliveryOrders,
      pickupOrders,
      sourceBreakdown,
      areaBreakdown,
      cancelledRows,
      period,
      orderFrom: resolved.from ? toISODate(resolved.from) : toISODate(new Date(0)),
      orderTo: toISODate(new Date(resolved.to.getTime() - 86400000)),
    };

    exportButton = <OrdersFulfillmentExportButton data={data} />;
    tabContent = <OrdersFulfillmentTab data={data} locale={locale as "en" | "ar"} />;
  } else if (tab === "catalog") {
    const [{ data: categories }, { data: itemRows }, { data: activeCakes }, { data: everOrderedRows }] = await Promise.all([
      supabase.from("categories").select("id, parent_id, name"),
      supabase
        .from("order_items")
        .select(
          "id, cake_id, size_id, fake_size_cm, is_fake, final_price, line_estimate, cakes(id, name, category_id), sizes(min_qty, max_qty), tiers(tier_count), order_item_flavors(flavor_id, flavors(name)), orders(status, created_at)",
        ),
      supabase.from("cakes").select("id, name, category_id, created_at").eq("active", true),
      supabase.from("order_items").select("cake_id"),
    ]);

    const categoryMap = new Map<string, { id: string; parent_id: string | null; name: Bilingual }>();
    for (const c of (categories ?? []) as { id: string; parent_id: string | null; name: Bilingual }[]) categoryMap.set(c.id, c);
    function topLevelName(categoryId: string | undefined): Bilingual {
      if (!categoryId) return { en: "—", ar: "—" };
      const cat = categoryMap.get(categoryId);
      if (!cat) return { en: "—", ar: "—" };
      const parent = cat.parent_id ? categoryMap.get(cat.parent_id) : null;
      return (parent ?? cat).name;
    }

    type ItemRow = {
      id: string;
      cake_id: string;
      size_id: string | null;
      fake_size_cm: number | null;
      is_fake: boolean;
      final_price: number | null;
      line_estimate: number;
      cakes: { id: string; name: Bilingual; category_id: string } | null;
      sizes: { min_qty: number; max_qty: number } | null;
      tiers: { tier_count: number } | null;
      order_item_flavors: { flavor_id: string; flavors: { name: Bilingual } }[];
      orders: { status: string; created_at: string } | null;
    };

    const allItems = (itemRows ?? []) as unknown as ItemRow[];
    const periodItems = allItems.filter((item) => {
      if (!item.orders) return false;
      if (item.orders.status === "cancelled") return false;
      const createdAt = new Date(item.orders.created_at);
      if (resolved.from && createdAt < resolved.from) return false;
      if (createdAt >= resolved.to) return false;
      return true;
    });
    const revenueItems = periodItems.filter((item) => item.orders?.status === "completed");

    const cakeCounts = new Map<string, { name: Bilingual; categoryId: string; orders: number }>();
    for (const item of periodItems) {
      if (!item.cakes) continue;
      const existing = cakeCounts.get(item.cake_id);
      if (existing) existing.orders += 1;
      else cakeCounts.set(item.cake_id, { name: item.cakes.name, categoryId: item.cakes.category_id, orders: 1 });
    }
    const cakeRevenue = new Map<string, number>();
    for (const item of revenueItems) {
      if (!item.cakes) continue;
      cakeRevenue.set(item.cake_id, (cakeRevenue.get(item.cake_id) ?? 0) + (item.final_price ?? item.line_estimate));
    }

    const mostOrdered: MostOrderedCakeRow[] = [...cakeCounts.entries()]
      .map(([cakeId, v]) => ({
        cakeId,
        name: v.name,
        categoryName: topLevelName(v.categoryId),
        orders: v.orders,
        revenue: cakeRevenue.get(cakeId) ?? 0,
      }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5);

    const topCakeEntry = [...cakeCounts.entries()].sort((a, b) => b[1].orders - a[1].orders)[0];
    const topCake = topCakeEntry ? { name: topCakeEntry[1].name, orders: topCakeEntry[1].orders } : null;

    const flavorCounts = new Map<string, { name: Bilingual; count: number }>();
    let totalFlavorOccurrences = 0;
    for (const item of periodItems) {
      for (const f of item.order_item_flavors) {
        totalFlavorOccurrences += 1;
        const existing = flavorCounts.get(f.flavor_id);
        if (existing) existing.count += 1;
        else flavorCounts.set(f.flavor_id, { name: f.flavors.name, count: 1 });
      }
    }
    const topFlavorEntry = [...flavorCounts.values()].sort((a, b) => b.count - a.count)[0];
    const topFlavor = topFlavorEntry
      ? { name: topFlavorEntry.name, pct: totalFlavorOccurrences > 0 ? Math.round((topFlavorEntry.count / totalFlavorOccurrences) * 100) : 0 }
      : null;

    const sizeCounts = new Map<string, { label: string; count: number }>();
    for (const item of periodItems) {
      let label: string;
      if (item.is_fake) {
        if (item.fake_size_cm == null) continue;
        label = `${item.fake_size_cm} cm`;
      } else if (item.sizes) {
        const range = item.sizes.max_qty !== item.sizes.min_qty ? `${item.sizes.min_qty}>${item.sizes.max_qty}` : String(item.sizes.min_qty);
        label = item.tiers ? `${range}, ${item.tiers.tier_count} Tier` : range;
      } else {
        continue;
      }
      const existing = sizeCounts.get(label);
      if (existing) existing.count += 1;
      else sizeCounts.set(label, { label, count: 1 });
    }
    const topSizeEntry = [...sizeCounts.values()].sort((a, b) => b.count - a.count)[0];
    const topSize = topSizeEntry ? { label: topSizeEntry.label, orders: topSizeEntry.count } : null;

    const categoryRevenue = new Map<string, { name: Bilingual; amount: number }>();
    for (const item of revenueItems) {
      if (!item.cakes) continue;
      const name = topLevelName(item.cakes.category_id);
      const key = name.en;
      const existing = categoryRevenue.get(key);
      const amount = item.final_price ?? item.line_estimate;
      if (existing) existing.amount += amount;
      else categoryRevenue.set(key, { name, amount });
    }
    const revenueByCategory = [...categoryRevenue.values()].sort((a, b) => b.amount - a.amount);

    const everOrderedCakeIds = new Set(((everOrderedRows ?? []) as { cake_id: string | null }[]).map((r) => r.cake_id).filter(Boolean));
    const neverOrderedCakesAll = ((activeCakes ?? []) as { id: string; name: Bilingual; category_id: string; created_at: string }[]).filter(
      (c) => !everOrderedCakeIds.has(c.id),
    );
    const neverOrdered: NeverOrderedCakeRow[] = neverOrderedCakesAll
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map((c) => ({ cakeId: c.id, name: c.name, categoryName: topLevelName(c.category_id), createdAt: c.created_at }));

    const data: CatalogPerformanceData = {
      topCake,
      topFlavor,
      topSize,
      neverOrderedCount: neverOrderedCakesAll.length,
      revenueByCategory,
      mostOrdered,
      neverOrdered,
      period,
      from: customFrom,
      to: customTo,
    };

    exportButton = <CatalogPerformanceExportButton data={data} />;
    tabContent = <CatalogPerformanceTab data={data} locale={locale as "en" | "ar"} />;
  } else if (tab === "customers") {
    let newCustomersQuery = supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "customer")
      .lt("created_at", resolved.to.toISOString());
    if (resolved.from) newCustomersQuery = newCustomersQuery.gte("created_at", resolved.from.toISOString());

    const [{ count: totalCustomers }, { count: newThisPeriod }, { data: allTimeOrderCustomerIds }, { data: periodOrders }] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
      newCustomersQuery,
      supabase.from("orders").select("customer_id").not("customer_id", "is", null),
      (() => {
        let q = supabase
          .from("orders")
          .select(
            "id, customer_id, guest_name, contact_phone, status, final_price, subtotal_estimate, delivery_price, discount_amount, created_at, profiles(first_name, last_name)",
          )
          .lt("created_at", resolved.to.toISOString());
        if (resolved.from) q = q.gte("created_at", resolved.from.toISOString());
        return q;
      })(),
    ]);

    const customerOrderCounts = new Map<string, number>();
    for (const row of (allTimeOrderCustomerIds ?? []) as { customer_id: string | null }[]) {
      if (!row.customer_id) continue;
      customerOrderCounts.set(row.customer_id, (customerOrderCounts.get(row.customer_id) ?? 0) + 1);
    }
    const customersWithOrders = customerOrderCounts.size;
    const repeatCustomers = [...customerOrderCounts.values()].filter((c) => c >= 2).length;
    const repeatRate = customersWithOrders > 0 ? Math.round((repeatCustomers / customersWithOrders) * 100) : 0;

    const orderRows = (periodOrders ?? []) as unknown as {
      id: string;
      customer_id: string | null;
      guest_name: string | null;
      contact_phone: string | null;
      status: string;
      final_price: number | null;
      subtotal_estimate: number;
      delivery_price: number;
      discount_amount: number;
      created_at: string;
      profiles: { first_name: string | null; last_name: string | null } | null;
    }[];

    const guestOrders = orderRows.filter((r) => !r.customer_id).length;
    const accountOrders = orderRows.filter((r) => r.customer_id).length;

    type Agg = { key: string; name: string; orders: number; totalSpent: number; lastOrderDate: string; type: "account" | "guest" };
    const aggregates = new Map<string, Agg>();
    for (const r of orderRows) {
      const key = r.customer_id ? `c:${r.customer_id}` : `g:${(r.guest_name ?? "").toLowerCase()}:${r.contact_phone ?? ""}`;
      const name = r.customer_id
        ? [r.profiles?.first_name, r.profiles?.last_name].filter(Boolean).join(" ").trim() || "—"
        : r.guest_name || "—";
      const spent = r.status === "completed" ? r.final_price ?? r.subtotal_estimate + r.delivery_price - r.discount_amount : 0;
      const existing = aggregates.get(key);
      if (existing) {
        existing.orders += 1;
        existing.totalSpent += spent;
        if (r.created_at > existing.lastOrderDate) existing.lastOrderDate = r.created_at;
      } else {
        aggregates.set(key, { key, name, orders: 1, totalSpent: spent, lastOrderDate: r.created_at, type: r.customer_id ? "account" : "guest" });
      }
    }
    const topCustomers: TopCustomerRow[] = [...aggregates.values()].sort((a, b) => b.orders - a.orders).slice(0, 5);

    const data: CustomersData = {
      totalCustomers: totalCustomers ?? 0,
      newThisPeriod: newThisPeriod ?? 0,
      repeatRate,
      guestOrders,
      accountOrders,
      topCustomers,
      period,
      from: customFrom,
      to: customTo,
    };

    exportButton = <CustomersExportButton data={data} />;
    tabContent = <CustomersTab data={data} locale={locale as "en" | "ar"} />;
  } else if (tab === "promo") {
    const [{ data: promoCodes }, { data: redemptionRows }] = await Promise.all([
      supabase.from("promo_codes").select("id, code, active, redemption_cap"),
      supabase
        .from("promo_code_redemptions")
        .select(
          "promo_code_id, order_id, orders(order_number, created_at, status, final_price, subtotal_estimate, delivery_price, discount_amount, customer_id, guest_name, profiles(first_name, last_name))",
        ),
    ]);

    type RedemptionRow = {
      promo_code_id: string;
      order_id: string;
      orders: {
        order_number: string;
        created_at: string;
        status: string;
        final_price: number | null;
        subtotal_estimate: number;
        delivery_price: number;
        discount_amount: number;
        customer_id: string | null;
        guest_name: string | null;
        profiles: { first_name: string | null; last_name: string | null } | null;
      } | null;
    };
    const allRedemptions = (redemptionRows ?? []) as unknown as RedemptionRow[];

    const codes: PromoCodeRow[] = ((promoCodes ?? []) as { id: string; code: string; active: boolean; redemption_cap: number | null }[]).map(
      (promo) => {
        const forCode = allRedemptions.filter((r) => r.promo_code_id === promo.id && r.orders);
        const inPeriod = forCode.filter((r) => {
          const createdAt = new Date(r.orders!.created_at);
          if (resolved.from && createdAt < resolved.from) return false;
          if (createdAt >= resolved.to) return false;
          return true;
        });
        const discountGiven = inPeriod.reduce((sum, r) => sum + r.orders!.discount_amount, 0);
        const revenueInfluenced = inPeriod.reduce(
          (sum, r) => sum + (r.orders!.final_price ?? r.orders!.subtotal_estimate + r.orders!.delivery_price - r.orders!.discount_amount),
          0,
        );
        const redemptions: PromoRedemptionRow[] = inPeriod
          .sort((a, b) => new Date(b.orders!.created_at).getTime() - new Date(a.orders!.created_at).getTime())
          .map((r) => ({
            orderId: r.order_id,
            orderNumber: r.orders!.order_number,
            customerName:
              [r.orders!.profiles?.first_name, r.orders!.profiles?.last_name].filter(Boolean).join(" ").trim() ||
              r.orders!.guest_name ||
              "—",
            date: r.orders!.created_at,
            discount: r.orders!.discount_amount,
          }));
        return {
          id: promo.id,
          code: promo.code,
          redemptionsAllTime: forCode.length,
          redemptionCap: promo.redemption_cap,
          discountGiven,
          revenueInfluenced,
          redemptions,
        };
      },
    );

    const data: PromoCodesData = {
      activeCodes: ((promoCodes ?? []) as { active: boolean }[]).filter((p) => p.active).length,
      totalCodes: (promoCodes ?? []).length,
      totalRedemptions: codes.reduce((sum, c) => sum + c.redemptions.length, 0),
      totalDiscountGiven: codes.reduce((sum, c) => sum + c.discountGiven, 0),
      totalRevenueInfluenced: codes.reduce((sum, c) => sum + c.revenueInfluenced, 0),
      codes,
    };

    exportButton = <PromoCodesExportButton data={data} />;
    tabContent = <PromoCodesTab data={data} locale={locale as "en" | "ar"} />;
  }

  return (
    <AnalyticsShell
      tab={tab}
      period={period}
      from={customFrom}
      to={customTo}
      locale={locale as "en" | "ar"}
      showAllTimeChip={tab === "customers" || tab === "revenue" || tab === "orders" || tab === "catalog" || tab === "promo"}
      exportButton={exportButton}
    >
      {tabContent}
    </AnalyticsShell>
  );
}
