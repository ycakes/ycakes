import { createClient } from "@/lib/supabase/server";
import type { Cake, Category } from "@/types/catalog";

const TOP_LEVEL_SLUGS = [
  "birthday",
  "wedding",
  "graduation",
  "bento",
  "custom",
  "candy-corner",
] as const;

export async function getTopLevelCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, parent_id, name, slug, sort_order")
    .is("parent_id", null)
    .in("slug", TOP_LEVEL_SLUGS)
    .order("sort_order");

  if (error) throw error;
  return data;
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, parent_id, name, slug, sort_order")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getSubcategories(parentId: string): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, parent_id, name, slug, sort_order")
    .eq("parent_id", parentId)
    .order("sort_order");

  if (error) throw error;
  return data;
}

/** Trending cakes for the Home page: `limit` featured cakes per top-level category. */
export async function getTrendingCakesByCategory(
  limit = 4,
): Promise<Record<string, Cake[]>> {
  const supabase = await createClient();
  const categories = await getTopLevelCategories();
  const candyCorner = categories.find((c) => c.slug === "candy-corner");
  const subcategories = candyCorner ? await getSubcategories(candyCorner.id) : [];

  const result: Record<string, Cake[]> = {};

  for (const category of categories) {
    if (category.slug === "candy-corner") {
      const subIds = subcategories.map((s) => s.id);
      if (subIds.length === 0) {
        result[category.slug] = [];
        continue;
      }
      const { data, error } = await supabase
        .from("cakes")
        .select("id, category_id, name, description, base_price, primary_image_url, featured, sort_order")
        .in("category_id", subIds)
        .eq("active", true)
        .order("sort_order")
        .limit(limit);
      if (error) throw error;
      result[category.slug] = data;
      continue;
    }

    const { data, error } = await supabase
      .from("cakes")
      .select("id, category_id, name, description, base_price, primary_image_url, featured, sort_order")
      .eq("category_id", category.id)
      .eq("active", true)
      .order("sort_order")
      .limit(limit);
    if (error) throw error;
    result[category.slug] = data;
  }

  return result;
}

export async function getCakesByCategorySlug(slug: string): Promise<Cake[]> {
  const supabase = await createClient();
  const category = await getCategoryBySlug(slug);
  if (!category) return [];

  let categoryIds = [category.id];
  if (category.parent_id === null) {
    const subcategories = await getSubcategories(category.id);
    if (subcategories.length > 0) {
      categoryIds = subcategories.map((s) => s.id);
    }
  }

  const { data, error } = await supabase
    .from("cakes")
    .select("id, category_id, name, description, base_price, primary_image_url, featured, sort_order")
    .in("category_id", categoryIds)
    .eq("active", true)
    .order("sort_order");

  if (error) throw error;
  return data;
}

export async function getCakeById(id: string): Promise<Cake | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cakes")
    .select("id, category_id, name, description, base_price, primary_image_url, featured, sort_order")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}
