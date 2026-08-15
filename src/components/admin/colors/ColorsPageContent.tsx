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
  const supabase = createClient();

  async function refresh() {
    const { data } = await supabase.from("colors").select("id, name, hex_code, active, sort_order").order("sort_order");
    if (data) setColors(data as Row[]);
  }

  async function handleSave(value: ColorFormValue) {
    const payload = { name: { en: value.name_en, ar: value.name_ar }, hex_code: value.hex_code };
    if (value.id) {
      await supabase.from("colors").update(payload).eq("id", value.id);
    } else {
      await supabase.from("colors").insert({ ...payload, sort_order: colors.length });
    }
    setEditing(undefined);
    await refresh();
  }

  async function handleDelete(id: string) {
    await supabase.from("colors").delete().eq("id", id);
    await refresh();
  }

  async function toggleActive(id: string, active: boolean) {
    await supabase.from("colors").update({ active }).eq("id", id);
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
        <Button type="button" variant="brand-primary" onClick={() => setEditing(null)}>
          {t("add")}
        </Button>
      </div>
      <AdminTable columns={columns} rows={colors} getRowId={(row) => row.id} emptyMessage={t("noResults")} />
      <ColorFormDialog open={editing !== undefined} initialValue={editing ?? null} onSave={handleSave} onCancel={() => setEditing(undefined)} />
    </div>
  );
}
