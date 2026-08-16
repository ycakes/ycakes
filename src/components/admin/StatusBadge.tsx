import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/orders";

const STATUS_CLASSES: Record<OrderStatus, string> = {
  pending: "bg-status-pending/15 text-status-pending",
  confirmed: "bg-status-confirmed/15 text-status-confirmed",
  completed: "bg-status-completed/15 text-status-completed",
  cancelled: "bg-status-cancelled/15 text-status-cancelled",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const t = useTranslations("Admin.orders");
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-[10px] py-[4px] text-[12px] font-semibold whitespace-nowrap",
        STATUS_CLASSES[status],
      )}
    >
      {t(`statusValue.${status}`)}
    </span>
  );
}
