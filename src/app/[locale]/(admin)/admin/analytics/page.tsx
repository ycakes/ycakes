import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/admin/requireAdmin";
import { resolvePeriod, toISODate, type AnalyticsPeriod } from "@/lib/admin/analyticsPeriod";
import { AnalyticsShell, type AnalyticsTabKey } from "@/components/admin/analytics/AnalyticsShell";
import { RevenueProfitTab, RevenueProfitExportButton, type RevenueProfitData } from "@/components/admin/analytics/RevenueProfitTab";
import type { Bilingual } from "@/types/catalog";

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
    const [{ total: totalRevenue, count: completedOrdersCount }, totalExpenses, prevRevenue, prevExpenses] = await Promise.all([
      sumFinalPrice(supabase, resolved.from, resolved.to),
      sumExpenses(supabase, resolved.from, resolved.to),
      resolved.previousFrom ? sumFinalPrice(supabase, resolved.previousFrom, resolved.previousTo!) : Promise.resolve({ total: 0, count: 0 }),
      resolved.previousFrom ? sumExpenses(supabase, resolved.previousFrom, resolved.previousTo!) : Promise.resolve(0),
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
      last6Months: monthBuckets.map(({ label, amount }) => ({ label, amount })),
      expensesByCategory,
      trendLabelKey: resolved.trendLabelKey,
      period,
      from: customFrom,
      to: customTo,
    };

    exportButton = <RevenueProfitExportButton data={data} />;
    tabContent = <RevenueProfitTab data={data} locale={locale as "en" | "ar"} />;
  } else {
    tabContent = (
      <div className="rounded-[24px] bg-bg-surface p-12 text-center text-text-secondary">
        This tab is coming in the next build pass.
      </div>
    );
  }

  return (
    <AnalyticsShell
      tab={tab}
      period={period}
      from={customFrom}
      to={customTo}
      locale={locale as "en" | "ar"}
      showAllTimeChip={tab === "customers"}
      exportButton={exportButton}
    >
      {tabContent}
    </AnalyticsShell>
  );
}
