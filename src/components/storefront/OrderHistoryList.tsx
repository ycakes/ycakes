"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { OrderDetailModal } from "@/components/storefront/OrderDetailModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { buildOrderWhatsAppUrl, CONTACT_INSTAGRAM_URL } from "@/lib/contact";
import { cn } from "@/lib/utils";
import type { OrderHistoryRow, OrderStatus } from "@/types/orders";

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: "bg-[rgba(245,166,35,0.15)] text-[#a8710a]",
  confirmed: "bg-[rgba(41,112,191,0.15)] text-[#4a6fa5]",
  completed: "bg-[rgba(33,140,33,0.15)] text-[#3e7d4c]",
  cancelled: "bg-[rgba(191,38,26,0.15)] text-[#c23b2e]",
};

function CancelOrderAction({ order }: { order: OrderHistoryRow }) {
  const t = useTranslations("Profile");
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState(false);

  if (order.status !== "pending") {
    return (
      <div className="flex flex-col gap-1.5 border-t border-border-default pt-2">
        <p className="text-xs text-text-secondary">{t("contactToCancel")}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            render={<a href={buildOrderWhatsAppUrl(order.order_number)} target="_blank" rel="noopener noreferrer" />}
            nativeButton={false}
            variant="brand-ghost"
            size="sm"
          >
            {t("messageOnWhatsApp")}
          </Button>
          <Button
            render={<a href={CONTACT_INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" />}
            nativeButton={false}
            variant="brand-ghost"
            size="sm"
          >
            {t("messageOnInstagram")}
          </Button>
        </div>
      </div>
    );
  }

  async function handleCancel() {
    setConfirming(false);
    setCancelling(true);
    setError(false);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("cancel_own_order", { p_order_id: order.id });
    setCancelling(false);
    if (rpcError) {
      setError(true);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="destructive" size="sm" disabled={cancelling} onClick={() => setConfirming(true)}>
        {t("cancelOrder")}
      </Button>
      {error && <p className="text-xs text-red-600">{t("cancelOrderFailed")}</p>}
      <ConfirmDialog
        open={confirming}
        title={t("cancelOrderConfirmTitle")}
        message={t("cancelOrderConfirmMessage")}
        confirmLabel={t("cancelOrder")}
        cancelLabel={t("cancel")}
        onConfirm={handleCancel}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}

export function OrderHistoryList({ orders }: { orders: OrderHistoryRow[] }) {
  const t = useTranslations("Profile");
  const tCommon = useTranslations("Common");
  const locale = useLocale() as "en" | "ar";

  if (orders.length === 0) {
    return <p className="text-sm text-text-secondary">{t("noOrders")}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {orders.map((order) => {
        const price = order.final_price ?? order.subtotal_estimate;
        const summary = order.order_items
          .map((item) => `${item.cakes?.name[locale] ?? "—"} • ${t("qty", { count: item.quantity })}`)
          .join(", ");
        return (
          <div key={order.id} className="flex flex-col gap-2 rounded-3xl bg-bg-surface p-5">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <p className="text-[15px] font-semibold text-text-primary">
                  {t("orderNumber", { number: order.order_number })}
                </p>
                <p className="text-xs text-text-secondary">
                  {new Date(order.created_at).toLocaleDateString(locale, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_STYLE[order.status])}>
                {t(`status.${order.status}`)}
              </span>
            </div>
            <p className="text-[13px] text-text-secondary">{summary}</p>
            <div className="flex items-center justify-between">
              <p className="text-[20px] font-semibold text-text-primary">
                {price > 0 ? `${price} ${tCommon("egp")}` : tCommon("priceOnRequest")}
              </p>
              <OrderDetailModal orderId={order.id} />
            </div>
            <CancelOrderAction order={order} />
          </div>
        );
      })}
    </div>
  );
}
