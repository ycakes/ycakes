"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowUp, ArrowDown, X, Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Cake, Category } from "@/types/catalog";

type Row = Cake & { active: boolean };
type CategoryRow = Category & { show_trending: boolean; trending_sort_order: number };

export function TrendingCakesContent({ categories, cakes }: { categories: CategoryRow[]; cakes: Row[] }) {
  const t = useTranslations("Admin.table");
  const [rows, setRows] = useState(cakes);
  const [categoryRows, setCategoryRows] = useState(categories);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const topLevel = [...categoryRows.filter((c) => c.parent_id === null)].sort(
    (a, b) => a.trending_sort_order - b.trending_sort_order,
  );
  const candyCorner = topLevel.find((c) => c.slug === "candy-corner");
  const subcategoryIds = candyCorner ? categoryRows.filter((c) => c.parent_id === candyCorner.id).map((c) => c.id) : [];

  function groupCategoryIds(category: Category): string[] {
    return category.slug === "candy-corner" ? subcategoryIds : [category.id];
  }

  async function toggleShowTrending(id: string, showTrending: boolean) {
    setError(null);
    const { error: updateError } = await supabase.from("categories").update({ show_trending: showTrending }).eq("id", id);
    if (updateError) {
      setError(t("saveFailed"));
      return;
    }
    setCategoryRows((prev) => prev.map((c) => (c.id === id ? { ...c, show_trending: showTrending } : c)));
  }

  async function swapCategoryOrder(a: CategoryRow, b: CategoryRow) {
    setError(null);
    const [{ error: err1 }, { error: err2 }] = await Promise.all([
      supabase.from("categories").update({ trending_sort_order: b.trending_sort_order }).eq("id", a.id),
      supabase.from("categories").update({ trending_sort_order: a.trending_sort_order }).eq("id", b.id),
    ]);
    if (err1 || err2) {
      setError(t("saveFailed"));
      return;
    }
    setCategoryRows((prev) =>
      prev.map((c) => {
        if (c.id === a.id) return { ...c, trending_sort_order: b.trending_sort_order };
        if (c.id === b.id) return { ...c, trending_sort_order: a.trending_sort_order };
        return c;
      }),
    );
  }

  async function setFeatured(id: string, featured: boolean) {
    setError(null);
    const { error: updateError } = await supabase.from("cakes").update({ featured }).eq("id", id);
    if (updateError) {
      setError(t("saveFailed"));
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, featured } : r)));
  }

  async function swapSortOrder(a: Row, b: Row) {
    setError(null);
    const [{ error: err1 }, { error: err2 }] = await Promise.all([
      supabase.from("cakes").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("cakes").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    if (err1 || err2) {
      setError(t("saveFailed"));
      return;
    }
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === a.id) return { ...r, sort_order: b.sort_order };
        if (r.id === b.id) return { ...r, sort_order: a.sort_order };
        return r;
      }),
    );
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6 p-6">
      <Link
        href="/admin/cakes"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" />
        {t("back")}
      </Link>
      <h1 className="font-heading text-2xl font-bold text-brand-primary">{t("trendingCakes")}</h1>
      <p className="text-sm text-text-secondary">{t("trendingCakesHelper")}</p>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {topLevel.map((category, categoryIndex) => {
        const ids = new Set(groupCategoryIds(category));
        const groupCakes = rows.filter((r) => ids.has(r.category_id));
        const featuredCakes = groupCakes.filter((r) => r.featured).sort((a, b) => a.sort_order - b.sort_order);
        const availableCakes = groupCakes.filter((r) => !r.featured);

        return (
          <div
            key={category.id}
            className={`flex flex-col gap-3 rounded-3xl border border-border-default bg-bg-surface p-5 ${
              category.show_trending ? "" : "opacity-60"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-lg font-semibold text-text-primary">{category.name.en}</h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={categoryIndex === 0}
                  onClick={() => swapCategoryOrder(category, topLevel[categoryIndex - 1])}
                  className="rounded-lg p-1.5 text-text-secondary hover:bg-bg-surface-alt disabled:opacity-30"
                  aria-label={t("moveUp")}
                >
                  <ArrowUp className="size-4" />
                </button>
                <button
                  type="button"
                  disabled={categoryIndex === topLevel.length - 1}
                  onClick={() => swapCategoryOrder(category, topLevel[categoryIndex + 1])}
                  className="rounded-lg p-1.5 text-text-secondary hover:bg-bg-surface-alt disabled:opacity-30"
                  aria-label={t("moveDown")}
                >
                  <ArrowDown className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleShowTrending(category.id, !category.show_trending)}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-surface-alt"
                  aria-label={category.show_trending ? t("hideFromHome") : t("showOnHome")}
                >
                  {category.show_trending ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                  {category.show_trending ? t("hideFromHome") : t("showOnHome")}
                </button>
              </div>
            </div>
            {featuredCakes.length === 0 ? (
              <p className="text-sm text-text-secondary">{t("noTrendingCakes")}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {featuredCakes.map((cake, index) => (
                  <div key={cake.id} className="flex items-center gap-3 rounded-xl border border-border-default p-2">
                    <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-bg-surface-alt">
                      {cake.primary_image_url && (
                        <Image src={cake.primary_image_url} alt="" fill sizes="40px" className="object-cover" />
                      )}
                    </span>
                    <span className="flex-1 text-sm font-medium text-text-primary">{cake.name.en}</span>
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => swapSortOrder(cake, featuredCakes[index - 1])}
                      className="rounded-lg p-1.5 text-text-secondary hover:bg-bg-surface-alt disabled:opacity-30"
                      aria-label={t("moveUp")}
                    >
                      <ArrowUp className="size-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === featuredCakes.length - 1}
                      onClick={() => swapSortOrder(cake, featuredCakes[index + 1])}
                      className="rounded-lg p-1.5 text-text-secondary hover:bg-bg-surface-alt disabled:opacity-30"
                      aria-label={t("moveDown")}
                    >
                      <ArrowDown className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeatured(cake.id, false)}
                      className="rounded-lg p-1.5 text-destructive hover:bg-bg-surface-alt"
                      aria-label={t("removeFromTrending")}
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {availableCakes.length > 0 && (
              <div className="flex items-center gap-2 border-t border-border-default pt-3">
                <select
                  className="flex-1 rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2 text-sm"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) setFeatured(e.target.value, true);
                  }}
                >
                  <option value="" disabled>
                    {t("addToTrending")}
                  </option>
                  {availableCakes.map((cake) => (
                    <option key={cake.id} value={cake.id}>
                      {cake.name.en}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
