import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/admin/requireAdmin";
import { resolvePeriod, toISODate, type AnalyticsPeriod } from "@/lib/admin/analyticsPeriod";
import { RevenueDetailContent, type LedgerRow } from "@/components/admin/analytics/RevenueDetailContent";
import type { Bilingual } from "@/types/catalog";

const VALID_PERIODS: AnalyticsPeriod[] = ["day", "week", "month", "year", "custom", "all"];

export default async function RevenueDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const { locale } = await params;
  await requireStaff(locale);
  const supabase = await createClient();

  const sp = await searchParams;
  const period: AnalyticsPeriod = VALID_PERIODS.includes(sp.period as AnalyticsPeriod) ? (sp.period as AnalyticsPeriod) : "month";
  const customFrom = sp.from ?? null;
  const customTo = sp.to ?? null;
  const resolved = resolvePeriod(period, customFrom, customTo);

  let ordersQuery = supabase
    .from("orders")
    .select("id, order_number, created_at, final_price, guest_name, profiles(first_name, last_name)")
    .eq("status", "completed")
    .lt("created_at", resolved.to.toISOString());
  if (resolved.from) ordersQuery = ordersQuery.gte("created_at", resolved.from.toISOString());

  let expensesQuery = supabase
    .from("expenses")
    .select("id, expense_date, amount, description, expense_categories(name)")
    .lt("expense_date", toISODate(resolved.to));
  if (resolved.from) expensesQuery = expensesQuery.gte("expense_date", toISODate(resolved.from));

  const [{ data: orders }, { data: expenses }] = await Promise.all([ordersQuery, expensesQuery]);

  type OrderRow = {
    id: string;
    order_number: string;
    created_at: string;
    final_price: number | null;
    guest_name: string | null;
    profiles: { first_name: string | null; last_name: string | null } | null;
  };
  type ExpenseRow = {
    id: string;
    expense_date: string;
    amount: number;
    description: string | null;
    expense_categories: { name: Bilingual } | null;
  };

  const revenueRows = ((orders ?? []) as unknown as OrderRow[]).map((o) => {
    const customerName = [o.profiles?.first_name, o.profiles?.last_name].filter(Boolean).join(" ").trim() || o.guest_name || "—";
    return {
      id: `order-${o.id}`,
      type: "revenue" as const,
      date: o.created_at,
      description: `${o.order_number} — ${customerName}`,
      amount: o.final_price ?? 0,
      orderId: o.id,
    };
  });

  const expenseRows = ((expenses ?? []) as unknown as ExpenseRow[]).map((e) => ({
    id: `expense-${e.id}`,
    type: "expense" as const,
    date: e.expense_date,
    description: e.expense_categories ? `${e.expense_categories.name[locale as "en" | "ar"]}${e.description ? ` — ${e.description}` : ""}` : e.description ?? "—",
    amount: e.amount,
  }));

  const merged = [...revenueRows, ...expenseRows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const rows: LedgerRow[] = merged.reduce<LedgerRow[]>((acc, row) => {
    const previousBalance = acc.length > 0 ? acc[acc.length - 1].balance : 0;
    const balance = previousBalance + (row.type === "revenue" ? row.amount : -row.amount);
    acc.push({ ...row, balance });
    return acc;
  }, []);

  const rangeStart = resolved.from
    ? new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(resolved.from)
    : "—";
  const rangeEndDate = new Date(resolved.to.getTime() - 86400000);
  const rangeEnd = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(rangeEndDate);
  const rangeLabel = resolved.from ? `${rangeStart}–${rangeEnd}` : rangeEnd;

  const backParams = new URLSearchParams({ tab: "revenue", period });
  if (period === "custom") {
    if (customFrom) backParams.set("from", customFrom);
    if (customTo) backParams.set("to", customTo);
  }

  return (
    <RevenueDetailContent
      rows={rows}
      locale={locale as "en" | "ar"}
      backHref={`/admin/analytics?${backParams.toString()}`}
      rangeLabel={rangeLabel}
    />
  );
}
