import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { StaffPageContent, type StaffRow } from "@/components/admin/staff/StaffPageContent";

export default async function AdminStaffPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const profile = await requireAdmin(locale);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_staff");

  if (error) throw error;

  return <StaffPageContent initialStaff={data as StaffRow[]} currentUserId={profile.id} />;
}
