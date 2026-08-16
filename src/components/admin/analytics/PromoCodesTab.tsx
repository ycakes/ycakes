"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadExcel } from "@/lib/admin/exportExcel";

export type PromoRedemptionRow = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  date: string;
  discount: number;
};

export type PromoCodeRow = {
  id: string;
  code: string;
  redemptionsAllTime: number;
  redemptionCap: number | null;
  discountGiven: number;
  revenueInfluenced: number;
  redemptions: PromoRedemptionRow[];
};

export type PromoCodesData = {
  activeCodes: number;
  totalCodes: number;
  totalRedemptions: number;
  totalDiscountGiven: number;
  totalRevenueInfluenced: number;
  codes: PromoCodeRow[];
};

function roi(revenue: number, discount: number): number | null {
  if (discount <= 0) return null;
  return Math.round(((revenue - discount) / discount) * 1000) / 10;
}

export function PromoCodesExportButton({ data }: { data: PromoCodesData }) {
  const t = useTranslations("Admin.analytics");

  async function handleExport() {
    await downloadExcel(
      "promo-codes.xlsx",
      "Promo Codes",
      [
        { header: "Code", key: "code", width: 18 },
        { header: "Redemptions (all-time)", key: "redemptions", width: 20 },
        { header: "Discount Given (EGP)", key: "discount", width: 20 },
        { header: "Revenue Influenced (EGP)", key: "revenue", width: 22 },
        { header: "ROI (%)", key: "roi", width: 12 },
      ],
      data.codes.map((c) => ({
        code: c.code,
        redemptions: `${c.redemptionsAllTime} / ${c.redemptionCap ?? "∞"}`,
        discount: c.discountGiven,
        revenue: c.revenueInfluenced,
        roi: roi(c.revenueInfluenced, c.discountGiven) ?? 0,
      })),
    );
  }

  return (
    <Button type="button" variant="brand-primary" size="xl" className="h-auto px-4 py-3 text-sm" onClick={handleExport}>
      {t("exportToExcel")}
    </Button>
  );
}

