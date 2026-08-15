"use client";

import { useLocale, useTranslations } from "next-intl";
import { OrderDetailModal } from "@/components/storefront/OrderDetailModal";
import { cn } from "@/lib/utils";
import type { OrderHistoryRow, OrderStatus } from "@/types/orders";

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: "bg-[rgba(245,166,35,0.15)] text-[#a8710a]",
  confirmed: "bg-[rgba(41,112,191,0.15)] text-[#4a6fa5]",
  completed: "bg-[rgba(33,140,33,0.15)] text-[#3e7d4c]",
  cancelled: "bg-[rgba(191,38,26,0.15)] text-[#c23b2e]",
};

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
          </div>
        );
      })}
    </div>
  );
}
