import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { DeliveryCalendarPageContent } from "@/components/admin/deliveryCalendar/DeliveryCalendarPageContent";

export default async function AdminDeliveryCalendarPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdmin(locale);
  const supabase = await createClient();

  const { data, error } = await supabase.from("delivery_calendar_blocks").select("id, blocked_date").order("blocked_date");
  if (error) throw error;

  return <DeliveryCalendarPageContent locale={locale as "en" | "ar"} initialBlocks={data} />;
}
