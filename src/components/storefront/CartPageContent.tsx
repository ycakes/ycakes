"use client";

import { useLocale, useTranslations } from "next-intl";
import { NavBar } from "@/components/layout/NavBar";
import { Footer } from "@/components/layout/Footer";
import { Divider } from "@/components/storefront/Divider";
import { CartItemRow } from "@/components/storefront/CartItemRow";
import { FulfillmentFields } from "@/components/storefront/FulfillmentFields";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { CHECKOUT_ENABLED, useCartStore, useCartSubtotal, useFulfillmentComplete } from "@/store/cart";
import type { DeliveryArea } from "@/types/catalog";

export function CartPageContent({
  deliveryAreas,
  blockedDates,
}: {
  deliveryAreas: DeliveryArea[];
  blockedDates: string[];
}) {
  const t = useTranslations("Cart");
  const tCommon = useTranslations("Common");
  const locale = useLocale() as "en" | "ar";
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const subtotal = useCartSubtotal();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const fulfillmentType = useCartStore((state) => state.fulfillmentMethod);
  const setFulfillmentType = useCartStore((state) => state.setFulfillmentMethod);
  const deliveryAreaId = useCartStore((state) => state.deliveryAreaId);
  const setDeliveryAreaId = useCartStore((state) => state.setDeliveryAreaId);
  const fulfillmentDate = useCartStore((state) => state.fulfillmentDate);
  const setFulfillmentDate = useCartStore((state) => state.setFulfillmentDate);
  const fulfillmentComplete = useFulfillmentComplete();

  return (
    <main className="flex flex-col bg-bg-page">
      <NavBar />
      <div className="flex flex-col gap-6 px-6 py-8 md:px-[100px]">
        <p className="text-[13px] text-text-secondary">
          <Link href="/">{t("breadcrumbHome")}</Link>
          {"  /  "}
          <span>{t("title")}</span>
        </p>
        <h1 className="font-heading text-3xl font-extrabold text-brand-primary md:text-[40px]">
          {t("title")}
        </h1>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-text-secondary">{t("empty")}</p>
            <Button render={<Link href="/shop" />} nativeButton={false} variant="brand-primary" size="xl">
              {t("browseCakes")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-end">
            <div className="flex w-full flex-col gap-4 lg:max-w-[700px]">
              {items.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  onRemove={() => removeItem(item.id)}
                  onQuantityChange={(quantity) => setQuantity(item.id, quantity)}
                />
              ))}
            </div>

            <div className="flex w-full flex-col gap-5 rounded-3xl bg-bg-surface p-5 shadow-sm lg:sticky lg:top-6 lg:w-[460px] lg:shrink-0">
              <p className="font-heading text-[22px] font-semibold text-text-primary">
                {t("orderSummary")}
              </p>
              <div className="flex items-center justify-between text-sm text-text-secondary">
                <span>{t("subtotal", { count: itemCount })}</span>
                <span>{subtotal > 0 ? `${subtotal} ${tCommon("egp")}` : tCommon("priceOnRequest")}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-text-secondary">
                <span>{t("delivery")}</span>
                <span>{t("deliveryCalculated")}</span>
              </div>
              <div className="h-px w-full bg-border-default" />

              <FulfillmentFields
                locale={locale}
                deliveryAreas={deliveryAreas}
                blockedDates={blockedDates}
                fulfillmentMethod={fulfillmentType}
                onFulfillmentMethodChange={setFulfillmentType}
                deliveryAreaId={deliveryAreaId}
                onDeliveryAreaChange={setDeliveryAreaId}
                fulfillmentDate={fulfillmentDate}
                onFulfillmentDateChange={setFulfillmentDate}
              />

              <div className="h-px w-full bg-border-default" />
              <div className="flex items-center justify-between text-[17px] font-semibold text-text-primary">
                <span>{t("estimatedTotal")}</span>
                <span>{subtotal > 0 ? `${subtotal} ${tCommon("egp")}` : tCommon("priceOnRequest")}</span>
              </div>
              <p className="text-xs text-text-secondary">{t("priceDisclaimer")}</p>
              <Button
                variant="brand-primary"
                size="xl"
                className="w-full justify-center"
                disabled={!CHECKOUT_ENABLED || !fulfillmentComplete}
                onClick={() => router.push("/checkout")}
              >
                {t("proceedToCheckout")}
              </Button>
            </div>
          </div>
        )}
      </div>

      <Divider />
      <Footer />
    </main>
  );
}
