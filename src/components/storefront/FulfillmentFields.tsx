"use client";

import { Store, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import { DatePicker } from "@/components/storefront/DatePicker";
import { cn } from "@/lib/utils";
import type { FulfillmentMethod } from "@/store/cart";
import type { DeliveryArea } from "@/types/catalog";

const PICKUP_LOCATION = { en: "New Cairo", ar: "التجمع الخامس" };

// Pickup/Delivery + area + date fields, shared by Cart (where this state
// originates, see ARCHITECTURE.md's Phase 3 notes) and Checkout's inline
// "Edit Fulfillment" modal, which reuses this rather than a second copy.
export function FulfillmentFields({
  locale,
  deliveryAreas,
  blockedDates,
  fulfillmentMethod,
  onFulfillmentMethodChange,
  deliveryAreaId,
  onDeliveryAreaChange,
  fulfillmentDate,
  onFulfillmentDateChange,
}: {
  locale: "en" | "ar";
  deliveryAreas: DeliveryArea[];
  blockedDates: string[];
  fulfillmentMethod: FulfillmentMethod | null;
  onFulfillmentMethodChange: (method: FulfillmentMethod | null) => void;
  deliveryAreaId: string | null;
  onDeliveryAreaChange: (id: string | null) => void;
  fulfillmentDate: string | null;
  onFulfillmentDateChange: (date: string | null) => void;
}) {
  const t = useTranslations("Cart");

  return (
    <>
      <div className="flex flex-col gap-2">
        <p className="text-[15px] font-semibold text-text-primary">{t("fulfillmentType")}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onFulfillmentMethodChange("pickup")}
            className={cn(
              "flex flex-1 items-center gap-2 rounded-2xl border-[1.5px] px-3 py-2.5 text-sm",
              fulfillmentMethod === "pickup"
                ? "border-brand-primary bg-bg-surface-alt text-text-primary"
                : "border-border-default text-text-primary",
            )}
          >
            <Store className="size-5 shrink-0" />
            <span className="flex flex-col items-start">
              <span className="font-semibold">{t("pickup")}</span>
              <span className="text-xs text-text-secondary">{PICKUP_LOCATION[locale]}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => onFulfillmentMethodChange("delivery")}
            className={cn(
              "flex flex-1 items-center gap-2 rounded-2xl border-[1.5px] px-3 py-2.5 text-sm",
              fulfillmentMethod === "delivery"
                ? "border-brand-primary bg-bg-surface-alt text-text-primary"
                : "border-border-default text-text-primary",
            )}
          >
            <Truck className="size-5 shrink-0" />
            <span className="font-semibold">{t("delivery")}</span>
          </button>
        </div>
      </div>

      {fulfillmentMethod === "delivery" && (
        <div className="flex flex-col gap-2">
          <p className="text-[15px] font-semibold text-text-primary">{t("deliveryArea")}</p>
          <div className="flex flex-wrap gap-2">
            {deliveryAreas.map((area) => (
              <button
                key={area.id}
                type="button"
                onClick={() => onDeliveryAreaChange(area.id)}
                className={cn(
                  "rounded-full border-[1.5px] px-3 py-1.5 text-sm",
                  deliveryAreaId === area.id
                    ? "border-brand-primary bg-brand-primary text-text-on-brand"
                    : "border-border-default text-text-primary",
                )}
              >
                {area.name[locale]}
              </button>
            ))}
          </div>
        </div>
      )}

      {fulfillmentMethod && (
        <div className="flex flex-col gap-2">
          <p className="text-[15px] font-semibold text-text-primary">{t("fulfillmentDate")}</p>
          <DatePicker
            locale={locale}
            value={fulfillmentDate}
            onChange={onFulfillmentDateChange}
            blockedDates={blockedDates}
          />
        </div>
      )}
    </>
  );
}
