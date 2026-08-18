"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { OrderLineItem } from "@/components/admin/orders/OrderLineItem";
import type { Color, DeliveryArea, Flavor, Shape, Size, Tier, Topper } from "@/types/catalog";
import type { AdminOrderDetail, AdminOrderItemDetail } from "@/types/adminOrderDetail";
import type { FulfillmentType, OrderStatus } from "@/types/orders";
import { cn } from "@/lib/utils";
import { isValidPhone } from "@/lib/validation/phone";

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
  deliveryAreas,
}: {
  order: AdminOrderDetail;
  items: AdminOrderItemDetail[];
  role: "admin" | "accountant";
  locale: "en" | "ar";
  catalogByCategoryId: Record<string, CatalogContext>;
  deliveryAreas: DeliveryArea[];
}) {
  const t = useTranslations("Admin.orders");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const itemsSubtotal = items.reduce((sum, item) => sum + (item.final_price ?? item.line_estimate), 0);
  const [finalPrice, setFinalPrice] = useState(
    order.final_price != null ? String(order.final_price) : itemsSubtotal > 0 ? String(itemsSubtotal) : "",
  );
  const [deliveryFeeDraft, setDeliveryFeeDraft] = useState(String(order.delivery_price));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const customerName = order.profiles
    ? [order.profiles.first_name, order.profiles.last_name].filter(Boolean).join(" ").trim()
    : (order.guest_name ?? "");

  // Per-order overrides an admin can make without touching the customer's
  // actual saved account (name/phone/address live on `orders` already for
  // guest checkouts; for account orders `guest_name` is otherwise unused, so
  // setting it here just overrides what this one order displays).
  const [nameDraft, setNameDraft] = useState(order.guest_name ?? customerName);
  const [phoneDraft, setPhoneDraft] = useState(order.contact_phone ?? "");
  const [phoneMethodDraft, setPhoneMethodDraft] = useState(order.contact_phone_method ?? "call");
  const [phone2Draft, setPhone2Draft] = useState(order.contact_phone_2 ?? "");
  const [phone2MethodDraft, setPhone2MethodDraft] = useState(order.contact_phone_2_method ?? "call");
  const [instagramDraft, setInstagramDraft] = useState(order.instagram_username ?? "");
  const [addressDraft, setAddressDraft] = useState(order.delivery_address ?? "");
  const [fulfillmentTypeDraft, setFulfillmentTypeDraft] = useState<FulfillmentType>(order.fulfillment_type);
  const [deliveryAreaIdDraft, setDeliveryAreaIdDraft] = useState(order.delivery_area_id ?? "");
  const [fulfillmentDateDraft, setFulfillmentDateDraft] = useState(order.fulfillment_date);
  const [notesDraft, setNotesDraft] = useState(order.notes ?? "");
  const placedAt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.created_at));
  const fulfillmentDate = new Intl.DateTimeFormat(locale, { weekday: "short", year: "numeric", month: "short", day: "numeric" }).format(
    new Date(order.fulfillment_date),
  );
  const methodLabel =
    order.fulfillment_type === "delivery"
      ? `${t("delivery")} — ${order.delivery_areas?.name[locale] ?? ""}`
      : `${t("pickup")} — ${PICKUP_LOCATION[locale]}`;
  const deliveryFee = fulfillmentTypeDraft === "delivery" ? Number(deliveryFeeDraft) || 0 : 0;
  const finalPriceValue = finalPrice.trim() ? Number(finalPrice) : itemsSubtotal;
  const total = finalPriceValue + deliveryFee - order.discount_amount;

  async function handleSave() {
    setError(null);
    setSaved(false);
    if (phoneDraft.trim() && !isValidPhone(phoneDraft)) {
      setError(t("invalidPhoneError"));
      return;
    }
    if (phone2Draft.trim() && !isValidPhone(phone2Draft)) {
      setError(t("invalidPhoneError"));
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status,
        final_price: finalPrice.trim() ? Number(finalPrice) : null,
        delivery_price: fulfillmentTypeDraft === "delivery" ? Number(deliveryFeeDraft) || 0 : 0,
        guest_name: nameDraft.trim() || null,
        contact_phone: phoneDraft.trim() || null,
        contact_phone_method: phoneDraft.trim() ? phoneMethodDraft : null,
        contact_phone_2: phone2Draft.trim() || null,
        contact_phone_2_method: phone2Draft.trim() ? phone2MethodDraft : null,
        instagram_username: instagramDraft.trim() || null,
        delivery_address: addressDraft.trim() || null,
        fulfillment_type: fulfillmentTypeDraft,
        delivery_area_id: fulfillmentTypeDraft === "delivery" ? deliveryAreaIdDraft || null : null,
        fulfillment_date: fulfillmentDateDraft,
        notes: notesDraft.trim() || null,
      })
      .eq("id", order.id);
    setSaving(false);
    if (updateError) {
      setError(t("saveFailed"));
      return;
    }
    setSaved(true);
    router.refresh();
  }

  function handleFulfillmentTypeChange(next: FulfillmentType) {
    setFulfillmentTypeDraft(next);
    if (next === "pickup") {
      setDeliveryAreaIdDraft("");
      setDeliveryFeeDraft("0");
    }
  }

  function handleDeliveryAreaChange(areaId: string) {
    setDeliveryAreaIdDraft(areaId);
    const area = deliveryAreas.find((a) => a.id === areaId);
    if (area) setDeliveryFeeDraft(String(area.price));
  }

  useEffect(() => {
    if (!saved) return;
    const timeout = setTimeout(() => setSaved(false), 4000);
    return () => clearTimeout(timeout);
  }, [saved]);

  // Final Price has never been explicitly saved as an override (order.final_price
  // is still null) — keep it tracking the live items subtotal so pricing a cake
  // (or several) adds straight up into it instead of leaving it stuck at blank/0
  // until the admin happens to reload the page. Adjusted during render (React's
  // documented pattern for syncing state to a changed value) rather than in an
  // effect, same convention already used for the Cakes admin search fix.
  const [lastAutoSubtotal, setLastAutoSubtotal] = useState(itemsSubtotal);
  if (order.final_price == null && itemsSubtotal !== lastAutoSubtotal) {
    setLastAutoSubtotal(itemsSubtotal);
    setFinalPrice(itemsSubtotal > 0 ? String(itemsSubtotal) : "");
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
          <Row
            label={t("phone")}
            value={order.contact_phone ? `${order.contact_phone}${order.contact_phone_method ? ` (${tCommon(`contactMethod.${order.contact_phone_method}`)})` : ""}` : "—"}
          />
          {order.contact_phone_2 && (
            <Row
              label={t("phoneNumber2")}
              value={`${order.contact_phone_2}${order.contact_phone_2_method ? ` (${tCommon(`contactMethod.${order.contact_phone_2_method}`)})` : ""}`}
            />
          )}
          {order.instagram_username && <Row label={t("instagramUsername")} value={order.instagram_username} />}
          {order.delivery_address && <Row label={t("address")} value={order.delivery_address} />}

          <div className="h-px w-full bg-border-default" />
          <Row label={t("itemsSubtotal")} value={tCommon("egpPrice", { amount: itemsSubtotal })} />
          {deliveryFee > 0 && <Row label={t("deliveryFee")} value={tCommon("egpPrice", { amount: deliveryFee })} />}
          {order.discount_amount > 0 && <Row label={t("discount")} value={`- ${tCommon("egpPrice", { amount: order.discount_amount })}`} />}
          <Row label={t("total")} value={tCommon("egpPrice", { amount: total })} bold />
        </div>

        {role === "admin" && (
          <div className="flex w-full flex-col gap-4 rounded-3xl border border-border-default bg-bg-surface p-6 lg:max-w-[376px]">
            <p className="text-xl font-semibold text-text-primary">{t("adminActions")}</p>

            <label className="flex flex-col gap-1">
              <span className="text-[13px] font-medium text-text-primary">{t("orderStatus")}</span>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as OrderStatus)}
                items={STATUSES.map((s) => ({ value: s, label: t(`statusValue.${s}`) }))}
              >
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
              <span className="text-xs text-text-secondary">{t("finalPriceHelper")}</span>
            </label>

            {fulfillmentTypeDraft === "delivery" && (
              <label className="flex flex-col gap-1">
                <span className="text-[13px] font-medium text-text-primary">{t("deliveryFee")}</span>
                <input
                  type="number"
                  min={0}
                  value={deliveryFeeDraft}
                  onChange={(e) => setDeliveryFeeDraft(e.target.value)}
                  className="w-full rounded-2xl border-[1.5px] border-border-default bg-bg-surface p-3 text-[15px] text-text-primary focus:outline-none"
                />
                <span className="text-xs text-text-secondary">{t("deliveryFeeHelper")}</span>
              </label>
            )}
            <Row label={t("total")} value={tCommon("egpPrice", { amount: total })} bold />

            <div className="h-px w-full bg-border-default" />
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-[15px] font-semibold text-text-primary">{t("editCustomerFulfillment")}</p>
                <p className="text-xs text-text-secondary">{t("editCustomerFulfillmentHelper")}</p>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-[13px] font-medium text-text-primary">{t("contactName")}</span>
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="w-full rounded-2xl border-[1.5px] border-border-default bg-bg-surface p-3 text-[15px] text-text-primary focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[13px] font-medium text-text-primary">{t("phone")}</span>
                <input
                  value={phoneDraft}
                  onChange={(e) => setPhoneDraft(e.target.value)}
                  className="w-full rounded-2xl border-[1.5px] border-border-default bg-bg-surface p-3 text-[15px] text-text-primary focus:outline-none"
                  dir="ltr"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[13px] font-medium text-text-primary">{t("phoneMethod")}</span>
                <Select
                  value={phoneMethodDraft}
                  onValueChange={(v) => setPhoneMethodDraft(v as "call" | "whatsapp" | "both")}
                  items={(["call", "whatsapp", "both"] as const).map((m) => ({ value: m, label: tCommon(`contactMethod.${m}`) }))}
                >
                  <SelectTrigger className="h-[52px] w-full rounded-2xl bg-bg-surface p-3 text-[15px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="min-w-[var(--anchor-width)] bg-bg-surface" alignItemWithTrigger={false}>
                    {(["call", "whatsapp", "both"] as const).map((m) => (
                      <SelectItem key={m} value={m}>
                        {tCommon(`contactMethod.${m}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[13px] font-medium text-text-primary">{t("phoneNumber2")}</span>
                <input
                  value={phone2Draft}
                  onChange={(e) => setPhone2Draft(e.target.value)}
                  className="w-full rounded-2xl border-[1.5px] border-border-default bg-bg-surface p-3 text-[15px] text-text-primary focus:outline-none"
                  dir="ltr"
                />
              </label>

              {phone2Draft.trim() && (
                <label className="flex flex-col gap-1">
                  <span className="text-[13px] font-medium text-text-primary">{t("phoneMethod")}</span>
                  <Select
                    value={phone2MethodDraft}
                    onValueChange={(v) => setPhone2MethodDraft(v as "call" | "whatsapp" | "both")}
                    items={(["call", "whatsapp", "both"] as const).map((m) => ({ value: m, label: tCommon(`contactMethod.${m}`) }))}
                  >
                    <SelectTrigger className="h-[52px] w-full rounded-2xl bg-bg-surface p-3 text-[15px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="min-w-[var(--anchor-width)] bg-bg-surface" alignItemWithTrigger={false}>
                      {(["call", "whatsapp", "both"] as const).map((m) => (
                        <SelectItem key={m} value={m}>
                          {tCommon(`contactMethod.${m}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              )}

              <label className="flex flex-col gap-1">
                <span className="text-[13px] font-medium text-text-primary">{t("instagramUsername")}</span>
                <input
                  value={instagramDraft}
                  onChange={(e) => setInstagramDraft(e.target.value)}
                  className="w-full rounded-2xl border-[1.5px] border-border-default bg-bg-surface p-3 text-[15px] text-text-primary focus:outline-none"
                  dir="ltr"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[13px] font-medium text-text-primary">{t("address")}</span>
                <textarea
                  value={addressDraft}
                  onChange={(e) => setAddressDraft(e.target.value)}
                  rows={2}
                  className="w-full rounded-2xl border-[1.5px] border-border-default bg-bg-surface p-3 text-[15px] text-text-primary focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[13px] font-medium text-text-primary">{t("fulfillmentMethod")}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleFulfillmentTypeChange("pickup")}
                    className={cn(
                      "flex-1 rounded-2xl border-[1.5px] p-3 text-[14px] font-medium",
                      fulfillmentTypeDraft === "pickup"
                        ? "border-brand-primary bg-brand-primary text-text-on-brand"
                        : "border-border-default bg-bg-surface text-text-primary",
                    )}
                  >
                    {t("pickup")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFulfillmentTypeChange("delivery")}
                    className={cn(
                      "flex-1 rounded-2xl border-[1.5px] p-3 text-[14px] font-medium",
                      fulfillmentTypeDraft === "delivery"
                        ? "border-brand-primary bg-brand-primary text-text-on-brand"
                        : "border-border-default bg-bg-surface text-text-primary",
                    )}
                  >
                    {t("delivery")}
                  </button>
                </div>
              </label>

              {fulfillmentTypeDraft === "delivery" && (
                <label className="flex flex-col gap-1">
                  <span className="text-[13px] font-medium text-text-primary">{t("deliveryArea")}</span>
                  <Select
                    value={deliveryAreaIdDraft}
                    onValueChange={(v) => handleDeliveryAreaChange(v ?? "")}
                    items={deliveryAreas.map((area) => ({ value: area.id, label: area.name[locale] }))}
                  >
                    <SelectTrigger className="h-[52px] w-full rounded-2xl bg-bg-surface p-3 text-[15px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="min-w-[var(--anchor-width)] bg-bg-surface" alignItemWithTrigger={false}>
                      {deliveryAreas.map((area) => (
                        <SelectItem key={area.id} value={area.id}>
                          {area.name[locale]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              )}

              <label className="flex flex-col gap-1">
                <span className="text-[13px] font-medium text-text-primary">{t("date")}</span>
                <input
                  type="date"
                  value={fulfillmentDateDraft}
                  onChange={(e) => setFulfillmentDateDraft(e.target.value)}
                  className="w-full rounded-2xl border-[1.5px] border-border-default bg-bg-surface p-3 text-[15px] text-text-primary focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[13px] font-medium text-text-primary">{t("orderNotesTitle")}</span>
                <textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  rows={3}
                  placeholder={t("orderNotesPlaceholder")}
                  className="w-full rounded-2xl border-[1.5px] border-border-default bg-bg-surface p-3 text-[15px] text-text-primary focus:outline-none"
                />
              </label>
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}
            {saved && <p className="text-xs font-semibold text-status-completed">{t("orderSaved")}</p>}
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
