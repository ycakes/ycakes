"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export type ColorFormValue = {
  id?: string;
  name_en: string;
  name_ar: string;
  hex_code: string;
};

export function ColorFormDialog({
  open,
  initialValue,
  onSave,
  onCancel,
}: {
  open: boolean;
  initialValue: ColorFormValue | null;
  onSave: (value: ColorFormValue) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("Admin.table");
  const [nameEn, setNameEn] = useState(initialValue?.name_en ?? "");
  const [nameAr, setNameAr] = useState(initialValue?.name_ar ?? "");
  const [hex, setHex] = useState(initialValue?.hex_code ?? "#000000");

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
            <label className="flex items-center gap-3 text-[13px] font-medium text-text-primary">
              <input type="color" value={hex} onChange={(e) => setHex(e.target.value)} className="size-9 rounded-lg border-[1.5px] border-border-default" />
              {hex}
            </label>
          </div>
          <div className="mt-5 flex gap-2">
            <Button
              type="button"
              variant="brand-primary"
              className="flex-1 justify-center"
              onClick={() => onSave({ id: initialValue?.id, name_en: nameEn, name_ar: nameAr, hex_code: hex })}
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
