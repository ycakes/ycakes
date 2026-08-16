"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { CakeSelect, type SelectableCake } from "@/components/admin/orders/CakeSelect";
import { CakeItemFields } from "@/components/admin/orders/CakeItemFields";
import { emptyFieldsValue, type ManualOrderItem } from "@/lib/admin/manualOrder";
import type { Color, Flavor, Shape, Size, Tier, Topper } from "@/types/catalog";

type SizeWithTiers = Size & { tierIds: string[] };
type CatalogContext = {
  sizes: SizeWithTiers[];
  tiers: Tier[];
  flavors: Flavor[];
  colors: Color[];
  shapes: Shape[];
  toppers: Topper[];
  showToppers: boolean;
};

export function NewOrderItemRow({
  item,
  locale,
  cakes,
  catalogByCategoryId,
  canRemove,
  onChange,
  onRemove,
}: {
  item: ManualOrderItem;
  locale: "en" | "ar";
  cakes: SelectableCake[];
  catalogByCategoryId: Record<string, CatalogContext>;
  canRemove: boolean;
  onChange: (patch: Partial<ManualOrderItem>) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("Admin.orders");
  const catalog = item.categoryId ? catalogByCategoryId[item.categoryId] : undefined;
  const [blockedMessage, setBlockedMessage] = useState(false);

  // Once another row makes removal possible again, drop the message rather
  // than leaving a stale warning attached to this row indefinitely.
  if (blockedMessage && canRemove) setBlockedMessage(false);

  function handleRemoveClick() {
    if (!canRemove) {
      setBlockedMessage(true);
      return;
    }
    onRemove();
  }

  return (
    <div className="flex w-full flex-col gap-2.5 rounded-2xl bg-bg-subtle p-4">
      <div className="flex w-full items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-[12px] font-medium text-text-secondary">{t("cake")}</p>
          <CakeSelect
            locale={locale}
            cakes={cakes}
            value={{ cakeId: item.cakeId, label: item.cakeName }}
            onSelect={(cakeId, label, categoryId) =>
              onChange({ cakeId, cakeName: label, categoryId, customizing: false, fields: emptyFieldsValue() })
            }
          />
        </div>
        <div className="flex w-[70px] shrink-0 flex-col gap-1">
          <p className="text-[12px] font-medium text-text-secondary">{t("qtyLabel")}</p>
          <input
            type="number"
            min={1}
            value={item.quantity}
            onChange={(e) => onChange({ quantity: Math.max(1, Number(e.target.value) || 1) })}
            className="w-full rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm text-text-primary focus:outline-none"
          />
        </div>
        <div className="flex w-[110px] shrink-0 flex-col gap-1">
          <p className="text-[12px] font-medium text-text-secondary">{t("price")}</p>
          <input
            type="number"
            min={0}
            value={item.price}
            onChange={(e) => onChange({ price: e.target.value })}
            className="w-full rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm text-text-primary focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={handleRemoveClick}
          aria-label={t("remove")}
          className="mt-6 flex shrink-0 items-center gap-1.5 rounded-full border-[1.5px] border-status-cancelled/30 bg-bg-surface px-3 py-2.5 text-[13px] font-semibold text-status-cancelled transition-colors hover:border-status-cancelled hover:bg-status-cancelled/10"
        >
          <Trash2 className="size-[14px]" />
          {t("remove")}
        </button>
      </div>
      {blockedMessage && (
        <p className="text-xs text-status-cancelled">{t("cannotRemoveLastItem")}</p>
      )}

      {item.cakeId === null ? (
        <textarea
          value={item.customNotes}
          onChange={(e) => onChange({ customNotes: e.target.value })}
          placeholder={t("descriptionPlaceholder")}
          rows={2}
          className="w-full resize-none rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none"
        />
      ) : item.customizing ? (
        <div className="flex flex-col gap-4 rounded-2xl bg-bg-surface p-4">
          {catalog && (
            <CakeItemFields
              locale={locale}
              value={item.fields}
              onChange={(patch) => onChange({ fields: { ...item.fields, ...patch } })}
              sizes={catalog.sizes}
              tiers={catalog.tiers}
              flavors={catalog.flavors}
              colors={catalog.colors}
              shapes={catalog.shapes}
              toppers={catalog.toppers}
              showToppers={catalog.showToppers}
            />
          )}
          <button type="button" onClick={() => onChange({ customizing: false })} className="self-start text-[13px] font-semibold text-brand-primary">
            {t("collapse")}
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => onChange({ customizing: true })} className="text-start text-[12px] font-semibold text-brand-primary">
          {t("addCustomizationDetails")}
        </button>
      )}
    </div>
  );
}
