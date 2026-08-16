import { createClient } from "@/lib/supabase/server";
import { ColorsPageContent } from "@/components/admin/colors/ColorsPageContent";
import type { Color } from "@/types/catalog";

export default async function AdminColorsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("colors")
    .select("id, name, hex_code, active, sort_order")
    .order("sort_order");

  if (error) throw error;

  return <ColorsPageContent initialColors={data as (Color & { active: boolean; sort_order: number })[]} />;
}
