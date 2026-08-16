"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { downloadExcel } from "@/lib/admin/exportExcel";
import { periodWordKey, type AnalyticsPeriod } from "@/lib/admin/analyticsPeriod";
import type { Bilingual } from "@/types/catalog";

export type MostOrderedCakeRow = {
  cakeId: string;
  name: Bilingual;
  categoryName: Bilingual;
  orders: number;
  revenue: number;
};

export type NeverOrderedCakeRow = {
  cakeId: string;
  name: Bilingual;
  categoryName: Bilingual;
  createdAt: string;
};

export type CatalogPerformanceData = {
  topCake: { name: Bilingual; orders: number } | null;
  topFlavor: { name: Bilingual; pct: number } | null;
  topSize: { label: string; orders: number } | null;
  neverOrderedCount: number;
  revenueByCategory: { name: Bilingual; amount: number }[];
  mostOrdered: MostOrderedCakeRow[];
  neverOrdered: NeverOrderedCakeRow[];
  period: AnalyticsPeriod;
  from: string | null;
  to: string | null;
};

export function CatalogPerformanceExportButton({ data }: { data: CatalogPerformanceData }) {
  const t = useTranslations("Admin.analytics");

  async function handleExport() {
    await downloadExcel(
      "catalog-performance.xlsx",
      "Catalog Performance",
      [
        { header: "Rank", key: "rank", width: 10 },
        { header: "Cake", key: "cake", width: 30 },
        { header: "Category", key: "category", width: 20 },
        { header: "Orders", key: "orders", width: 12 },
        { header: "Revenue (EGP)", key: "revenue", width: 16 },
      ],
      data.mostOrdered.map((row, i) => ({
        rank: i + 1,
        cake: row.name.en,
        category: row.categoryName.en,
        orders: row.orders,
        revenue: row.revenue,
      })),
    );
  }

  return (
    <Button type="button" variant="brand-primary" size="xl" className="h-auto px-4 py-3 text-sm" onClick={handleExport}>
      {t("exportToExcel")}
    </Button>
  );
}

export function CatalogPerformanceTab({ data, locale }: { data: CatalogPerformanceData; locale: "en" | "ar" }) {
  const t = useTranslations("Admin.analytics");
  const tCommon = useTranslations("Common");
  const maxCategoryAmount = Math.max(1, ...data.revenueByCategory.map((r) => r.amount));
  const totalCategoryRevenue = data.revenueByCategory.reduce((sum, r) => sum + r.amount, 0);

  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-2 rounded-[24px] bg-bg-surface p-6">
          <p className="text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">{t("topCake")}</p>
          <p className="font-heading text-[26px] font-bold text-text-primary">{data.topCake?.name[locale] ?? "—"}</p>
          <p className="text-[13px] font-medium text-text-secondary">
            {data.topCake ? t("ordersInPeriod", { count: data.topCake.orders, periodWord: t(periodWordKey(data.period)) }) : t("noDataInPeriod")}
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-[24px] bg-bg-surface p-6">
          <p className="text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">{t("topFlavor")}</p>
          <p className="font-heading text-[26px] font-bold text-text-primary">{data.topFlavor?.name[locale] ?? "—"}</p>
          <p className="text-[13px] font-medium text-text-secondary">
            {data.topFlavor ? t("pctOfOrderItems", { pct: data.topFlavor.pct }) : t("noDataInPeriod")}
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-[24px] bg-bg-surface p-6">
          <p className="text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">{t("topSize")}</p>
          <p className="font-heading text-[26px] font-bold text-text-primary">{data.topSize?.label ?? "—"}</p>
          <p className="text-[13px] font-medium text-text-secondary">
            {data.topSize ? t("ordersInPeriod", { count: data.topSize.orders, periodWord: t(periodWordKey(data.period)) }) : t("noDataInPeriod")}
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-[24px] bg-bg-surface p-6">
          <p className="text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">{t("neverOrderedCakes")}</p>
          <p className="font-heading text-[26px] font-bold text-text-primary">{t("cakesCount", { count: data.neverOrderedCount })}</p>
          <p className="text-[13px] font-medium text-text-secondary">{t("ordersAllTime", { count: 0 })}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-[24px] bg-bg-surface p-6">
        <h2 className="font-heading text-lg font-bold text-text-primary">{t("revenueByCategory")}</h2>
        {data.revenueByCategory.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-secondary">{t("noRevenueInPeriod")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {data.revenueByCategory.map((row) => {
              const pct = totalCategoryRevenue > 0 ? Math.round((row.amount / totalCategoryRevenue) * 100) : 0;
              return (
                <div key={row.name.en} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-medium text-text-primary">{row.name[locale]}</span>
                    <span className="font-semibold text-text-primary" dir="ltr">
                      {row.amount.toLocaleString(locale === "ar" ? "ar-EG" : "en-US")} EGP ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-bg-surface-alt">
                    <div
                      className="h-2 rounded-full bg-brand-primary"
                      style={{ width: `${Math.max(4, (row.amount / maxCategoryAmount) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 rounded-[24px] bg-bg-surface p-6">
        <h2 className="font-heading text-lg font-bold text-text-primary">{t("mostOrderedCakes")}</h2>
        {data.mostOrdered.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-secondary">{t("noOrdersInPeriod")}</p>
        ) : (
          <div className="flex flex-col">
            {data.mostOrdered.map((row, index) => (
              <div
                key={row.cakeId}
                className={`flex flex-wrap items-center gap-4 py-3 ${index < data.mostOrdered.length - 1 ? "border-b border-border-default" : ""}`}
              >
                <span className="w-[40px] shrink-0 text-[14px] text-text-secondary">{index + 1}</span>
                <span className="w-[280px] shrink-0 truncate text-[14px] text-text-primary">{row.name[locale]}</span>
                <span className="w-[160px] shrink-0 truncate text-[14px] text-text-secondary">{row.categoryName[locale]}</span>
                <span className="w-[100px] shrink-0 text-[14px] text-text-primary">{row.orders}</span>
                <span className="ms-auto shrink-0 text-[14px] font-semibold text-text-primary">
                  {tCommon("egpPrice", { amount: row.revenue })}
                </span>
              </div>
            ))}
          </div>
        )}
        <div>
          <Button
            render={
              <Link
                href={`/admin/analytics/catalog-detail?period=${data.period}${data.from ? `&from=${data.from}` : ""}${data.to ? `&to=${data.to}` : ""}`}
              />
            }
            nativeButton={false}
            variant="brand-secondary"
            size="xl"
            className="h-auto px-4 py-3 text-sm"
          >
            {t("viewFullCatalogPerformance")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-[24px] bg-bg-surface p-6">
        <h2 className="font-heading text-lg font-bold text-text-primary">{t("neverOrderedCakesTitle")}</h2>
        {data.neverOrdered.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-secondary">{t("noNeverOrderedCakes")}</p>
        ) : (
          <div className="flex flex-col">
            {data.neverOrdered.map((row, index) => (
              <div
                key={row.cakeId}
                className={`flex flex-wrap items-center gap-4 py-3 ${index < data.neverOrdered.length - 1 ? "border-b border-border-default" : ""}`}
              >
                <span className="w-[280px] shrink-0 truncate text-[14px] text-text-primary">{row.name[locale]}</span>
                <span className="w-[160px] shrink-0 truncate text-[14px] text-text-secondary">{row.categoryName[locale]}</span>
                <span className="w-[140px] shrink-0 text-[14px] text-text-secondary">
                  {new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(new Date(row.createdAt))}
                </span>
                <span className="ms-auto shrink-0 text-[14px] font-semibold text-status-pending">0</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
