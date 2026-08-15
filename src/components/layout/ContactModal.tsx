"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { Phone, X } from "lucide-react";
import { Dialog } from "@base-ui/react/dialog";
import { useTranslations } from "next-intl";
import {
  CONTACT_INSTAGRAM_URL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_TEL,
  CONTACT_WHATSAPP_URL,
} from "@/lib/contact";

// Shared "Contact" popup, triggered from both NavBar and Footer instead of
// the old scroll-to-footer anchor link.
export function ContactModal({ className, children }: { className?: string; children: ReactNode }) {
  const t = useTranslations("ContactModal");

  return (
    <Dialog.Root>
      <Dialog.Trigger className={className}>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-bg-surface p-6 shadow-lg">
          <Dialog.Close
            aria-label={t("close")}
            className="absolute end-4 top-4 flex size-8 items-center justify-center rounded-full text-text-secondary transition-transform duration-150 hover:scale-105 hover:bg-bg-surface-alt"
          >
            <X className="size-4" />
          </Dialog.Close>

          <Dialog.Title className="font-heading text-xl font-semibold text-brand-primary">
            {t("title")}
          </Dialog.Title>
          <p className="mt-1 text-sm text-text-secondary">{CONTACT_PHONE_DISPLAY}</p>

          <div className="mt-4 flex gap-2.5">
            <a
              href={`tel:${CONTACT_PHONE_TEL}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-full border-[1.5px] border-border-default px-4 py-2.5 text-sm font-semibold text-text-primary transition-transform duration-150 hover:scale-105"
            >
              <Phone className="size-4" />
              {t("call")}
            </a>
            <a
              href={CONTACT_WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-primary px-4 py-2.5 text-sm font-semibold text-text-on-brand transition-transform duration-150 hover:scale-105"
            >
              <Image src="/icons/whatsapp.svg" alt="" width={16} height={16} />
              {t("whatsapp")}
            </a>
          </div>

          <a
            href={CONTACT_INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex items-center justify-center gap-2 rounded-full border-[1.5px] border-border-default px-4 py-2.5 text-sm font-semibold text-text-primary transition-transform duration-150 hover:scale-105"
          >
            <Image src="/icons/instagram.svg" alt="" width={18} height={18} />
            {t("instagram")}
          </a>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
