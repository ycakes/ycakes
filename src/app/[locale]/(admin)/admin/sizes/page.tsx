import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { SizesPageContent } from "@/components/admin/sizes/SizesPageContent";
import type { Category, Size } from "@/types/catalog";

export default async function AdminSizesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { locale } = await params;
  await requireAdmin(locale);
  const { category } = await searchParams;
  const supabase = await createClient();

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, parent_id, name, slug, sort_order, image_url")
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

  const sizeIds = (sizes ?? []).map((s) => s.id);
  const { data: sizeTiers, error: sizeTiersError } =
    sizeIds.length > 0
      ? await supabase.from("size_tiers").select("size_id, tiers(tier_count)").in("size_id", sizeIds)
      : { data: [], error: null };
  if (sizeTiersError) throw sizeTiersError;

  const tiersBySizeId: Record<string, number[]> = {};
  for (const row of sizeTiers ?? []) {
    const tierCount = (row.tiers as unknown as { tier_count: number } | null)?.tier_count;
    if (tierCount == null) continue;
    (tiersBySizeId[row.size_id] ??= []).push(tierCount);
  }
  for (const counts of Object.values(tiersBySizeId)) counts.sort((a, b) => a - b);

  return (
    <SizesPageContent
      key={selectedCategoryId}
      categories={categories as Category[]}
      selectedCategoryId={selectedCategoryId}
      initialSizes={(sizes ?? []) as (Size & { active: boolean })[]}
      tiersBySizeId={tiersBySizeId}
    />
  );
}
