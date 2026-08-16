import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { FlavorsPageContent } from "@/components/admin/flavors/FlavorsPageContent";
import type { Category, Flavor } from "@/types/catalog";

export default async function AdminFlavorsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdmin(locale);
  const supabase = await createClient();
  const [{ data, error }, { data: restrictions, error: restrictionsError }, { data: categories, error: categoriesError }] =
    await Promise.all([
      supabase.from("flavors").select("id, name, price_modifier, active, sort_order").order("sort_order"),
      supabase.from("category_flavors").select("flavor_id, category_id, categories(name)"),
      supabase.from("categories").select("id, parent_id, name, slug, sort_order, image_url").order("sort_order"),
    ]);

  if (error) throw error;
  if (restrictionsError) throw restrictionsError;
  if (categoriesError) throw categoriesError;

  const restrictionsByFlavor: Record<string, { id: string; name: string }[]> = {};
  for (const row of restrictions ?? []) {
    const categoryName = (row.categories as unknown as { name: { en: string } } | null)?.name?.en;
    if (!categoryName) continue;
    (restrictionsByFlavor[row.flavor_id] ??= []).push({ id: row.category_id, name: categoryName });
  }

  return (
    <FlavorsPageContent
      initialFlavors={data as (Flavor & { active: boolean; sort_order: number })[]}
      restrictionsByFlavor={restrictionsByFlavor}
      allCategories={categories as Category[]}
    />
  );
}
