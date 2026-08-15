import { createClient } from "@/lib/supabase/server";
import { FlavorsPageContent } from "@/components/admin/flavors/FlavorsPageContent";
import type { Flavor } from "@/types/catalog";

export default async function AdminFlavorsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("flavors")
    .select("id, name, price_modifier, active, sort_order")
    .order("sort_order");

  if (error) throw error;

  return <FlavorsPageContent initialFlavors={data as (Flavor & { active: boolean; sort_order: number })[]} />;
}
