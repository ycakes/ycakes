import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { ColorsPageContent } from "@/components/admin/colors/ColorsPageContent";
import type { Color } from "@/types/catalog";

export default async function AdminColorsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdmin(locale);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("colors")
    .select("id, name, hex_code, active, sort_order")
    .order("sort_order");

  if (error) throw error;

  return <ColorsPageContent initialColors={data as (Color & { active: boolean; sort_order: number })[]} />;
}
