"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCartStore } from "@/store/cart";
import { SelectChip } from "@/components/storefront/SelectChip";
import { ColorSwatch } from "@/components/storefront/ColorSwatch";
import { TopperCard } from "@/components/storefront/TopperCard";
import { InputField } from "@/components/storefront/InputField";
import { QuantityStepper } from "@/components/storefront/QuantityStepper";
import { SizeQuantityInput } from "@/components/storefront/SizeQuantityInput";
import { Button } from "@/components/ui/button";
import type { Cake, Color, Flavor, Shape, Size, Tier, Topper } from "@/types/catalog";
import type { CartItem } from "@/types/cart";

type SizeWithTiers = Size & { tierIds: string[] };

export function CakeCustomizer({
  locale,
  cake,
  categorySlug,
  sizes,
  tiers,
  flavors,
  colors,
  shapes,
  toppers,
  showToppers,
  allowFakeCake,
}: {
  locale: "en" | "ar";
  cake: Cake;
  categorySlug: string;
  sizes: SizeWithTiers[];
  tiers: Tier[];
  flavors: Flavor[];
  colors: Color[];
  shapes: Shape[];
  toppers: Topper[];
  showToppers: boolean;
  allowFakeCake: boolean;
}) {
  const t = useTranslations("CakeDetail");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);

  const sizeUnit = sizes[0]?.unit ?? "servings";
  const fakeShapes = useMemo(() => shapes.filter((s) => s.fake_eligible), [shapes]);

  const [cakeType, setCakeType] = useState<"normal" | "fake">("normal");

  // Normal cake fields
  const [sizeId, setSizeId] = useState<string | null>(null);
  const [tierId, setTierId] = useState<string | null>(null);
  const [flavorId, setFlavorId] = useState<string | null>(null);
  const [fiftyFifty, setFiftyFifty] = useState(false);
  const [secondFlavorId, setSecondFlavorId] = useState<string | null>(null);
  const [shapeId, setShapeId] = useState<string | null>(null);

  // Fake cake fields
  const [fakeSizeCm, setFakeSizeCm] = useState("");
  const [fakeShapeId, setFakeShapeId] = useState<string | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);

  // Shared fields
  const [colorIds, setColorIds] = useState<string[]>([]);
  const [colorArrangementNotes, setColorArrangementNotes] = useState("");
  const [topperId, setTopperId] = useState<string | null>(null);
  const [topperColorId, setTopperColorId] = useState<string | null>(null);
  const [textOnCake, setTextOnCake] = useState("");
  const [textOnBoard, setTextOnBoard] = useState("");
  const [notes, setNotes] = useState("");
  const [quantity, setQuantity] = useState(1);

  const selectedSize = sizes.find((s) => s.id === sizeId);
  const availableTiers = selectedSize
    ? tiers.filter((tier) => selectedSize.tierIds.includes(tier.id))
    : [];
  const selectedTier = availableTiers.find((tier) => tier.id === tierId);
  const selectedFlavor = flavors.find((f) => f.id === flavorId);
  const selectedSecondFlavor = flavors.find((f) => f.id === secondFlavorId);
  const selectedTopper = toppers.find((tp) => tp.id === topperId);
  const selectedColors = colors.filter((c) => colorIds.includes(c.id));
  const selectedFakeShape = fakeShapes.find((s) => s.id === fakeShapeId);

  function switchCakeType(next: "normal" | "fake") {
    setCakeType(next);
    setSizeId(null);
    setTierId(null);
    setFlavorId(null);
    setFiftyFifty(false);
    setSecondFlavorId(null);
    setShapeId(null);
    setFakeSizeCm("");
    setFakeShapeId(null);
    setReferenceImageUrl(null);
    setColorIds([]);
    setColorArrangementNotes("");
    setTopperId(null);
    setTopperColorId(null);
  }

  function toggleColor(colorId: string) {
    setColorIds((prev) =>
      prev.includes(colorId) ? prev.filter((id) => id !== colorId) : [...prev, colorId],
    );
  }

  const flavorModifier = selectedFlavor
    ? fiftyFifty && selectedSecondFlavor
      ? (selectedFlavor.price_modifier + selectedSecondFlavor.price_modifier) / 2
      : selectedFlavor.price_modifier
    : 0;

  const priceModifiersTotal =
    cakeType === "normal"
      ? (selectedSize?.price_modifier ?? 0) +
        (selectedTier?.price_modifier ?? 0) +
        flavorModifier +
        (selectedTopper?.price_modifier ?? 0)
      : selectedTopper?.price_modifier ?? 0;

  const unitTotal = cake.base_price + priceModifiersTotal;
  const lineEstimate = unitTotal * quantity;
  const priceLabel = unitTotal > 0 ? `${unitTotal} ${tCommon("egp")}` : tCommon("priceOnRequest");

  const fakeSizeValid = Number(fakeSizeCm) > 0;
  const [submitted, setSubmitted] = useState(false);

  const errors = {
    size: cakeType === "normal" && !sizeId,
    tier: cakeType === "normal" && availableTiers.length > 0 && !tierId,
    flavor: cakeType === "normal" && !flavorId,
    secondFlavor:
      cakeType === "normal" && fiftyFifty && (!secondFlavorId || secondFlavorId === flavorId),
    color: colorIds.length === 0,
    colorArrangement: colorIds.length > 1 && !colorArrangementNotes.trim(),
    shape: cakeType === "normal" && !shapeId,
    fakeSize: cakeType === "fake" && !fakeSizeValid,
    fakeShape: cakeType === "fake" && !fakeShapeId,
  };

  const isValid = !Object.values(errors).some(Boolean);

  const fieldOrder: (keyof typeof errors)[] =
    cakeType === "normal"
      ? ["size", "tier", "flavor", "secondFlavor", "color", "colorArrangement", "shape"]
      : ["fakeSize", "color", "colorArrangement", "fakeShape"];

  function handleAddToCart() {
    if (!isValid) {
      setSubmitted(true);
      const firstErrorKey = fieldOrder.find((key) => errors[key]);
      if (firstErrorKey) {
        document
          .getElementById(`section-${firstErrorKey}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    const item: CartItem = {
      id: crypto.randomUUID(),
      cakeId: cake.id,
      cakeName: cake.name,
      cakeImage: cake.primary_image_url,
      categorySlug,
      isFake: cakeType === "fake",
      sizeId: cakeType === "normal" ? sizeId : null,
      sizeLabel:
        cakeType === "normal" && selectedSize
          ? `${selectedSize.min_qty}${selectedSize.max_qty !== selectedSize.min_qty ? `>${selectedSize.max_qty}` : ""}`
          : null,
      tierId: cakeType === "normal" ? tierId : null,
      tierCount: cakeType === "normal" ? (selectedTier?.tier_count ?? null) : null,
      isFiftyFifty: cakeType === "normal" && fiftyFifty,
      flavorIds:
        cakeType === "normal"
          ? [flavorId, ...(fiftyFifty && secondFlavorId ? [secondFlavorId] : [])].filter(
              (id): id is string => Boolean(id),
            )
          : [],
      flavorNames:
        cakeType === "normal"
          ? [selectedFlavor?.name[locale], fiftyFifty ? selectedSecondFlavor?.name[locale] : null].filter(
              (n): n is string => Boolean(n),
            )
          : [],
      fakeSizeCm: cakeType === "fake" ? Number(fakeSizeCm) : null,
      fakeShapeId: cakeType === "fake" ? fakeShapeId : null,
      fakeShapeName: cakeType === "fake" ? (selectedFakeShape?.name[locale] ?? null) : null,
      referenceImageUrl: cakeType === "fake" ? referenceImageUrl : null,
      shapeId: cakeType === "normal" ? shapeId : null,
      shapeName: cakeType === "normal" ? (shapes.find((s) => s.id === shapeId)?.name[locale] ?? null) : null,
      colorIds,
      colorNames: selectedColors.map((c) => c.name[locale]),
      colorArrangementNotes: colorIds.length > 1 ? colorArrangementNotes.trim() || null : null,
      topperId: showToppers ? topperId : null,
      topperName: showToppers ? (selectedTopper?.name[locale] ?? null) : null,
      topperColorId: showToppers ? topperColorId : null,
      textOnCake,
      textOnBoard,
      notes,
      quantity,
      unitBasePrice: cake.base_price,
      priceModifiersTotal,
      lineEstimate,
    };

    addItem(item);
    router.push("/cart");
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {allowFakeCake && (
        <Section label={t("cakeType")}>
          <div className="flex flex-wrap gap-2.5">
            <SelectChip
              label={t("normalCake")}
              selected={cakeType === "normal"}
              onSelect={() => switchCakeType("normal")}
            />
            <SelectChip
              label={t("fakeCake")}
              selected={cakeType === "fake"}
              onSelect={() => switchCakeType("fake")}
            />
          </div>
        </Section>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-xl font-semibold text-text-primary">
          {unitTotal > 0 ? t("priceFrom", { price: priceLabel }) : priceLabel}
        </p>
        {cake.description && <p className="text-[15px] text-text-secondary">{cake.description[locale]}</p>}
      </div>

      {cakeType === "normal" ? (
        <>
          <Section
            id="section-size"
            label={t(sizeUnit === "quantity" ? "quantitySection" : "sizeSection")}
            error={submitted && errors.size ? t("errorSizeRequired") : undefined}
          >
            {sizeUnit === "quantity" ? (
              <SizeQuantityInput
                sizes={sizes}
                selectedSizeId={sizeId}
                onSelect={(id) => setSizeId(id)}
                mustBeLabel={(a, b) => t("quantityMustBe", { a, b })}
                minimumLabel={(min) => t("quantityMinimum", { min })}
              />
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {sizes.map((size) => (
                  <SelectChip
                    key={size.id}
                    label={size.max_qty !== size.min_qty ? `${size.min_qty}>${size.max_qty}` : String(size.min_qty)}
                    selected={sizeId === size.id}
                    onSelect={() => {
                      setSizeId(size.id);
                      const singleTier = tiers.find(
                        (tier) => size.tierIds.includes(tier.id) && tier.tier_count === 1,
                      );
                      setTierId(singleTier?.id ?? null);
                    }}
                  />
                ))}
              </div>
            )}
          </Section>

          {availableTiers.length > 0 && (
            <Section
              id="section-tier"
              label={t("tiers")}
              hint={t("tiersHint")}
              error={submitted && errors.tier ? t("errorTierRequired") : undefined}
            >
              <div className="flex flex-wrap gap-2.5">
                {availableTiers.map((tier) => (
                  <SelectChip
                    key={tier.id}
                    label={t("tierCount", { count: tier.tier_count })}
                    selected={tierId === tier.id}
                    onSelect={() => setTierId(tier.id)}
                  />
                ))}
              </div>
            </Section>
          )}

          <Section
            id="section-flavor"
            label={t("flavor")}
            error={submitted && errors.flavor ? t("errorFlavorRequired") : undefined}
          >
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2.5">
                {flavors.map((flavor) => (
                  <SelectChip
                    key={flavor.id}
                    label={flavor.name[locale]}
                    selected={flavorId === flavor.id}
                    onSelect={() => setFlavorId(flavor.id)}
                  />
                ))}
              </div>
              {availableTiers.length > 0 && (
                <>
                  <label className="flex items-center gap-2 text-sm text-text-primary">
                    <input
                      type="checkbox"
                      checked={fiftyFifty}
                      onChange={(e) => {
                        setFiftyFifty(e.target.checked);
                        if (!e.target.checked) setSecondFlavorId(null);
                      }}
                      className="size-[18px] accent-brand-primary"
                    />
                    {t("splitFlavor")}
                  </label>
                  {fiftyFifty && (
                    <div id="section-secondFlavor" className="flex scroll-mt-28 flex-col gap-2">
                      <div className="flex flex-wrap gap-2.5">
                        {flavors
                          .filter((f) => f.id !== flavorId)
                          .map((flavor) => (
                            <SelectChip
                              key={flavor.id}
                              label={flavor.name[locale]}
                              selected={secondFlavorId === flavor.id}
                              onSelect={() => setSecondFlavorId(flavor.id)}
                            />
                          ))}
                      </div>
                      {submitted && errors.secondFlavor && (
                        <p className="text-xs text-red-600">{t("errorSecondFlavorRequired")}</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </Section>
        </>
      ) : (
        <InputField
          id="section-fakeSize"
          label={t("sizeCm")}
          helperText={t("sizeCmHelper")}
          placeholder={t("sizeCmPlaceholder")}
          value={fakeSizeCm}
          onChange={setFakeSizeCm}
          error={submitted && errors.fakeSize ? t("errorFakeSizeRequired") : undefined}
        />
      )}

      <Section
        id="section-color"
        label={t("icingColor")}
        error={submitted && errors.color ? t("errorColorRequired") : undefined}
      >
        <div className="flex flex-wrap gap-3">
          {colors.map((color) => (
            <ColorSwatch
              key={color.id}
              hex={color.hex_code}
              label={color.name[locale]}
              selected={colorIds.includes(color.id)}
              onSelect={() => toggleColor(color.id)}
            />
          ))}
        </div>
        {colorIds.length > 1 && (
          <div id="section-colorArrangement" className="flex scroll-mt-28 flex-col gap-2">
            <p className="text-xs text-text-secondary">{t("multiColorHint")}</p>
            <InputField
              label={t("colorArrangement")}
              placeholder={t("colorArrangementPlaceholder")}
              value={colorArrangementNotes}
              onChange={setColorArrangementNotes}
              error={submitted && errors.colorArrangement ? t("errorColorArrangementRequired") : undefined}
              multiline
            />
          </div>
        )}
      </Section>

      <Section
        id={cakeType === "normal" ? "section-shape" : "section-fakeShape"}
        label={t("shape")}
        error={
          submitted && (cakeType === "normal" ? errors.shape : errors.fakeShape)
            ? t("errorShapeRequired")
            : undefined
        }
      >
        <div className="flex flex-wrap gap-3">
          {(cakeType === "normal" ? shapes : fakeShapes).map((shape) => (
            <SelectChip
              key={shape.id}
              label={shape.name[locale]}
              selected={(cakeType === "normal" ? shapeId : fakeShapeId) === shape.id}
              onSelect={() =>
                cakeType === "normal" ? setShapeId(shape.id) : setFakeShapeId(shape.id)
              }
            />
          ))}
        </div>
      </Section>

      <Section label={t("referenceImage")}>
        {referenceImageUrl ? (
          <div className="relative flex h-[140px] w-[200px] items-center justify-center overflow-hidden rounded-2xl border-[1.5px] border-border-default bg-bg-page">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob: object URL, next/image can't render it */}
            <img src={referenceImageUrl} alt="" className="size-full object-contain" />
            <button
              type="button"
              onClick={() => setReferenceImageUrl(null)}
              aria-label={t("removeReferenceImage")}
              className="absolute end-2 top-2 flex size-6 items-center justify-center rounded-full bg-brand-primary text-xs font-bold text-text-on-brand"
            >
              ×
            </button>
          </div>
        ) : (
          <label className="flex h-[140px] w-[200px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-border-default bg-bg-page text-center">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setReferenceImageUrl(URL.createObjectURL(file));
              }}
            />
            <p className="w-40 text-xs text-text-secondary">{t("uploadPrompt")}</p>
          </label>
        )}
      </Section>

      {showToppers && (
        <Section label={t("topper")}>
          <div className="flex flex-wrap gap-3">
            <TopperCard
              label={t("none")}
              selected={topperId === null}
              onSelect={() => {
                setTopperId(null);
                setTopperColorId(null);
              }}
            />
            {toppers.map((topper) => (
              <TopperCard
                key={topper.id}
                label={topper.name[locale]}
                selected={topperId === topper.id}
                onSelect={() => setTopperId(topper.id)}
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
                  selected={topperColorId === color.id}
                  onSelect={() => setTopperColorId(color.id)}
                />
              ))}
            </div>
          )}
        </Section>
      )}

      <InputField
        label={t("textOnCake")}
        helperText={t("textOnCakeHelper")}
        placeholder={t("textOnCakePlaceholder")}
        value={textOnCake}
        onChange={setTextOnCake}
      />
      <InputField
        label={t("textOnBoard")}
        helperText={t("textOnBoardHelper")}
        placeholder={t("textOnBoardPlaceholder")}
        value={textOnBoard}
        onChange={setTextOnBoard}
      />
      <InputField
        label={t("notes")}
        placeholder={t("notesPlaceholder")}
        value={notes}
        onChange={setNotes}
        multiline
      />

      <div className="flex items-center gap-4 pt-2">
        <QuantityStepper quantity={quantity} onChange={setQuantity} />
        <Button
          variant="brand-primary"
          size="xl"
          className="flex-1 justify-center"
          onClick={handleAddToCart}
        >
          {unitTotal > 0
            ? t("addToCartWithPrice", { price: `${lineEstimate} ${tCommon("egp")}` })
            : t("addToCart")}
        </Button>
      </div>
    </div>
  );
}

function Section({
  id,
  label,
  hint,
  error,
  children,
}: {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="flex w-full scroll-mt-28 flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <p className="text-[15px] font-semibold text-text-primary">{label}</p>
        {hint && <p className="text-xs text-text-secondary">{hint}</p>}
      </div>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
