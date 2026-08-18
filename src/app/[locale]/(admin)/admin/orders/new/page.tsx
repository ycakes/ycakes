import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { getBlockedDates, getColors, getDeliveryAreas, getFlavorsForCategory, getShapes, getSizesWithTiers, getTiers, getToppers } from "@/lib/catalog/queries";
import { NewOrderContent } from "@/components/admin/orders/NewOrderContent";
import type { SelectableCake } from "@/components/admin/orders/CakeSelect";

// Same Bento/Candy Corner exclusion as the storefront's Fake Cake toggle
// (src/app/[locale]/(storefront)/cakes/[id]/page.tsx) — kept in sync here
// since New Order builds its own catalog context server-side rather than
// reusing that page.
const NO_FAKE_CAKE_SLUGS = new Set(["bento", "candy-corner"]);

export default async function AdminNewOrderPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdmin(locale);
  const supabase = await createClient();

  const [{ data: cakes, error: cakesError }, { data: categories, error: categoriesError }, deliveryAreas, blockedDates, tiers, colors, shapes] =
    await Promise.all([
      supabase.from("cakes").select("id, name, category_id, active, allow_fake").order("sort_order"),
      supabase.from("categories").select("id, parent_id, slug").order("sort_order"),
      getDeliveryAreas(),
      getBlockedDates(),
      getTiers(),
      getColors(),
      getShapes(),
    ]);

  if (cakesError) throw cakesError;
  if (categoriesError) throw categoriesError;

  const catalogByCategoryId: Record<
    string,
    {
      sizes: Awaited<ReturnType<typeof getSizesWithTiers>>;
      tiers: typeof tiers;
      flavors: Awaited<ReturnType<typeof getFlavorsForCategory>>;
      colors: typeof colors;
      shapes: typeof shapes;
      toppers: Awaited<ReturnType<typeof getToppers>>;
      showToppers: boolean;
      allowFakeCake: boolean;
    }
  > = {};

  await Promise.all(
    categories.map(async (category) => {
      const topLevel = category.parent_id ? categories.find((c) => c.id === category.parent_id) : category;
      const showToppers = topLevel?.slug === "custom";
      const allowFakeCake = !NO_FAKE_CAKE_SLUGS.has(topLevel?.slug ?? "");
      const [sizes, flavors, toppers] = await Promise.all([
        getSizesWithTiers(category.id),
        getFlavorsForCategory(category.id),
        showToppers ? getToppers() : Promise.resolve([]),
      ]);
      catalogByCategoryId[category.id] = { sizes, tiers, flavors, colors, shapes, toppers, showToppers, allowFakeCake };
    }),
  );

  return (
    <NewOrderContent
      locale={locale as "en" | "ar"}
      cakes={cakes as SelectableCake[]}
      catalogByCategoryId={catalogByCategoryId}
      deliveryAreas={deliveryAreas}
      blockedDates={blockedDates}
    />
  );
}
