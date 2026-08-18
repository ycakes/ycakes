"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/storefront/InputField";
import { SelectChip } from "@/components/storefront/SelectChip";
import { DatePicker } from "@/components/storefront/DatePicker";
import { ToggleChip } from "@/components/storefront/ToggleChip";
import { NewOrderItemRow } from "@/components/admin/orders/NewOrderItemRow";
import type { SelectableCake } from "@/components/admin/orders/CakeSelect";
import {
  createManualOrder,
  emptyFieldsValue,
  type ManualOrderItem,
} from "@/lib/admin/manualOrder";
import { useRouter, Link } from "@/i18n/navigation";
import type {
  Color,
  DeliveryArea,
  Flavor,
  Shape,
  Size,
  Tier,
  Topper,
} from "@/types/catalog";
import type { ContactMethod } from "@/types/auth";

type ManualOrderSource = "phone" | "instagram" | "in_person";

type SizeWithTiers = Size & { tierIds: string[] };
type CatalogContext = {
  sizes: SizeWithTiers[];
  tiers: Tier[];
  flavors: Flavor[];
  colors: Color[];
  shapes: Shape[];
  toppers: Topper[];
  showToppers: boolean;
  allowFakeCake: boolean;
};

const SOURCES: ManualOrderSource[] = ["instagram", "phone", "in_person"];

function newItem(): ManualOrderItem {
  return {
    key: crypto.randomUUID(),
    cakeId: null,
    cakeName: "",
    categoryId: null,
    quantity: 1,
    price: "",
    customizing: false,
    customNotes: "",
    fields: emptyFieldsValue(),
  };
}

