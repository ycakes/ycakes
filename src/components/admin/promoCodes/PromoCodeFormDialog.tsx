"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SelectChip } from "@/components/storefront/SelectChip";

export type PromoCodeFormValue = {
  id?: string;
  code: string;
  discount_type: "fixed" | "percentage";
  discount_value: string;
  min_order_amount: string;
  expiry_date: string;
  redemption_cap: string;
};

export function PromoCodeFormDialog({
  open,
  initialValue,
  onSave,
  onCancel,
}: {
  open: boolean;
  initialValue: PromoCodeFormValue | null;
  onSave: (value: PromoCodeFormValue) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("Admin.table");
  const tPromo = useTranslations("Admin.promoCodes");
  const [code, setCode] = useState(initialValue?.code ?? "");
  const [discountType, setDiscountType] = useState<"fixed" | "percentage">(initialValue?.discount_type ?? "percentage");
  const [discountValue, setDiscountValue] = useState(initialValue?.discount_value ?? "");
  const [minOrder, setMinOrder] = useState(initialValue?.min_order_amount ?? "");
  const [expiryDate, setExpiryDate] = useState(initialValue?.expiry_date ?? "");
  const [redemptionCap, setRedemptionCap] = useState(initialValue?.redemption_cap ?? "");

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-bg-surface p-6 shadow-lg">
          <Dialog.Title className="font-heading text-lg font-semibold text-text-primary">
            {initialValue?.id ? t("edit") : t("add")}
          </Dialog.Title>
          <div className="mt-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
              {tPromo("code")}
              <input
                dir="ltr"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm"
              />
            </label>
            <div className="flex flex-col gap-1">
              <p className="text-[13px] font-medium text-text-primary">{tPromo("discountType")}</p>
              <div className="flex gap-2">
                <SelectChip label={tPromo("percentageOff")} selected={discountType === "percentage"} onSelect={() => setDiscountType("percentage")} />
                <SelectChip label={tPromo("fixedOff")} selected={discountType === "fixed"} onSelect={() => setDiscountType("fixed")} />
              </div>
            </div>
            <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
              {discountType === "percentage" ? tPromo("discountValuePercent") : tPromo("discountValueFixed")}
              <input
                type="number"
                min={0}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
              {tPromo("minOrderOptional")}
              <input
                type="number"
                min={0}
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
                className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
              {tPromo("expiryOptional")}
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
              {tPromo("redemptionCapOptional")}
              <input
                type="number"
                min={0}
                value={redemptionCap}
                onChange={(e) => setRedemptionCap(e.target.value)}
                className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm"
              />
            </label>
          </div>
          <div className="mt-5 flex gap-2">
            <Button
              type="button"
              variant="brand-primary"
              className="flex-1 justify-center"
              onClick={() =>
                onSave({
                  id: initialValue?.id,
                  code: code.trim(),
                  discount_type: discountType,
                  discount_value: discountValue,
                  min_order_amount: minOrder,
                  expiry_date: expiryDate,
                  redemption_cap: redemptionCap,
                })
              }
            >
              {t("save")}
            </Button>
            <Button type="button" variant="brand-ghost" className="flex-1 justify-center" onClick={onCancel}>
              {t("cancel")}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
