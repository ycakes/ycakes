"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { RowActions } from "@/components/admin/RowActions";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { ColorFormDialog, type ColorFormValue } from "./ColorFormDialog";
import type { Color } from "@/types/catalog";

type Row = Color & { active: boolean; sort_order: number };

export function ColorsPageContent({ initialColors }: { initialColors: Row[] }) {
  const t = useTranslations("Admin.table");
  const [colors, setColors] = useState(initialColors);
  const [editing, setEditing] = useState<ColorFormValue | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [addKey, setAddKey] = useState(0);
  const supabase = createClient();

  async function refresh() {
    const { data, error: fetchError } = await supabase.from("colors").select("id, name, hex_code, active, sort_order").order("sort_order");
    if (fetchError) {
      setError(t("saveFailed"));
      return;
    }
    if (data) setColors(data as Row[]);
  }

  async function handleSave(value: ColorFormValue) {
    setError(null);
    const payload = { name: { en: value.name_en, ar: value.name_ar }, hex_code: value.hex_code };
    if (value.id) {
      const { error: updateError } = await supabase.from("colors").update(payload).eq("id", value.id);
      if (updateError) {
        setError(t("saveFailed"));
        return;
      }
    } else {
      const nextSort = colors.length > 0 ? Math.max(...colors.map(c => c.sort_order)) + 1 : 0;
      const { error: insertError } = await supabase.from("colors").insert({ ...payload, sort_order: nextSort });
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
    const { error: deleteError } = await supabase.from("colors").delete().eq("id", id);
    if (deleteError) {
      setError(t("saveFailed"));
      return;
    }
    await refresh();
  }

  async function toggleActive(id: string, active: boolean) {
    setError(null);
    const { error: updateError } = await supabase.from("colors").update({ active }).eq("id", id);
    if (updateError) {
      setError(t("saveFailed"));
      return;
    }
    setColors((prev) => prev.map((c) => (c.id === id ? { ...c, active } : c)));
  }

  const columns: AdminTableColumn<Row>[] = [
    {
      header: t("name"),
      render: (row) => (
        <span className="flex items-center gap-2">
          <span className="size-5 shrink-0 rounded-full border border-border-default" style={{ backgroundColor: row.hex_code ?? undefined }} />
          {row.name.en} / {row.name.ar}
        </span>
      ),
    },
    {
      header: t("hex"),
      render: (row) => (
        <span dir="ltr" className="inline-block text-text-secondary">
          {row.hex_code ?? "—"}
        </span>
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
            setEditing({ id: row.id, name_en: row.name.en, name_ar: row.name.ar, hex_code: row.hex_code ?? "#000000" })
          }
          onDelete={() => handleDelete(row.id)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-text-primary">{t("colors")}</h1>
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
      <AdminTable columns={columns} rows={colors} getRowId={(row) => row.id} emptyMessage={t("noResults")} />
      <ColorFormDialog
        key={editing?.id ?? `new-${addKey}`}
        open={editing !== undefined}
        initialValue={editing ?? null}
        onSave={handleSave}
        onCancel={() => setEditing(undefined)}
      />
    </div>
  );
}
