"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { FilterChip } from "@/components/storefront/FilterChip";
import { Pagination } from "@/components/storefront/Pagination";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DateRangeFilterButton, type DateRange } from "@/components/admin/orders/DateRangeFilterButton";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import type { AdminOrderListRow, OrderSource, OrderStatus } from "@/types/orders";

const PICKUP_LOCATION = { en: "New Cairo", ar: "التجمع الخامس" };
const BASE_PATH = "/admin/orders";
const STATUSES: OrderStatus[] = ["pending", "confirmed", "completed", "cancelled"];
const SOURCES: OrderSource[] = ["website", "phone", "instagram", "in_person"];

export function OrdersListContent({
  orders,
  totalCount,
  role,
  status,
  source,
  search,
  orderDateRange,
  deliveryDateRange,
  sort,
  dir,
  currentPage,
  totalPages,
}: {
  orders: AdminOrderListRow[];
  totalCount: number;
  role: "admin" | "accountant";
  status: string | null;
  source: string | null;
  search: string;
  orderDateRange: DateRange;
  deliveryDateRange: DateRange;
  sort: string;
  dir: "asc" | "desc";
  currentPage: number;
  totalPages: number;
}) {
  const t = useTranslations("Admin.orders");
  const tTable = useTranslations("Admin.table");
  const tCommon = useTranslations("Common");
  const locale = useLocale() as "en" | "ar";
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(search);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const baseParams: Record<string, string> = {};
  if (status) baseParams.status = status;
  if (source) baseParams.source = source;
  if (search) baseParams.search = search;
  if (orderDateRange.from) baseParams.orderFrom = orderDateRange.from;
  if (orderDateRange.to) baseParams.orderTo = orderDateRange.to;
  if (deliveryDateRange.from) baseParams.deliveryFrom = deliveryDateRange.from;
  if (deliveryDateRange.to) baseParams.deliveryTo = deliveryDateRange.to;
  if (sort) baseParams.sort = sort;
  if (dir) baseParams.dir = dir;

  function hrefWith(overrides: Record<string, string | null>) {
    const params = new URLSearchParams(baseParams);
    for (const [key, value] of Object.entries(overrides)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    const qs = params.toString();
    return qs ? `${BASE_PATH}?${qs}` : BASE_PATH;
  }

  function pushWith(overrides: Record<string, string | null>) {
    router.push(hrefWith(overrides));
  }

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      if (searchInput === search) return;
      pushWith({ search: searchInput.trim() || null });
    }, 350);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function customerName(row: AdminOrderListRow) {
    if (row.profiles) {
      return [row.profiles.first_name, row.profiles.last_name].filter(Boolean).join(" ").trim();
    }
    return row.guest_name ?? "";
  }

  function fulfillmentLabel(row: AdminOrderListRow) {
    if (row.fulfillment_type === "delivery") {
      return `${t("delivery")} • ${row.delivery_areas?.name[locale] ?? ""}`;
    }
    return `${t("pickup")} • ${PICKUP_LOCATION[locale]}`;
  }

  function totalFor(row: AdminOrderListRow) {
    return row.final_price ?? row.subtotal_estimate + row.delivery_price - row.discount_amount;
  }

  function formatDate(iso: string) {
    return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(new Date(iso));
  }

  const columns: AdminTableColumn<AdminOrderListRow>[] = [
    {
      header: t("orderNumber"),
      render: (row) => <span className="text-[13px] font-medium text-text-primary" dir="ltr">{row.order_number}</span>,
    },
    { header: t("customer"), render: (row) => customerName(row) },
    {
      header: t("orderDate"),
      sortKey: "orderDate",
      render: (row) => <span className="text-text-secondary">{formatDate(row.created_at)}</span>,
    },
    {
      header: t("deliveryDate"),
      sortKey: "deliveryDate",
      render: (row) => <span className="text-text-secondary">{formatDate(row.fulfillment_date)}</span>,
    },
    { header: t("fulfillment"), render: (row) => <span className="text-[13px] text-text-secondary">{fulfillmentLabel(row)}</span> },
    { header: t("total"), render: (row) => tCommon("egpPrice", { amount: totalFor(row) }) },
    { header: t("status"), render: (row) => <StatusBadge status={row.status} /> },
    { header: t("source"), render: (row) => <span className="text-[13px] text-text-secondary">{t(`sourceValue.${row.source}`)}</span> },
    {
      header: tTable("actions"),
      align: "end",
      render: (row) => (
        <Link href={`/admin/orders/${row.id}`} className="text-sm font-semibold text-brand-primary">
          {t("view")}
        </Link>
      ),
    },
  ];

  const PAGE_SIZE = 20;
  const rangeStart = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = totalCount === 0 ? 0 : rangeStart + orders.length - 1;

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-brand-primary">{t("title")}</h1>
        {role === "admin" && (
          <Link href="/admin/orders/new">
            <Button type="button" variant="brand-primary" size="xl" className="px-5 py-3 text-base">
              {t("newOrder")}
            </Button>
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-border-default bg-bg-surface p-4">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-full border-[1.5px] border-border-default bg-bg-surface-alt py-2.5 ps-9 pe-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterChip href={hrefWith({ status: null })} label={tTable("all")} active={!status} />
          {STATUSES.map((s) => (
            <FilterChip key={s} href={hrefWith({ status: s })} label={t(`statusValue.${s}`)} active={status === s} />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-text-secondary">{t("sourceLabel")}</span>
          <FilterChip href={hrefWith({ source: null })} label={tTable("all")} active={!source} />
          {SOURCES.map((s) => (
            <FilterChip key={s} href={hrefWith({ source: s })} label={t(`sourceValue.${s}`)} active={source === s} />
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <DateRangeFilterButton
            locale={locale}
            label={t("orderDate")}
            value={orderDateRange}
            onChange={(range) => pushWith({ orderFrom: range.from, orderTo: range.to })}
          />
          <DateRangeFilterButton
            locale={locale}
            label={t("deliveryDate")}
            value={deliveryDateRange}
            onChange={(range) => pushWith({ deliveryFrom: range.from, deliveryTo: range.to })}
          />
        </div>
      </div>

      <AdminTable
        columns={columns}
        rows={orders}
        getRowId={(row) => row.id}
        emptyMessage={search ? tTable("noSearchResults") : tTable("noResults")}
        rowHeight="64"
        currentSortKey={sort}
        currentSortDir={dir}
        buildSortHref={(key, nextDir) => hrefWith({ sort: key, dir: nextDir })}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">{t("showingCount", { start: rangeStart, end: rangeEnd, total: totalCount })}</p>
        <Pagination basePath={BASE_PATH} currentPage={currentPage} totalPages={totalPages} extraParams={baseParams} />
      </div>
    </div>
  );
}
