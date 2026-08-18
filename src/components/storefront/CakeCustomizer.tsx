"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Dialog } from "@base-ui/react/dialog";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCartStore } from "@/store/cart";
import { SelectChip } from "@/components/storefront/SelectChip";
import { ColorSwatch } from "@/components/storefront/ColorSwatch";
import { TopperCard } from "@/components/storefront/TopperCard";
import { InputField } from "@/components/storefront/InputField";
import { QuantityStepper } from "@/components/storefront/QuantityStepper";
import { SizeQuantityInput } from "@/components/storefront/SizeQuantityInput";
import { Button } from "@/components/ui/button";
import { getEditCartItem, clearEditCartItem } from "@/lib/cart/editItem";
import { uploadReferenceImage, ReferenceImageUploadError } from "@/lib/customer/cloudinaryUpload";
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
  const [referenceImagePublicId, setReferenceImagePublicId] = useState<string | null>(null);
  const [referenceImageUploading, setReferenceImageUploading] = useState(false);
  const [referenceImageError, setReferenceImageError] = useState<string | null>(null);

  // Shared fields
  const [colorIds, setColorIds] = useState<string[]>([]);
  const [colorArrangementNotes, setColorArrangementNotes] = useState("");
  const [topperId, setTopperId] = useState<string | null>(null);
  const [topperColorId, setTopperColorId] = useState<string | null>(null);
  const [textOnCake, setTextOnCake] = useState("");
  const [textOnBoard, setTextOnBoard] = useState("");
  const [notes, setNotes] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [addedModalOpen, setAddedModalOpen] = useState(false);

  // Pre-fill from a cart item being edited (Cart's Edit button stashes it
  // in sessionStorage before navigating here — see src/lib/cart/editItem.ts).
  // Editing never touches the original cart row; it only pre-fills the form
  // so "Add to Cart" below creates a separate new item, per the owner's
  // decision that the old one stays until removed manually.
  useEffect(() => {
    const item = getEditCartItem();
    if (!item || item.cakeId !== cake.id) return;
    clearEditCartItem();

    /* eslint-disable react-hooks/set-state-in-effect -- one-time form
       pre-fill from a client-only sessionStorage read, not something a
       lazy useState initializer can do without an SSR/hydration mismatch
       (same reasoning as Order Confirmation's snapshot read). */
    setCakeType(item.isFake ? "fake" : "normal");
    if (item.isFake) {
      setFakeSizeCm(item.fakeSizeCm != null ? String(item.fakeSizeCm) : "");
      setFakeShapeId(item.fakeShapeId);
      setReferenceImageUrl(item.referenceImageUrl);
      setReferenceImagePublicId(item.referenceImagePublicId);
    } else {
      setSizeId(item.sizeId);
      setTierId(item.tierId);
      setFlavorId(item.flavorIds[0] ?? null);
      setFiftyFifty(item.isFiftyFifty);
      setSecondFlavorId(item.isFiftyFifty ? (item.flavorIds[1] ?? null) : null);
      setShapeId(item.shapeId);
    }
    setColorIds(item.colorIds);
    setColorArrangementNotes(item.colorArrangementNotes ?? "");
    setTopperId(item.topperId);
    setTopperColorId(item.topperColorId);
    setTextOnCake(item.textOnCake);
    setTextOnBoard(item.textOnBoard);
    setNotes(item.notes);
    setQuantity(item.quantity);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [cake.id]);

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
    if (referenceImageUploading) {
      document.getElementById("section-referenceImage")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
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
      referenceImageUrl,
      referenceImagePublicId,
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
    setAddedModalOpen(true);
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
        <p className="text-2xl font-bold text-text-primary">
          {unitTotal > 0 ? t("priceFrom", { price: priceLabel }) : priceLabel}
        </p>
        {cake.description && (
          <p className="text-base font-medium text-text-secondary">{cake.description[locale]}</p>
        )}
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
                  <label className="flex items-center gap-2 text-[15px] font-medium text-text-primary">
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
            <p className="text-sm font-medium text-text-secondary">{t("multiColorHint")}</p>
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

      <Section id="section-referenceImage" label={t("referenceImage")} error={referenceImageError ?? undefined}>
        {referenceImageUrl ? (
          <div className="relative flex h-[140px] w-[200px] items-center justify-center overflow-hidden rounded-2xl border-[1.5px] border-border-default bg-bg-page">
            <Image src={referenceImageUrl} alt="" fill sizes="200px" className="object-contain" />
            <button
              type="button"
              onClick={() => {
                setReferenceImageUrl(null);
                setReferenceImagePublicId(null);
              }}
              aria-label={t("removeReferenceImage")}
              className="absolute end-2 top-2 flex size-6 items-center justify-center rounded-full bg-brand-primary text-xs font-bold text-text-on-brand"
            >
              ×
            </button>
          </div>
        ) : (
          <label className="flex h-[140px] w-[200px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-white bg-bg-surface text-center">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={referenceImageUploading}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setReferenceImageError(null);
                setReferenceImageUploading(true);
                try {
                  const { url, publicId } = await uploadReferenceImage(file);
                  setReferenceImageUrl(url);
                  setReferenceImagePublicId(publicId);
                } catch (err) {
                  const reason = err instanceof ReferenceImageUploadError ? err.reason : "uploadFailed";
                  setReferenceImageError(
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
                  setReferenceImageUploading(false);
                }
              }}
            />
            <p className="w-40 text-sm font-medium text-text-secondary">
              {referenceImageUploading ? t("uploadingReference") : t("uploadPrompt")}
            </p>
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

      <Dialog.Root open={addedModalOpen} onOpenChange={setAddedModalOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-bg-surface p-6 text-center shadow-lg">
            <Dialog.Title className="font-heading text-xl font-semibold text-brand-primary">
              {t("addedToCartTitle")}
            </Dialog.Title>
            <p className="mt-1 text-[15px] font-medium text-text-secondary">{t("addedToCartBody")}</p>
            <div className="mt-4 flex flex-col gap-2">
              <Button
                render={<Link href="/cart" />}
                nativeButton={false}
                variant="brand-primary"
                size="xl"
                className="w-full justify-center"
              >
                {t("goToCart")}
              </Button>
              <Dialog.Close render={<Button variant="brand-ghost" size="xl" className="w-full justify-center" />}>
                {t("continueShopping")}
              </Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
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
        <p className="text-base font-bold text-text-primary sm:text-lg">{label}</p>
        {hint && <p className="text-sm font-medium text-text-secondary">{hint}</p>}
      </div>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
