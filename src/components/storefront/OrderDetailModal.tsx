"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { OrderDetail } from "@/types/orders";

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
      .select(
        "order_number, status, created_at, fulfillment_type, delivery_address, fulfillment_date, notes, subtotal_estimate, delivery_price, discount_amount, final_price, delivery_areas(name), order_items(quantity, line_estimate, cakes(name))",
      )
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
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[92vw] max-w-[440px] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 overflow-y-auto rounded-3xl bg-bg-surface p-6 shadow-lg">
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

              <div className="flex flex-col gap-1">
                {order.order_items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">
                      {item.cakes?.name[locale] ?? "—"} • {t("qty", { count: item.quantity })}
                    </span>
                    <span className="font-semibold text-text-primary">
                      {item.line_estimate > 0 ? `${item.line_estimate} ${tCommon("egp")}` : tCommon("priceOnRequest")}
                    </span>
                  </div>
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
