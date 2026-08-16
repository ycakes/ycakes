"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { AdminSidebarNav } from "./AdminSidebarNav";

export function AdminShell({
  adminName,
  children,
}: {
  adminName?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("Admin.nav");
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-bg-page">
      <AdminSidebarNav adminName={adminName} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-auto">
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border-default bg-bg-surface px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label={t("toggleSidebar")}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-surface-alt"
          >
            <Menu className="size-5" />
          </button>
          <span className="truncate font-heading text-[16px] font-semibold text-brand-primary">{t("brand")}</span>
        </div>
        {children}
      </div>
    </div>
  );
}
