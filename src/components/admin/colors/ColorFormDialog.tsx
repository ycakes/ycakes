"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/admin/ColorPicker";

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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftHex, setDraftHex] = useState(hex);

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
            <div className="relative flex items-center gap-3 text-[13px] font-medium text-text-primary">
              <button
                type="button"
                onClick={() => {
                  setDraftHex(hex);
                  setPickerOpen(true);
                }}
                className="size-9 shrink-0 rounded-lg border-[1.5px] border-border-default"
                style={{ backgroundColor: hex }}
                aria-label={t("hex")}
              />
              <span dir="ltr">{hex}</span>

              {pickerOpen && (
                <>
                  <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setPickerOpen(false)} aria-hidden="true" />
                  <div className="fixed left-1/2 top-1/2 z-50 flex w-[92vw] max-w-[320px] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-2xl border border-border-default bg-bg-surface p-4 shadow-lg">
                    <ColorPicker value={draftHex} onChange={setDraftHex} />
                    <input
                      dir="ltr"
                      value={draftHex}
                      onChange={(e) => setDraftHex(e.target.value)}
                      className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2 text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="brand-primary"
                        size="sm"
                        className="flex-1 justify-center"
                        onClick={() => {
                          setHex(draftHex);
                          setPickerOpen(false);
                        }}
                      >
                        {t("confirmColor")}
                      </Button>
                      <Button
                        type="button"
                        variant="brand-ghost"
                        size="sm"
                        className="flex-1 justify-center bg-bg-surface"
                        onClick={() => setPickerOpen(false)}
                      >
                        {t("cancel")}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
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
