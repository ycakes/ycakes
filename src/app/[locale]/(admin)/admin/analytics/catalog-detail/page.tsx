import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/admin/requireAdmin";
import { resolvePeriod, type AnalyticsPeriod } from "@/lib/admin/analyticsPeriod";
import { CatalogDetailContent, type CatalogCakeRow, type CatalogDetailData, type UsageRow } from "@/components/admin/analytics/CatalogDetailContent";
import type { Bilingual } from "@/types/catalog";

const VALID_PERIODS: AnalyticsPeriod[] = ["day", "week", "month", "year", "custom", "all"];
const SORTS = ["orders", "revenue", "az"] as const;
type Sort = (typeof SORTS)[number];

function topUsageRows(counts: Map<string, number>, withPct: boolean, limit = 8): UsageRow[] {
  const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count, pct: withPct && total > 0 ? Math.round((count / total) * 100) : null }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export default async function CatalogDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ period?: string; from?: string; to?: string; sort?: string; category?: string }>;
}) {
  const { locale } = await params;
  await requireStaff(locale);
  const supabase = await createClient();

  const sp = await searchParams;
  const period: AnalyticsPeriod = VALID_PERIODS.includes(sp.period as AnalyticsPeriod) ? (sp.period as AnalyticsPeriod) : "month";
  const customFrom = sp.from ?? null;
  const customTo = sp.to ?? null;
  const resolved = resolvePeriod(period, customFrom, customTo);
  const sort: Sort = SORTS.includes(sp.sort as Sort) ? (sp.sort as Sort) : "orders";
  const category = sp.category ?? "all";

  const [{ data: categories }, { data: allCakes }, { data: itemRows }] = await Promise.all([
    supabase.from("categories").select("id, parent_id, name, slug"),
    supabase.from("cakes").select("id, name, category_id"),
    supabase
      .from("order_items")
      .select(
        "id, cake_id, size_id, fake_size_cm, is_fake, topper_id, final_price, line_estimate, cakes(id, name, category_id), sizes(min_qty, max_qty), tiers(tier_count), toppers(name), order_item_flavors(flavor_id, flavors(name)), order_item_colors(color_id, colors(name)), orders(status, created_at)",
      ),
  ]);

  type CategoryRow = { id: string; parent_id: string | null; name: Bilingual; slug: string };
  const categoryMap = new Map<string, CategoryRow>();
  for (const c of (categories ?? []) as CategoryRow[]) categoryMap.set(c.id, c);
  const topLevelCategories = [...categoryMap.values()].filter((c) => !c.parent_id).sort((a, b) => a.name.en.localeCompare(b.name.en));
  function topLevelOf(categoryId: string | undefined): CategoryRow | null {
    if (!categoryId) return null;
    const cat = categoryMap.get(categoryId);
    if (!cat) return null;
    return cat.parent_id ? (categoryMap.get(cat.parent_id) ?? cat) : cat;
  }

  type ItemRow = {
    id: string;
    cake_id: string;
    size_id: string | null;
    fake_size_cm: number | null;
    is_fake: boolean;
    topper_id: string | null;
    final_price: number | null;
    line_estimate: number;
    cakes: { id: string; name: Bilingual; category_id: string } | null;
    sizes: { min_qty: number; max_qty: number } | null;
    tiers: { tier_count: number } | null;
    toppers: { name: Bilingual } | null;
    order_item_flavors: { flavor_id: string; flavors: { name: Bilingual } }[];
    order_item_colors: { color_id: string; colors: { name: Bilingual } }[];
    orders: { status: string; created_at: string } | null;
  };

  const periodItems = ((itemRows ?? []) as unknown as ItemRow[]).filter((item) => {
    if (!item.orders || item.orders.status === "cancelled") return false;
    const createdAt = new Date(item.orders.created_at);
    if (resolved.from && createdAt < resolved.from) return false;
    if (createdAt >= resolved.to) return false;
    return true;
  });
  const revenueItems = periodItems.filter((item) => item.orders?.status === "completed");

  const cakeOrders = new Map<string, number>();
  const cakeRevenue = new Map<string, number>();
  for (const item of periodItems) cakeOrders.set(item.cake_id, (cakeOrders.get(item.cake_id) ?? 0) + 1);
  for (const item of revenueItems) cakeRevenue.set(item.cake_id, (cakeRevenue.get(item.cake_id) ?? 0) + (item.final_price ?? item.line_estimate));

  let cakeRows: CatalogCakeRow[] = ((allCakes ?? []) as { id: string; name: Bilingual; category_id: string }[]).map((cake) => ({
    cakeId: cake.id,
    name: cake.name,
    categoryName: topLevelOf(cake.category_id)?.name ?? { en: "—", ar: "—" },
    orders: cakeOrders.get(cake.id) ?? 0,
    revenue: cakeRevenue.get(cake.id) ?? 0,
  }));

  if (category !== "all") {
    cakeRows = cakeRows.filter((row) => {
      const cakeRecord = ((allCakes ?? []) as { id: string; category_id: string }[]).find((c) => c.id === row.cakeId);
      return topLevelOf(cakeRecord?.category_id)?.slug === category;
    });
  }
  cakeRows = cakeRows.sort((a, b) => {
    if (sort === "orders") return b.orders - a.orders;
    if (sort === "revenue") return b.revenue - a.revenue;
    return a.name.en.localeCompare(b.name.en);
  });

  const flavorCounts = new Map<string, number>();
  const sizeCounts = new Map<string, number>();
  const topperCounts = new Map<string, number>();
  const colorCounts = new Map<string, number>();
  for (const item of periodItems) {
    for (const f of item.order_item_flavors) {
      const label = f.flavors.name[locale as "en" | "ar"];
      flavorCounts.set(label, (flavorCounts.get(label) ?? 0) + 1);
    }
    for (const c of item.order_item_colors) {
      const label = c.colors.name[locale as "en" | "ar"];
      colorCounts.set(label, (colorCounts.get(label) ?? 0) + 1);
    }
    if (item.topper_id && item.toppers) {
      const label = item.toppers.name[locale as "en" | "ar"];
      topperCounts.set(label, (topperCounts.get(label) ?? 0) + 1);
    }
    let sizeLabel: string | null = null;
    if (item.is_fake) {
      if (item.fake_size_cm != null) sizeLabel = `${item.fake_size_cm} cm`;
    } else if (item.sizes) {
      const range = item.sizes.max_qty !== item.sizes.min_qty ? `${item.sizes.min_qty}>${item.sizes.max_qty}` : String(item.sizes.min_qty);
      sizeLabel = item.tiers ? `${range}, ${item.tiers.tier_count} Tier` : range;
    }
    if (sizeLabel) sizeCounts.set(sizeLabel, (sizeCounts.get(sizeLabel) ?? 0) + 1);
  }

  const data: CatalogDetailData = {
    cakes: cakeRows,
    flavors: topUsageRows(flavorCounts, true),
    sizes: topUsageRows(sizeCounts, false),
    toppers: topUsageRows(topperCounts, false),
    colors: topUsageRows(colorCounts, true),
  };

  const backParams = new URLSearchParams({ tab: "catalog", period });
  if (period === "custom") {
    if (customFrom) backParams.set("from", customFrom);
    if (customTo) backParams.set("to", customTo);
  }

  function buildHref(overrides: { sort?: Sort; category?: string }) {
    const params = new URLSearchParams({ period, sort: overrides.sort ?? sort, category: overrides.category ?? category });
    if (period === "custom") {
      if (customFrom) params.set("from", customFrom);
      if (customTo) params.set("to", customTo);
    }
    return `/admin/analytics/catalog-detail?${params.toString()}`;
  }

  return (
    <CatalogDetailContent
      data={data}
      locale={locale as "en" | "ar"}
      backHref={`/admin/analytics?${backParams.toString()}`}
      sort={sort}
      category={category}
      categories={topLevelCategories.map((c) => ({ slug: c.slug, name: c.name }))}
      buildHref={buildHref}
    />
  );
}
