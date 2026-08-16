"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { Category } from "@/types/catalog";

export type FlavorFormValue = {
  id?: string;
  name_en: string;
  name_ar: string;
  price_modifier: number;
  restricted_category_ids: string[];
};

export function FlavorFormDialog({
  open,
  initialValue,
  allCategories,
  onSave,
  onCancel,
}: {
  open: boolean;
  initialValue: FlavorFormValue | null;
  allCategories: Category[];
  onSave: (value: FlavorFormValue) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("Admin.table");
  const [nameEn, setNameEn] = useState(initialValue?.name_en ?? "");
  const [nameAr, setNameAr] = useState(initialValue?.name_ar ?? "");
  const [priceModifier, setPriceModifier] = useState(String(initialValue?.price_modifier ?? 0));
  const [restrictedCategoryIds, setRestrictedCategoryIds] = useState<string[]>(initialValue?.restricted_category_ids ?? []);

  function toggleCategory(id: string) {
    setRestrictedCategoryIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

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
            <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
              {t("nameEn")}
              <input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
              {t("nameAr")}
              <input
                dir="rtl"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
              {t("priceModifier")}
              <input
                type="number"
                step="0.01"
                value={priceModifier}
                onChange={(e) => setPriceModifier(e.target.value)}
                className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm"
              />
            </label>
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-text-primary">{t("restrictedTo")}</span>
              <p className="text-xs text-text-secondary">{t("restrictedToNone")}</p>
              <div className="flex flex-wrap gap-2">
                {allCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    className={
                      restrictedCategoryIds.includes(category.id)
                        ? "rounded-full border-2 border-brand-secondary px-2.5 py-1 text-xs"
                        : "rounded-full border-[1.5px] border-border-default px-2.5 py-1 text-xs"
                    }
                  >
                    {category.name.en}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <Button
              type="button"
              variant="brand-primary"
              className="flex-1 justify-center"
              onClick={() =>
                onSave({
                  id: initialValue?.id,
                  name_en: nameEn,
                  name_ar: nameAr,
                  price_modifier: Number(priceModifier) || 0,
                  restricted_category_ids: restrictedCategoryIds,
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
