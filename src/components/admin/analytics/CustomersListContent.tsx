"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { OrderStatus } from "@/types/orders";

export type CustomerAddress = { id: string; label: string; address: string; apartment: string | null };
export type CustomerPhone = { id: string; phone: string; contact_method: "call" | "whatsapp" | "both" };
export type CustomerOrderRow = { id: string; order_number: string; created_at: string; status: OrderStatus; total: number };

export type CustomerListRow = {
  id: string;
  name: string;
  orderCount: number;
  totalSpent: number;
  lastOrderDate: string | null;
  addresses: CustomerAddress[] | null;
  phones: CustomerPhone[] | null;
  orders: CustomerOrderRow[];
};

export function CustomersListContent({
  customers,
  locale,
  backHref,
  showAddressesPhones,
}: {
  customers: CustomerListRow[];
  locale: "en" | "ar";
  backHref: string;
  showAddressesPhones: boolean;
}) {
  const t = useTranslations("Admin.analytics");
  const tCommon = useTranslations("Common");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        (c.phones ?? []).some((p) => p.phone.toLowerCase().includes(needle)),
    );
  }, [customers, search]);

  return (
    <main className="flex flex-1 flex-col">
      <div className="flex min-h-[80px] shrink-0 flex-wrap items-center gap-4 border-b border-border-default bg-bg-surface px-4 py-3 sm:px-8">
        <Button render={<Link href={backHref} />} nativeButton={false} variant="brand-ghost" size="xl" className="h-auto bg-bg-surface px-4 py-3 text-sm">
          ← {t("backToAnalytics")}
        </Button>
        <h1 className="font-heading text-2xl font-bold text-text-primary">{t("allCustomers")}</h1>
      </div>

      <div className="flex flex-1 flex-col gap-4 bg-bg-surface-alt px-4 py-6 sm:px-8">
        <div className="flex w-full max-w-[400px] items-center gap-2.5 rounded-full border-[1.5px] border-border-default bg-bg-surface px-4 py-3">
          <Search className="size-4 text-text-secondary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchCustomers")}
            className="w-full bg-transparent text-sm text-text-primary outline-none"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-text-secondary">{t("noCustomersMatch")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((customer) => {
              const expanded = expandedId === customer.id;
              return (
                <div key={customer.id} className="flex flex-col rounded-[20px] bg-bg-surface">
                  <div className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                    <span className="size-9 shrink-0 rounded-full bg-bg-surface-alt" />
                    <span className="w-[200px] shrink-0 truncate text-[14px] font-semibold text-text-primary">{customer.name}</span>
                    <span className="shrink-0 rounded-full bg-bg-surface-alt px-2.5 py-1 text-[12px] font-semibold text-text-secondary">
                      {t("typeAccount")}
                    </span>
                    <span className="w-[100px] shrink-0 text-[14px] text-text-secondary">{t("ordersCount", { count: customer.orderCount })}</span>
                    <span className="w-[130px] shrink-0 text-[14px] font-semibold text-text-primary">
                      {tCommon("egpPrice", { amount: customer.totalSpent })}
                    </span>
                    <span className="w-[160px] shrink-0 text-[14px] text-text-secondary">
                      {customer.lastOrderDate
                        ? t("lastOrderDate", {
                            date: new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(
                              new Date(customer.lastOrderDate),
                            ),
                          })
                        : "—"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : customer.id)}
                      className="ms-auto shrink-0 text-[14px] font-semibold text-brand-primary"
                    >
                      {expanded ? t("collapseCustomer") : t("expandCustomer")}
                    </button>
                  </div>

                  {expanded && (
                    <div className="flex flex-col gap-5 border-t border-border-default px-5 pb-5 pt-4">
                      {showAddressesPhones && (
                        <div className="flex flex-col gap-4 sm:flex-row">
                          <div className="flex flex-1 flex-col gap-2 rounded-2xl bg-bg-surface-alt p-4">
                            <p className="text-[13px] font-semibold text-text-primary">
                              {t("savedAddressesCount", { count: customer.addresses?.length ?? 0 })}
                            </p>
                            {(customer.addresses ?? []).length === 0 ? (
                              <p className="text-[13px] text-text-secondary">{t("noneSaved")}</p>
                            ) : (
                              customer.addresses!.map((a) => (
                                <p key={a.id} className="text-[13px] text-text-secondary">
                                  {a.label} — {a.address}
                                  {a.apartment ? `, ${a.apartment}` : ""}
                                </p>
                              ))
                            )}
                          </div>
                          <div className="flex flex-1 flex-col gap-2 rounded-2xl bg-bg-surface-alt p-4">
                            <p className="text-[13px] font-semibold text-text-primary">
                              {t("savedPhonesCount", { count: customer.phones?.length ?? 0 })}
                            </p>
                            {(customer.phones ?? []).length === 0 ? (
                              <p className="text-[13px] text-text-secondary">{t("noneSaved")}</p>
                            ) : (
                              customer.phones!.map((p) => (
                                <p key={p.id} dir="ltr" className="text-end text-[13px] text-text-secondary">
                                  {p.phone} — {tCommon(`contactMethod.${p.contact_method}`)}
                                </p>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col gap-2">
                        <p className="text-[13px] font-semibold text-text-primary">
                          {t("orderHistoryCount", { count: customer.orders.length })}
                        </p>
                        {customer.orders.length === 0 ? (
                          <p className="text-[13px] text-text-secondary">{t("noOrdersInPeriod")}</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <div className="flex min-w-[600px] flex-col">
                              <div className="flex gap-4 pb-1 text-[11px] font-semibold tracking-[0.44px] text-text-secondary uppercase">
                                <span className="w-[200px] shrink-0">{t("colOrderNumber")}</span>
                                <span className="w-[140px] shrink-0">{t("colDate")}</span>
                                <span className="w-[140px] shrink-0">{t("colStatus")}</span>
                                <span className="w-[120px] shrink-0">{t("colTotal")}</span>
                              </div>
                              {customer.orders.map((order) => (
                                <Link
                                  key={order.id}
                                  href={`/admin/orders/${order.id}`}
                                  className="flex gap-4 border-t border-border-default py-1.5 text-[13px] hover:bg-bg-surface-alt"
                                >
                                  <span className="w-[200px] shrink-0 truncate font-medium text-text-primary">{order.order_number}</span>
                                  <span className="w-[140px] shrink-0 text-text-secondary">
                                    {new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(new Date(order.created_at))}
                                  </span>
                                  <span className="w-[140px] shrink-0">
                                    <StatusBadge status={order.status} />
                                  </span>
                                  <span className="w-[120px] shrink-0 text-text-secondary">{tCommon("egpPrice", { amount: order.total })}</span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
