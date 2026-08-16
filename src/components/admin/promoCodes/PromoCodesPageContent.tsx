"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { RowActions } from "@/components/admin/RowActions";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { PromoCodeFormDialog, type PromoCodeFormValue } from "./PromoCodeFormDialog";

type PromoCodeRow = {
  id: string;
  code: string;
  discount_type: "fixed" | "percentage";
  discount_value: number;
  min_order_amount: number | null;
  expiry_date: string | null;
  redemption_cap: number | null;
  active: boolean;
  created_at: string;
};

export function PromoCodesPageContent({
  initialPromoCodes,
  redemptionCounts,
}: {
  initialPromoCodes: PromoCodeRow[];
  redemptionCounts: Record<string, number>;
}) {
  const t = useTranslations("Admin.table");
  const tCommon = useTranslations("Common");
  const tPromo = useTranslations("Admin.promoCodes");
  const locale = useLocale() as "en" | "ar";
  const [promoCodes, setPromoCodes] = useState(initialPromoCodes);
  const [editing, setEditing] = useState<PromoCodeFormValue | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [addKey, setAddKey] = useState(0);
  const supabase = createClient();

  async function refresh() {
    const { data, error: fetchError } = await supabase
      .from("promo_codes")
      .select("id, code, discount_type, discount_value, min_order_amount, expiry_date, redemption_cap, active, created_at")
      .order("created_at", { ascending: false });
    if (fetchError) {
      setError(t("saveFailed"));
      return;
    }
    if (data) setPromoCodes(data as PromoCodeRow[]);
  }

  async function handleSave(value: PromoCodeFormValue) {
    setError(null);
    const payload = {
      code: value.code,
      discount_type: value.discount_type,
      discount_value: Number(value.discount_value) || 0,
      min_order_amount: value.min_order_amount.trim() ? Number(value.min_order_amount) : null,
      expiry_date: value.expiry_date.trim() || null,
      redemption_cap: value.redemption_cap.trim() ? Number(value.redemption_cap) : null,
    };
    if (value.id) {
      const { error: updateError } = await supabase.from("promo_codes").update(payload).eq("id", value.id);
      if (updateError) {
        setError(t("saveFailed"));
        return;
      }
    } else {
      const { error: insertError } = await supabase.from("promo_codes").insert(payload);
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
    const { error: deleteError } = await supabase.from("promo_codes").delete().eq("id", id);
    if (deleteError) {
      setError(t("saveFailed"));
      return;
    }
    await refresh();
  }

  async function toggleActive(id: string, active: boolean) {
    setError(null);
    const { error: updateError } = await supabase.from("promo_codes").update({ active }).eq("id", id);
    if (updateError) {
      setError(t("saveFailed"));
      return;
    }
    setPromoCodes((prev) => prev.map((p) => (p.id === id ? { ...p, active } : p)));
  }

  function formatDiscount(row: PromoCodeRow) {
    return row.discount_type === "percentage"
      ? tPromo("percentOffValue", { value: row.discount_value })
      : tPromo("fixedOffValue", { value: row.discount_value });
  }

  function formatExpiry(row: PromoCodeRow) {
    if (!row.expiry_date) return tPromo("noExpiry");
    return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(new Date(row.expiry_date));
  }

  const columns: AdminTableColumn<PromoCodeRow>[] = [
    { header: tPromo("code"), render: (row) => <span dir="ltr" className="font-semibold text-text-primary">{row.code}</span> },
    { header: tPromo("discount"), render: (row) => formatDiscount(row) },
    {
      header: tPromo("minOrder"),
      render: (row) => (row.min_order_amount ? tCommon("egpPrice", { amount: row.min_order_amount }) : tPromo("none")),
    },
    { header: tPromo("expires"), render: (row) => formatExpiry(row) },
    {
      header: tPromo("redemptions"),
      render: (row) =>
        tPromo("redemptionCount", {
          used: redemptionCounts[row.id] ?? 0,
          cap: row.redemption_cap != null ? String(row.redemption_cap) : "∞",
        }),
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
          itemLabel={row.code}
          onEdit={() =>
            setEditing({
              id: row.id,
              code: row.code,
              discount_type: row.discount_type,
              discount_value: String(row.discount_value),
              min_order_amount: row.min_order_amount != null ? String(row.min_order_amount) : "",
              expiry_date: row.expiry_date ?? "",
              redemption_cap: row.redemption_cap != null ? String(row.redemption_cap) : "",
            })
          }
          onDelete={() => handleDelete(row.id)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-brand-primary">{tPromo("title")}</h1>
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
          {tPromo("addPromoCode")}
        </Button>
      </div>
      <p className="text-sm text-text-secondary">{tPromo("hint")}</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <AdminTable columns={columns} rows={promoCodes} getRowId={(row) => row.id} emptyMessage={t("noResults")} />
      <PromoCodeFormDialog
        key={editing?.id ?? `new-${addKey}`}
        open={editing !== undefined}
        initialValue={editing ?? null}
        onSave={handleSave}
        onCancel={() => setEditing(undefined)}
      />
    </div>
  );
}
