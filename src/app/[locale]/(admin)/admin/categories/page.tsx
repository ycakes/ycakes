import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { CategoriesPageContent } from "@/components/admin/categories/CategoriesPageContent";
import type { Category } from "@/types/catalog";

export default async function AdminCategoriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdmin(locale);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, parent_id, name, slug, active, sort_order, image_url, image_public_id")
    .order("sort_order");

  if (error) throw error;

  return <CategoriesPageContent initialCategories={data as (Category & { active: boolean; image_public_id: string | null })[]} />;
}
