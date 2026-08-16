"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { NavBar } from "@/components/layout/NavBar";
import { Footer } from "@/components/layout/Footer";
import { InputField } from "@/components/storefront/InputField";
import { ToggleChip } from "@/components/storefront/ToggleChip";
import { CheckoutAuthCard } from "@/components/storefront/CheckoutAuthCard";
import { EditFulfillmentModal } from "@/components/storefront/EditFulfillmentModal";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { useCartStore, useCartSubtotal, useFulfillmentComplete } from "@/store/cart";
import { useSession } from "@/hooks/useSession";
import { createClient } from "@/lib/supabase/client";
import { createOrder } from "@/lib/orders/createOrder";
import { setLastOrder } from "@/lib/orders/lastOrder";
import type { DeliveryArea, PromoCode } from "@/types/catalog";
import type { ContactMethod, SavedAddress, SavedPhone } from "@/types/auth";
import type { CartItem } from "@/types/cart";
import type { OrderConfirmationSnapshot } from "@/types/orders";

const PICKUP_LOCATION = { en: "New Cairo", ar: "التجمع الخامس" };

export function CheckoutPageContent({
  deliveryAreas,
  blockedDates,
}: {
  deliveryAreas: DeliveryArea[];
  blockedDates: string[];
}) {
  const t = useTranslations("Checkout");
  const tCommon = useTranslations("Common");
  const locale = useLocale() as "en" | "ar";
  const router = useRouter();
  const { session } = useSession();

  const items = useCartStore((state) => state.items);
  const subtotal = useCartSubtotal();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const fulfillmentMethod = useCartStore((state) => state.fulfillmentMethod);
  const deliveryAreaId = useCartStore((state) => state.deliveryAreaId);
  const fulfillmentDate = useCartStore((state) => state.fulfillmentDate);
  const fulfillmentComplete = useFulfillmentComplete();
  const deliveryArea = deliveryAreas.find((area) => area.id === deliveryAreaId);

  useEffect(() => {
    if (items.length === 0) router.replace("/cart");
  }, [items.length, router]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [address, setAddress] = useState("");
  const [apartment, setApartment] = useState("");
  const [phone1, setPhone1] = useState("");
  const [phone1Method, setPhone1Method] = useState<ContactMethod>("call");
  const [phone2, setPhone2] = useState("");
  const [phone2Method, setPhone2Method] = useState<ContactMethod>("call");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  // Pre-fill from the account when logged in — only into fields still empty,
  // never overwriting anything already typed (same rule as the saved-address
  // "Use this" chips).
  useEffect(() => {
    if (!session) return;
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", session.user.id)
      .single()
      .then(({ data: profile }) => {
        if (profile?.first_name) setFirstName((current) => current || profile.first_name);
        if (profile?.last_name) setLastName((current) => current || profile.last_name);
        if (session.user.email) setEmail((current) => current || session.user.email!);
      });
  }, [session]);

  const [savingAddress, setSavingAddress] = useState(false);
  const [saveAddressMessage, setSaveAddressMessage] = useState<string | null>(null);

  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [promoApplying, setPromoApplying] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);

  const [attempted, setAttempted] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const fieldErrors: Record<string, string> = {};
  if (!firstName.trim()) fieldErrors.firstName = t("errorRequired");
  if (!lastName.trim()) fieldErrors.lastName = t("errorRequired");
  if (!address.trim()) fieldErrors.address = t("errorRequired");
  if (!phone1.trim()) fieldErrors.phone1 = t("errorRequired");
  const fieldOrder = ["firstName", "lastName", "address", "phone1"];
  const fieldError = (id: string) => (attempted ? fieldErrors[id] : undefined);

  function handleUseAddress(saved: SavedAddress) {
    setAddress(saved.address);
    setApartment(saved.apartment ?? "");
  }

  function handleUsePhone(saved: SavedPhone) {
    if (!phone1) {
      setPhone1(saved.phone);
      setPhone1Method(saved.contact_method);
    } else if (!phone2) {
      setPhone2(saved.phone);
      setPhone2Method(saved.contact_method);
    }
  }

  async function handleSaveAddress() {
    if (!session || !address.trim()) return;
    setSavingAddress(true);
    setSaveAddressMessage(null);
    const supabase = createClient();
    try {
      const { error: addressError } = await supabase.from("customer_addresses").insert({
        customer_id: session.user.id,
        label: t("address"),
        address,
        apartment: apartment || null,
      });
      if (addressError) throw addressError;

      if (phone1.trim()) {
        const { error: phoneError } = await supabase.from("customer_phones").insert({
          customer_id: session.user.id,
          phone: phone1,
          contact_method: phone1Method,
        });
        if (phoneError) throw phoneError;
      }

      if (phone2.trim()) {
        const { error: phone2Error } = await supabase.from("customer_phones").insert({
          customer_id: session.user.id,
          phone: phone2,
          contact_method: phone2Method,
        });
        if (phone2Error) throw phone2Error;
      }
      setSaveAddressMessage(t("saveAddressSuccess"));
    } catch (err) {
      console.error("save address error:", err);
      setSaveAddressMessage(t("saveAddressCapReached"));
    } finally {
      setSavingAddress(false);
    }
  }

  async function handleApplyPromo() {
    setPromoError(null);
    setAppliedPromo(null);
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) return;

    setPromoApplying(true);
    const supabase = createClient();
    // promo_codes has no public SELECT policy (anyone could otherwise
    // enumerate every active code) — validate_promo_code is a narrow,
    // exact-match RPC instead (20260814090200_promo_code_lookup.sql).
    const { data, error } = await supabase.rpc("validate_promo_code", { p_code: code }).maybeSingle();
    setPromoApplying(false);

    if (error || !data) {
      setPromoError(t("promoInvalid"));
      return;
    }
    const promo = { ...data, code } as PromoCode;
    if (promo.min_order_amount && subtotal < promo.min_order_amount) {
      setPromoError(t("promoMinOrder", { amount: promo.min_order_amount }));
      return;
    }
    setAppliedPromo(promo);
  }

  const discount = appliedPromo
    ? appliedPromo.discount_type === "fixed"
      ? appliedPromo.discount_value
      : Math.round((subtotal * appliedPromo.discount_value) / 100)
    : 0;
  const total = Math.max(0, subtotal - discount);

  function attributesSummary(item: CartItem) {
    const parts: string[] = [];
    if (item.isFake) parts.push(`${item.fakeSizeCm} cm`);
    else if (item.sizeLabel) parts.push(item.sizeLabel);
    if (item.tierCount) parts.push(t("tierCount", { count: item.tierCount }));
    if (item.flavorNames.length > 0) parts.push(item.flavorNames.join(", "));
    if (item.colorNames.length > 0) parts.push(item.colorNames.join(", "));
    const shapeName = item.isFake ? item.fakeShapeName : item.shapeName;
    if (shapeName) parts.push(shapeName);
    parts.push(t("qty", { count: item.quantity }));
    return parts.join(" • ");
  }

  async function handlePlaceOrder() {
    setOrderError(null);
    setAttempted(true);

    const firstErrorId = fieldOrder.find((id) => fieldErrors[id]);
    if (firstErrorId) {
      document.getElementById(firstErrorId)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!fulfillmentComplete || !fulfillmentMethod || !fulfillmentDate) {
      setOrderError(t("errorFulfillmentIncomplete"));
      return;
    }

    setSubmittingOrder(true);
    const fullAddress = apartment.trim() ? `${address}, ${apartment}` : address;
    try {
      const { orderNumber } = await createOrder({
        customerId: session?.user.id ?? null,
        guestName: session ? null : `${firstName} ${lastName}`.trim(),
        contactPhone: phone1,
        contactPhoneMethod: phone1Method,
        fulfillmentType: fulfillmentMethod,
        deliveryAreaId: fulfillmentMethod === "delivery" ? deliveryAreaId : null,
        deliveryAddress: fullAddress,
        fulfillmentDate,
        promoCodeId: appliedPromo?.id ?? null,
        subtotalEstimate: subtotal,
        deliveryPrice: fulfillmentMethod === "delivery" ? (deliveryArea?.price ?? 0) : 0,
        discountAmount: discount,
        notes: notes.trim() || null,
        items,
      });

      const snapshot: OrderConfirmationSnapshot = {
        orderNumber,
        lineItems: items.map((item) => ({
          name: item.cakeName[locale],
          image: item.cakeImage,
          attributesSummary: attributesSummary(item),
          quantity: item.quantity,
          lineEstimate: item.lineEstimate,
        })),
        fulfillmentMethod,
        deliveryAreaName: fulfillmentMethod === "delivery" ? (deliveryArea?.name[locale] ?? null) : PICKUP_LOCATION[locale],
        fulfillmentDate,
        contactName: `${firstName} ${lastName}`.trim(),
        phone: phone1,
        phoneMethod: phone1Method,
        address: fullAddress,
        total,
      };
      setLastOrder(snapshot);
      // Cart is cleared by the Order Confirmation page itself, not here —
      // clearing it while still mounted on /checkout made `items.length ===
      // 0` true immediately, which raced this navigation against the
      // redirect-to-/cart effect above and could send the customer to an
      // empty cart instead of their confirmation page.
      router.push("/order-confirmation");
    } catch (err) {
      console.error("create order error:", err);
      setOrderError(t("placeOrderError"));
      setSubmittingOrder(false);
    }
  }

  if (items.length === 0) return null;

  return (
    <main className="flex flex-col bg-bg-page">
      <NavBar />
      <div className="flex flex-col gap-6 px-6 py-8 md:px-[100px]">
        <p className="text-[13px] text-text-secondary">
          <Link href="/">{t("breadcrumbHome")}</Link>
          {"  /  "}
          <Link href="/cart">{t("breadcrumbCart")}</Link>
          {"  /  "}
          <span>{t("breadcrumbCheckout")}</span>
        </p>
        <h1 className="font-heading text-3xl font-extrabold text-brand-primary md:text-[40px]">{t("title")}</h1>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex w-full flex-col gap-4 lg:max-w-[760px]">
            <div className="flex flex-col gap-3 rounded-3xl bg-bg-surface p-5">
              <p className="font-heading text-[22px] font-semibold text-text-primary">{t("howCheckout")}</p>
              <CheckoutAuthCard locale={locale} onUseAddress={handleUseAddress} onUsePhone={handleUsePhone} />
            </div>

            <div className="flex flex-col gap-3 rounded-3xl bg-bg-surface p-5">
              <p className="font-heading text-[22px] font-semibold text-text-primary">
                {t("contactDetailsTitle")}
              </p>
              <div className="flex gap-3">
                <InputField id="firstName" label={t("firstName")} value={firstName} onChange={setFirstName} error={fieldError("firstName")} />
                <InputField id="lastName" label={t("lastName")} value={lastName} onChange={setLastName} error={fieldError("lastName")} />
                <InputField label={t("company")} value={company} onChange={setCompany} />
              </div>
              <InputField id="address" label={t("address")} value={address} onChange={setAddress} error={fieldError("address")} />
              <InputField label={t("apartment")} value={apartment} onChange={setApartment} />

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <InputField id="phone1" label={t("phone1")} type="tel" value={phone1} onChange={setPhone1} error={fieldError("phone1")} />
                </div>
                <div className="flex gap-1.5 pb-3">
                  {(["call", "whatsapp", "both"] as const).map((method) => (
                    <ToggleChip
                      key={method}
                      label={tCommon(`contactMethod.${method}`)}
                      selected={phone1Method === method}
                      onClick={() => setPhone1Method(method)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <InputField label={t("phone2")} type="tel" value={phone2} onChange={setPhone2} />
                </div>
                <div className="flex gap-1.5 pb-3">
                  {(["call", "whatsapp", "both"] as const).map((method) => (
                    <ToggleChip
                      key={method}
                      label={tCommon(`contactMethod.${method}`)}
                      selected={phone2Method === method}
                      onClick={() => setPhone2Method(method)}
                    />
                  ))}
                </div>
              </div>

              <InputField label={t("emailOptional")} type="email" value={email} onChange={setEmail} />

              {session && (
                <div className="flex items-center gap-2.5">
                  <Button type="button" variant="brand-primary" disabled={savingAddress} onClick={handleSaveAddress}>
                    {t("saveAddress")}
                  </Button>
                  <p className="text-xs text-text-secondary">{saveAddressMessage ?? t("saveAddressHint")}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex w-full flex-col gap-4 lg:w-[400px] lg:shrink-0">
            <div className="flex flex-col gap-2.5 rounded-3xl bg-bg-surface p-4">
              <div className="flex items-center justify-between">
                <p className="font-heading text-[22px] font-semibold text-text-primary">
                  {t("fulfillmentDetailsTitle")}
                </p>
                <EditFulfillmentModal
                  locale={locale}
                  deliveryAreas={deliveryAreas}
                  blockedDates={blockedDates}
                  triggerClassName="text-sm font-semibold text-brand-secondary underline"
                >
                  {t("edit")}
                </EditFulfillmentModal>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">{t("method")}</span>
                <span className="font-semibold text-text-primary">
                  {fulfillmentMethod === "delivery" ? t("delivery") : fulfillmentMethod === "pickup" ? t("pickup") : "—"}
                </span>
              </div>
              {fulfillmentMethod === "delivery" && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">{t("deliveryArea")}</span>
                  <span className="font-semibold text-text-primary">{deliveryArea?.name[locale] ?? "—"}</span>
                </div>
              )}
              {fulfillmentMethod === "pickup" && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">{t("deliveryArea")}</span>
                  <span className="font-semibold text-text-primary">{PICKUP_LOCATION[locale]}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">{t("fulfillmentDate")}</span>
                <span className="font-semibold text-text-primary">{fulfillmentDate ?? "—"}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-3xl bg-bg-surface p-4">
              <p className="font-heading text-[22px] font-semibold text-text-primary">{t("orderNotesTitle")}</p>
              <InputField
                label={t("notes")}
                placeholder={t("notesPlaceholder")}
                value={notes}
                onChange={setNotes}
                multiline
              />
            </div>

            <div className="flex flex-col gap-4 rounded-3xl bg-bg-surface p-4">
              <p className="font-heading text-[22px] font-semibold text-text-primary">{t("orderSummaryTitle")}</p>
              <div className="flex items-center justify-between text-sm text-text-secondary">
                <span>{t("subtotal", { count: itemCount })}</span>
                <span>{subtotal > 0 ? `${subtotal} ${tCommon("egp")}` : tCommon("priceOnRequest")}</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <InputField label="" placeholder={t("promoCodePlaceholder")} value={promoCodeInput} onChange={setPromoCodeInput} />
                </div>
                <Button type="button" variant="brand-primary" disabled={promoApplying} onClick={handleApplyPromo}>
                  {t("apply")}
                </Button>
              </div>
              {promoError && <p className="text-xs text-red-600">{promoError}</p>}
              {appliedPromo && (
                <p className="text-xs font-semibold text-[#3e7d4c]">
                  {t("promoApplied", { code: appliedPromo.code, amount: discount })}
                </p>
              )}

              <div className="flex items-center justify-between text-sm text-text-secondary">
                <span>{t("delivery")}</span>
                <span>{t("deliveryTBD")}</span>
              </div>
              <div className="h-px w-full bg-border-default" />
              <div className="flex items-center justify-between text-[20px] font-semibold text-text-primary">
                <span>{t("estimatedTotal")}</span>
                <span>{total > 0 ? `${total} ${tCommon("egp")}` : tCommon("priceOnRequest")}</span>
              </div>
              <p className="text-xs text-text-secondary">{t("priceDisclaimer")}</p>
              {orderError && <p className="text-center text-sm text-red-600">{orderError}</p>}
              <Button
                variant="brand-primary"
                size="xl"
                className="w-full justify-center"
                disabled={submittingOrder}
                onClick={handlePlaceOrder}
              >
                {t("placeOrder")}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
