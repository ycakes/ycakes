"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { DateRangeFilterButton, type DateRange } from "@/components/admin/orders/DateRangeFilterButton";
import { useRouter } from "@/i18n/navigation";
import type { AnalyticsPeriod } from "@/lib/admin/analyticsPeriod";

export type AnalyticsTabKey = "revenue" | "orders" | "catalog" | "customers" | "promo";

const BASE_PATH = "/admin/analytics";

function Chip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex shrink-0 items-center rounded-full px-3 py-2 text-sm",
        active ? "bg-brand-primary text-text-on-brand" : "border-[1.5px] border-border-default bg-bg-surface text-text-primary",
      )}
    >
      {label}
    </Link>
  );
}

export function AnalyticsShell({
  tab,
  period,
  from,
  to,
  locale,
  showAllTimeChip = false,
  exportButton,
  children,
}: {
  tab: AnalyticsTabKey;
  period: AnalyticsPeriod;
  from: string | null;
  to: string | null;
  locale: "en" | "ar";
  showAllTimeChip?: boolean;
  exportButton?: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = useTranslations("Admin.analytics");
  const router = useRouter();

  function hrefFor(overrides: { tab?: AnalyticsTabKey; period?: AnalyticsPeriod; from?: string | null; to?: string | null }) {
    const params = new URLSearchParams();
    const nextTab = overrides.tab ?? tab;
    const nextPeriod = overrides.period ?? period;
    // Switching tabs keeps whatever from/to was already active; switching
    // period always takes the explicit override (null clears it, a string sets it).
    const nextFrom = overrides.period !== undefined ? (overrides.from ?? null) : from;
    const nextTo = overrides.period !== undefined ? (overrides.to ?? null) : to;
    params.set("tab", nextTab);
    params.set("period", nextPeriod);
    if (nextPeriod === "custom") {
      if (nextFrom) params.set("from", nextFrom);
      if (nextTo) params.set("to", nextTo);
    }
    return `${BASE_PATH}?${params.toString()}`;
  }

  const tabs: { key: AnalyticsTabKey; label: string }[] = [
    { key: "revenue", label: t("tabRevenueProfit") },
    { key: "orders", label: t("tabOrdersFulfillment") },
    { key: "catalog", label: t("tabCatalogPerformance") },
    { key: "customers", label: t("tabCustomers") },
    { key: "promo", label: t("tabPromoCodes") },
  ];

  return (
    <main className="flex flex-1 flex-col">
      <div className="flex h-[80px] shrink-0 items-center gap-3 border-b border-border-default bg-bg-surface px-8">
        <h1 className="font-heading text-[28px] font-bold text-brand-primary">{t("pageTitle")}</h1>
        <div className="ms-auto">{exportButton}</div>
      </div>

      <div className="flex flex-1 flex-col gap-5 bg-bg-surface-alt px-8 py-6">
        <div className="flex flex-col gap-3 rounded-3xl border border-border-default bg-bg-surface p-4">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tabItem) => (
              <Chip key={tabItem.key} href={hrefFor({ tab: tabItem.key })} label={tabItem.label} active={tab === tabItem.key} />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-text-secondary">{t("periodLabel")}</span>
            <Chip href={hrefFor({ period: "day", from: null, to: null })} label={t("periodDay")} active={period === "day"} />
            <Chip href={hrefFor({ period: "week", from: null, to: null })} label={t("periodWeek")} active={period === "week"} />
            <Chip href={hrefFor({ period: "month", from: null, to: null })} label={t("periodMonth")} active={period === "month"} />
            <Chip href={hrefFor({ period: "year", from: null, to: null })} label={t("periodYear")} active={period === "year"} />
            <div className={cn("shrink-0 rounded-full", period === "custom" && "ring-2 ring-brand-primary/40")}>
              <DateRangeFilterButton
                locale={locale}
                label={t("dateRangeLabel")}
                value={{ from: period === "custom" ? from : null, to: period === "custom" ? to : null }}
                onChange={(range: DateRange) => {
                  if (range.from && range.to) {
                    router.push(hrefFor({ period: "custom", from: range.from, to: range.to }));
                  }
                }}
              />
            </div>
            {showAllTimeChip && (
              <Chip href={hrefFor({ period: "all", from: null, to: null })} label={t("periodAllTime")} active={period === "all"} />
            )}
          </div>
        </div>

        {children}
      </div>
    </main>
  );
}
