import { requireAdmin } from "@/lib/admin/requireAdmin";
import { AdminSidebarNav } from "@/components/admin/AdminSidebarNav";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const profile = await requireAdmin(locale);
  const adminName = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || undefined;

  return (
    <div className="flex min-h-screen bg-bg-page">
      <AdminSidebarNav adminName={adminName} />
      <div className="flex-1 overflow-x-auto">{children}</div>
    </div>
  );
}
