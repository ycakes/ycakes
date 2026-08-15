"use client";

import Image from "next/image";
import { Pencil } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { QuantityStepper } from "@/components/storefront/QuantityStepper";
import { useRouter } from "@/i18n/navigation";
import { setEditCartItem } from "@/lib/cart/editItem";
import type { CartItem } from "@/types/cart";

export function CartItemRow({
  item,
  onRemove,
  onQuantityChange,
}: {
  item: CartItem;
  onRemove: () => void;
  onQuantityChange: (quantity: number) => void;
}) {
  const t = useTranslations("Cart");
  const tCommon = useTranslations("Common");
  const locale = useLocale() as "en" | "ar";
  const router = useRouter();

  function handleEdit() {
    setEditCartItem(item);
    router.push(`/cakes/${item.cakeId}`);
  }

  const chips = [
    item.isFake ? (item.fakeSizeCm ? t("cmChip", { cm: item.fakeSizeCm }) : null) : item.sizeLabel,
    item.tierCount ? t("tierChip", { count: item.tierCount }) : null,
    ...item.flavorNames,
    ...item.colorNames,
    item.isFake ? item.fakeShapeName : item.shapeName,
    item.topperName,
  ].filter((chip): chip is string => Boolean(chip));

  return (
    <div className="flex w-full items-start gap-4 rounded-3xl bg-bg-surface p-4 drop-shadow-[0px_1px_1.5px_rgba(43,30,25,0.08)]">
      <div className="relative size-28 shrink-0 overflow-hidden rounded-2xl bg-bg-surface-alt">
        {item.cakeImage && (
          <Image src={item.cakeImage} alt={item.cakeName[locale]} fill sizes="112px" className="object-contain" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex w-full items-start justify-between gap-2">
          <p className="flex-1 text-[17px] font-semibold text-text-primary">{item.cakeName[locale]}</p>
          <button
            type="button"
            onClick={handleEdit}
            aria-label={t("edit")}
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-text-secondary hover:text-text-primary"
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label={t("remove")}
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-text-secondary hover:text-text-primary"
          >
            ×
          </button>
        </div>
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip, i) => (
              <span
                key={i}
                className="rounded-full bg-bg-surface-alt px-2.5 py-1 text-xs text-text-secondary"
              >
                {chip}
              </span>
            ))}
          </div>
        )}
        <div className="flex w-full items-center justify-between pt-1">
          <QuantityStepper quantity={item.quantity} onChange={onQuantityChange} />
          <p className="text-xl font-semibold text-text-primary">
            {item.lineEstimate > 0 ? `${item.lineEstimate} ${tCommon("egp")}` : tCommon("priceOnRequest")}
          </p>
        </div>
      </div>
    </div>
  );
}
