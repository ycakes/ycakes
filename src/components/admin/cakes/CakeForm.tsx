"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUploader, type UploadedImage } from "@/components/admin/ImageUploader";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Cake, CakeImage, Category } from "@/types/catalog";

type CakeFormValue = Pick<Cake, "id" | "category_id" | "name" | "description" | "base_price" | "featured"> & {
  active: boolean;
};

export function CakeForm({
  categories,
  cake,
  images,
}: {
  categories: Category[];
  cake: CakeFormValue | null;
  images: CakeImage[];
}) {
  const t = useTranslations("Admin.table");
  const router = useRouter();
  const supabase = createClient();

  const topLevel = categories.filter((c) => c.parent_id === null);
  const candyCorner = topLevel.find((c) => c.slug === "candy-corner");
  const subcategories = candyCorner ? categories.filter((c) => c.parent_id === candyCorner.id) : [];
  const initialCategory = cake ? categories.find((c) => c.id === cake.category_id) : null;
  const initialTopLevelId = initialCategory?.parent_id ?? initialCategory?.id ?? topLevel[0]?.id ?? "";
  const initialSubcategoryId = initialCategory?.parent_id ? initialCategory.id : "";

  const [nameEn, setNameEn] = useState(cake?.name.en ?? "");
  const [nameAr, setNameAr] = useState(cake?.name.ar ?? "");
  const [descriptionEn, setDescriptionEn] = useState(cake?.description?.en ?? "");
  const [descriptionAr, setDescriptionAr] = useState(cake?.description?.ar ?? "");
  const [basePrice, setBasePrice] = useState(String(cake?.base_price ?? 0));
  const [topLevelId, setTopLevelId] = useState(initialTopLevelId);
  const [subcategoryId, setSubcategoryId] = useState(initialSubcategoryId);
  const [featured, setFeatured] = useState(cake?.featured ?? false);
  const [active, setActive] = useState(cake?.active ?? true);
  const [cakeImages, setCakeImages] = useState<UploadedImage[]>(
    images.map((img) => ({ url: img.url, sort_order: img.sort_order, is_primary: img.is_primary })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCandyCorner = topLevel.find((c) => c.id === topLevelId)?.slug === "candy-corner";
  const finalCategoryId = isCandyCorner && subcategoryId ? subcategoryId : topLevelId;

  async function handleSubmit() {
    setError(null);
    setSaving(true);
    try {
      const payload = {
        category_id: finalCategoryId,
        name: { en: nameEn, ar: nameAr },
        description: descriptionEn || descriptionAr ? { en: descriptionEn, ar: descriptionAr } : null,
        base_price: Number(basePrice) || 0,
        featured,
        active,
        ...(images.length > 0 && cakeImages.length === 0 ? { primary_image_url: null } : {}),
      };

      let cakeId = cake?.id;
      if (cakeId) {
        const { error: updateError } = await supabase.from("cakes").update(payload).eq("id", cakeId);
        if (updateError) {
          setError(t("saveFailed"));
          return;
        }
        const { error: deleteError } = await supabase.from("cake_images").delete().eq("cake_id", cakeId);
        if (deleteError) {
          setError(t("saveFailed"));
          return;
        }
      } else {
        const { data, error: insertError } = await supabase.from("cakes").insert(payload).select("id").single();
        if (insertError) {
          setError(t("saveFailed"));
          return;
        }
        cakeId = data.id;
      }

      if (cakeImages.length > 0) {
        const { error: imagesError } = await supabase.from("cake_images").insert(
          cakeImages.map((img) => ({ cake_id: cakeId, url: img.url, sort_order: img.sort_order, is_primary: img.is_primary })),
        );
        if (imagesError) {
          setError(t("saveFailed"));
          return;
        }
      }

      router.push("/admin/cakes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="font-heading text-2xl font-bold text-text-primary">{cake ? t("edit") : t("add")}</h1>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
        {t("nameEn")}
        <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
        {t("nameAr")}
        <input dir="rtl" value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
        {t("descriptionEn")}
        <textarea value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} rows={3} className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
        {t("descriptionAr")}
        <textarea dir="rtl" value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} rows={3} className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm" />
      </label>

      <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
        {t("category")}
        <Select
          value={topLevelId}
          onValueChange={(value) => {
            setTopLevelId(value ?? "");
            setSubcategoryId("");
          }}
          items={topLevel.map((category) => ({ value: category.id, label: `${category.name.en} / ${category.name.ar}` }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {topLevel.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name.en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      {isCandyCorner && (
        <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
          {t("subcategory")}
          <Select
            value={subcategoryId}
            onValueChange={(value) => setSubcategoryId(value ?? "")}
            items={subcategories.map((sub) => ({ value: sub.id, label: `${sub.name.en} / ${sub.name.ar}` }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("selectSubcategory")} />
            </SelectTrigger>
            <SelectContent>
              {subcategories.map((sub) => (
                <SelectItem key={sub.id} value={sub.id}>
                  {sub.name.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      )}

      <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
        {t("priceModifier")}
        <input type="number" step="0.01" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm" />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-[13px] font-medium text-text-primary">{t("images")}</span>
        <ImageUploader images={cakeImages} onChange={setCakeImages} folder="cakes" multiple />
      </div>

      <label className="flex items-center gap-2 text-[13px] font-medium text-text-primary">
        <Switch checked={featured} onCheckedChange={setFeatured} />
        {t("featured")}
      </label>
      <label className="flex items-center gap-2 text-[13px] font-medium text-text-primary">
        <Switch checked={active} onCheckedChange={setActive} />
        {t("active")}
      </label>

      <div className="mt-2 flex gap-2">
        <Button type="button" variant="brand-primary" disabled={saving} onClick={handleSubmit}>
          {t("save")}
        </Button>
        <Button type="button" variant="brand-ghost" onClick={() => router.push("/admin/cakes")}>
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}
