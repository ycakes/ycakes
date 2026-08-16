"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { SelectChip } from "@/components/storefront/SelectChip";
import { ColorSwatch } from "@/components/storefront/ColorSwatch";
import { TopperCard } from "@/components/storefront/TopperCard";
import { InputField } from "@/components/storefront/InputField";
import { SizeQuantityInput } from "@/components/storefront/SizeQuantityInput";
import { uploadReferenceImage, ReferenceImageUploadError } from "@/lib/customer/cloudinaryUpload";
import type { Color, Flavor, Shape, Size, Tier, Topper } from "@/types/catalog";
import type { CakeItemFieldsValue } from "@/types/adminCakeItem";

type SizeWithTiers = Size & { tierIds: string[] };

// Admin version of CakeCustomizer's field set (Order Detail line-item edit,
// New Order's customization panel) — same components/branching logic
// (normal vs Fake Cake), driven by a fully controlled value/onChange
// instead of internal state + cart submission. No Cake Type toggle here:
// whichever type the item already is stays fixed, matching the Figma
// annotation's intent (reuse the same field-rendering logic per type, not
// let an admin convert a real order into a display one mid-edit).
export function CakeItemFields({
  locale,
  value,
  onChange,
  sizes,
  tiers,
  flavors,
  colors,
  shapes,
  toppers,
  showToppers,
}: {
  locale: "en" | "ar";
  value: CakeItemFieldsValue;
  onChange: (patch: Partial<CakeItemFieldsValue>) => void;
  sizes: SizeWithTiers[];
  tiers: Tier[];
  flavors: Flavor[];
  colors: Color[];
  shapes: Shape[];
  toppers: Topper[];
  showToppers: boolean;
}) {
  const t = useTranslations("CakeDetail");

  const sizeUnit = sizes[0]?.unit ?? "servings";
  const fakeShapes = shapes.filter((s) => s.fake_eligible);
  const selectedSize = sizes.find((s) => s.id === value.sizeId);
  const availableTiers = selectedSize ? tiers.filter((tier) => selectedSize.tierIds.includes(tier.id)) : [];
  const selectedTopper = toppers.find((tp) => tp.id === value.topperId);

  function toggleColor(colorId: string) {
    onChange({
      colorIds: value.colorIds.includes(colorId)
        ? value.colorIds.filter((id) => id !== colorId)
        : [...value.colorIds, colorId],
    });
  }

  return (
    <div className="flex w-full flex-col gap-5">
      {value.isFake ? (
        <InputField
          label={t("sizeCm")}
          helperText={t("sizeCmHelper")}
          placeholder={t("sizeCmPlaceholder")}
          value={value.fakeSizeCm}
          onChange={(v) => onChange({ fakeSizeCm: v })}
        />
      ) : (
        <>
          <Field label={t(sizeUnit === "quantity" ? "quantitySection" : "sizeSection")}>
            {sizeUnit === "quantity" ? (
              <SizeQuantityInput
                sizes={sizes}
                selectedSizeId={value.sizeId}
                onSelect={(id) => onChange({ sizeId: id })}
                mustBeLabel={(a, b) => t("quantityMustBe", { a, b })}
                minimumLabel={(min) => t("quantityMinimum", { min })}
              />
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {sizes.map((size) => (
                  <SelectChip
                    key={size.id}
                    label={size.max_qty !== size.min_qty ? `${size.min_qty}>${size.max_qty}` : String(size.min_qty)}
                    selected={value.sizeId === size.id}
                    onSelect={() => {
                      const singleTier = tiers.find((tier) => size.tierIds.includes(tier.id) && tier.tier_count === 1);
                      onChange({ sizeId: size.id, tierId: singleTier?.id ?? null });
                    }}
                  />
                ))}
              </div>
            )}
          </Field>

          {availableTiers.length > 0 && (
            <Field label={t("tiers")} hint={t("tiersHint")}>
              <div className="flex flex-wrap gap-2.5">
                {availableTiers.map((tier) => (
                  <SelectChip
                    key={tier.id}
                    label={t("tierCount", { count: tier.tier_count })}
                    selected={value.tierId === tier.id}
                    onSelect={() => onChange({ tierId: tier.id })}
                  />
                ))}
              </div>
            </Field>
          )}

          <Field label={t("flavor")}>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2.5">
                {flavors.map((flavor) => (
                  <SelectChip
                    key={flavor.id}
                    label={flavor.name[locale]}
                    selected={value.flavorId === flavor.id}
                    onSelect={() => onChange({ flavorId: flavor.id })}
                  />
                ))}
              </div>
              {availableTiers.length > 0 && (
                <>
                  <label className="flex items-center gap-2 text-sm text-text-primary">
                    <input
                      type="checkbox"
                      checked={value.fiftyFifty}
                      onChange={(e) => onChange({ fiftyFifty: e.target.checked, secondFlavorId: e.target.checked ? value.secondFlavorId : null })}
                      className="size-[18px] accent-brand-primary"
                    />
                    {t("splitFlavor")}
                  </label>
                  {value.fiftyFifty && (
                    <div className="flex flex-wrap gap-2.5">
                      {flavors
                        .filter((f) => f.id !== value.flavorId)
                        .map((flavor) => (
                          <SelectChip
                            key={flavor.id}
                            label={flavor.name[locale]}
                            selected={value.secondFlavorId === flavor.id}
                            onSelect={() => onChange({ secondFlavorId: flavor.id })}
                          />
                        ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </Field>
        </>
      )}

      <Field label={t("icingColor")}>
        <div className="flex flex-wrap gap-3">
          {colors.map((color) => (
            <ColorSwatch
              key={color.id}
              hex={color.hex_code}
              label={color.name[locale]}
              selected={value.colorIds.includes(color.id)}
              onSelect={() => toggleColor(color.id)}
            />
          ))}
        </div>
        {value.colorIds.length > 1 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-text-secondary">{t("multiColorHint")}</p>
            <InputField
              label={t("colorArrangement")}
              placeholder={t("colorArrangementPlaceholder")}
              value={value.colorArrangementNotes}
              onChange={(v) => onChange({ colorArrangementNotes: v })}
              multiline
            />
          </div>
        )}
      </Field>

      <Field label={t("shape")}>
        <div className="flex flex-wrap gap-3">
          {(value.isFake ? fakeShapes : shapes).map((shape) => (
            <SelectChip
              key={shape.id}
              label={shape.name[locale]}
              selected={(value.isFake ? value.fakeShapeId : value.shapeId) === shape.id}
              onSelect={() => (value.isFake ? onChange({ fakeShapeId: shape.id }) : onChange({ shapeId: shape.id }))}
            />
          ))}
        </div>
      </Field>

      <Field label={t("referenceImage")}>
        <ReferenceImageField
          url={value.referenceImageUrl}
          onChange={(url, publicId) => onChange({ referenceImageUrl: url, referenceImagePublicId: publicId })}
        />
      </Field>

      {showToppers && (
        <Field label={t("topper")}>
          <div className="flex flex-wrap gap-3">
            <TopperCard label={t("none")} selected={value.topperId === null} onSelect={() => onChange({ topperId: null, topperColorId: null })} />
            {toppers.map((topper) => (
              <TopperCard
                key={topper.id}
                label={topper.name[locale]}
                selected={value.topperId === topper.id}
                onSelect={() => onChange({ topperId: topper.id })}
                imageSrc={topper.image_url}
              />
            ))}
          </div>
          {selectedTopper?.has_color_variants && (
            <div className="mt-3 flex flex-wrap gap-3">
              {colors.map((color) => (
                <ColorSwatch
                  key={color.id}
                  hex={color.hex_code}
                  label={color.name[locale]}
                  selected={value.topperColorId === color.id}
                  onSelect={() => onChange({ topperColorId: color.id })}
                />
              ))}
            </div>
          )}
        </Field>
      )}

      <InputField label={t("textOnCake")} value={value.textOnCake} onChange={(v) => onChange({ textOnCake: v })} />
      <InputField label={t("textOnBoard")} value={value.textOnBoard} onChange={(v) => onChange({ textOnBoard: v })} />
      <InputField label={t("notes")} value={value.notes} onChange={(v) => onChange({ notes: v })} multiline />
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center gap-2">
        <p className="text-[13px] font-semibold text-text-primary">{label}</p>
        {hint && <p className="text-xs text-text-secondary">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function ReferenceImageField({
  url,
  onChange,
}: {
  url: string | null;
  onChange: (url: string | null, publicId: string | null) => void;
}) {
  const t = useTranslations("CakeDetail");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      {url ? (
        <div className="relative flex h-[120px] w-[160px] items-center justify-center overflow-hidden rounded-2xl border-[1.5px] border-border-default bg-bg-page">
          <Image src={url} alt="" fill sizes="160px" className="object-contain" />
          <button
            type="button"
            onClick={() => onChange(null, null)}
            aria-label={t("removeReferenceImage")}
            className="absolute end-2 top-2 flex size-6 items-center justify-center rounded-full bg-brand-primary text-xs font-bold text-text-on-brand"
          >
            ×
          </button>
        </div>
      ) : (
        <label className="flex h-[120px] w-[160px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-border-default bg-bg-surface text-center">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setError(null);
              setUploading(true);
              try {
                const { url: newUrl, publicId } = await uploadReferenceImage(file);
                onChange(newUrl, publicId);
              } catch (err) {
                const reason = err instanceof ReferenceImageUploadError ? err.reason : "uploadFailed";
                setError(
                  t(
                    reason === "invalidType"
                      ? "referenceImageInvalidType"
                      : reason === "tooLarge"
                        ? "referenceImageTooLarge"
                        : reason === "rateLimited"
                          ? "referenceImageRateLimited"
                          : "referenceImageUploadFailed",
                  ),
                );
              } finally {
                setUploading(false);
              }
            }}
          />
          <p className="w-36 text-xs text-text-secondary">{uploading ? t("uploadingReference") : t("uploadPrompt")}</p>
        </label>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
