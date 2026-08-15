"use client";

import { useState } from "react";
import {
  Cake,
  FolderTree,
  Ruler,
  IceCreamCone,
  Palette,
  PartyPopper,
  ShoppingBag,
  Wallet,
  Users,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { AdminNavItem } from "./AdminNavItem";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";

export function AdminSidebarNav() {
  const t = useTranslations("Admin.nav");
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const catalogItems = [
    { href: "/admin/cakes", icon: Cake, label: t("cakes") },
    { href: "/admin/categories", icon: FolderTree, label: t("categories") },
    { href: "/admin/sizes", icon: Ruler, label: t("sizes") },
    { href: "/admin/flavors", icon: IceCreamCone, label: t("flavors") },
    { href: "/admin/colors", icon: Palette, label: t("colors") },
    { href: "/admin/toppers", icon: PartyPopper, label: t("toppers") },
  ];

  const futureItems = [
    { icon: ShoppingBag, label: t("orders") },
    { icon: Wallet, label: t("money") },
    { icon: Users, label: t("team") },
  ];

  return (
    <aside
      className={
        collapsed
          ? "flex h-full w-[76px] shrink-0 flex-col gap-6 border-e border-border-default bg-bg-surface p-3"
          : "flex h-full w-64 shrink-0 flex-col gap-6 border-e border-border-default bg-bg-surface p-4"
      }
    >
      <div className="flex items-center justify-between">
        {!collapsed && <span className="font-heading text-lg font-bold text-brand-primary">YCakes</span>}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={t("toggleSidebar")}
          className="rounded-lg p-1.5 text-text-secondary hover:bg-bg-surface-alt"
        >
          {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
        </button>
      </div>

      <nav className="flex flex-col gap-1">
        {!collapsed && (
          <p className="px-3 pb-1 text-xs font-semibold uppercase text-text-secondary/70">
            {t("catalog")}
          </p>
        )}
        {catalogItems.map((item) => (
          <AdminNavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={pathname.startsWith(item.href)}
            collapsed={collapsed}
          />
        ))}
      </nav>

      <nav className="flex flex-col gap-1">
        {futureItems.map((item) => (
          <AdminNavItem
            key={item.label}
            href={null}
            icon={item.icon}
            label={item.label}
            active={false}
            collapsed={collapsed}
          />
        ))}
      </nav>

      <button
        type="button"
        onClick={async () => {
          await createClient().auth.signOut();
          router.push("/");
        }}
        className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-primary hover:bg-bg-surface-alt"
      >
        <LogOut className="size-5 shrink-0" />
        {!collapsed && <span>{t("logOut")}</span>}
      </button>
    </aside>
  );
}
