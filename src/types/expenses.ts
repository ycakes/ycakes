import type { Bilingual } from "@/types/catalog";

export type ExpenseCategory = {
  id: string;
  name: Bilingual;
  active: boolean;
};

export type ExpenseRow = {
  id: string;
  category_id: string;
  amount: number;
  expense_date: string;
  description: string | null;
  expense_categories: { id: string; name: Bilingual } | null;
};
