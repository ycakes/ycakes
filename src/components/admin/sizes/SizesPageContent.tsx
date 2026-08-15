"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { RowActions } from "@/components/admin/RowActions";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { SizeFormDialog, type SizeFormValue } from "./SizeFormDialog";
import type { Category, Size } from "@/types/catalog";

type Row = Size & { active: boolean };

export function SizesPageContent({
  categories,
  selectedCategoryId,
  initialSizes,
}: {
  categories: Category[];
  selectedCategoryId: string | null;
  initialSizes: Row[];
}) {
  const t = useTranslations("Admin.table");
  const router = useRouter();
  const [sizes, setSizes] = useState(initialSizes);
  const [editing, setEditing] = useState<SizeFormValue | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [addKey, setAddKey] = useState(0);
  const supabase = createClient();

  async function refresh() {
    if (!selectedCategoryId) return;
    const { data, error: fetchError } = await supabase
      .from("sizes")
      .select("id, category_id, min_qty, max_qty, unit, price_modifier, active, sort_order")
      .eq("category_id", selectedCategoryId)
      .order("sort_order");
    if (fetchError) {
      setError(t("saveFailed"));
      return;
    }
    if (data) setSizes(data as Row[]);
  }

  async function handleSave(value: SizeFormValue) {
    setError(null);
    if (!selectedCategoryId) return;
    const payload = { category_id: selectedCategoryId, min_qty: value.min_qty, max_qty: value.max_qty, unit: value.unit, price_modifier: value.price_modifier };
    if (value.id) {
      const { error: updateError } = await supabase.from("sizes").update(payload).eq("id", value.id);
      if (updateError) {
        setError(t("saveFailed"));
        return;
      }
    } else {
      const nextSort = sizes.length > 0 ? Math.max(...sizes.map((s) => s.sort_order)) + 1 : 0;
      const { error: insertError } = await supabase.from("sizes").insert({ ...payload, sort_order: nextSort });
      if (insertError) {
        setError(t("saveFailed"));
        return;
      }
    }
    setEditing(undefined);
    await refresh();
  }

  async function handleDelete(id: string) {
    setError(null);
    const { error: deleteError } = await supabase.from("sizes").delete().eq("id", id);
    if (deleteError) {
      setError(t("saveFailed"));
      return;
    }
    await refresh();
  }

  async function toggleActive(id: string, active: boolean) {
    setError(null);
    const { error: updateError } = await supabase.from("sizes").update({ active }).eq("id", id);
    if (updateError) {
      setError(t("saveFailed"));
      return;
    }
    setSizes((prev) => prev.map((s) => (s.id === id ? { ...s, active } : s)));
  }

  const columns: AdminTableColumn<Row>[] = [
    { header: t("minQty"), render: (row) => row.min_qty },
    { header: t("maxQty"), render: (row) => row.max_qty },
    { header: t("unit"), render: (row) => t(`unit${row.unit.charAt(0).toUpperCase()}${row.unit.slice(1)}` as "unitServings" | "unitQuantity" | "unitCm") },
    { header: t("priceModifier"), render: (row) => row.price_modifier },
    {
      header: t("active"),
      render: (row) => <Switch checked={row.active} onCheckedChange={(checked) => toggleActive(row.id, checked)} />,
    },
    {
      header: "",
      render: (row) => (
        <RowActions
          itemLabel={`${row.min_qty}–${row.max_qty}`}
          onEdit={() => setEditing({ id: row.id, min_qty: row.min_qty, max_qty: row.max_qty, unit: row.unit, price_modifier: row.price_modifier })}
          onDelete={() => handleDelete(row.id)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-text-primary">{t("sizes")}</h1>
        <Button
          type="button"
          variant="brand-primary"
          disabled={!selectedCategoryId}
          onClick={() => {
            setEditing(null);
            setAddKey((k) => k + 1);
          }}
        >
          {t("add")}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Select
        value={selectedCategoryId ?? ""}
        onValueChange={(value) => {
          if (value) router.push(`/admin/sizes?category=${value}`);
        }}
        items={categories.map((category) => ({ value: category.id, label: `${category.name.en} / ${category.name.ar}` }))}
      >
        <SelectTrigger className="w-fit">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name.en} / {category.name.ar}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <AdminTable columns={columns} rows={sizes} getRowId={(row) => row.id} emptyMessage={t("noResults")} />
      <SizeFormDialog
        key={editing?.id ?? `new-${addKey}`}
        open={editing !== undefined}
        initialValue={editing ?? null}
        onSave={handleSave}
        onCancel={() => setEditing(undefined)}
      />
    </div>
  );
}
