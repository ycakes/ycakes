import { createClient } from "@/lib/supabase/server";
import { SizesPageContent } from "@/components/admin/sizes/SizesPageContent";
import type { Category, Size } from "@/types/catalog";

export default async function AdminSizesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const supabase = await createClient();

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, parent_id, name, slug, sort_order")
    .order("sort_order");
  if (categoriesError) throw categoriesError;

  const selectedCategoryId = category ?? categories[0]?.id ?? null;

  const { data: sizes, error: sizesError } = selectedCategoryId
    ? await supabase
        .from("sizes")
        .select("id, category_id, min_qty, max_qty, unit, price_modifier, active, sort_order")
        .eq("category_id", selectedCategoryId)
        .order("sort_order")
    : { data: [], error: null };
  if (sizesError) throw sizesError;

  return (
    <SizesPageContent
      categories={categories as Category[]}
      selectedCategoryId={selectedCategoryId}
      initialSizes={(sizes ?? []) as (Size & { active: boolean })[]}
    />
  );
}
