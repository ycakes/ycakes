"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { downloadExcel } from "@/lib/admin/exportExcel";
import type { Bilingual } from "@/types/catalog";

export type CatalogCakeRow = {
  cakeId: string;
  name: Bilingual;
  categoryName: Bilingual;
  orders: number;
  revenue: number;
};

export type UsageRow = { label: string; count: number; pct: number | null };

export type CatalogDetailData = {
  cakes: CatalogCakeRow[];
  flavors: UsageRow[];
  sizes: UsageRow[];
  toppers: UsageRow[];
  colors: UsageRow[];
};

const SORTS = ["orders", "revenue", "az"] as const;
type Sort = (typeof SORTS)[number];

export function CatalogDetailExportButton({ data }: { data: CatalogDetailData }) {
  const t = useTranslations("Admin.analytics");

  async function handleExport() {
    await downloadExcel(
      "catalog-detail.xlsx",
      "Catalog Detail",
      [
        { header: "Cake", key: "cake", width: 30 },
        { header: "Category", key: "category", width: 20 },
        { header: "Orders", key: "orders", width: 12 },
        { header: "Revenue (EGP)", key: "revenue", width: 16 },
      ],
      data.cakes.map((c) => ({ cake: c.name.en, category: c.categoryName.en, orders: c.orders, revenue: c.revenue })),
    );
  }

  return (
    <Button type="button" variant="brand-primary" size="xl" className="h-auto px-4 py-3 text-sm" onClick={handleExport}>
      {t("exportToExcel")}
    </Button>
  );
}

function UsageCard({ title, rows, emptyLabel }: { title: string; rows: UsageRow[]; emptyLabel: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="flex flex-1 flex-col gap-3.5 rounded-[24px] bg-bg-surface p-6">
      <h2 className="font-heading text-lg font-bold text-text-primary">{title}</h2>
      {rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-text-secondary">{emptyLabel}</p>
      ) : (
        rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-medium text-text-primary">{row.label}</span>
              <span className="font-semibold text-text-primary">
                {row.count} {row.pct != null ? `(${row.pct}%)` : ""}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-surface-alt">
              <div className="h-1.5 rounded-full bg-brand-primary" style={{ width: `${Math.max(4, (row.count / max) * 100)}%` }} />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export function CatalogDetailContent({
  data,
  locale,
  backHref,
  sort,
  category,
  categories,
  period,
  from,
  to,
}: {
  data: CatalogDetailData;
  locale: "en" | "ar";
  backHref: string;
  sort: Sort;
  category: string;
  categories: { slug: string; name: Bilingual }[];
  period: string;
  from: string | null;
  to: string | null;
}) {
  const t = useTranslations("Admin.analytics");
  const tCommon = useTranslations("Common");

  function buildHref(overrides: { sort?: Sort; category?: string }) {
    const params = new URLSearchParams({ period, sort: overrides.sort ?? sort, category: overrides.category ?? category });
    if (period === "custom") {
      if (from) params.set("from", from);
      if (to) params.set("to", to);
    }
    return `/admin/analytics/catalog-detail?${params.toString()}`;
  }

  return (
    <main className="flex flex-1 flex-col">
      <div className="flex h-[80px] shrink-0 items-center gap-4 border-b border-border-default bg-bg-surface px-8">
        <Button render={<Link href={backHref} />} nativeButton={false} variant="brand-ghost" size="xl" className="h-auto bg-bg-surface px-4 py-3 text-sm">
          ← {t("backToAnalytics")}
        </Button>
        <h1 className="font-heading text-2xl font-bold text-text-primary">{t("catalogFullDetail")}</h1>
        <div className="ms-auto">
          <CatalogDetailExportButton data={data} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-6 bg-bg-surface-alt px-8 py-6">
        <div className="flex flex-col gap-4 rounded-[24px] bg-bg-surface p-6">
          <h2 className="font-heading text-xl font-bold text-text-primary">{t("allCakesRanked")}</h2>

          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-text-secondary">{t("sortBy")}</span>
              {SORTS.map((s) => (
                <Link
                  key={s}
                  href={buildHref({ sort: s })}
                  className={
                    sort === s
                      ? "flex shrink-0 items-center rounded-full bg-brand-primary px-3 py-2 text-sm text-text-on-brand"
                      : "flex shrink-0 items-center rounded-full border-[1.5px] border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary"
                  }
                >
                  {t(s === "orders" ? "sortMostOrders" : s === "revenue" ? "sortMostRevenue" : "sortAZ")}
                </Link>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-text-secondary">{t("categoryLabel")}</span>
              <Link
                href={buildHref({ category: "all" })}
                className={
                  category === "all"
                    ? "flex shrink-0 items-center rounded-full bg-brand-primary px-3 py-2 text-sm text-text-on-brand"
                    : "flex shrink-0 items-center rounded-full border-[1.5px] border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary"
                }
              >
                {t("showAll")}
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={buildHref({ category: cat.slug })}
                  className={
                    category === cat.slug
                      ? "flex shrink-0 items-center rounded-full bg-brand-primary px-3 py-2 text-sm text-text-on-brand"
                      : "flex shrink-0 items-center rounded-full border-[1.5px] border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary"
                  }
                >
                  {cat.name[locale]}
                </Link>
              ))}
            </div>
          </div>

          {data.cakes.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-secondary">{t("noCakesMatch")}</p>
          ) : (
            <div className="flex flex-col">
              <div className="flex gap-4 pb-3 text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">
                <span className="w-[50px] shrink-0">{t("rank")}</span>
                <span className="w-[280px] shrink-0">{t("cake")}</span>
                <span className="w-[160px] shrink-0">{t("category")}</span>
                <span className="w-[100px] shrink-0">{t("ordersColumn")}</span>
                <span className="w-[130px] shrink-0">{t("revenue")}</span>
              </div>
              {data.cakes.map((row, index) => (
                <div key={row.cakeId} className={`flex items-center gap-4 py-3 ${index < data.cakes.length - 1 ? "border-b border-border-default" : ""}`}>
                  <span className="w-[50px] shrink-0 text-[14px] text-text-secondary">{index + 1}</span>
                  <Link href={`/admin/cakes/${row.cakeId}`} className="w-[280px] shrink-0 truncate text-[14px] font-medium text-text-primary hover:underline">
                    {row.name[locale]}
                  </Link>
                  <span className="w-[160px] shrink-0 truncate text-[14px] text-text-secondary">{row.categoryName[locale]}</span>
                  <span className="w-[100px] shrink-0 text-[14px] text-text-primary">{row.orders}</span>
                  <span className="w-[130px] shrink-0 text-[14px] text-text-secondary">{tCommon("egpPrice", { amount: row.revenue })}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <UsageCard title={t("flavorsUsed")} rows={data.flavors} emptyLabel={t("noUsageInPeriod")} />
          <UsageCard title={t("sizesUsed")} rows={data.sizes} emptyLabel={t("noUsageInPeriod")} />
        </div>
        <div className="flex flex-col gap-6 lg:flex-row">
          <UsageCard title={t("toppersUsed")} rows={data.toppers} emptyLabel={t("noUsageInPeriod")} />
          <UsageCard title={t("colorsUsed")} rows={data.colors} emptyLabel={t("noUsageInPeriod")} />
        </div>
      </div>
    </main>
  );
}
