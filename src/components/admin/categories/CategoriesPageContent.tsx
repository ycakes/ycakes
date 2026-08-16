"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { deleteFromCloudinary } from "@/lib/admin/cloudinaryUpload";
import { CategoryRow } from "./CategoryRow";
import { CategoryFormDialog, type CategoryFormValue } from "./CategoryFormDialog";
import type { Category } from "@/types/catalog";

type Row = Category & { active: boolean; image_public_id: string | null };

function startTransition(update: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => void };
  if (doc.startViewTransition) {
    doc.startViewTransition(update);
  } else {
    update();
  }
}

export function CategoriesPageContent({ initialCategories }: { initialCategories: Row[] }) {
  const t = useTranslations("Admin.table");
  const [categories, setCategories] = useState(initialCategories);
  const [editing, setEditing] = useState<CategoryFormValue | null | undefined>(undefined);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(initialCategories.filter((c) => initialCategories.some((s) => s.parent_id === c.id)).map((c) => c.id)),
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addKey, setAddKey] = useState(0);
  const [addingSubcategoryUnderId, setAddingSubcategoryUnderId] = useState<string | null>(null);
  const supabase = createClient();

  const topLevel = categories.filter((c) => c.parent_id === null);

  function subcategoriesOf(categoryId: string) {
    return categories.filter((c) => c.parent_id === categoryId);
  }

  async function refresh() {
    const { data, error: fetchError } = await supabase
      .from("categories")
      .select("id, parent_id, name, slug, active, sort_order, image_url, image_public_id")
      .order("sort_order");
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

    const groupIds = new Set(group.map((c) => c.id));
    startTransition(() => {
      setCategories((prev) => {
        const others = prev.filter((c) => !groupIds.has(c.id));
        // Re-insert the reordered group at the position its first member held.
        const firstIndex = prev.findIndex((c) => groupIds.has(c.id));
        const next = [...others];
        next.splice(firstIndex, 0, ...reordered);
        return next;
      });
    });
    persistOrder(reordered);
  }

  async function handleSave(value: CategoryFormValue, parentId: string | null) {
    setError(null);
    const existing = value.id ? categories.find((c) => c.id === value.id) : null;
    const payload = {
      name: { en: value.name_en, ar: value.name_ar },
      slug: value.slug,
      parent_id: parentId,
      image_url: value.image_url,
      image_public_id: value.image_public_id,
    };
    if (value.id) {
      const { error: updateError } = await supabase.from("categories").update(payload).eq("id", value.id);
      if (updateError) {
        setError(t("saveFailed"));
        return;
      }
    } else {
      const group = parentId ? subcategoriesOf(parentId) : topLevel;
      const nextSort = group.length > 0 ? Math.max(...group.map((c) => c.sort_order)) + 1 : 0;
      const { error: insertError } = await supabase.from("categories").insert({ ...payload, sort_order: nextSort });
      if (insertError) {
        setError(t("saveFailed"));
        return;
      }
    }

    // Clean up the old Cloudinary asset if the image was replaced or removed.
    if (existing?.image_public_id && existing.image_public_id !== value.image_public_id) {
      await deleteFromCloudinary(existing.image_public_id);
    }

    if (parentId) setExpandedIds((prev) => new Set(prev).add(parentId));
    setEditing(undefined);
    setAddingSubcategoryUnderId(null);
    await refresh();
  }

  async function handleDelete(id: string) {
    setError(null);
    const category = categories.find((c) => c.id === id);
    const { error: deleteError } = await supabase.from("categories").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.code === "23503" ? t("categoryHasCakes") : t("saveFailed"));
      return;
    }
    if (category?.image_public_id) {
      await deleteFromCloudinary(category.image_public_id);
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

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-brand-primary">{t("categories")}</h1>
        <Button
          type="button"
          variant="brand-primary"
          size="xl"
          className="px-5 py-3 text-base"
          onClick={() => {
            setEditing(null);
            setAddingSubcategoryUnderId(null);
            setAddKey((k) => k + 1);
          }}
        >
          {t("addCategory")}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-3 rounded-[24px] border border-border-default bg-bg-surface p-4">
        <div className="flex items-center gap-3 px-3 text-[12px] font-semibold uppercase tracking-[0.48px] text-text-secondary">
          <span className="w-4" />
          <span className="w-9" />
          <span className="flex-1">{t("category")}</span>
          <span className="w-40 shrink-0 pe-8 text-center">{t("subcategoriesCountHeader")}</span>
          <span className="w-10 shrink-0 text-end">{t("active")}</span>
          <span className="w-[68px] shrink-0 text-end">{t("actions")}</span>
        </div>

        <div className="flex flex-col gap-2">
          {topLevel.map((category) => {
          const subs = subcategoriesOf(category.id);
          const expanded = expandedIds.has(category.id);
          return (
            <div key={category.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleExpanded(category.id)}
                  disabled={subs.length === 0}
                  className="text-text-secondary disabled:opacity-30"
                >
                  {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </button>
                <div className="flex-1">
                  <CategoryRow
                    category={category}
                    active={category.active}
                    indented={false}
                    subcategoriesLabel={subs.length > 0 ? t("subcategoriesCount", { count: subs.length }) : "—"}
                    onDragStart={() => setDragId(category.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(topLevel, category.id)}
                    onToggleActive={(active) => toggleActive(category.id, active)}
                    onEdit={() =>
                      setEditing({
                        id: category.id,
                        name_en: category.name.en,
                        name_ar: category.name.ar,
                        slug: category.slug,
                        image_url: category.image_url,
                        image_public_id: category.image_public_id,
                      })
                    }
                    onDelete={() => handleDelete(category.id)}
                  />
                </div>
              </div>
              {expanded && subs.length > 0 && (
                <div className="flex flex-col gap-2">
                  {subs.map((sub) => (
                    <CategoryRow
                      key={sub.id}
                      category={sub}
                      active={sub.active}
                      indented
                      onDragStart={() => setDragId(sub.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(subs, sub.id)}
                      onToggleActive={(active) => toggleActive(sub.id, active)}
                      onEdit={() =>
                        setEditing({
                          id: sub.id,
                          name_en: sub.name.en,
                          name_ar: sub.name.ar,
                          slug: sub.slug,
                          image_url: sub.image_url,
                          image_public_id: sub.image_public_id,
                        })
                      }
                      onDelete={() => handleDelete(sub.id)}
                    />
                  ))}
                </div>
              )}
              <button
                type="button"
                className="ms-8 self-start text-sm font-medium text-brand-primary"
                onClick={() => {
                  setEditing(null);
                  setAddingSubcategoryUnderId(category.id);
                  setExpandedIds((prev) => new Set(prev).add(category.id));
                  setAddKey((k) => k + 1);
                }}
              >
                {t("addSubcategory")}
              </button>
            </div>
          );
          })}
        </div>
      </div>
      <CategoryFormDialog
        key={editing?.id ?? `new-${addKey}`}
        open={editing !== undefined}
        initialValue={editing ?? null}
        onSave={(value) =>
          handleSave(
            value,
            editing?.id ? (categories.find((c) => c.id === editing.id)?.parent_id ?? null) : addingSubcategoryUnderId,
          )
        }
        onCancel={() => {
          setEditing(undefined);
          setAddingSubcategoryUnderId(null);
        }}
      />
    </div>
  );
}
