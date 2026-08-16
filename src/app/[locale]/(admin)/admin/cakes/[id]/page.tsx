import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { CakeForm } from "@/components/admin/cakes/CakeForm";

export default async function AdminCakeFormPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = await params;
  await requireAdmin(locale);
  const supabase = await createClient();

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, parent_id, name, slug, sort_order, image_url")
    .order("sort_order");
  if (categoriesError) throw categoriesError;

  if (id === "new") {
    return <CakeForm categories={categories} cake={null} images={[]} />;
  }

  const [{ data: cake, error: cakeError }, { data: images, error: imagesError }] = await Promise.all([
    supabase.from("cakes").select("id, category_id, name, description, base_price, featured, active, allow_fake").eq("id", id).maybeSingle(),
    supabase.from("cake_images").select("id, cake_id, url, sort_order, is_primary, public_id").eq("cake_id", id).order("sort_order"),
  ]);
  if (cakeError) throw cakeError;
  if (imagesError) throw imagesError;

  return <CakeForm categories={categories} cake={cake} images={images ?? []} />;
}
