"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { RowActions } from "@/components/admin/RowActions";
import { DateRangeFilterButton, type DateRange } from "@/components/admin/orders/DateRangeFilterButton";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ExpenseFormDialog, type ExpenseFormValue } from "./ExpenseFormDialog";
import { ManageCategoriesModal } from "./ManageCategoriesModal";
import type { ExpenseCategory, ExpenseRow } from "@/types/expenses";

export function ExpensesPageContent({
  initialExpenses,
  categories: initialCategories,
}: {
  initialExpenses: ExpenseRow[];
  categories: ExpenseCategory[];
}) {
  const t = useTranslations("Admin.table");
  const tExpenses = useTranslations("Admin.expenses");
  const locale = useLocale() as "en" | "ar";
  const supabase = createClient();

  const [expenses, setExpenses] = useState(initialExpenses);
  const [categories, setCategories] = useState(initialCategories);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });
  const [editing, setEditing] = useState<ExpenseFormValue | null | undefined>(undefined);
  const [addKey, setAddKey] = useState(0);
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.en.localeCompare(b.name.en)),
    [categories],
  );

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      if (categoryFilter && expense.category_id !== categoryFilter) return false;
      if (dateRange.from && expense.expense_date < dateRange.from) return false;
      if (dateRange.to && expense.expense_date > dateRange.to) return false;
      return true;
    });
  }, [expenses, categoryFilter, dateRange]);

  async function refreshExpenses() {
    const { data, error: fetchError } = await supabase
      .from("expenses")
      .select("id, category_id, amount, expense_date, description, expense_categories(id, name)")
      .order("expense_date", { ascending: false });
    if (fetchError) {
      setError(t("saveFailed"));
      return;
    }
    if (data) setExpenses(data as unknown as ExpenseRow[]);
  }

  async function refreshCategories() {
    const { data, error: fetchError } = await supabase.from("expense_categories").select("id, name, active");
    if (fetchError) {
      setError(t("saveFailed"));
      return;
    }
    if (data) setCategories(data as ExpenseCategory[]);
  }

  async function handleSave(value: ExpenseFormValue) {
    setError(null);
    const payload = {
      category_id: value.category_id,
      amount: Number(value.amount),
      expense_date: value.expense_date,
      description: value.description.trim() || null,
    };
    if (value.id) {
      const { error: updateError } = await supabase.from("expenses").update(payload).eq("id", value.id);
      if (updateError) {
        setError(t("saveFailed"));
        return;
      }
    } else {
      const { error: insertError } = await supabase.from("expenses").insert(payload);
      if (insertError) {
        setError(t("saveFailed"));
        return;
      }
    }
    setEditing(undefined);
    await refreshExpenses();
  }

  async function handleDelete(id: string) {
    setError(null);
    const { error: deleteError } = await supabase.from("expenses").delete().eq("id", id);
    if (deleteError) {
      setError(t("saveFailed"));
      return;
    }
    await refreshExpenses();
  }

  function formatDate(iso: string) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(new Date(y, m - 1, d));
  }

  const columns: AdminTableColumn<ExpenseRow>[] = [
    { header: tExpenses("colDate"), render: (row) => formatDate(row.expense_date) },
    { header: tExpenses("colCategory"), render: (row) => row.expense_categories?.name[locale] ?? "—" },
    {
      header: tExpenses("colAmount"),
      render: (row) => (
        <span className="font-semibold" dir="ltr">
          {row.amount.toLocaleString(locale === "ar" ? "ar-EG" : "en-US")} EGP
        </span>
      ),
    },
    { header: tExpenses("colNotes"), render: (row) => <span className="text-text-secondary">{row.description ?? "—"}</span> },
    {
      header: t("actions"),
      align: "end",
      render: (row) => (
        <RowActions
          itemLabel={row.expense_categories?.name.en ?? ""}
          onEdit={() =>
            setEditing({
              id: row.id,
              expense_date: row.expense_date,
              category_id: row.category_id,
              amount: String(row.amount),
              description: row.description ?? "",
            })
          }
          onDelete={() => handleDelete(row.id)}
        />
      ),
    },
  ];

  return (
    <main className="flex flex-1 flex-col">
      <div className="flex min-h-[80px] shrink-0 flex-wrap items-center gap-3 border-b border-border-default bg-bg-surface px-4 py-3 sm:px-8">
        <h1 className="font-heading text-[28px] font-bold text-brand-primary">{tExpenses("title")}</h1>
        <div className="flex w-full shrink-0 flex-wrap gap-2 sm:ms-auto sm:w-auto">
          <Button type="button" variant="brand-primary" size="xl" className="h-auto px-4 py-3 text-sm" onClick={() => setManageCategoriesOpen(true)}>
            {tExpenses("manageCategories")}
          </Button>
          <Button
            type="button"
            variant="brand-primary"
            size="xl"
            className="h-auto px-4 py-3 text-sm"
            onClick={() => {
              setEditing(null);
              setAddKey((k) => k + 1);
            }}
          >
            {tExpenses("addExpense")}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 bg-bg-surface-alt px-4 py-6 sm:px-8">
        <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-border-default bg-bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-text-secondary">{tExpenses("categoryLabel")}</span>
            <CategoryChip label={t("all")} active={!categoryFilter} onClick={() => setCategoryFilter(null)} />
            {sortedCategories.map((category) => (
              <CategoryChip
                key={category.id}
                label={category.name[locale]}
                active={categoryFilter === category.id}
                onClick={() => setCategoryFilter(category.id)}
              />
            ))}
          </div>
          <div className="ms-auto">
            <DateRangeFilterButton locale={locale} label={tExpenses("dateRangeLabel")} value={dateRange} onChange={setDateRange} />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <AdminTable
          columns={columns}
          rows={filteredExpenses}
          getRowId={(row) => row.id}
          emptyMessage={tExpenses("noExpenses")}
        />
      </div>

      <ExpenseFormDialog
        key={editing?.id ?? `new-${addKey}`}
        open={editing !== undefined}
        initialValue={editing ?? null}
        categories={sortedCategories}
        onSave={handleSave}
        onCancel={() => setEditing(undefined)}
      />
      <ManageCategoriesModal
        open={manageCategoriesOpen}
        categories={sortedCategories}
        onClose={() => setManageCategoriesOpen(false)}
        onRefresh={refreshCategories}
      />
    </main>
  );
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center rounded-full px-3 py-2 text-sm",
        active ? "bg-brand-primary text-text-on-brand" : "border-[1.5px] border-border-default bg-bg-surface text-text-primary",
      )}
    >
      {label}
    </button>
  );
}
