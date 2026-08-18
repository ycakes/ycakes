"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { downloadExcel } from "@/lib/admin/exportExcel";

export type LedgerRow = {
  id: string;
  type: "revenue" | "expense";
  date: string;
  description: string;
  amount: number;
  balance: number;
  orderId?: string;
};

type ShowFilter = "all" | "revenue" | "expense";

export function RevenueDetailExportButton({ rows }: { rows: LedgerRow[] }) {
  const t = useTranslations("Admin.analytics");

  async function handleExport() {
    await downloadExcel(
      "revenue-expense-log.xlsx",
      "Revenue & Expense Log",
      [
        { header: "Date", key: "date", width: 16 },
        { header: "Type", key: "type", width: 12 },
        { header: "Description", key: "description", width: 40 },
        { header: "Amount (EGP)", key: "amount", width: 16 },
        { header: "Running Balance (EGP)", key: "balance", width: 20 },
      ],
      rows.map((r) => ({
        date: r.date,
        type: r.type === "revenue" ? "Revenue" : "Expense",
        description: r.description,
        amount: r.amount,
        balance: r.balance,
      })),
    );
  }

  return (
    <Button type="button" variant="brand-primary" size="xl" className="h-auto px-4 py-3 text-sm" onClick={handleExport}>
      {t("exportToExcel")}
    </Button>
  );
}

export function RevenueDetailContent({
  rows,
  locale,
  backHref,
  rangeLabel,
}: {
  rows: LedgerRow[];
  locale: "en" | "ar";
  backHref: string;
  rangeLabel: string;
}) {
  const t = useTranslations("Admin.analytics");
  const [show, setShow] = useState<ShowFilter>("all");
  const visibleRows = useMemo(() => (show === "all" ? rows : rows.filter((r) => r.type === show)), [rows, show]);

  return (
    <main className="flex flex-1 flex-col">
      <div className="flex min-h-[80px] shrink-0 flex-wrap items-center gap-4 border-b border-border-default bg-bg-surface px-4 py-3 sm:px-8">
        <Button render={<Link href={backHref} />} nativeButton={false} variant="brand-ghost" size="xl" className="h-auto bg-bg-surface px-4 py-3 text-sm">
          ← {t("backToAnalytics")}
        </Button>
        <h1 className="font-heading text-2xl font-bold text-text-primary">{t("revenueExpenseLog")}</h1>
        <div className="ms-auto">
          <RevenueDetailExportButton rows={visibleRows} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 bg-bg-surface-alt px-4 py-6 sm:px-8">
        <p className="max-w-[900px] text-sm text-text-secondary">{t("revenueDetailDescription", { range: rangeLabel })}</p>

        <div className="flex flex-wrap items-center gap-2 rounded-3xl border border-border-default bg-bg-surface p-4">
          <span className="text-sm text-text-secondary">{t("show")}</span>
          {(["all", "revenue", "expense"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setShow(key)}
              className={
                show === key
                  ? "flex shrink-0 items-center rounded-full bg-brand-primary px-3 py-2 text-sm text-text-on-brand"
                  : "flex shrink-0 items-center rounded-full border-[1.5px] border-border-default bg-bg-surface-alt px-3 py-2 text-sm text-text-primary"
              }
            >
              {t(key === "all" ? "showAll" : key === "revenue" ? "showRevenueOnly" : "showExpensesOnly")}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-[24px] bg-bg-surface">
          {visibleRows.length === 0 ? (
            <p className="py-12 text-center text-sm text-text-secondary">{t("noLedgerRows")}</p>
          ) : (
            <div className="flex min-w-[720px] flex-col px-6">
              <div className="flex gap-4 pb-4 pt-6 text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">
                <span className="w-[130px] shrink-0">{t("colDate")}</span>
                <span className="w-[110px] shrink-0">{t("colType")}</span>
                <span className="min-w-0 flex-1">{t("colDescription")}</span>
                <span className="w-[140px] shrink-0 text-end">{t("colAmount")}</span>
                <span className="w-[160px] shrink-0 text-end">{t("colRunningBalance")}</span>
              </div>
              {visibleRows.map((row, index) => {
                const content = (
                  <div
                    className={`flex items-center gap-4 py-3.5 ${index < visibleRows.length - 1 ? "border-b border-border-default" : ""}`}
                  >
                    <span className="w-[130px] shrink-0 text-[14px] text-text-secondary">
                      {new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(new Date(row.date))}
                    </span>
                    <span className="w-[110px] shrink-0">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                          row.type === "revenue" ? "bg-status-completed/15 text-status-completed" : "bg-status-cancelled/15 text-status-cancelled"
                        }`}
                      >
                        {row.type === "revenue" ? t("typeRevenue") : t("typeExpense")}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-text-primary">{row.description}</span>
                    <span
                      className={`w-[140px] shrink-0 text-end text-[14px] font-semibold ${
                        row.type === "revenue" ? "text-status-completed" : "text-status-cancelled"
                      }`}
                      dir="ltr"
                    >
                      {row.type === "revenue" ? "+" : "-"}
                      {Math.abs(row.amount).toLocaleString(locale === "ar" ? "ar-EG" : "en-US")} EGP
                    </span>
                    <span className="w-[160px] shrink-0 text-end text-[14px] text-text-secondary" dir="ltr">
                      {row.balance.toLocaleString(locale === "ar" ? "ar-EG" : "en-US")} EGP
                    </span>
                  </div>
                );
                return row.orderId ? (
                  <Link key={row.id} href={`/admin/orders/${row.orderId}`} className="hover:bg-bg-surface-alt">
                    {content}
                  </Link>
                ) : (
                  <div key={row.id}>{content}</div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
