import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { ToppersPageContent } from "@/components/admin/toppers/ToppersPageContent";
import type { Color, Topper } from "@/types/catalog";

type Row = Topper & {
  active: boolean;
  sort_order: number;
  image_public_id: string | null;
  topper_colors: { color_id: string; colors: Color }[];
};

export default async function AdminToppersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdmin(locale);
  const supabase = await createClient();

  const [toppersRes, colorsRes] = await Promise.all([
    supabase
      .from("toppers")
      .select("id, name, price_modifier, has_color_variants, image_url, image_public_id, active, sort_order, topper_colors(color_id, colors(id, name, hex_code))")
      .order("sort_order"),
    supabase.from("colors").select("id, name, hex_code").eq("active", true).order("sort_order"),
  ]);

  if (toppersRes.error) throw toppersRes.error;
  if (colorsRes.error) throw colorsRes.error;

  return <ToppersPageContent initialToppers={toppersRes.data as unknown as Row[]} allColors={colorsRes.data} />;
}
