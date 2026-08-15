import { createClient } from "@/lib/supabase/server";
import type {
  Cake,
  Category,
  Color,
  DeliveryArea,
  Flavor,
  Shape,
  Size,
  Tier,
  Topper,
} from "@/types/catalog";

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
    .select("id, parent_id, name, slug, sort_order, image_url")
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
    .select("id, parent_id, name, slug, sort_order, image_url")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getSubcategories(parentId: string): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, parent_id, name, slug, sort_order, image_url")
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
        .select("id, category_id, name, description, base_price, primary_image_url, featured, allow_fake, sort_order")
        .in("category_id", subIds)
        .eq("active", true)
        .eq("featured", true)
        .order("sort_order")
        .limit(limit);
      if (error) throw error;
      result[category.slug] = data;
      continue;
    }

    const { data, error } = await supabase
      .from("cakes")
      .select("id, category_id, name, description, base_price, primary_image_url, featured, allow_fake, sort_order")
      .eq("category_id", category.id)
      .eq("active", true)
      .eq("featured", true)
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
    .select("id, category_id, name, description, base_price, primary_image_url, featured, allow_fake, sort_order")
    .in("category_id", categoryIds)
    .eq("active", true)
    .order("sort_order");

  if (error) throw error;
  return data;
}

export async function getAllCakes(): Promise<Cake[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cakes")
    .select("id, category_id, name, description, base_price, primary_image_url, featured, allow_fake, sort_order")
    .eq("active", true)
    .order("sort_order");

  if (error) throw error;
  return data;
}

export async function getCakeById(id: string): Promise<Cake | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cakes")
    .select("id, category_id, name, description, base_price, primary_image_url, featured, allow_fake, sort_order")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, parent_id, name, slug, sort_order, image_url")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** Sizes for a category, each enriched with the tier ids available at that size. */
export async function getSizesWithTiers(
  categoryId: string,
): Promise<(Size & { tierIds: string[] })[]> {
  const supabase = await createClient();
  const { data: sizes, error } = await supabase
    .from("sizes")
    .select("id, category_id, min_qty, max_qty, unit, price_modifier, sort_order")
    .eq("category_id", categoryId)
    .eq("active", true)
    .order("sort_order");
  if (error) throw error;
  if (sizes.length === 0) return [];

  const { data: sizeTiers, error: sizeTiersError } = await supabase
    .from("size_tiers")
    .select("size_id, tier_id")
    .in(
      "size_id",
      sizes.map((s) => s.id),
    );
  if (sizeTiersError) throw sizeTiersError;

  return sizes.map((size) => ({
    ...size,
    tierIds: sizeTiers.filter((st) => st.size_id === size.id).map((st) => st.tier_id),
  }));
}

export async function getTiers(): Promise<Tier[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tiers")
    .select("id, tier_count, price_modifier")
    .eq("active", true)
    .order("tier_count");

  if (error) throw error;
  return data;
}

export async function getFlavors(): Promise<Flavor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("flavors")
    .select("id, name, price_modifier")
    .eq("active", true)
    .order("sort_order");

  if (error) throw error;
  return data;
}

/** Flavors selectable for a category. No `category_flavors` rows = unrestricted (all flavors). */
export async function getFlavorsForCategory(categoryId: string): Promise<Flavor[]> {
  const supabase = await createClient();
  const { data: restricted, error: restrictedError } = await supabase
    .from("category_flavors")
    .select("flavor_id")
    .eq("category_id", categoryId);
  if (restrictedError) throw restrictedError;

  if (restricted.length === 0) return getFlavors();

  const { data, error } = await supabase
    .from("flavors")
    .select("id, name, price_modifier")
    .in(
      "id",
      restricted.map((r) => r.flavor_id),
    )
    .eq("active", true)
    .order("sort_order");

  if (error) throw error;
  return data;
}

export async function getColors(): Promise<Color[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("colors")
    .select("id, name, hex_code")
    .eq("active", true)
    .order("sort_order");

  if (error) throw error;
  return data;
}

export async function getShapes(): Promise<Shape[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shapes")
    .select("id, name, fake_eligible")
    .eq("active", true)
    .order("sort_order");

  if (error) throw error;
  return data;
}

export async function getToppers(): Promise<Topper[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("toppers")
    .select("id, name, price_modifier, has_color_variants, image_url")
    .eq("active", true)
    .order("sort_order");

  if (error) throw error;
  return data;
}

export async function getDeliveryAreas(): Promise<DeliveryArea[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("delivery_areas")
    .select("id, name, price")
    .eq("active", true)
    .order("sort_order");

  if (error) throw error;
  return data;
}

/** ISO ('YYYY-MM-DD') dates the admin has closed for both delivery and pickup. */
export async function getBlockedDates(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("delivery_calendar_blocks").select("blocked_date");

  if (error) throw error;
  return data.map((row) => row.blocked_date);
}
