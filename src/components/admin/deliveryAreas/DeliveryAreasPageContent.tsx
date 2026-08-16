"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { RowActions } from "@/components/admin/RowActions";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { DeliveryAreaFormDialog, type DeliveryAreaFormValue } from "./DeliveryAreaFormDialog";
import type { DeliveryArea } from "@/types/catalog";

type Row = DeliveryArea & { active: boolean; sort_order: number };

export function DeliveryAreasPageContent({ initialAreas }: { initialAreas: Row[] }) {
  const t = useTranslations("Admin.table");
  const tCommon = useTranslations("Common");
  const tAreas = useTranslations("Admin.deliveryAreas");
  const locale = useLocale() as "en" | "ar";
  const [areas, setAreas] = useState(initialAreas);
  const [editing, setEditing] = useState<DeliveryAreaFormValue | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [addKey, setAddKey] = useState(0);
  const supabase = createClient();

  async function refresh() {
    const { data, error: fetchError } = await supabase.from("delivery_areas").select("id, name, price, active, sort_order").order("sort_order");
    if (fetchError) {
      setError(t("saveFailed"));
      return;
    }
    if (data) setAreas(data as Row[]);
  }

  async function handleSave(value: DeliveryAreaFormValue) {
    setError(null);
    const payload = { name: { en: value.name_en, ar: value.name_ar }, price: Number(value.price) || 0 };
    if (value.id) {
      const { error: updateError } = await supabase.from("delivery_areas").update(payload).eq("id", value.id);
      if (updateError) {
        setError(t("saveFailed"));
        return;
      }
    } else {
      const nextSort = areas.length > 0 ? Math.max(...areas.map((a) => a.sort_order)) + 1 : 0;
      const { error: insertError } = await supabase.from("delivery_areas").insert({ ...payload, sort_order: nextSort });
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
    const { error: deleteError } = await supabase.from("delivery_areas").delete().eq("id", id);
    if (deleteError) {
      setError(t("saveFailed"));
      return;
    }
    await refresh();
  }

  async function toggleActive(id: string, active: boolean) {
    setError(null);
    const { error: updateError } = await supabase.from("delivery_areas").update({ active }).eq("id", id);
    if (updateError) {
      setError(t("saveFailed"));
      return;
    }
    setAreas((prev) => prev.map((a) => (a.id === id ? { ...a, active } : a)));
  }

  const columns: AdminTableColumn<Row>[] = [
    {
      header: tAreas("areaName"),
      render: (row) => (
        <span className="flex flex-col gap-0.5">
          <span className="text-[14px] font-medium text-text-primary">{row.name.en}</span>
          <span dir="rtl" className="text-[12px] text-text-secondary">
            {row.name.ar}
          </span>
        </span>
      ),
    },
    {
      header: tAreas("deliveryPrice"),
      render: (row) => (row.price > 0 ? tCommon("egpPrice", { amount: row.price }) : tAreas("priceTbd")),
    },
    {
      header: t("active"),
      render: (row) => <Switch checked={row.active} onCheckedChange={(checked) => toggleActive(row.id, checked)} />,
    },
    {
      header: t("actions"),
      align: "end",
      render: (row) => (
        <RowActions
          itemLabel={row.name[locale]}
          onEdit={() => setEditing({ id: row.id, name_en: row.name.en, name_ar: row.name.ar, price: String(row.price) })}
          onDelete={() => handleDelete(row.id)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-brand-primary">{tAreas("title")}</h1>
        <Button
          type="button"
          variant="brand-primary"
          size="xl"
          className="px-5 py-3 text-base"
          onClick={() => {
            setEditing(null);
            setAddKey((k) => k + 1);
          }}
        >
          {tAreas("addArea")}
        </Button>
      </div>
      <p className="text-sm text-text-secondary">{tAreas("hint")}</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <AdminTable columns={columns} rows={areas} getRowId={(row) => row.id} emptyMessage={t("noResults")} />
      <DeliveryAreaFormDialog
        key={editing?.id ?? `new-${addKey}`}
        open={editing !== undefined}
        initialValue={editing ?? null}
        onSave={handleSave}
        onCancel={() => setEditing(undefined)}
      />
    </div>
  );
}
