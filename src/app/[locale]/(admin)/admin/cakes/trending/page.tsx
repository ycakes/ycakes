import { createClient } from "@/lib/supabase/server";
import { TrendingCakesContent } from "@/components/admin/cakes/TrendingCakesContent";

export default async function AdminTrendingCakesPage() {
  const supabase = await createClient();

  const [{ data: categories, error: categoriesError }, { data: cakes, error: cakesError }] = await Promise.all([
    supabase.from("categories").select("id, parent_id, name, slug, sort_order, image_url").order("sort_order"),
    supabase
      .from("cakes")
      .select("id, category_id, name, description, base_price, primary_image_url, featured, allow_fake, sort_order, active")
      .eq("active", true)
      .order("sort_order"),
  ]);

  if (categoriesError) throw categoriesError;
  if (cakesError) throw cakesError;

  return <TrendingCakesContent categories={categories} cakes={cakes} />;
}
