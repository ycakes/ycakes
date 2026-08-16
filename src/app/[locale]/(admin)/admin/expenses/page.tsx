import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { ExpensesPageContent } from "@/components/admin/expenses/ExpensesPageContent";
import type { ExpenseCategory, ExpenseRow } from "@/types/expenses";

export default async function AdminExpensesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdmin(locale);
  const supabase = await createClient();

  const [{ data: expenses, error: expensesError }, { data: categories, error: categoriesError }] = await Promise.all([
    supabase
      .from("expenses")
      .select("id, category_id, amount, expense_date, description, expense_categories(id, name)")
      .order("expense_date", { ascending: false }),
    supabase.from("expense_categories").select("id, name, active"),
  ]);

  if (expensesError) throw expensesError;
  if (categoriesError) throw categoriesError;

  return (
    <ExpensesPageContent
      initialExpenses={expenses as unknown as ExpenseRow[]}
      categories={categories as ExpenseCategory[]}
    />
  );
}
