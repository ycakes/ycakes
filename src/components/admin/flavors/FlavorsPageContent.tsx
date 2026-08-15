"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { RowActions } from "@/components/admin/RowActions";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { FlavorFormDialog, type FlavorFormValue } from "./FlavorFormDialog";
import type { Flavor } from "@/types/catalog";

type Row = Flavor & { active: boolean; sort_order: number };

export function FlavorsPageContent({ initialFlavors }: { initialFlavors: Row[] }) {
  const t = useTranslations("Admin.table");
  const tCommon = useTranslations("Common");
  const [flavors, setFlavors] = useState(initialFlavors);
  const [editing, setEditing] = useState<FlavorFormValue | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function refresh() {
    const { data } = await supabase.from("flavors").select("id, name, price_modifier, active, sort_order").order("sort_order");
    if (data) setFlavors(data as Row[]);
  }

  async function handleSave(value: FlavorFormValue) {
    setError(null);
    const payload = { name: { en: value.name_en, ar: value.name_ar }, price_modifier: value.price_modifier };
    if (value.id) {
      const { error: updateError } = await supabase.from("flavors").update(payload).eq("id", value.id);
      if (updateError) {
        setError(t("saveFailed"));
        return;
      }
    } else {
      const nextSort = flavors.length > 0 ? Math.max(...flavors.map(f => f.sort_order)) + 1 : 0;
      const { error: insertError } = await supabase.from("flavors").insert({ ...payload, sort_order: nextSort });
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
    const { error: deleteError } = await supabase.from("flavors").delete().eq("id", id);
    if (deleteError) {
      setError(t("saveFailed"));
      return;
    }
    await refresh();
  }

  async function toggleActive(id: string, active: boolean) {
    setError(null);
    const { error: updateError } = await supabase.from("flavors").update({ active }).eq("id", id);
    if (updateError) {
      setError(t("saveFailed"));
      return;
    }
    setFlavors((prev) => prev.map((f) => (f.id === id ? { ...f, active } : f)));
  }

  const columns: AdminTableColumn<Row>[] = [
    { header: t("name"), render: (row) => `${row.name.en} / ${row.name.ar}` },
    { header: t("priceModifier"), render: (row) => `${row.price_modifier} ${tCommon("egp")}` },
    {
      header: t("active"),
      render: (row) => <Switch checked={row.active} onCheckedChange={(checked) => toggleActive(row.id, checked)} />,
    },
    {
      header: "",
      render: (row) => (
        <RowActions
          itemLabel={row.name.en}
          onEdit={() => setEditing({ id: row.id, name_en: row.name.en, name_ar: row.name.ar, price_modifier: row.price_modifier })}
          onDelete={() => handleDelete(row.id)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-text-primary">{t("flavors")}</h1>
        <Button type="button" variant="brand-primary" onClick={() => setEditing(null)}>
          {t("add")}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <AdminTable columns={columns} rows={flavors} getRowId={(row) => row.id} emptyMessage={t("noResults")} />
      <FlavorFormDialog open={editing !== undefined} initialValue={editing ?? null} onSave={handleSave} onCancel={() => setEditing(undefined)} />
    </div>
  );
}
