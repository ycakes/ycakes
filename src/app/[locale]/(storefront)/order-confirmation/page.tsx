"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CircleCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { NavBar } from "@/components/layout/NavBar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { buildOrderWhatsAppUrl } from "@/lib/contact";
import { getLastOrder, clearLastOrder } from "@/lib/orders/lastOrder";
import { useCartStore } from "@/store/cart";
import type { OrderConfirmationSnapshot } from "@/types/orders";

export default function OrderConfirmationPage() {
  const t = useTranslations("OrderConfirmation");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const [order, setOrder] = useState<OrderConfirmationSnapshot | null>(null);

  useEffect(() => {
    // sessionStorage only exists client-side — a lazy useState initializer
    // would run during SSR too (crash) or risk a hydration mismatch, so this
    // has to be an effect despite the lint rule's general preference.
    const snapshot = getLastOrder();
    if (!snapshot) {
      router.replace("/");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
    setOrder(snapshot);
    // One-time receipt — clear so a later back-navigation to this URL
    // doesn't show a stale order.
    clearLastOrder();
    // Cleared here, not in Checkout, so Checkout's own "redirect to /cart if
    // empty" effect never fires while still mounted on /checkout — see the
    // comment on that call site for the bug this caused.
    useCartStore.getState().clear();
  }, [router]);

  if (!order) return null;

  return (
    <main className="flex flex-col bg-bg-page">
      <NavBar />
      <div className="flex flex-1 justify-center px-4 py-10 md:py-16">
        <div className="flex w-full max-w-[700px] flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <CircleCheck className="size-16 text-[#3e7d4c]" strokeWidth={1.5} />
            <h1 className="font-heading text-3xl font-extrabold text-text-primary sm:text-[40px]">
              {t("orderPlaced")}
            </h1>
            <p className="text-text-secondary">{t("thanks", { name: order.contactName.split(" ")[0] || "" })}</p>
            <p className="text-sm font-semibold text-text-primary">{t("orderNumber", { number: order.orderNumber })}</p>
          </div>

          <div className="flex flex-col items-center gap-3 rounded-3xl bg-bg-surface p-6 text-center">
            <p className="font-heading text-[22px] font-semibold text-text-primary">{t("whatsNextTitle")}</p>
            <p className="text-sm text-text-secondary">{t("whatsNextBody")}</p>
            <a
              href={buildOrderWhatsAppUrl(order.orderNumber)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-brand-secondary px-4 py-2.5 text-sm font-semibold text-text-on-brand transition-transform duration-150 hover:scale-105"
            >
              <Image src="/icons/whatsapp.svg" alt="" width={16} height={16} />
              {t("messageWhatsApp")}
            </a>
          </div>

          <div className="flex flex-col gap-3 rounded-3xl bg-bg-surface p-6">
            <p className="font-heading text-[22px] font-semibold text-text-primary">{t("orderDetailsTitle")}</p>

            {order.lineItems.map((item, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="relative size-[72px] shrink-0 overflow-hidden rounded-2xl bg-bg-subtle">
                  {item.image && <Image src={item.image} alt="" fill sizes="72px" className="object-contain" />}
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <p className="font-semibold text-text-primary">{item.name}</p>
                  <p className="text-xs text-text-secondary">{item.attributesSummary}</p>
                </div>
                <p className="font-semibold text-text-primary">
                  {item.lineEstimate > 0 ? `${item.lineEstimate} ${tCommon("egp")}` : tCommon("priceOnRequest")}
                </p>
              </div>
            ))}

            <div className="h-px w-full bg-border-default" />
            <p className="text-[13px] font-semibold text-text-secondary">{t("fulfillmentLabel")}</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">{t("method")}</span>
              <span className="font-semibold text-text-primary">
                {order.fulfillmentMethod === "delivery" ? t("delivery") : t("pickup")}
                {order.deliveryAreaName ? ` — ${order.deliveryAreaName}` : ""}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">{t("date")}</span>
              <span className="font-semibold text-text-primary">{order.fulfillmentDate}</span>
            </div>

            <div className="h-px w-full bg-border-default" />
            <p className="text-[13px] font-semibold text-text-secondary">{t("contactLabel")}</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">{t("name")}</span>
              <span className="font-semibold text-text-primary">{order.contactName}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">{t("phone")}</span>
              <span className="font-semibold text-text-primary">
                {order.phone} ({tCommon(`contactMethod.${order.phoneMethod}`)})
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">{t("address")}</span>
              <span className="font-semibold text-text-primary">{order.address}</span>
            </div>

            <div className="h-px w-full bg-border-default" />
            <div className="flex items-center justify-between text-[20px] font-semibold text-text-primary">
              <span>{t("estimatedTotal")}</span>
              <span>{order.total > 0 ? `${order.total} ${tCommon("egp")}` : tCommon("priceOnRequest")}</span>
            </div>
            <p className="text-xs text-text-secondary">{t("priceDisclaimer")}</p>
          </div>

          <div className="flex justify-center">
            <Button render={<Link href="/shop" />} nativeButton={false} variant="brand-primary" size="xl">
              {t("continueShopping")}
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
