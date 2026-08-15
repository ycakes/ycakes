"use client";

import { useState } from "react";
import Image from "next/image";
import { Dialog } from "@base-ui/react/dialog";
import { ChevronDown, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { OrderDetail, OrderDetailItem } from "@/types/orders";

const ORDER_DETAIL_SELECT = `
  order_number, status, created_at, fulfillment_type, delivery_address, fulfillment_date, notes,
  subtotal_estimate, delivery_price, discount_amount, final_price,
  delivery_areas(name),
  order_items(
    quantity, line_estimate, is_fake, fake_size_cm, text_on_cake, text_on_board, notes,
    reference_image_url, color_arrangement_notes,
    cakes(name, primary_image_url),
    sizes(min_qty, max_qty, unit),
    tiers(tier_count),
    shape:shapes!order_items_shape_id_fkey(name),
    fake_shape:shapes!order_items_fake_shape_id_fkey(name),
    topper:toppers(name),
    order_item_flavors(flavors(name)),
    order_item_colors(colors(name))
  )
`;

function OrderItemCard({ item }: { item: OrderDetailItem }) {
  const t = useTranslations("Profile");
  const tCommon = useTranslations("Common");
  const locale = useLocale() as "en" | "ar";
  const [expanded, setExpanded] = useState(false);

  const shapeName = item.is_fake ? item.fake_shape?.name[locale] : item.shape?.name[locale];
  const flavorNames = item.order_item_flavors.map((f) => f.flavors.name[locale]);
  const colorNames = item.order_item_colors.map((c) => c.colors.name[locale]);

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-bg-subtle p-3">
      <div className="flex items-start gap-3">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-bg-surface">
          {item.cakes?.primary_image_url && (
            <Image src={item.cakes.primary_image_url} alt="" fill sizes="64px" className="object-contain" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-0.5">
          <p className="text-sm font-semibold text-text-primary">{item.cakes?.name[locale] ?? "—"}</p>
          <p className="text-xs text-text-secondary">{t("qty", { count: item.quantity })}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="text-sm font-semibold text-text-primary">
            {item.line_estimate > 0 ? `${item.line_estimate} ${tCommon("egp")}` : tCommon("priceOnRequest")}
          </p>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="flex items-center gap-1 text-xs font-semibold text-brand-primary"
          >
            {t("cakeDetails")}
            <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="flex flex-col gap-1.5 border-t border-border-default pt-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">{t("size")}</span>
            <span className="font-semibold text-text-primary">
              {item.is_fake
                ? `${item.fake_size_cm} cm`
                : item.sizes
                  ? `${item.sizes.min_qty}–${item.sizes.max_qty} ${item.sizes.unit}`
                  : "—"}
            </span>
          </div>
          {item.tiers && (
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">{t("tier")}</span>
              <span className="font-semibold text-text-primary">{item.tiers.tier_count}</span>
            </div>
          )}
          {flavorNames.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">{t("flavor")}</span>
              <span className="font-semibold text-text-primary">{flavorNames.join(", ")}</span>
            </div>
          )}
          {colorNames.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">{t("color")}</span>
              <span className="font-semibold text-text-primary">{colorNames.join(", ")}</span>
            </div>
          )}
          {item.color_arrangement_notes && (
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">{t("colorArrangement")}</span>
              <span className="font-semibold text-text-primary">{item.color_arrangement_notes}</span>
            </div>
          )}
          {shapeName && (
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">{t("shape")}</span>
              <span className="font-semibold text-text-primary">{shapeName}</span>
            </div>
          )}
          {item.topper && (
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">{t("topper")}</span>
              <span className="font-semibold text-text-primary">{item.topper.name[locale]}</span>
            </div>
          )}
          {item.text_on_cake && (
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">{t("textOnCake")}</span>
              <span className="font-semibold text-text-primary">{item.text_on_cake}</span>
            </div>
          )}
          {item.text_on_board && (
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">{t("textOnBoard")}</span>
              <span className="font-semibold text-text-primary">{item.text_on_board}</span>
            </div>
          )}
          {item.notes && (
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">{t("notesLabel")}</span>
              <span className="font-semibold text-text-primary">{item.notes}</span>
            </div>
          )}
          {item.reference_image_url && (
            <div className="flex flex-col gap-1">
              <span className="text-text-secondary">{t("referenceImage")}</span>
              {/* Plain <img>, not next/image — reference_image_url is
                  currently a client-side blob: URL (Cloudinary isn't wired
                  to the storefront yet, see ARCHITECTURE.md's Phase 3
                  notes), which next/image can't optimize. Matches the same
                  pattern already used in CakeCustomizer's own preview. */}
              <div className="h-32 w-full overflow-hidden rounded-xl bg-bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.reference_image_url} alt="" className="size-full object-contain" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function OrderDetailModal({ orderId }: { orderId: string }) {
  const t = useTranslations("Profile");
  const tCommon = useTranslations("Common");
  const locale = useLocale() as "en" | "ar";
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleOpenChange(open: boolean) {
    if (!open || order || loading) return;
    setLoading(true);
    setError(false);
    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("orders")
      .select(ORDER_DETAIL_SELECT)
      .eq("id", orderId)
      .single();
    setLoading(false);
    if (fetchError || !data) {
      console.error("order detail fetch error:", fetchError);
      setError(true);
      return;
    }
    setOrder(data as unknown as OrderDetail);
  }

  const total = order?.final_price ?? order?.subtotal_estimate ?? 0;

  return (
    <Dialog.Root onOpenChange={handleOpenChange}>
      <Dialog.Trigger render={<Button type="button" variant="brand-ghost" />}>{t("viewDetails")}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[92vw] max-w-[460px] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 overflow-y-auto rounded-3xl bg-bg-surface p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-heading text-xl font-semibold text-brand-primary">
              {t("orderDetailsTitle")}
            </Dialog.Title>
            <Dialog.Close aria-label={t("close")} className="flex size-8 items-center justify-center rounded-full text-text-secondary hover:bg-bg-surface-alt">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          {loading && <p className="text-sm text-text-secondary">…</p>}
          {error && <p className="text-sm text-red-600">{t("errorGeneric")}</p>}

          {order && (
            <>
              <p className="text-sm font-semibold text-text-primary">{t("orderNumber", { number: order.order_number })}</p>

              <div className="flex flex-col gap-2">
                {order.order_items.map((item, index) => (
                  <OrderItemCard key={index} item={item} />
                ))}
              </div>

              <div className="h-px w-full bg-border-default" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">{t("method")}</span>
                <span className="font-semibold text-text-primary">
                  {order.fulfillment_type === "delivery"
                    ? `${t("deliveryMethod")}${order.delivery_areas ? ` — ${order.delivery_areas.name[locale]}` : ""}`
                    : t("pickupMethod")}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">{t("fulfillmentDate")}</span>
                <span className="font-semibold text-text-primary">{order.fulfillment_date}</span>
              </div>
              {order.delivery_address && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">{t("address")}</span>
                  <span className="font-semibold text-text-primary">{order.delivery_address}</span>
                </div>
              )}
              {order.notes && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">{t("notesLabel")}</span>
                  <span className="font-semibold text-text-primary">{order.notes}</span>
                </div>
              )}

              <div className="h-px w-full bg-border-default" />
              <div className="flex items-center justify-between text-sm text-text-secondary">
                <span>{t("subtotal")}</span>
                <span>{order.subtotal_estimate} {tCommon("egp")}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex items-center justify-between text-sm text-text-secondary">
                  <span>{t("discount")}</span>
                  <span>-{order.discount_amount} {tCommon("egp")}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-[17px] font-semibold text-text-primary">
                <span>{t("total")}</span>
                <span>{total > 0 ? `${total} ${tCommon("egp")}` : tCommon("priceOnRequest")}</span>
              </div>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
