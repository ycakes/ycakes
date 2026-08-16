"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { OrderLineItem } from "@/components/admin/orders/OrderLineItem";
import type { Color, Flavor, Shape, Size, Tier, Topper } from "@/types/catalog";
import type { AdminOrderDetail, AdminOrderItemDetail } from "@/types/adminOrderDetail";
import type { OrderStatus } from "@/types/orders";

type SizeWithTiers = Size & { tierIds: string[] };
type CatalogContext = {
  sizes: SizeWithTiers[];
  tiers: Tier[];
  flavors: Flavor[];
  colors: Color[];
  shapes: Shape[];
  toppers: Topper[];
  showToppers: boolean;
};

const PICKUP_LOCATION = { en: "New Cairo", ar: "التجمع الخامس" };
const STATUSES: OrderStatus[] = ["pending", "confirmed", "completed", "cancelled"];

export function OrderDetailContent({
  order,
  items,
  role,
  locale,
  catalogByCategoryId,
}: {
  order: AdminOrderDetail;
  items: AdminOrderItemDetail[];
  role: "admin" | "accountant";
  locale: "en" | "ar";
  catalogByCategoryId: Record<string, CatalogContext>;
}) {
  const t = useTranslations("Admin.orders");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [finalPrice, setFinalPrice] = useState(order.final_price != null ? String(order.final_price) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customerName = order.profiles
    ? [order.profiles.first_name, order.profiles.last_name].filter(Boolean).join(" ").trim()
    : (order.guest_name ?? "");
  const placedAt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.created_at));
  const fulfillmentDate = new Intl.DateTimeFormat(locale, { weekday: "short", year: "numeric", month: "short", day: "numeric" }).format(
    new Date(order.fulfillment_date),
  );
  const methodLabel =
    order.fulfillment_type === "delivery"
      ? `${t("delivery")} — ${order.delivery_areas?.name[locale] ?? ""}`
      : `${t("pickup")} — ${PICKUP_LOCATION[locale]}`;
  const subtotal = order.final_price ?? order.subtotal_estimate + order.delivery_price - order.discount_amount;

  async function handleSave() {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status, final_price: finalPrice.trim() ? Number(finalPrice) : null })
      .eq("id", order.id);
    setSaving(false);
    if (updateError) {
      setError(t("saveFailed"));
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-brand-primary">{t("orderNumberTitle", { number: order.order_number })}</h1>
        <Link href="/admin/orders">
          <Button type="button" variant="brand-ghost" size="xl" className="bg-bg-surface px-5 py-3 text-base">
            {t("backToOrders")}
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex w-full flex-col gap-5 rounded-3xl border border-border-default bg-bg-surface p-6 lg:max-w-[728px]">
          <div className="flex w-full items-center justify-between">
            <p className="text-xl font-semibold text-text-primary">{t("orderDetails")}</p>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-[13px] text-text-secondary">{t("placedAt", { date: placedAt })}</p>

          <div className="flex flex-col gap-4">
            {items.map((item) => (
              <OrderLineItem
                key={item.id}
                item={item}
                locale={locale}
                canEdit={role === "admin"}
                catalog={
                  catalogByCategoryId[item.cakes?.category_id ?? ""] ?? {
                    sizes: [],
                    tiers: [],
                    flavors: [],
                    colors: [],
                    shapes: [],
                    toppers: [],
                    showToppers: false,
                  }
                }
              />
            ))}
          </div>

          <div className="h-px w-full bg-border-default" />
          <p className="text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">{t("fulfillment")}</p>
          <Row label={t("method")} value={methodLabel} />
          <Row label={t("date")} value={fulfillmentDate} />

          <div className="h-px w-full bg-border-default" />
          <p className="text-[12px] font-semibold tracking-[0.48px] text-text-secondary uppercase">{t("contactAndAddress")}</p>
          <Row label={t("name")} value={customerName || "—"} />
          <Row label={t("phone")} value={order.guest_phone || "—"} />
          {order.fulfillment_type === "delivery" && <Row label={t("address")} value={order.delivery_address || "—"} />}

          <div className="h-px w-full bg-border-default" />
          <Row label={t("subtotal")} value={tCommon("egpPrice", { amount: subtotal })} bold />
        </div>

        {role === "admin" && (
          <div className="flex w-full flex-col gap-4 rounded-3xl border border-border-default bg-bg-surface p-6 lg:max-w-[376px]">
            <p className="text-xl font-semibold text-text-primary">{t("adminActions")}</p>

            <label className="flex flex-col gap-1">
              <span className="text-[13px] font-medium text-text-primary">{t("orderStatus")}</span>
              <Select value={status} onValueChange={(v) => setStatus(v as OrderStatus)}>
                <SelectTrigger className="h-[52px] w-full rounded-2xl bg-bg-surface p-3 text-[15px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="min-w-[var(--anchor-width)] bg-bg-surface" alignItemWithTrigger={false}>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`statusValue.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[13px] font-medium text-text-primary">{t("finalPrice")}</span>
              <input
                type="number"
                min={0}
                value={finalPrice}
                onChange={(e) => setFinalPrice(e.target.value)}
                className="w-full rounded-2xl border-[1.5px] border-border-default bg-bg-surface p-3 text-[15px] text-text-primary focus:outline-none"
              />
            </label>

            {error && <p className="text-xs text-red-600">{error}</p>}
            <Button type="button" variant="brand-primary" size="xl" disabled={saving} onClick={handleSave} className="w-full justify-center">
              {t("saveChanges")}
            </Button>

            <div className="h-px w-full bg-border-default" />
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-medium text-text-primary">{t("source")}</span>
              <div className="w-full rounded-2xl bg-bg-subtle p-3 text-[15px] text-text-secondary">{t(`sourceValue.${order.source}`)}</div>
              <p className="text-xs text-text-secondary">{t("sourceHelper")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex w-full items-center justify-between text-sm">
      <span className="text-text-secondary">{label}</span>
      <span className={bold ? "font-semibold text-text-primary" : "font-medium text-text-primary"}>{value}</span>
    </div>
  );
}
