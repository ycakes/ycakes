"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { downloadExcel } from "@/lib/admin/exportExcel";
import { periodWordKey, trendPercent, type AnalyticsPeriod } from "@/lib/admin/analyticsPeriod";
import type { Bilingual } from "@/types/catalog";
import type { OrderSource } from "@/types/orders";

export type CancelledOrderRow = {
  id: string;
  order_number: string;
  created_at: string;
  customerName: string;
  total: number;
};

export type OrdersFulfillmentData = {
  totalOrders: number;
  previousTotalOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  previousCancelledOrders: number;
  deliveryOrders: number;
  pickupOrders: number;
  sourceBreakdown: { source: OrderSource; count: number }[];
  areaBreakdown: { name: Bilingual; count: number }[];
  cancelledRows: CancelledOrderRow[];
  trendLabelKey: "vsYesterday" | "vsLastWeek" | "vsLastMonth" | "vsLastYear" | "vsPreviousPeriod";
  period: AnalyticsPeriod;
  orderFrom: string;
  orderTo: string;
};

const SOURCE_LABEL_KEY: Record<OrderSource, string> = {
  website: "sourceValue.website",
  phone: "sourceValue.phone",
  instagram: "sourceValue.instagram",
  in_person: "sourceValue.in_person",
};

export function OrdersFulfillmentExportButton({ data }: { data: OrdersFulfillmentData }) {
  const t = useTranslations("Admin.analytics");

  async function handleExport() {
    await downloadExcel(
      "orders-fulfillment.xlsx",
      "Orders & Fulfillment",
      [
        { header: "Metric", key: "metric", width: 30 },
        { header: "Value", key: "value", width: 20 },
      ],
      [
        { metric: "Total Orders", value: data.totalOrders },
        { metric: "Pending Orders", value: data.pendingOrders },
        { metric: "Cancelled Orders", value: data.cancelledOrders },
        { metric: "Delivery Orders", value: data.deliveryOrders },
        { metric: "Pickup Orders", value: data.pickupOrders },
        ...data.sourceBreakdown.map((row) => ({ metric: `Source — ${row.source}`, value: row.count })),
        ...data.areaBreakdown.map((row) => ({ metric: `Area — ${row.name.en}`, value: row.count })),
      ],
    );
  }

  return (
    <Button type="button" variant="brand-primary" size="xl" className="h-auto px-4 py-3 text-sm" onClick={handleExport}>
      {t("exportToExcel")}
    </Button>
  );
}

function BreakdownBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[13px]">
        <span className="font-medium text-text-primary">{label}</span>
        <span className="font-semibold text-text-primary">
          {count} ({pct}%)
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-bg-surface-alt">
        <div className="h-2 rounded-full bg-brand-primary" style={{ width: `${Math.max(4, pct)}%` }} />
      </div>
    </div>
  );
}

