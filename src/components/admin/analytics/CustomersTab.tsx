"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { downloadExcel } from "@/lib/admin/exportExcel";
import { periodWordKey, type AnalyticsPeriod } from "@/lib/admin/analyticsPeriod";

export type TopCustomerRow = {
  key: string;
  name: string;
  orders: number;
  totalSpent: number;
  lastOrderDate: string;
  type: "account" | "guest";
};

export type CustomersData = {
  totalCustomers: number;
  newThisPeriod: number;
  repeatRate: number;
  guestOrders: number;
  accountOrders: number;
  topCustomers: TopCustomerRow[];
  period: AnalyticsPeriod;
};

export function CustomersExportButton({ data }: { data: CustomersData }) {
  const t = useTranslations("Admin.analytics");

  async function handleExport() {
    await downloadExcel(
      "customers.xlsx",
      "Customers",
      [
        { header: "Customer", key: "name", width: 28 },
        { header: "Type", key: "type", width: 14 },
        { header: "Orders", key: "orders", width: 12 },
        { header: "Total Spent (EGP)", key: "totalSpent", width: 18 },
        { header: "Last Order", key: "lastOrderDate", width: 18 },
      ],
      data.topCustomers.map((row) => ({
        name: row.name,
        type: row.type === "account" ? "Account" : "Guest",
        orders: row.orders,
        totalSpent: row.totalSpent,
        lastOrderDate: row.lastOrderDate,
      })),
    );
  }

  return (
    <Button type="button" variant="brand-primary" size="xl" className="h-auto px-4 py-3 text-sm" onClick={handleExport}>
      {t("exportToExcel")}
    </Button>
  );
}

export function CustomersTab({ data, locale }: { data: CustomersData; locale: "en" | "ar" }) {
  const t = useTranslations("Admin.analytics");
  const tCommon = useTranslations("Common");
  const totalOrders = data.guestOrders + data.accountOrders;
  const guestPct = totalOrders > 0 ? Math.round((data.guestOrders / totalOrders) * 100) : 0;
  const accountPct = totalOrders > 0 ? Math.round((data.accountOrders / totalOrders) * 100) : 0;
  const maxOrders = Math.max(1, data.guestOrders, data.accountOrders);

  return (
    <>
      <div>
        <Button
          render={<Link href="/admin/analytics/customers" />}
          nativeButton={false}
          variant="brand-secondary"
          size="xl"
          className="h-auto px-4 py-3 text-sm"
        >
          {t("viewAllCustomers")}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-2 rounded-[24px] bg-bg-surface p-6">
          <p className="text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">{t("totalCustomers")}</p>
          <p className="font-heading text-[30px] font-bold text-text-primary">{data.totalCustomers}</p>
          <p className="text-[13px] font-medium text-text-secondary">{t("withSavedAccount")}</p>
        </div>
        <div className="flex flex-col gap-2 rounded-[24px] bg-bg-surface p-6">
          <p className="text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">{t("newThisPeriod")}</p>
          <p className="font-heading text-[30px] font-bold text-text-primary">{data.newThisPeriod}</p>
          <p className="text-[13px] font-medium text-text-secondary">
            {data.period === "all" ? t("signedUpAllTime") : t("signedUpInPeriod")}
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-[24px] bg-bg-surface p-6">
          <p className="text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">{t("repeatRate")}</p>
          <p className="font-heading text-[30px] font-bold text-text-primary">{data.repeatRate}%</p>
          <p className="text-[13px] font-medium text-text-secondary">{t("orderedMoreThanOnce")}</p>
        </div>
        <div className="flex flex-col gap-2 rounded-[24px] bg-bg-surface p-6">
          <p className="text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">{t("guestVsAccount")}</p>
          <p className="font-heading text-[30px] font-bold text-text-primary" dir="ltr">
            {guestPct}% / {accountPct}%
          </p>
          <p className="text-[13px] font-medium text-text-secondary">
            {data.period === "all" ? t("ofOrdersAllTime") : t("ofOrdersThisPeriod")}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-[24px] bg-bg-surface p-6">
        <h2 className="font-heading text-lg font-bold text-text-primary">{t("guestVsAccountOrders")}</h2>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-medium text-text-primary">{t("guestCheckout")}</span>
              <span className="font-semibold text-text-primary">{t("ordersCountPct", { count: data.guestOrders, pct: guestPct })}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-bg-surface-alt">
              <div className="h-2 rounded-full bg-brand-primary" style={{ width: `${Math.max(4, (data.guestOrders / maxOrders) * 100)}%` }} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-medium text-text-primary">{t("loggedInAccount")}</span>
              <span className="font-semibold text-text-primary">{t("ordersCountPct", { count: data.accountOrders, pct: accountPct })}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-bg-surface-alt">
              <div className="h-2 rounded-full bg-brand-primary" style={{ width: `${Math.max(4, (data.accountOrders / maxOrders) * 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-[24px] bg-bg-surface p-6">
        <h2 className="font-heading text-lg font-bold text-text-primary">{t("topCustomers")}</h2>
        {data.topCustomers.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-secondary">{t(periodWordKey(data.period) === "periodWordAll" ? "noCustomersAllTime" : "noCustomersInPeriod")}</p>
        ) : (
          <div className="flex flex-col">
            {data.topCustomers.map((row, index) => (
              <div
                key={row.key}
                className={`flex flex-wrap items-center gap-4 py-3 ${index < data.topCustomers.length - 1 ? "border-b border-border-default" : ""}`}
              >
                <span className="w-[240px] shrink-0 truncate text-[14px] font-medium text-text-primary">{row.name}</span>
                <span className="w-[100px] shrink-0 text-[14px] text-text-secondary">{row.orders}</span>
                <span className="w-[160px] shrink-0 text-[14px] text-text-primary">{tCommon("egpPrice", { amount: row.totalSpent })}</span>
                <span className="w-[160px] shrink-0 text-[14px] text-text-secondary">
                  {new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(new Date(row.lastOrderDate))}
                </span>
                <span className="ms-auto shrink-0 text-[13px] text-text-secondary">
                  {row.type === "account" ? t("typeAccount") : t("typeGuest")}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-text-secondary">{t("guestApproximationNote")}</p>
      </div>
    </>
  );
}
