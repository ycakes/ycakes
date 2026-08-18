"use client";

import { useTranslations } from "next-intl";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { downloadExcel } from "@/lib/admin/exportExcel";
import { periodWordKey, trendPercent, type AnalyticsPeriod } from "@/lib/admin/analyticsPeriod";
import type { Bilingual } from "@/types/catalog";

export type RevenueProfitData = {
  totalRevenue: number;
  totalExpenses: number;
  previousRevenue: number;
  previousExpenses: number;
  completedOrdersCount: number;
  pendingRevenue: number;
  pendingOrdersCount: number;
  previousPendingRevenue: number;
  confirmedRevenue: number;
  confirmedOrdersCount: number;
  previousConfirmedRevenue: number;
  last6Months: { label: string; amount: number }[];
  expensesByCategory: { name: Bilingual; amount: number }[];
  trendLabelKey: "vsYesterday" | "vsLastWeek" | "vsLastMonth" | "vsLastYear" | "vsPreviousPeriod";
  period: AnalyticsPeriod;
  from: string | null;
  to: string | null;
};

export function RevenueProfitExportButton({ data }: { data: RevenueProfitData }) {
  const t = useTranslations("Admin.analytics");

  async function handleExport() {
    const totalExpectedRevenue = data.totalRevenue + data.confirmedRevenue + data.pendingRevenue;
    await downloadExcel(
      "revenue-profit.xlsx",
      "Revenue & Profit",
      [
        { header: "Metric", key: "metric", width: 30 },
        { header: "Value", key: "value", width: 20 },
      ],
      [
        { metric: "Total Completed Revenue (EGP)", value: data.totalRevenue },
        { metric: "Total Expenses (EGP)", value: data.totalExpenses },
        { metric: "Net Profit (EGP)", value: data.totalRevenue - data.totalExpenses },
        { metric: "Completed Orders", value: data.completedOrdersCount },
        {
          metric: "Avg. Order Value (EGP)",
          value: data.completedOrdersCount > 0 ? Math.round(data.totalRevenue / data.completedOrdersCount) : 0,
        },
        { metric: "Pending Orders Revenue (EGP)", value: data.pendingRevenue },
        { metric: "Pending Orders", value: data.pendingOrdersCount },
        { metric: "Confirmed Orders Revenue (EGP)", value: data.confirmedRevenue },
        { metric: "Confirmed Orders", value: data.confirmedOrdersCount },
        { metric: "Total Expected Revenue (EGP)", value: totalExpectedRevenue },
        { metric: "Expected Net Profit (EGP)", value: totalExpectedRevenue - data.totalExpenses },
        ...data.expensesByCategory.map((row) => ({ metric: `Expenses — ${row.name.en}`, value: row.amount })),
      ],
    );
  }

  return (
    <Button type="button" variant="brand-primary" size="xl" className="h-auto px-4 py-3 text-sm" onClick={handleExport}>
      {t("exportToExcel")}
    </Button>
  );
}

