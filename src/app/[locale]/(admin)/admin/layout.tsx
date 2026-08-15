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
  await requireAdmin(locale);

  return (
    <div className="flex min-h-screen bg-bg-page">
      <AdminSidebarNav />
      <div className="flex-1 overflow-x-auto">{children}</div>
    </div>
  );
}
