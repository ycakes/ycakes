"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { InputField } from "@/components/storefront/InputField";
import { ToggleChip } from "@/components/storefront/ToggleChip";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { ContactMethod, SavedPhone } from "@/types/auth";

const MAX_PHONES = 5;

export function SavedPhonesCard({
  customerId,
  phones,
  onChange,
}: {
  customerId: string;
  phones: SavedPhone[];
  onChange: (phones: SavedPhone[]) => void;
}) {
  const t = useTranslations("Profile");
  const tCommon = useTranslations("Common");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<ContactMethod>("call");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setPhone("");
    setMethod("call");
    setError(null);
  }

  function startAdd() {
    resetForm();
    setEditingId(null);
    setAdding(true);
  }

  function startEdit(entry: SavedPhone) {
    setPhone(entry.phone);
    setMethod(entry.contact_method);
    setError(null);
    setEditingId(entry.id);
    setAdding(false);
  }

  function cancelForm() {
    setAdding(false);
    setEditingId(null);
    resetForm();
  }

  async function handleSave() {
    if (!phone.trim()) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();

    if (editingId) {
      const { error: updateError } = await supabase
        .from("customer_phones")
        .update({ phone, contact_method: method })
        .eq("id", editingId);
      setSaving(false);
      if (updateError) {
        setError(t("errorGeneric"));
        return;
      }
      onChange(
        phones.map((entry) => (entry.id === editingId ? { ...entry, phone, contact_method: method } : entry)),
      );
    } else {
      const { data, error: insertError } = await supabase
        .from("customer_phones")
        .insert({ customer_id: customerId, phone, contact_method: method })
        .select("id, phone, contact_method")
        .single();
      setSaving(false);
      if (insertError || !data) {
        setError(t("capReached"));
        return;
      }
      onChange([...phones, data as SavedPhone]);
    }
    cancelForm();
  }

  async function handleRemove(id: string) {
    if (!window.confirm(t("confirmRemovePhone"))) return;
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("customer_phones").delete().eq("id", id);
    if (!deleteError) onChange(phones.filter((entry) => entry.id !== id));
  }

  const formOpen = adding || editingId !== null;

  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-bg-surface p-5">
      <p className="font-heading text-xl font-semibold text-text-primary">{t("savedPhonesTitle")}</p>

      {phones.map((entry) =>
        editingId === entry.id ? null : (
          <div key={entry.id} className="flex flex-col gap-1 rounded-2xl bg-bg-subtle p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-text-primary">{entry.phone}</p>
              <div className="flex gap-2">
                <Button type="button" variant="brand-ghost" onClick={() => startEdit(entry)}>
                  {t("edit")}
                </Button>
                <Button type="button" variant="destructive" onClick={() => handleRemove(entry.id)}>
                  {t("remove")}
                </Button>
              </div>
            </div>
            <p className="text-[13px] text-text-secondary">{tCommon(`contactMethod.${entry.contact_method}`)}</p>
          </div>
        ),
      )}

      {formOpen && (
        <div className="flex flex-col gap-2 rounded-2xl bg-bg-subtle p-3">
          <InputField label={t("phone")} type="tel" value={phone} onChange={setPhone} />
          <div className="flex gap-1.5">
            {(["call", "whatsapp", "both"] as const).map((value) => (
              <ToggleChip
                key={value}
                label={tCommon(`contactMethod.${value}`)}
                selected={method === value}
                onClick={() => setMethod(value)}
              />
            ))}
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="brand-primary" disabled={saving} onClick={handleSave}>
              {t("save")}
            </Button>
            <Button type="button" variant="brand-ghost" onClick={cancelForm}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      )}

      {!formOpen && phones.length < MAX_PHONES && (
        <Button type="button" variant="brand-ghost" onClick={startAdd}>
          {t("addPhone", { count: phones.length, max: MAX_PHONES })}
        </Button>
      )}
    </div>
  );
}
