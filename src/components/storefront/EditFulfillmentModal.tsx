"use client";

import type { ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useTranslations } from "next-intl";
import { FulfillmentFields } from "@/components/storefront/FulfillmentFields";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart";
import type { DeliveryArea } from "@/types/catalog";

// Edit Fulfillment modal on Checkout — reads/writes the same cart-store
// fields Cart itself uses (owner decision, see ARCHITECTURE.md), so Cart
// and Checkout can never disagree on fulfillment state.
export function EditFulfillmentModal({
  locale,
  deliveryAreas,
  blockedDates,
  triggerClassName,
  children,
}: {
  locale: "en" | "ar";
  deliveryAreas: DeliveryArea[];
  blockedDates: string[];
  triggerClassName?: string;
  children: ReactNode;
}) {
  const t = useTranslations("Checkout");
  const fulfillmentMethod = useCartStore((state) => state.fulfillmentMethod);
  const setFulfillmentMethod = useCartStore((state) => state.setFulfillmentMethod);
  const deliveryAreaId = useCartStore((state) => state.deliveryAreaId);
  const setDeliveryAreaId = useCartStore((state) => state.setDeliveryAreaId);
  const fulfillmentDate = useCartStore((state) => state.fulfillmentDate);
  const setFulfillmentDate = useCartStore((state) => state.setFulfillmentDate);

  return (
    <Dialog.Root>
      <Dialog.Trigger className={triggerClassName}>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[92vw] max-w-[420px] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-3xl bg-bg-surface p-6 shadow-lg">
          <Dialog.Title className="font-heading text-xl font-semibold text-brand-primary">
            {t("editFulfillmentTitle")}
          </Dialog.Title>

          <FulfillmentFields
            locale={locale}
            deliveryAreas={deliveryAreas}
            blockedDates={blockedDates}
            fulfillmentMethod={fulfillmentMethod}
            onFulfillmentMethodChange={setFulfillmentMethod}
            deliveryAreaId={deliveryAreaId}
            onDeliveryAreaChange={setDeliveryAreaId}
            fulfillmentDate={fulfillmentDate}
            onFulfillmentDateChange={setFulfillmentDate}
          />

          <Dialog.Close render={<Button variant="brand-primary" size="xl" className="w-full justify-center" />}>
            {t("done")}
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
