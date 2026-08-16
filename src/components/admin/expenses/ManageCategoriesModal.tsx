"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { createClient } from "@/lib/supabase/client";
import type { ExpenseCategory } from "@/types/expenses";

export function ManageCategoriesModal({
  open,
  categories,
  onClose,
  onRefresh,
}: {
  open: boolean;
  categories: ExpenseCategory[];
  onClose: () => void;
  onRefresh: () => Promise<void>;
}) {
  const t = useTranslations("Admin.table");
  const tExpenses = useTranslations("Admin.expenses");
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEn, setEditEn] = useState("");
  const [editAr, setEditAr] = useState("");
  const [newEn, setNewEn] = useState("");
  const [newAr, setNewAr] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  function startEdit(category: ExpenseCategory) {
    setError(null);
    setEditingId(category.id);
    setEditEn(category.name.en);
    setEditAr(category.name.ar);
  }

  async function saveEdit() {
    if (!editingId) return;
    setError(null);
    const { error: updateError } = await supabase
      .from("expense_categories")
      .update({ name: { en: editEn, ar: editAr } })
      .eq("id", editingId);
    if (updateError) {
      setError(t("saveFailed"));
      return;
    }
    setEditingId(null);
    await onRefresh();
  }

  async function handleAdd() {
    if (!newEn.trim() || !newAr.trim()) return;
    setError(null);
    const { error: insertError } = await supabase.from("expense_categories").insert({ name: { en: newEn, ar: newAr } });
    if (insertError) {
      setError(t("saveFailed"));
      return;
    }
    setNewEn("");
    setNewAr("");
    await onRefresh();
  }

  async function handleDelete(id: string) {
    setError(null);
    const { error: deleteError } = await supabase.from("expense_categories").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.code === "23503" ? tExpenses("expenseCategoryInUse") : t("saveFailed"));
      return;
    }
    await onRefresh();
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-bg-surface p-6 shadow-lg">
          <Dialog.Title className="font-heading text-lg font-semibold text-text-primary">
            {tExpenses("manageCategoriesTitle")}
          </Dialog.Title>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

          <div className="mt-4 flex max-h-[320px] flex-col gap-2 overflow-y-auto">
            {categories.length === 0 && <p className="py-4 text-center text-sm text-text-secondary">{tExpenses("noCategories")}</p>}
            {categories.map((category) =>
              editingId === category.id ? (
                <div key={category.id} className="flex flex-col gap-2 rounded-xl border-[1.5px] border-border-default p-2.5">
                  <input
                    value={editEn}
                    onChange={(e) => setEditEn(e.target.value)}
                    placeholder={t("nameEn")}
                    className="rounded-lg border border-border-default bg-bg-surface p-2 text-sm"
                  />
                  <input
                    dir="rtl"
                    value={editAr}
                    onChange={(e) => setEditAr(e.target.value)}
                    placeholder={t("nameAr")}
                    className="rounded-lg border border-border-default bg-bg-surface p-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <Button type="button" variant="brand-primary" size="sm" className="flex-1 justify-center" onClick={saveEdit}>
                      {t("save")}
                    </Button>
                    <Button
                      type="button"
                      variant="brand-ghost"
                      size="sm"
                      className="flex-1 justify-center bg-bg-surface"
                      onClick={() => setEditingId(null)}
                    >
                      {t("cancel")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div key={category.id} className="flex items-center justify-between gap-2 rounded-xl border-[1.5px] border-border-default p-2.5">
                  <span className="text-sm text-text-primary">
                    {category.name.en} / {category.name.ar}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("edit")}
                      onClick={() => startEdit(category)}
                      className="size-8 rounded-lg text-text-secondary"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("delete")}
                      onClick={() => setConfirmingDeleteId(category.id)}
                      className="size-8 rounded-lg text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ),
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2 border-t border-border-default pt-4">
            <div className="flex gap-2">
              <input
                value={newEn}
                onChange={(e) => setNewEn(e.target.value)}
                placeholder={t("nameEn")}
                className="min-w-0 flex-1 rounded-lg border border-border-default bg-bg-surface p-2 text-sm"
              />
              <input
                dir="rtl"
                value={newAr}
                onChange={(e) => setNewAr(e.target.value)}
                placeholder={t("nameAr")}
                className="min-w-0 flex-1 rounded-lg border border-border-default bg-bg-surface p-2 text-sm"
              />
            </div>
            <Button
              type="button"
              variant="brand-ghost"
              size="sm"
              className="justify-center bg-bg-surface"
              disabled={!newEn.trim() || !newAr.trim()}
              onClick={handleAdd}
            >
              {tExpenses("addCategory")}
            </Button>
          </div>

          <div className="mt-5">
            <Button type="button" variant="brand-primary" className="w-full justify-center" onClick={onClose}>
              {tExpenses("done")}
            </Button>
          </div>

          <ConfirmDialog
            open={!!confirmingDeleteId}
            title={t("deleteTitle")}
            message={t("deleteMessage", {
              item: categories.find((c) => c.id === confirmingDeleteId)?.name.en ?? "",
            })}
            confirmLabel={t("delete")}
            cancelLabel={t("cancel")}
            onConfirm={() => {
              const id = confirmingDeleteId!;
              setConfirmingDeleteId(null);
              handleDelete(id);
            }}
            onCancel={() => setConfirmingDeleteId(null)}
          />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