export function NewOrderContent({
  locale,
  cakes,
  catalogByCategoryId,
  deliveryAreas,
  blockedDates,
}: {
  locale: "en" | "ar";
  cakes: SelectableCake[];
  catalogByCategoryId: Record<string, CatalogContext>;
  deliveryAreas: DeliveryArea[];
  blockedDates: string[];
}) {
  const t = useTranslations("Admin.orders");
  const tCheckout = useTranslations("Checkout");
  const tCommon = useTranslations("Common");
  const router = useRouter();

  const [source, setSource] = useState<ManualOrderSource>("instagram");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneMethod, setPhoneMethod] = useState<ContactMethod>("call");
  const [phone2, setPhone2] = useState("");
  const [phone2Method, setPhone2Method] = useState<ContactMethod>("call");
  const [instagramUsername, setInstagramUsername] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [items, setItems] = useState<ManualOrderItem[]>([newItem()]);
  const [notes, setNotes] = useState("");
  const [fulfillmentMethod, setFulfillmentMethod] = useState<
    "pickup" | "delivery" | null
  >(null);
  const [deliveryAreaId, setDeliveryAreaId] = useState<string | null>(null);
  const [fulfillmentDate, setFulfillmentDate] = useState<string | null>(null);
  const [dateOpen, setDateOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deliveryArea = deliveryAreas.find((a) => a.id === deliveryAreaId);
  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * item.quantity,
    0,
  );
  const deliveryFee =
    fulfillmentMethod === "delivery" ? (deliveryArea?.price ?? 0) : 0;
  const total = subtotal + deliveryFee;

  function patchItem(key: string, patch: Partial<ManualOrderItem>) {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, ...patch } : i)),
    );
  }

  async function handleCreate() {
    setError(null);
    const guestName = `${firstName} ${lastName}`.trim();
    const validItems = items.filter((i) => (Number(i.price) || 0) > 0);
    if (
      !guestName ||
      validItems.length === 0 ||
      !fulfillmentMethod ||
      !fulfillmentDate
    ) {
      setError(t("requiredFieldsError"));
      return;
    }
    if (
      fulfillmentMethod === "delivery" &&
      (!deliveryAreaId || !address.trim())
    ) {
      setError(t("requiredFieldsError"));
      return;
    }

    setSubmitting(true);
    try {
      const { id } = await createManualOrder({
        guestName,
        contactPhone: phone.trim() || null,
        contactPhoneMethod: phoneMethod,
        contactPhone2: phone2.trim() || null,
        contactPhone2Method: phone2Method,
        instagramUsername:
          source === "instagram" ? instagramUsername.trim() || null : null,
        email: email.trim() || null,
        source,
        fulfillmentType: fulfillmentMethod,
        deliveryAreaId:
          fulfillmentMethod === "delivery" ? deliveryAreaId : null,
        deliveryAddress: address.trim() || null,
        fulfillmentDate,
        notes: notes.trim() || null,
        deliveryPrice: deliveryFee,
        items: validItems,
      });
      router.push(`/admin/orders/${id}`);
    } catch (err) {
      console.error("create manual order error:", err);
      setError(t("createOrderFailed"));
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-brand-primary">
          {t("newOrderTitle")}
        </h1>
        <Link href="/admin/orders">
          <Button
            type="button"
            variant="brand-ghost"
            size="xl"
            className="bg-bg-surface px-5 py-3 text-base"
          >
            {t("backToOrders")}
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex w-full flex-col gap-6 lg:max-w-[728px]">
          <div className="flex flex-col gap-4 rounded-3xl border border-border-default bg-bg-surface p-6">
            <p className="text-xl font-semibold text-text-primary">
              {t("orderSource")}
            </p>
            <p className="text-[13px] text-text-secondary">
              {t("orderSourceHint")}
            </p>
            <div className="flex flex-wrap gap-3">
              {SOURCES.map((s) => (
                <SelectChip
                  key={s}
                  label={t(`sourceValue.${s}`)}
                  selected={source === s}
                  onSelect={() => setSource(s)}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-3xl border border-border-default bg-bg-surface p-6">
            <p className="text-xl font-semibold text-text-primary">
              {t("customerDetails")}
            </p>
            <div className="flex gap-3">
              <InputField
                label={tCheckout("firstName")}
                value={firstName}
                onChange={setFirstName}
              />
              <InputField
                label={tCheckout("lastName")}
                value={lastName}
                onChange={setLastName}
              />
            </div>
            <div className="flex flex-col gap-2">
              <InputField
                label={t("phoneNumber")}
                type="tel"
                value={phone}
                onChange={setPhone}
              />
              <div className="flex gap-1.5">
                {(["call", "whatsapp", "both"] as const).map((method) => (
                  <ToggleChip
                    key={method}
                    label={tCommon(`contactMethod.${method}`)}
                    selected={phoneMethod === method}
                    onClick={() => setPhoneMethod(method)}
                  />
                ))}
              </div>
            </div>
            <InputField
              label={t("addressDeliveryHint")}
              value={address}
              onChange={setAddress}
            />
            <InputField
              label={tCheckout("emailOptional")}
              type="email"
              value={email}
              onChange={setEmail}
            />
          </div>

          <div className="flex flex-col gap-4 rounded-3xl border border-border-default bg-bg-surface p-6">
            <p className="text-xl font-semibold text-text-primary">
              {t("orderItems")}
            </p>
            {items.map((item) => (
              <NewOrderItemRow
                key={item.key}
                item={item}
                locale={locale}
                cakes={cakes}
                catalogByCategoryId={catalogByCategoryId}
                canRemove={items.length > 1}
                onChange={(patch) => patchItem(item.key, patch)}
                onRemove={() =>
                  setItems((prev) => prev.filter((i) => i.key !== item.key))
                }
              />
            ))}
            <Button
              type="button"
              variant="brand-ghost"
              className="bg-bg-surface"
              onClick={() => setItems((prev) => [...prev, newItem()])}
            >
              {t("addItem")}
            </Button>
          </div>

          <div className="flex flex-col gap-4 rounded-3xl border border-border-default bg-bg-surface p-6">
            <p className="text-xl font-semibold text-text-primary">
              {t("orderNotesTitle")}
            </p>
            <InputField
              label=""
              placeholder={t("orderNotesPlaceholder")}
              value={notes}
              onChange={setNotes}
              multiline
            />
          </div>
        </div>

        <div className="flex w-full flex-col gap-6 lg:max-w-[376px]">
          <div className="flex flex-col gap-3.5 rounded-3xl border border-border-default bg-bg-surface p-6">
            <p className="text-xl font-semibold text-text-primary">
              {t("fulfillment")}
            </p>
            <div className="flex flex-wrap gap-2.5">
              <SelectChip
                label={t("pickup")}
                selected={fulfillmentMethod === "pickup"}
                onSelect={() => {
                  setFulfillmentMethod("pickup");
                  setDeliveryAreaId(null);
                }}
              />
              <SelectChip
                label={t("delivery")}
                selected={fulfillmentMethod === "delivery"}
                onSelect={() => setFulfillmentMethod("delivery")}
              />
            </div>
            {fulfillmentMethod === "delivery" && (
              <>
                <p className="text-[13px] font-medium text-text-primary">
                  {t("deliveryArea")}
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {deliveryAreas.map((area) => (
                    <SelectChip
                      key={area.id}
                      label={area.name[locale]}
                      selected={deliveryAreaId === area.id}
                      onSelect={() => setDeliveryAreaId(area.id)}
                    />
                  ))}
                </div>
              </>
            )}
            <p className="text-[13px] font-medium text-text-primary">
              {t("deliveryDate")}
            </p>
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => setDateOpen((v) => !v)}
                className="flex w-full items-center justify-between rounded-2xl border-[1.5px] border-border-default bg-bg-surface p-3 text-[15px] text-text-primary"
              >
                <span>{fulfillmentDate ?? "—"}</span>
                <Calendar className="size-[14px] text-text-secondary" />
              </button>
              {dateOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDateOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute end-0 top-full z-50 mt-1 w-[300px]">
                    <DatePicker
                      locale={locale}
                      value={fulfillmentDate}
                      blockedDates={blockedDates}
                      onChange={(iso) => {
                        setFulfillmentDate(iso);
                        setDateOpen(false);
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3.5 rounded-3xl border border-border-default bg-bg-surface p-6">
            <p className="text-xl font-semibold text-text-primary">
              {t("orderSummary")}
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">
                {t("itemsCount", { count: items.length })}
              </span>
              <span className="font-medium text-text-primary">
                {tCommon("egpPrice", { amount: subtotal })}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">{t("deliveryFee")}</span>
              <span className="font-medium text-text-primary">
                {tCommon("egpPrice", { amount: deliveryFee })}
              </span>
            </div>
            <div className="h-px w-full bg-border-default" />
            <div className="flex items-center justify-between font-semibold text-text-primary">
              <span className="text-base">{t("total")}</span>
              <span className="text-lg">
                {tCommon("egpPrice", { amount: total })}
              </span>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <Button
              type="button"
              variant="brand-primary"
              size="xl"
              disabled={submitting}
              onClick={handleCreate}
              className="w-full justify-center"
            >
              {t("createOrder")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
