"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { CakeItemFields } from "@/components/admin/orders/CakeItemFields";
import { orderItemToFieldsValue, buildUpdateOrderItemParams } from "@/lib/admin/orderItemFields";
import type { Color, Flavor, Shape, Size, Tier, Topper } from "@/types/catalog";
import type { AdminOrderItemDetail } from "@/types/adminOrderDetail";
import type { CakeItemFieldsValue } from "@/types/adminCakeItem";

type SizeWithTiers = Size & { tierIds: string[] };

// Admin (canEdit) view: expanding a line item goes straight into the
// editable form — no separate "Edit" click first. Earlier revisions had a
// two-step expand-then-edit flow that repeatedly confused the owner into
// thinking the fields weren't editable at all, since the default expanded
// state was read-only. Accountants (canEdit=false) still only ever see the
// read-only detail view, since they have no write access to order_items.
export function OrderLineItem({
  item,
  locale,
  canEdit,
  catalog,
}: {
  item: AdminOrderItemDetail;
  locale: "en" | "ar";
  canEdit: boolean;
  catalog: {
    sizes: SizeWithTiers[];
    tiers: Tier[];
    flavors: Flavor[];
    colors: Color[];
    shapes: Shape[];
    toppers: Topper[];
    showToppers: boolean;
  };
}) {
  const t = useTranslations("CakeDetail");
  const tOrders = useTranslations("Admin.orders");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<CakeItemFieldsValue | null>(null);
  const [priceDraft, setPriceDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const flavorNames = [...item.order_item_flavors].sort((a, b) => a.position - b.position).map((f) => f.flavors.name[locale]);
  const colorNames = [...item.order_item_colors].sort((a, b) => a.sort_order - b.sort_order).map((c) => c.colors.name[locale]);
  const shapeName = item.is_fake ? item.fake_shape?.name[locale] : item.shape?.name[locale];

  const summaryParts: string[] = [];
  if (item.is_fake) {
    if (item.fake_size_cm != null) summaryParts.push(`${item.fake_size_cm} cm`);
  } else if (item.sizes) {
    summaryParts.push(item.sizes.max_qty !== item.sizes.min_qty ? `${item.sizes.min_qty}>${item.sizes.max_qty}` : String(item.sizes.min_qty));
  }
  if (item.tiers) summaryParts.push(t("tierCount", { count: item.tiers.tier_count }));
  if (flavorNames.length > 0) summaryParts.push(flavorNames.join(", "));
  if (colorNames.length > 0) summaryParts.push(colorNames.join(", "));
  if (shapeName) summaryParts.push(shapeName);
  summaryParts.push(t("qty", { count: item.quantity }));

  function toggleExpanded() {
    setExpanded((prev) => {
      const next = !prev;
      if (next && canEdit) {
        setDraft(orderItemToFieldsValue(item));
        setPriceDraft(String(item.final_price ?? item.line_estimate));
        setError(null);
        setSaved(false);
      }
      return next;
    });
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc(
      "update_order_item_customization",
      buildUpdateOrderItemParams(item.id, draft, priceDraft),
    );
    setSaving(false);
    if (rpcError) {
      setError(tOrders("itemSaveFailed"));
      return;
    }
    setSaved(true);
    router.refresh();
  }

  useEffect(() => {
    if (!saved) return;
    const timeout = setTimeout(() => setSaved(false), 4000);
    return () => clearTimeout(timeout);
  }, [saved]);

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full items-center gap-4">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-bg-surface-alt">
          {item.cakes?.primary_image_url && (
            <Image src={item.cakes.primary_image_url} alt="" fill sizes="64px" className="object-cover" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-[15px] font-semibold text-text-primary">{item.cakes?.name[locale] ?? ""}</p>
          <p className="truncate text-[13px] text-text-secondary">{summaryParts.join(" • ")}</p>
        </div>
        <p className="shrink-0 text-[15px] font-semibold text-text-primary">
          {tCommon("egpPrice", { amount: item.final_price ?? item.line_estimate })}
        </p>
        <div className="flex shrink-0 items-center gap-3">
          {saved && <span className="text-[13px] font-semibold text-status-completed">{tOrders("itemSaved")}</span>}
          <button
            type="button"
            onClick={toggleExpanded}
            aria-label={expanded ? tOrders("collapse") : canEdit ? tOrders("edit") : tOrders("expand")}
            className="flex items-center gap-1 text-[13px] font-semibold text-brand-primary"
          >
            {!expanded && canEdit && <span>{tOrders("edit")}</span>}
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="flex w-full flex-col gap-4 rounded-2xl bg-bg-subtle p-4">
          {canEdit && draft ? (
            <>
              <label className="flex max-w-[220px] flex-col gap-1">
                <span className="text-[13px] font-semibold text-text-primary">{tOrders("itemPrice")}</span>
                <input
                  type="number"
                  min={0}
                  value={priceDraft}
                  onChange={(e) => setPriceDraft(e.target.value)}
                  className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm text-text-primary"
                />
              </label>
              <CakeItemFields
                locale={locale}
                value={draft}
                onChange={(patch) => setDraft((prev) => (prev ? { ...prev, ...patch } : prev))}
                sizes={catalog.sizes}
                tiers={catalog.tiers}
                flavors={catalog.flavors}
                colors={catalog.colors}
                shapes={catalog.shapes}
                toppers={catalog.toppers}
                showToppers={catalog.showToppers}
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2">
                <Button type="button" variant="brand-primary" size="sm" disabled={saving} onClick={save} className="flex-1 justify-center">
                  {tOrders("save")}
                </Button>
                <Button
                  type="button"
                  variant="brand-ghost"
                  size="sm"
                  disabled={saving}
                  onClick={() => setExpanded(false)}
                  className="flex-1 justify-center bg-bg-surface"
                >
                  {tOrders("cancel")}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
              <div className="flex shrink-0 flex-col gap-1.5">
                <p className="text-[10px] font-semibold tracking-[0.4px] text-text-secondary uppercase">{t("referenceImage")}</p>
                <div className="relative size-[120px] overflow-hidden rounded-xl bg-bg-surface-alt">
                  {item.reference_image_url && (
                    <Image src={item.reference_image_url} alt="" fill sizes="120px" className="object-contain" />
                  )}
                </div>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                {!item.is_fake && item.sizes && (
                  <DetailRow
                    label={tOrders("sizeTier")}
                    value={`${item.sizes.max_qty !== item.sizes.min_qty ? `${item.sizes.min_qty}>${item.sizes.max_qty}` : item.sizes.min_qty}${item.tiers ? ` • ${t("tierCount", { count: item.tiers.tier_count })}` : ""}`}
                  />
                )}
                {item.is_fake && item.fake_size_cm != null && <DetailRow label={tOrders("sizeTier")} value={`${item.fake_size_cm} cm`} />}
                {flavorNames.length > 0 && <DetailRow label={tOrders("flavors")} value={flavorNames.join(", ")} />}
                <DetailRow label={tOrders("icingColors")} value={colorNames.length > 0 ? colorNames.join(", ") : "—"} />
                <DetailRow label={t("colorArrangement")} value={item.color_arrangement_notes || "—"} />
                <DetailRow label={t("shape")} value={shapeName || "—"} />
                <DetailRow
                  label={t("topper")}
                  value={item.topper ? `${item.topper.name[locale]}${item.topper_color ? ` (${item.topper_color.name[locale]})` : ""}` : "—"}
                />
                <DetailRow label={t("textOnCake")} value={item.text_on_cake ? `"${item.text_on_cake}"` : "—"} />
                <DetailRow label={t("textOnBoard")} value={item.text_on_board ? `"${item.text_on_board}"` : "—"} />
                <DetailRow label={t("notes")} value={item.notes || "—"} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex w-full flex-col gap-0.5 sm:flex-row sm:gap-2">
      <p className="w-[110px] shrink-0 text-[12px] font-medium text-text-secondary">{label}</p>
      <p className="min-w-0 flex-1 text-[13px] text-text-primary">{value}</p>
    </div>
  );
}