export function OrdersFulfillmentTab({ data, locale }: { data: OrdersFulfillmentData; locale: "en" | "ar" }) {
  const t = useTranslations("Admin.analytics");
  const tOrders = useTranslations("Admin.orders");
  const tCommon = useTranslations("Common");
  const tDashboard = useTranslations("Admin.dashboard");

  const isAllTime = data.period === "all";
  const cancellationRate = data.totalOrders > 0 ? Math.round((data.cancelledOrders / data.totalOrders) * 1000) / 10 : 0;
  const previousCancellationRate =
    data.previousTotalOrders > 0 ? Math.round((data.previousCancelledOrders / data.previousTotalOrders) * 1000) / 10 : 0;
  const cancellationRatePointDiff = Math.round((cancellationRate - previousCancellationRate) * 10) / 10;
  const deliveryPct = data.totalOrders > 0 ? Math.round((data.deliveryOrders / data.totalOrders) * 100) : 0;
  const pickupPct = data.totalOrders > 0 ? Math.round((data.pickupOrders / data.totalOrders) * 100) : 0;

  const totalOrdersPct = trendPercent(data.totalOrders, data.previousTotalOrders);

  function trendText(pct: number | null) {
    if (pct === null) return t("noPreviousData");
    return t(data.trendLabelKey, { sign: pct >= 0 ? "+" : "", pct });
  }

  const ordersListHref = `/admin/orders?orderFrom=${data.orderFrom}&orderTo=${data.orderTo}`;
  const cancelledListHref = `${ordersListHref}&status=cancelled`;

  return (
    <>
      <div>
        <Button render={<Link href={ordersListHref} />} nativeButton={false} variant="brand-secondary" size="xl" className="h-auto px-4 py-3 text-sm">
          {t("viewAllOrdersThisPeriod")}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <div className="flex flex-col gap-2 rounded-[24px] bg-bg-surface p-6">
          <p className="text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">{t("totalOrders")}</p>
          <p className="font-heading text-[32px] font-bold text-text-primary">{data.totalOrders}</p>
          {isAllTime ? (
            <p className="text-[13px] font-medium text-text-secondary">{t(periodWordKey(data.period))}</p>
          ) : (
            <p className={`text-[13px] font-medium ${totalOrdersPct === null ? "text-text-secondary" : totalOrdersPct >= 0 ? "text-status-completed" : "text-destructive"}`}>
              {trendText(totalOrdersPct)}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 rounded-[24px] bg-bg-surface p-6">
          <p className="text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">{tDashboard("pendingOrders")}</p>
          <p className="font-heading text-[32px] font-bold text-text-primary">{data.pendingOrders}</p>
          <p className="text-[13px] font-medium text-status-pending">{tDashboard("pendingOrdersSubtext")}</p>
        </div>
        <div className="flex flex-col gap-2 rounded-[24px] bg-bg-surface p-6">
          <p className="text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">{t("cancelledOrders")}</p>
          <p className="font-heading text-[32px] font-bold text-text-primary">{data.cancelledOrders}</p>
          <p className="text-[13px] font-medium text-destructive">{t("cancellationRate", { pct: cancellationRate })}</p>
          {!isAllTime && (
            <p className={`text-[13px] font-medium ${cancellationRatePointDiff <= 0 ? "text-status-completed" : "text-destructive"}`}>
              {t(data.trendLabelKey, { sign: cancellationRatePointDiff >= 0 ? "+" : "", pct: cancellationRatePointDiff })}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 rounded-[24px] bg-bg-surface p-6">
          <p className="text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">{t("deliveryOrders")}</p>
          <p className="font-heading text-[32px] font-bold text-text-primary">{data.deliveryOrders}</p>
          <p className="text-[13px] font-medium text-text-secondary">{t("pctOfOrders", { pct: deliveryPct })}</p>
        </div>
        <div className="flex flex-col gap-2 rounded-[24px] bg-bg-surface p-6">
          <p className="text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">{t("pickupOrders")}</p>
          <p className="font-heading text-[32px] font-bold text-text-primary">{data.pickupOrders}</p>
          <p className="text-[13px] font-medium text-text-secondary">{t("pctOfOrders", { pct: pickupPct })}</p>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex flex-1 flex-col gap-4 rounded-[24px] bg-bg-surface p-6">
          <h2 className="font-heading text-lg font-bold text-text-primary">{t("orderSourceBreakdown")}</h2>
          {data.sourceBreakdown.length === 0 ? (
            <p className="py-4 text-center text-sm text-text-secondary">{t("noOrdersInPeriod")}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {data.sourceBreakdown.map((row) => (
                <BreakdownBar key={row.source} label={tOrders(SOURCE_LABEL_KEY[row.source])} count={row.count} total={data.totalOrders} />
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-4 rounded-[24px] bg-bg-surface p-6">
          <h2 className="font-heading text-lg font-bold text-text-primary">{t("deliveryAreaBreakdown")}</h2>
          {data.areaBreakdown.length === 0 ? (
            <p className="py-4 text-center text-sm text-text-secondary">{t("noDeliveryOrdersInPeriod")}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {data.areaBreakdown.map((row) => (
                <BreakdownBar key={row.name.en} label={row.name[locale]} count={row.count} total={data.deliveryOrders} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-[24px] bg-bg-surface p-6">
        <h2 className="font-heading text-lg font-bold text-text-primary">{t("cancelledOrdersTitle")}</h2>
        {data.cancelledRows.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-secondary">{t("noCancelledOrdersInPeriod")}</p>
        ) : (
          <div className="flex flex-col">
            {data.cancelledRows.map((row, index) => (
              <div
                key={row.id}
                className={`flex flex-wrap items-center gap-4 py-3 ${index < data.cancelledRows.length - 1 ? "border-b border-border-default" : ""}`}
              >
                <span className="w-[170px] shrink-0 truncate text-[14px] font-medium text-text-primary">{row.order_number}</span>
                <span className="w-[130px] shrink-0 text-[14px] text-text-secondary">
                  {new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(new Date(row.created_at))}
                </span>
                <span className="w-[220px] shrink-0 truncate text-[14px] text-text-primary">{row.customerName}</span>
                <span className="w-[130px] shrink-0 text-[14px] font-semibold text-destructive">
                  {tCommon("egpPrice", { amount: row.total })}
                </span>
                <Link href={`/admin/orders/${row.id}`} className="ms-auto shrink-0 text-[13px] font-semibold text-brand-primary hover:underline">
                  {tOrders("view")}
                </Link>
              </div>
            ))}
          </div>
        )}
        <div>
          <Button
            render={<Link href={cancelledListHref} />}
            nativeButton={false}
            variant="brand-secondary"
            size="xl"
            className="h-auto px-4 py-3 text-sm"
          >
            {t("viewAllCancelledOrders")}
          </Button>
        </div>
      </div>
    </>
  );
}
