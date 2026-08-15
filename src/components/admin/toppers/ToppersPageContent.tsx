"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { RowActions } from "@/components/admin/RowActions";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { TopperFormDialog, type TopperFormValue } from "./TopperFormDialog";
import type { Color, Topper } from "@/types/catalog";

type Row = Topper & {
  active: boolean;
  sort_order: number;
  topper_colors: { color_id: string; colors: Color }[];
};

export function ToppersPageContent({ initialToppers, allColors }: { initialToppers: Row[]; allColors: Color[] }) {
  const t = useTranslations("Admin.table");
  const [toppers, setToppers] = useState(initialToppers);
  const [editing, setEditing] = useState<TopperFormValue | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function refresh() {
    const { data } = await supabase
      .from("toppers")
      .select("id, name, price_modifier, has_color_variants, image_url, active, sort_order, topper_colors(color_id, colors(id, name, hex_code))")
      .order("sort_order");
    if (data) setToppers(data as unknown as Row[]);
  }

  async function handleSave(value: TopperFormValue) {
    setError(null);
    const payload = {
      name: { en: value.name_en, ar: value.name_ar },
      price_modifier: value.price_modifier,
      image_url: value.image_url,
      has_color_variants: value.has_color_variants,
    };

    let topperId = value.id;
    if (topperId) {
      const { error: updateError } = await supabase.from("toppers").update(payload).eq("id", topperId);
      if (updateError) {
        setError(t("saveFailed"));
        return;
      }
      const { error: deleteError } = await supabase.from("topper_colors").delete().eq("topper_id", topperId);
      if (deleteError) {
        setError(t("saveFailed"));
        return;
      }
    } else {
      const nextSort = toppers.length > 0 ? Math.max(...toppers.map((tp) => tp.sort_order)) + 1 : 0;
      const { data, error: insertError } = await supabase.from("toppers").insert({ ...payload, sort_order: nextSort }).select("id").single();
      if (insertError) {
        setError(t("saveFailed"));
        return;
      }
      topperId = data.id;
    }

    if (value.color_ids.length > 0) {
      const { error: colorsError } = await supabase.from("topper_colors").insert(value.color_ids.map((color_id) => ({ topper_id: topperId, color_id })));
      if (colorsError) {
        setError(t("saveFailed"));
        return;
      }
    }

    setEditing(undefined);
    await refresh();
  }

  async function handleDelete(id: string) {
    setError(null);
    const { error: deleteError } = await supabase.from("toppers").delete().eq("id", id);
    if (deleteError) {
      setError(t("saveFailed"));
      return;
    }
    await refresh();
  }

  async function toggleActive(id: string, active: boolean) {
    setError(null);
    const { error: updateError } = await supabase.from("toppers").update({ active }).eq("id", id);
    if (updateError) {
      setError(t("saveFailed"));
      return;
    }
    setToppers((prev) => prev.map((tp) => (tp.id === id ? { ...tp, active } : tp)));
  }

  const columns: AdminTableColumn<Row>[] = [
    {
      header: t("name"),
      render: (row) => (
        <span className="flex items-center gap-2">
          {row.image_url ? (
            <span className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-bg-surface-alt">
              <Image src={row.image_url} alt="" fill sizes="36px" className="object-cover" />
            </span>
          ) : (
            <span className="size-9 shrink-0 rounded-lg bg-bg-surface-alt" />
          )}
          {row.name.en} / {row.name.ar}
        </span>
      ),
    },
    { header: t("priceModifier"), render: (row) => `${row.price_modifier}` },
    {
      header: t("colorVariants"),
      render: (row) =>
        row.topper_colors.length > 0 ? (
          <span className="flex gap-1">
            {row.topper_colors.map((tc) => (
              <span key={tc.color_id} className="size-4 rounded-full border border-border-default" style={{ backgroundColor: tc.colors.hex_code ?? undefined }} />
            ))}
          </span>
        ) : (
          <span className="text-text-secondary">{t("noColorVariants")}</span>
        ),
    },
    {
      header: t("active"),
      render: (row) => <Switch checked={row.active} onCheckedChange={(checked) => toggleActive(row.id, checked)} />,
    },
    {
      header: "",
      render: (row) => (
        <RowActions
          itemLabel={row.name.en}
          onEdit={() =>
            setEditing({
              id: row.id,
              name_en: row.name.en,
              name_ar: row.name.ar,
              price_modifier: row.price_modifier,
              image_url: row.image_url,
              has_color_variants: row.has_color_variants,
              color_ids: row.topper_colors.map((tc) => tc.color_id),
            })
          }
          onDelete={() => handleDelete(row.id)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-text-primary">{t("toppers")}</h1>
        <Button type="button" variant="brand-primary" onClick={() => setEditing(null)}>
          {t("add")}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <AdminTable columns={columns} rows={toppers} getRowId={(row) => row.id} emptyMessage={t("noResults")} />
      <TopperFormDialog open={editing !== undefined} initialValue={editing ?? null} allColors={allColors} onSave={handleSave} onCancel={() => setEditing(undefined)} />
    </div>
  );
}
