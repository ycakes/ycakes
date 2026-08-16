import { requireStaff } from "@/lib/admin/requireAdmin";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const profile = await requireStaff(locale);
  const adminName = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || undefined;

  return (
    <AdminShell adminName={adminName} role={profile.role}>
      {children}
    </AdminShell>
  );
}
