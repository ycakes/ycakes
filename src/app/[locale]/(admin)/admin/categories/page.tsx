import { createClient } from "@/lib/supabase/server";
import { CategoriesPageContent } from "@/components/admin/categories/CategoriesPageContent";
import type { Category } from "@/types/catalog";

export default async function AdminCategoriesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, parent_id, name, slug, active, sort_order")
    .order("sort_order");

  if (error) throw error;

  return <CategoriesPageContent initialCategories={data as (Category & { active: boolean })[]} />;
}
