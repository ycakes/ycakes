"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { InputField } from "@/components/storefront/InputField";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { createClient } from "@/lib/supabase/client";
import type { SavedAddress } from "@/types/auth";

const MAX_ADDRESSES = 5;

export function SavedAddressesCard({
  customerId,
  addresses,
  onChange,
}: {
  customerId: string;
  addresses: SavedAddress[];
  onChange: (addresses: SavedAddress[]) => void;
}) {
  const t = useTranslations("Profile");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [apartment, setApartment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  function resetForm() {
    setLabel("");
    setAddress("");
    setApartment("");
    setError(null);
  }

  function startAdd() {
    resetForm();
    setEditingId(null);
    setAdding(true);
  }

  function startEdit(entry: SavedAddress) {
    setLabel(entry.label);
    setAddress(entry.address);
    setApartment(entry.apartment ?? "");
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
    if (!label.trim() || !address.trim()) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();

    if (editingId) {
      const { error: updateError } = await supabase
        .from("customer_addresses")
        .update({ label, address, apartment: apartment || null })
        .eq("id", editingId);
      setSaving(false);
      if (updateError) {
        setError(t("errorGeneric"));
        return;
      }
      onChange(
        addresses.map((entry) =>
          entry.id === editingId ? { ...entry, label, address, apartment: apartment || null } : entry,
        ),
      );
    } else {
      const { data, error: insertError } = await supabase
        .from("customer_addresses")
        .insert({ customer_id: customerId, label, address, apartment: apartment || null })
        .select("id, label, address, apartment")
        .single();
      setSaving(false);
      if (insertError || !data) {
        setError(t("capReached"));
        return;
      }
      onChange([...addresses, data as SavedAddress]);
    }
    cancelForm();
  }

  async function confirmRemove() {
    if (!pendingRemoveId) return;
    const id = pendingRemoveId;
    setPendingRemoveId(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("customer_addresses").delete().eq("id", id);
    if (!deleteError) onChange(addresses.filter((entry) => entry.id !== id));
  }

  const formOpen = adding || editingId !== null;

  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-bg-surface p-5">
      <p className="font-heading text-xl font-semibold text-text-primary">{t("savedAddressesTitle")}</p>

      {addresses.map((entry) =>
        editingId === entry.id ? null : (
          <div key={entry.id} className="flex flex-col gap-1 rounded-2xl bg-bg-subtle p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-text-primary">{entry.label}</p>
              <div className="flex gap-2">
                <Button type="button" variant="brand-ghost" onClick={() => startEdit(entry)}>
                  {t("edit")}
                </Button>
                <Button type="button" variant="destructive" onClick={() => setPendingRemoveId(entry.id)}>
                  {t("remove")}
                </Button>
              </div>
            </div>
            <p className="text-[13px] text-text-secondary">
              {entry.address}
              {entry.apartment ? `, ${entry.apartment}` : ""}
            </p>
          </div>
        ),
      )}

      {formOpen && (
        <div className="flex flex-col gap-2 rounded-2xl bg-bg-subtle p-3">
          <InputField label={t("addressLabel")} placeholder={t("addressLabelPlaceholder")} value={label} onChange={setLabel} />
          <InputField label={t("address")} value={address} onChange={setAddress} />
          <InputField label={t("apartment")} value={apartment} onChange={setApartment} />
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

      {!formOpen && addresses.length < MAX_ADDRESSES && (
        <Button type="button" variant="brand-ghost" onClick={startAdd}>
          {t("addAddress", { count: addresses.length, max: MAX_ADDRESSES })}
        </Button>
      )}

      <ConfirmDialog
        open={pendingRemoveId !== null}
        title={t("confirmRemoveTitle")}
        message={t("confirmRemoveAddress")}
        confirmLabel={t("remove")}
        cancelLabel={t("cancel")}
        onConfirm={confirmRemove}
        onCancel={() => setPendingRemoveId(null)}
      />
    </div>
  );
}
