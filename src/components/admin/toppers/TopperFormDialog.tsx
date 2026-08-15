"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ImageUploader, type UploadedImage } from "@/components/admin/ImageUploader";
import type { Color } from "@/types/catalog";

export type TopperFormValue = {
  id?: string;
  name_en: string;
  name_ar: string;
  price_modifier: number;
  image_url: string | null;
  has_color_variants: boolean;
  color_ids: string[];
};

export function TopperFormDialog({
  open,
  initialValue,
  allColors,
  onSave,
  onCancel,
}: {
  open: boolean;
  initialValue: TopperFormValue | null;
  allColors: Color[];
  onSave: (value: TopperFormValue) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("Admin.table");
  const tUpload = useTranslations("Admin.imageUploader");
  const [nameEn, setNameEn] = useState(initialValue?.name_en ?? "");
  const [nameAr, setNameAr] = useState(initialValue?.name_ar ?? "");
  const [priceModifier, setPriceModifier] = useState(String(initialValue?.price_modifier ?? 0));
  const [image, setImage] = useState<UploadedImage[]>(
    initialValue?.image_url ? [{ url: initialValue.image_url, sort_order: 0, is_primary: true }] : [],
  );
  const [hasColorVariants, setHasColorVariants] = useState(initialValue?.has_color_variants ?? false);
  const [colorIds, setColorIds] = useState<string[]>(initialValue?.color_ids ?? []);

  function toggleColor(id: string) {
    setColorIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
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
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[92vw] max-w-[480px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-bg-surface p-6 shadow-lg">
          <Dialog.Title className="font-heading text-lg font-semibold text-text-primary">
            {initialValue?.id ? t("edit") : t("add")}
          </Dialog.Title>
          <div className="mt-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
              {t("nameEn")}
              <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
              {t("nameAr")}
              <input dir="rtl" value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
              {t("priceModifier")}
              <input type="number" step="0.01" value={priceModifier} onChange={(e) => setPriceModifier(e.target.value)} className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm" />
            </label>
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-medium text-text-primary">{tUpload("upload")}</span>
              <ImageUploader images={image} onChange={setImage} folder="toppers" multiple={false} />
            </div>
            <label className="flex items-center gap-2 text-[13px] font-medium text-text-primary">
              <input type="checkbox" checked={hasColorVariants} onChange={(e) => setHasColorVariants(e.target.checked)} />
              {t("hasColorVariants")}
            </label>
            {hasColorVariants && (
              <div className="flex flex-wrap gap-2">
                {allColors.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => toggleColor(color.id)}
                    className={
                      colorIds.includes(color.id)
                        ? "flex items-center gap-1.5 rounded-full border-2 border-brand-secondary px-2.5 py-1 text-xs"
                        : "flex items-center gap-1.5 rounded-full border-[1.5px] border-border-default px-2.5 py-1 text-xs"
                    }
                  >
                    <span className="size-3.5 rounded-full border border-border-default" style={{ backgroundColor: color.hex_code ?? undefined }} />
                    {color.name.en}
                  </button>
                ))}
              </div>
            )}
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
                  image_url: image[0]?.url ?? null,
                  has_color_variants: hasColorVariants,
                  color_ids: hasColorVariants ? colorIds : [],
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
