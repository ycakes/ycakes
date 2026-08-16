"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export type SizeFormValue = {
  id?: string;
  min_qty: number;
  max_qty: number;
  unit: "servings" | "quantity" | "cm";
  price_modifier: number;
};

export function SizeFormDialog({
  open,
  initialValue,
  onSave,
  onCancel,
}: {
  open: boolean;
  initialValue: SizeFormValue | null;
  onSave: (value: SizeFormValue) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("Admin.table");
  const [minQty, setMinQty] = useState(String(initialValue?.min_qty ?? ""));
  const [maxQty, setMaxQty] = useState(String(initialValue?.max_qty ?? ""));
  const [unit, setUnit] = useState<SizeFormValue["unit"]>(initialValue?.unit ?? "servings");
  const [priceModifier, setPriceModifier] = useState(String(initialValue?.price_modifier ?? 0));

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-bg-surface p-6 shadow-lg">
          <Dialog.Title className="font-heading text-lg font-semibold text-text-primary">
            {initialValue?.id ? t("edit") : t("add")}
          </Dialog.Title>
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex gap-2">
              <label className="flex flex-1 flex-col gap-1 text-[13px] font-medium text-text-primary">
                {t("minQty")}
                <input type="number" value={minQty} onChange={(e) => setMinQty(e.target.value)} className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm" />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-[13px] font-medium text-text-primary">
                {t("maxQty")}
                <input type="number" value={maxQty} onChange={(e) => setMaxQty(e.target.value)} className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm" />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
              {t("unit")}
              <select value={unit} onChange={(e) => setUnit(e.target.value as SizeFormValue["unit"])} className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm">
                <option value="servings">{t("unitServings")}</option>
                <option value="quantity">{t("unitQuantity")}</option>
                <option value="cm">{t("unitCm")}</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
              {t("priceModifier")}
              <input type="number" step="0.01" value={priceModifier} onChange={(e) => setPriceModifier(e.target.value)} className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm" />
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
                  min_qty: Number(minQty) || 0,
                  max_qty: Number(maxQty) || 0,
                  unit,
                  price_modifier: Number(priceModifier) || 0,
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
