"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ExpenseCategory } from "@/types/expenses";

export type ExpenseFormValue = {
  id?: string;
  expense_date: string;
  category_id: string;
  amount: string;
  description: string;
};

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ExpenseFormDialog({
  open,
  initialValue,
  categories,
  onSave,
  onCancel,
}: {
  open: boolean;
  initialValue: ExpenseFormValue | null;
  categories: ExpenseCategory[];
  onSave: (value: ExpenseFormValue) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("Admin.table");
  const tExpenses = useTranslations("Admin.expenses");
  const [date, setDate] = useState(initialValue?.expense_date ?? todayISO());
  const [categoryId, setCategoryId] = useState(initialValue?.category_id ?? categories[0]?.id ?? "");
  const [amount, setAmount] = useState(initialValue?.amount ?? "");
  const [description, setDescription] = useState(initialValue?.description ?? "");

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[92vw] max-w-[420px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-bg-surface p-6 shadow-lg">
          <Dialog.Title className="font-heading text-lg font-semibold text-text-primary">
            {initialValue?.id ? t("edit") : t("add")}
          </Dialog.Title>
          <div className="mt-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
              {tExpenses("expenseDate")}
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
              {tExpenses("expenseCategory")}
              <Select
                value={categoryId}
                onValueChange={(value) => setCategoryId(value ?? "")}
                items={categories.map((c) => ({ value: c.id, label: `${c.name.en} / ${c.name.ar}` }))}
              >
                <SelectTrigger className="h-11 w-full bg-bg-surface text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="min-w-[var(--anchor-width)] bg-bg-surface" alignItemWithTrigger={false}>
                  {categories.map((c, index) => (
                    <SelectItem key={c.id} value={c.id} className={index > 0 ? "border-t border-border-default py-2.5 text-sm" : "py-2.5 text-sm"}>
                      {c.name.en} / {c.name.ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
              {tExpenses("expenseAmount")}
              <input
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-medium text-text-primary">
              {tExpenses("expenseNotes")}
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-sm"
              />
            </label>
          </div>
          <div className="mt-5 flex gap-2">
            <Button
              type="button"
              variant="brand-primary"
              className="flex-1 justify-center"
              disabled={!categoryId || !date || !amount}
              onClick={() => onSave({ id: initialValue?.id, expense_date: date, category_id: categoryId, amount, description })}
            >
              {t("save")}
            </Button>
            <Button type="button" variant="brand-ghost" className="flex-1 justify-center" onClick={onCancel}>
              {t("cancel")}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