function PromoCodeRowView({ row, locale }: { row: PromoCodeRow; locale: "en" | "ar" }) {
  const t = useTranslations("Admin.analytics");
  const tCommon = useTranslations("Common");
  const [expanded, setExpanded] = useState(false);
  const roiPct = roi(row.revenueInfluenced, row.discountGiven);

  return (
    <div className="border-t border-border-default">
      <div className="flex flex-wrap items-center gap-4 px-0 py-3.5">
        <span className="w-[140px] shrink-0 truncate text-[14px] font-semibold text-text-primary" dir="ltr">
          {row.code}
        </span>
        <span className="w-[130px] shrink-0 text-[14px] text-text-secondary" dir="ltr">
          {row.redemptionsAllTime} / {row.redemptionCap ?? "∞"}
        </span>
        <span className="w-[150px] shrink-0 text-[14px] text-text-secondary">{tCommon("egpPrice", { amount: row.discountGiven })}</span>
        <span className="w-[170px] shrink-0 text-[14px] text-text-secondary">{tCommon("egpPrice", { amount: row.revenueInfluenced })}</span>
        <span className={`w-[100px] shrink-0 text-[14px] font-semibold ${roiPct === null ? "text-text-secondary" : roiPct >= 0 ? "text-status-completed" : "text-destructive"}`}>
          {roiPct === null ? "—" : `${roiPct >= 0 ? "+" : ""}${roiPct}%`}
        </span>
        {row.redemptions.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="ms-auto flex shrink-0 items-center gap-1 text-[13px] font-semibold text-brand-primary"
          >
            {t("viewRedemptions")}
            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
        )}
      </div>
      {expanded && row.redemptions.length > 0 && (
        <div className="flex flex-col gap-2 rounded-2xl bg-bg-subtle px-4 py-3">
          <div className="flex gap-4 text-[11px] font-semibold tracking-[0.4px] text-text-secondary uppercase">
            <span className="w-[180px] shrink-0">{t("colOrderNumber")}</span>
            <span className="w-[200px] shrink-0">{t("colCustomer")}</span>
            <span className="w-[140px] shrink-0">{t("colDate")}</span>
            <span className="w-[140px] shrink-0">{t("discountApplied")}</span>
          </div>
          {row.redemptions.map((r) => (
            <div key={r.orderId} className="flex gap-4 border-t border-border-default pt-2 text-[13px]">
              <span className="w-[180px] shrink-0 truncate font-medium text-text-primary">{r.orderNumber}</span>
              <span className="w-[200px] shrink-0 truncate text-text-secondary">{r.customerName}</span>
              <span className="w-[140px] shrink-0 text-text-secondary">
                {new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(new Date(r.date))}
              </span>
              <span className="w-[140px] shrink-0 text-text-secondary">-{tCommon("egpPrice", { amount: r.discount })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PromoCodesTab({ data, locale }: { data: PromoCodesData; locale: "en" | "ar" }) {
  const t = useTranslations("Admin.analytics");
  const tCommon = useTranslations("Common");
  const overallRoi = roi(data.totalRevenueInfluenced, data.totalDiscountGiven);

  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-2 rounded-[24px] bg-bg-surface p-6">
          <p className="text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">{t("activeCodes")}</p>
          <p className="font-heading text-[30px] font-bold text-text-primary">{data.activeCodes}</p>
          <p className="text-[13px] font-medium text-text-secondary">{t("ofTotalCodes", { count: data.totalCodes })}</p>
        </div>
        <div className="flex flex-col gap-2 rounded-[24px] bg-bg-surface p-6">
          <p className="text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">{t("redemptions")}</p>
          <p className="font-heading text-[30px] font-bold text-text-primary">{data.totalRedemptions}</p>
          <p className="text-[13px] font-medium text-text-secondary">{t("thisPeriod")}</p>
        </div>
        <div className="flex flex-col gap-2 rounded-[24px] bg-bg-surface p-6">
          <p className="text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">{t("discountGiven")}</p>
          <p className="font-heading text-[30px] font-bold text-text-primary">{tCommon("egpPrice", { amount: data.totalDiscountGiven })}</p>
          <p className="text-[13px] font-medium text-text-secondary">{t("totalThisPeriod")}</p>
        </div>
        <div className="flex flex-col gap-2 rounded-[24px] bg-bg-surface p-6">
          <p className="text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">{t("revenueInfluenced")}</p>
          <p className="font-heading text-[30px] font-bold text-text-primary">{tCommon("egpPrice", { amount: data.totalRevenueInfluenced })}</p>
          <p className={`text-[13px] font-medium ${overallRoi === null ? "text-text-secondary" : overallRoi >= 0 ? "text-status-completed" : "text-destructive"}`}>
            {overallRoi === null ? t("noDiscountGivenYet") : t("roiVsDiscountCost", { pct: overallRoi >= 0 ? `+${overallRoi}` : overallRoi })}
          </p>
        </div>
      </div>

      <div className="flex flex-col rounded-[24px] bg-bg-surface p-6">
        <h2 className="font-heading text-lg font-bold text-text-primary">{t("promoCodePerformance")}</h2>
        {data.codes.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-secondary">{t("noPromoCodes")}</p>
        ) : (
          <>
            <div className="mt-4 flex gap-4 text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">
              <span className="w-[140px] shrink-0">{t("code")}</span>
              <span className="w-[130px] shrink-0">{t("redemptions")}</span>
              <span className="w-[150px] shrink-0">{t("discountGiven")}</span>
              <span className="w-[170px] shrink-0">{t("revenueInfluenced")}</span>
              <span className="w-[100px] shrink-0">{t("roi")}</span>
            </div>
            {data.codes.map((row) => (
              <PromoCodeRowView key={row.id} row={row} locale={locale} />
            ))}
          </>
        )}
      </div>
    </>
  );
}
