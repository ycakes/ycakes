"use client";

import { useState } from "react";
import Image from "next/image";
import { Dialog } from "@base-ui/react/dialog";
import { Download, Maximize2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

async function downloadImage(url: string, filename: string) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  } catch {
    // Cross-origin/network hiccup — fall back to opening it in a new tab
    // so the customer/admin can still save it manually.
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

// Shared by every place a reference-image thumbnail shows up (admin Order
// Detail edit form, admin read-only line-item view, storefront Profile
// Order Detail modal) — click to view fullscreen, download to device, and
// (only when onRemove is passed) confirm-before-remove.
export function ReferenceImageViewer({
  url,
  size = 120,
  onRemove,
}: {
  url: string;
  size?: number;
  onRemove?: () => void;
}) {
  const t = useTranslations("CakeDetail");
  const [fullscreen, setFullscreen] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border-[1.5px] border-border-default bg-bg-page" style={{ width: size, height: size }}>
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          aria-label={t("viewFullscreen")}
          className="group relative block size-full"
        >
          <Image src={url} alt="" fill sizes={`${size}px`} className="object-contain" />
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
            <Maximize2 className="size-5 text-white" />
          </span>
        </button>
        {onRemove && (
          <button
            type="button"
            onClick={() => setConfirmingRemove(true)}
            aria-label={t("removeReferenceImage")}
            className="absolute end-2 top-2 flex size-6 items-center justify-center rounded-full bg-brand-primary text-xs font-bold text-text-on-brand"
          >
            ×
          </button>
        )}
      </div>

      <Dialog.Root open={fullscreen} onOpenChange={setFullscreen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/70" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex w-[94vw] max-w-[720px] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-3xl bg-bg-surface p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <Dialog.Title className="font-heading text-base font-semibold text-text-primary">{t("referenceImage")}</Dialog.Title>
              <Dialog.Close aria-label={t("close")} className="flex size-9 items-center justify-center rounded-full text-text-secondary hover:bg-bg-surface-alt">
                <X className="size-5" />
              </Dialog.Close>
            </div>
            <div className="relative h-[70vh] w-full overflow-hidden rounded-2xl bg-bg-page">
              <Image src={url} alt="" fill sizes="720px" className="object-contain" />
            </div>
            <Button
              type="button"
              variant="brand-primary"
              className="justify-center"
              onClick={() => downloadImage(url, "reference-image.jpg")}
            >
              <Download className="size-4" />
              {t("downloadImage")}
            </Button>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      {onRemove && (
        <ConfirmDialog
          open={confirmingRemove}
          title={t("removeReferenceImage")}
          message={t("removeReferenceImageConfirm")}
          confirmLabel={t("removeReferenceImage")}
          cancelLabel={t("cancel")}
          onConfirm={() => {
            setConfirmingRemove(false);
            onRemove();
          }}
          onCancel={() => setConfirmingRemove(false)}
        />
      )}
    </>
  );
}
