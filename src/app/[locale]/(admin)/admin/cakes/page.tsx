import { createClient } from "@/lib/supabase/server";
import { CakesListContent } from "@/components/admin/cakes/CakesListContent";

const PAGE_SIZE = 20;

export default async function AdminCakesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; subcategory?: string; sort?: string; dir?: string; page?: string; search?: string }>;
}) {
  const { category, subcategory, sort, dir, page, search } = await searchParams;
  const supabase = await createClient();

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, parent_id, name, slug, sort_order, image_url")
    .order("sort_order");
  if (categoriesError) throw categoriesError;

  const topLevel = categories.filter((c) => c.parent_id === null);
  const candyCorner = topLevel.find((c) => c.slug === "candy-corner");
  const subcategories = candyCorner ? categories.filter((c) => c.parent_id === candyCorner.id) : [];

  let categoryIds: string[] | null = null;
  if (subcategory) {
    categoryIds = [subcategory];
  } else if (category === "candy-corner") {
    categoryIds = subcategories.map((s) => s.id);
  } else if (category) {
    const match = topLevel.find((c) => c.slug === category);
    categoryIds = match ? [match.id] : [];
  }

  let query = supabase.from("cakes").select("id, category_id, name, description, base_price, primary_image_url, featured, allow_fake, active, sort_order");
  if (categoryIds) query = query.in("category_id", categoryIds);

  // Note: sorting by `name` sorts the raw jsonb value, not name.en
  // alphabetically — fine for a small admin catalog, not a general solution.
  const sortColumn = sort === "price" ? "base_price" : sort === "name" ? "name" : "sort_order";
  query = query.order(sortColumn, { ascending: dir !== "desc" });

  const { data: allCakes, error: cakesError } = await query;
  if (cakesError) throw cakesError;

  const needle = search?.trim().toLowerCase();
  const cakes = needle
    ? allCakes.filter((cake) => {
        const name = cake.name as { en?: string; ar?: string };
        return name.en?.toLowerCase().includes(needle) || name.ar?.toLowerCase().includes(needle);
      })
    : allCakes;

  const currentPage = Math.max(1, Number(page) || 1);
  const totalPages = Math.max(1, Math.ceil(cakes.length / PAGE_SIZE));
  const pageCakes = cakes.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <CakesListContent
      key={`${category ?? ""}|${subcategory ?? ""}|${sort ?? ""}|${dir ?? ""}|${currentPage}|${search ?? ""}`}
      topLevel={topLevel}
      subcategories={subcategories}
      activeCategory={category ?? null}
      activeSubcategory={subcategory ?? null}
      cakes={pageCakes}
      categoriesById={Object.fromEntries(categories.map((c) => [c.id, c]))}
      sort={sort ?? "sort_order"}
      dir={(dir as "asc" | "desc") ?? "asc"}
      currentPage={currentPage}
      totalPages={totalPages}
      search={search ?? ""}
    />
  );
}
