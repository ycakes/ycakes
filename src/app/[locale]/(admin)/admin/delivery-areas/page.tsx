import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { DeliveryAreasPageContent } from "@/components/admin/deliveryAreas/DeliveryAreasPageContent";
import type { DeliveryArea } from "@/types/catalog";

export default async function AdminDeliveryAreasPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdmin(locale);
  const supabase = await createClient();

  const { data, error } = await supabase.from("delivery_areas").select("id, name, price, active, sort_order").order("sort_order");
  if (error) throw error;

  return <DeliveryAreasPageContent initialAreas={data as (DeliveryArea & { active: boolean; sort_order: number })[]} />;
}
