import { createClient } from "@/lib/supabase/server";
import { FlavorsPageContent } from "@/components/admin/flavors/FlavorsPageContent";
import type { Flavor } from "@/types/catalog";

export default async function AdminFlavorsPage() {
  const supabase = await createClient();
  const [{ data, error }, { data: restrictions, error: restrictionsError }] = await Promise.all([
    supabase.from("flavors").select("id, name, price_modifier, active, sort_order").order("sort_order"),
    supabase.from("category_flavors").select("flavor_id, categories(name)"),
  ]);

  if (error) throw error;
  if (restrictionsError) throw restrictionsError;

  const restrictionsByFlavor: Record<string, string[]> = {};
  for (const row of restrictions ?? []) {
    const categoryName = (row.categories as unknown as { name: { en: string } } | null)?.name?.en;
    if (!categoryName) continue;
    (restrictionsByFlavor[row.flavor_id] ??= []).push(categoryName);
  }

  return (
    <FlavorsPageContent
      initialFlavors={data as (Flavor & { active: boolean; sort_order: number })[]}
      restrictionsByFlavor={restrictionsByFlavor}
    />
  );
}