export function RevenueProfitTab({ data, locale }: { data: RevenueProfitData; locale: "en" | "ar" }) {
  const t = useTranslations("Admin.analytics");
  const netProfit = data.totalRevenue - data.totalExpenses;
  const margin = data.totalRevenue > 0 ? Math.round((netProfit / data.totalRevenue) * 1000) / 10 : 0;
  const aov = data.completedOrdersCount > 0 ? Math.round(data.totalRevenue / data.completedOrdersCount) : 0;

  const isAllTime = data.period === "all";
  const revenuePct = trendPercent(data.totalRevenue, data.previousRevenue);
  const expensesPct = trendPercent(data.totalExpenses, data.previousExpenses);
  const pendingPct = trendPercent(data.pendingRevenue, data.previousPendingRevenue);
  const confirmedPct = trendPercent(data.confirmedRevenue, data.previousConfirmedRevenue);

  const totalExpectedRevenue = data.totalRevenue + data.confirmedRevenue + data.pendingRevenue;
  const previousTotalExpectedRevenue = data.previousRevenue + data.previousConfirmedRevenue + data.previousPendingRevenue;
  const expectedRevenuePct = trendPercent(totalExpectedRevenue, previousTotalExpectedRevenue);
  const expectedNetProfit = totalExpectedRevenue - data.totalExpenses;
  const expectedMargin = totalExpectedRevenue > 0 ? Math.round((expectedNetProfit / totalExpectedRevenue) * 1000) / 10 : 0;

  function trendText(pct: number | null) {
    if (pct === null) return t("noPreviousData");
    return t(data.trendLabelKey, { sign: pct >= 0 ? "+" : "", pct });
  }

  function trendColorClass(pct: number | null, higherIsGood: boolean) {
    if (pct === null) return "text-text-secondary";
    const isGood = higherIsGood ? pct >= 0 : pct <= 0;
    return isGood ? "text-status-completed" : "text-destructive";
  }

  const maxCategoryAmount = Math.max(1, ...data.expensesByCategory.map((r) => r.amount));

  const logHref = `/admin/analytics/revenue-detail?period=${data.period}${data.from ? `&from=${data.from}` : ""}${data.to ? `&to=${data.to}` : ""}`;

  return (
    <>
      <div>
        <Button render={<Link href={logHref} />} nativeButton={false} variant="brand-secondary" size="xl" className="h-auto px-4 py-3 text-sm">
          {t("viewFullRevenueLog")}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-2 rounded-[24px] bg-bg-surface p-6">
          <p className="text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">{t("totalCompletedRevenue")}</p>
          <p className="font-heading text-[32px] font-bold text-text-primary" dir="ltr">
            {data.totalRevenue.toLocaleString(locale === "ar" ? "ar-EG" : "en-US")} EGP
          </p>
          {!isAllTime && <p className={`text-[13px] font-medium ${trendColorClass(revenuePct, true)}`}>{trendText(revenuePct)}</p>}
        </div>
        <div className="flex flex-col gap-2 rounded-[24px] bg-bg-surface p-6">
          <p className="text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">{t("totalExpenses")}</p>
          <p className="font-heading text-[32px] font-bold text-text-primary" dir="ltr">
            {data.totalExpenses.toLocaleString(locale === "ar" ? "ar-EG" : "en-US")} EGP
          </p>
          {!isAllTime && <p className={`text-[13px] font-medium ${trendColorClass(expensesPct, false)}`}>{trendText(expensesPct)}</p>}
        </div>
        <div className="flex flex-col gap-2 rounded-[24px] bg-bg-surface p-6">
          <p className="text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">{t("netProfit")}</p>
          <p className="font-heading text-[32px] font-bold text-text-primary" dir="ltr">
            {netProfit.toLocaleString(locale === "ar" ? "ar-EG" : "en-US")} EGP
          </p>
          {!isAllTime && (
            <p className={`text-[13px] font-medium ${netProfit >= 0 ? "text-status-completed" : "text-destructive"}`}>
              {t("marginLabel", { pct: margin })}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 rounded-[24px] bg-bg-surface p-6">
          <p className="text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">{t("avgOrderValue")}</p>
          <p className="font-heading text-[32px] font-bold text-text-primary" dir="ltr">
            {aov.toLocaleString(locale === "ar" ? "ar-EG" : "en-US")} EGP
          </p>
          <p className="text-[13px] font-medium text-text-secondary">
            {t("ordersInPeriod", { count: data.completedOrdersCount, periodWord: t(periodWordKey(data.period)) })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-2 rounded-[24px] bg-bg-surface p-6">
          <p className="text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">{t("pendingRevenue")}</p>
          <p className="font-heading text-[32px] font-bold text-text-primary" dir="ltr">
            {data.pendingRevenue.toLocaleString(locale === "ar" ? "ar-EG" : "en-US")} EGP
          </p>
          {!isAllTime && <p className={`text-[13px] font-medium ${trendColorClass(pendingPct, true)}`}>{trendText(pendingPct)}</p>}
        </div>
        <div className="flex flex-col gap-2 rounded-[24px] bg-bg-surface p-6">
          <p className="text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">{t("confirmedRevenue")}</p>
          <p className="font-heading text-[32px] font-bold text-text-primary" dir="ltr">
            {data.confirmedRevenue.toLocaleString(locale === "ar" ? "ar-EG" : "en-US")} EGP
          </p>
          {!isAllTime && <p className={`text-[13px] font-medium ${trendColorClass(confirmedPct, true)}`}>{trendText(confirmedPct)}</p>}
        </div>
        <div className="flex flex-col gap-2 rounded-[24px] bg-bg-surface p-6">
          <p className="text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">{t("expectedNetProfit")}</p>
          <p className="font-heading text-[32px] font-bold text-text-primary" dir="ltr">
            {expectedNetProfit.toLocaleString(locale === "ar" ? "ar-EG" : "en-US")} EGP
          </p>
          {!isAllTime && (
            <p className={`text-[13px] font-medium ${expectedNetProfit >= 0 ? "text-status-completed" : "text-destructive"}`}>
              {t("marginLabel", { pct: expectedMargin })}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 rounded-[24px] bg-bg-surface p-6">
          <p className="text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">{t("totalExpectedRevenue")}</p>
          <p className="font-heading text-[32px] font-bold text-text-primary" dir="ltr">
            {totalExpectedRevenue.toLocaleString(locale === "ar" ? "ar-EG" : "en-US")} EGP
          </p>
          {!isAllTime && <p className={`text-[13px] font-medium ${trendColorClass(expectedRevenuePct, true)}`}>{trendText(expectedRevenuePct)}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex flex-1 flex-col gap-5 rounded-[24px] bg-bg-surface p-6">
          <h2 className="font-heading text-lg font-bold text-text-primary">{t("revenueChartTitle")}</h2>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.last6Months} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#6b5c54", fontSize: 12 }} />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: "#f6e3d2" }}
                  formatter={(value) => [`${Number(value ?? 0).toLocaleString(locale === "ar" ? "ar-EG" : "en-US")} EGP`, ""]}
                />
                <Bar dataKey="amount" fill="#501907" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex w-full flex-col gap-4 rounded-[24px] bg-bg-surface p-6 lg:w-[388px]">
          <h2 className="font-heading text-lg font-bold text-text-primary">{t("expensesByCategoryTitle")}</h2>
          {data.expensesByCategory.length === 0 ? (
            <p className="py-4 text-center text-sm text-text-secondary">{t("noExpensesInPeriod")}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {data.expensesByCategory.map((row) => (
                <div key={row.name.en} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-medium text-text-primary">{row.name[locale]}</span>
                    <span className="font-semibold text-text-primary" dir="ltr">
                      {row.amount.toLocaleString(locale === "ar" ? "ar-EG" : "en-US")} EGP
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-bg-surface-alt">
                    <div
                      className="h-2 rounded-full bg-brand-primary"
                      style={{ width: `${Math.max(4, (row.amount / maxCategoryAmount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
