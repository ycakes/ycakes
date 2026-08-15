"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { RowActions } from "@/components/admin/RowActions";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { deleteFromCloudinary } from "@/lib/admin/cloudinaryUpload";
import { TopperFormDialog, type TopperFormValue } from "./TopperFormDialog";
import type { Color, Topper } from "@/types/catalog";

type Row = Topper & {
  active: boolean;
  sort_order: number;
  image_public_id: string | null;
  topper_colors: { color_id: string; colors: Color }[];
};

export function ToppersPageContent({ initialToppers, allColors }: { initialToppers: Row[]; allColors: Color[] }) {
  const t = useTranslations("Admin.table");
  const [toppers, setToppers] = useState(initialToppers);
  const [editing, setEditing] = useState<TopperFormValue | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [addKey, setAddKey] = useState(0);
  const supabase = createClient();

  async function refresh() {
    const { data, error: fetchError } = await supabase
      .from("toppers")
      .select("id, name, price_modifier, has_color_variants, image_url, image_public_id, active, sort_order, topper_colors(color_id, colors(id, name, hex_code))")
      .order("sort_order");
    if (fetchError) {
      setError(t("saveFailed"));
      return;
    }
    if (data) setToppers(data as unknown as Row[]);
  }

  async function handleSave(value: TopperFormValue) {
    setError(null);
    const existing = value.id ? toppers.find((tp) => tp.id === value.id) : null;
    const payload = {
      name: { en: value.name_en, ar: value.name_ar },
      price_modifier: value.price_modifier,
      image_url: value.image_url,
      image_public_id: value.image_public_id,
      has_color_variants: value.has_color_variants,
    };

    let topperId = value.id;
    if (topperId) {
      const { error: updateError } = await supabase.from("toppers").update(payload).eq("id", topperId);
      if (updateError) {
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

    const { error: colorsError } = await supabase.rpc("fn_replace_topper_colors", {
      p_topper_id: topperId,
      p_color_ids: value.color_ids,
    });
    if (colorsError) {
      setError(t("saveFailed"));
      return;
    }

    if (existing?.image_public_id && existing.image_public_id !== value.image_public_id) {
      await deleteFromCloudinary(existing.image_public_id);
    }

    setEditing(undefined);
    await refresh();
  }

  async function handleDelete(id: string) {
    setError(null);
    const topper = toppers.find((tp) => tp.id === id);
    const { error: deleteError } = await supabase.from("toppers").delete().eq("id", id);
    if (deleteError) {
      setError(t("saveFailed"));
      return;
    }
    if (topper?.image_public_id) {
      await deleteFromCloudinary(topper.image_public_id);
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
          <span className="flex items-center gap-1.5">
            <span className="flex items-center">
              {row.topper_colors.map((tc, index) => (
                <span
                  key={tc.color_id}
                  className="size-[18px] shrink-0 rounded-full border-2 border-bg-surface"
                  style={{ backgroundColor: tc.colors.hex_code ?? undefined, marginInlineStart: index === 0 ? 0 : "-6px" }}
                />
              ))}
            </span>
            <span className="text-text-secondary">{t("variantsCount", { count: row.topper_colors.length })}</span>
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
              image_public_id: row.image_public_id,
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
        <Button
          type="button"
          variant="brand-primary"
          size="xl"
          onClick={() => {
            setEditing(null);
            setAddKey((k) => k + 1);
          }}
        >
          {t("add")}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <AdminTable columns={columns} rows={toppers} getRowId={(row) => row.id} emptyMessage={t("noResults")} rowHeight="64" />
      <TopperFormDialog
        key={editing?.id ?? `new-${addKey}`}
        open={editing !== undefined}
        initialValue={editing ?? null}
        allColors={allColors}
        onSave={handleSave}
        onCancel={() => setEditing(undefined)}
      />
    </div>
  );
}
