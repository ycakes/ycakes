"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { CategoryRow } from "./CategoryRow";
import { CategoryFormDialog, type CategoryFormValue } from "./CategoryFormDialog";
import type { Category } from "@/types/catalog";

type Row = Category & { active: boolean };

export function CategoriesPageContent({ initialCategories }: { initialCategories: Row[] }) {
  const t = useTranslations("Admin.table");
  const [categories, setCategories] = useState(initialCategories);
  const [editing, setEditing] = useState<CategoryFormValue | null | undefined>(undefined);
  const [candyCornerExpanded, setCandyCornerExpanded] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addKey, setAddKey] = useState(0);
  const [addingSubcategoryUnderCandyCorner, setAddingSubcategoryUnderCandyCorner] = useState(false);
  const supabase = createClient();

  const topLevel = categories.filter((c) => c.parent_id === null);
  const candyCorner = topLevel.find((c) => c.slug === "candy-corner");
  const subcategories = candyCorner ? categories.filter((c) => c.parent_id === candyCorner.id) : [];

  async function refresh() {
    const { data, error: fetchError } = await supabase.from("categories").select("id, parent_id, name, slug, active, sort_order").order("sort_order");
    if (fetchError) {
      setError(t("saveFailed"));
      return;
    }
    if (data) setCategories(data as Row[]);
  }

  async function persistOrder(group: Row[]) {
    setError(null);
    const results = await Promise.all(group.map((row, index) => supabase.from("categories").update({ sort_order: index }).eq("id", row.id)));
    if (results.some((result) => result.error)) {
      setError(t("saveFailed"));
      await refresh();
      return;
    }
    await refresh();
  }

  function handleDrop(group: Row[], targetId: string) {
    if (!dragId || dragId === targetId) return;
    const fromIndex = group.findIndex((c) => c.id === dragId);
    if (fromIndex === -1) {
      setDragId(null);
      return;
    }
    const toIndex = group.findIndex((c) => c.id === targetId);
    const reordered = [...group];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setDragId(null);
    persistOrder(reordered);
  }

  async function handleSave(value: CategoryFormValue, parentId: string | null) {
    setError(null);
    const payload = { name: { en: value.name_en, ar: value.name_ar }, slug: value.slug, parent_id: parentId };
    if (value.id) {
      const { error: updateError } = await supabase.from("categories").update(payload).eq("id", value.id);
      if (updateError) {
        setError(t("saveFailed"));
        return;
      }
    } else {
      const group = parentId ? subcategories : topLevel;
      const nextSort = group.length > 0 ? Math.max(...group.map((c) => c.sort_order)) + 1 : 0;
      const { error: insertError } = await supabase.from("categories").insert({ ...payload, sort_order: nextSort });
      if (insertError) {
        setError(t("saveFailed"));
        return;
      }
    }
    setEditing(undefined);
    setAddingSubcategoryUnderCandyCorner(false);
    await refresh();
  }

  async function handleDelete(id: string) {
    setError(null);
    const { error: deleteError } = await supabase.from("categories").delete().eq("id", id);
    if (deleteError) {
      setError(t("saveFailed"));
      return;
    }
    await refresh();
  }

  async function toggleActive(id: string, active: boolean) {
    setError(null);
    const { error: updateError } = await supabase.from("categories").update({ active }).eq("id", id);
    if (updateError) {
      setError(t("saveFailed"));
      return;
    }
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, active } : c)));
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-text-primary">{t("categories")}</h1>
        <Button
          type="button"
          variant="brand-primary"
          onClick={() => {
            setEditing(null);
            setAddingSubcategoryUnderCandyCorner(false);
            setAddKey((k) => k + 1);
          }}
        >
          {t("add")}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-col gap-2">
        {topLevel.map((category) => (
          <div key={category.id} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              {category.slug === "candy-corner" && (
                <button type="button" onClick={() => setCandyCornerExpanded((v) => !v)} className="text-text-secondary">
                  {candyCornerExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </button>
              )}
              <div className="flex-1">
                <CategoryRow
                  category={category}
                  active={category.active}
                  indented={false}
                  subcategoriesLabel={
                    category.slug === "candy-corner"
                      ? t("subcategoriesCount", { count: subcategories.length })
                      : "—"
                  }
                  onDragStart={() => setDragId(category.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(topLevel, category.id)}
                  onToggleActive={(active) => toggleActive(category.id, active)}
                  onEdit={() =>
                    setEditing({ id: category.id, name_en: category.name.en, name_ar: category.name.ar, slug: category.slug })
                  }
                  onDelete={() => handleDelete(category.id)}
                />
              </div>
            </div>
            {category.slug === "candy-corner" && candyCornerExpanded && (
              <div className="flex flex-col gap-2">
                {subcategories.map((sub) => (
                  <CategoryRow
                    key={sub.id}
                    category={sub}
                    active={sub.active}
                    indented
                    onDragStart={() => setDragId(sub.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(subcategories, sub.id)}
                    onToggleActive={(active) => toggleActive(sub.id, active)}
                    onEdit={() => setEditing({ id: sub.id, name_en: sub.name.en, name_ar: sub.name.ar, slug: sub.slug })}
                    onDelete={() => handleDelete(sub.id)}
                  />
                ))}
                <button
                  type="button"
                  className="ms-8 self-start text-sm font-medium text-brand-primary"
                  onClick={() => {
                    setEditing(null);
                    setAddingSubcategoryUnderCandyCorner(true);
                    setAddKey((k) => k + 1);
                  }}
                >
                  {t("addSubcategory")}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <CategoryFormDialog
        key={editing?.id ?? `new-${addKey}`}
        open={editing !== undefined}
        initialValue={editing ?? null}
        onSave={(value) =>
          handleSave(
            value,
            editing?.id
              ? (categories.find((c) => c.id === editing.id)?.parent_id ?? null)
              : addingSubcategoryUnderCandyCorner
                ? (candyCorner?.id ?? null)
                : null,
          )
        }
        onCancel={() => {
          setEditing(undefined);
          setAddingSubcategoryUnderCandyCorner(false);
        }}
      />
    </div>
  );
}
