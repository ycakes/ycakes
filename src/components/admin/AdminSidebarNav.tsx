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
  MapPin,
  Calendar,
  Tag,
  Wallet,
  BarChart3,
  Users,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  User,
  X,
  Home,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, Link } from "@/i18n/navigation";
import { AdminNavItem } from "./AdminNavItem";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

function SidebarContent({
  adminName,
  role,
  collapsed,
  onToggleCollapsed,
  onCloseMobile,
  isMobile,
}: {
  adminName?: string;
  role: "admin" | "accountant";
  collapsed: boolean;
  onToggleCollapsed?: () => void;
  onCloseMobile?: () => void;
  isMobile: boolean;
}) {
  const t = useTranslations("Admin.nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const otherLocale = locale === "en" ? "ar" : "en";
  const isAdmin = role === "admin";

  const catalogItems = [
    { href: "/admin/cakes", icon: Cake, label: t("cakes") },
    { href: "/admin/categories", icon: FolderTree, label: t("categories") },
    { href: "/admin/sizes", icon: Ruler, label: t("sizes") },
    { href: "/admin/flavors", icon: IceCreamCone, label: t("flavors") },
    { href: "/admin/colors", icon: Palette, label: t("colors") },
    { href: "/admin/toppers", icon: PartyPopper, label: t("toppers") },
  ];

  const ordersItems = [
    { href: "/admin/orders", icon: ShoppingBag, label: t("allOrders") },
    { href: isAdmin ? "/admin/delivery-areas" : null, icon: MapPin, label: t("deliveryAreas"), dimmed: !isAdmin },
    { href: isAdmin ? "/admin/delivery-calendar" : null, icon: Calendar, label: t("deliveryCalendar"), dimmed: !isAdmin },
    { href: isAdmin ? "/admin/promo-codes" : null, icon: Tag, label: t("promoCodes"), dimmed: !isAdmin },
  ];

  const moneyItems = [
    { icon: Wallet, label: t("expenses") },
    { icon: BarChart3, label: t("analytics") },
  ];

  const teamItems = [{ icon: Users, label: t("adminsAndRoles") }];

  const displayName = adminName || t("role");
  const initial = adminName ? adminName.trim().charAt(0).toUpperCase() : null;
  const roleLabel = isAdmin ? t("role") : t("roleAccountant");

  return (
    <>
      <div
        className={cn(
          "flex shrink-0 border-b border-border-default",
          collapsed && !isMobile
            ? "flex-col items-center gap-2 py-3"
            : "h-[64px] items-center justify-between pe-[16px] ps-[20px]",
        )}
      >
        <div className={cn("flex min-w-0 items-center gap-2", collapsed && !isMobile && "flex-col gap-2")}>
          <Link
            href="/"
            aria-label={t("goToHome")}
            title={t("goToHome")}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-surface-alt"
          >
            <Home className="size-4" />
          </Link>
          {!collapsed && (
            <span className="truncate font-heading text-[18px] font-semibold text-brand-primary">
              {t("brand")}
            </span>
          )}
        </div>
        {!isMobile && onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={t("toggleSidebar")}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-surface-alt"
          >
            {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
          </button>
        )}
        {isMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label={t("toggleSidebar")}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-surface-alt"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-[20px] overflow-y-auto p-[16px]">
        {isAdmin && (
          <nav className="flex flex-col gap-1" onClick={onCloseMobile}>
            {!collapsed && (
              <p className="px-[12px] pb-1 text-[11px] font-semibold uppercase tracking-[0.44px] text-text-secondary">
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
        )}

        <nav className="flex flex-col gap-1" onClick={onCloseMobile}>
          {!collapsed && (
            <p className="px-[12px] pb-1 text-[11px] font-semibold uppercase tracking-[0.44px] text-text-secondary">
              {t("orders")}
            </p>
          )}
          {ordersItems.map((item) => (
            <AdminNavItem
              key={item.label}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={!!item.href && pathname.startsWith(item.href)}
              collapsed={collapsed}
              dimmed={item.dimmed}
            />
          ))}
        </nav>

        <nav className="flex flex-col gap-1">
          {!collapsed && (
            <p className="px-[12px] pb-1 text-[11px] font-semibold uppercase tracking-[0.44px] text-text-secondary">
              {t("money")}
            </p>
          )}
          {moneyItems.map((item) => (
            <AdminNavItem key={item.label} href={null} icon={item.icon} label={item.label} active={false} collapsed={collapsed} dimmed />
          ))}
        </nav>

        {isAdmin && (
          <nav className="flex flex-col gap-1">
            {!collapsed && (
              <p className="px-[12px] pb-1 text-[11px] font-semibold uppercase tracking-[0.44px] text-text-secondary">
                {t("team")}
              </p>
            )}
            {teamItems.map((item) => (
              <AdminNavItem key={item.label} href={null} icon={item.icon} label={item.label} active={false} collapsed={collapsed} dimmed />
            ))}
          </nav>
        )}
      </div>

      <div className="flex h-[64px] shrink-0 items-center justify-between border-t border-border-default bg-bg-subtle px-[16px]">
        <div className="flex min-w-0 items-center gap-[8px]">
          <span className="flex size-[32px] shrink-0 items-center justify-center rounded-full bg-bg-surface-alt text-text-primary">
            {initial ? <span className="text-[13px] font-semibold">{initial}</span> : <User className="size-4" />}
          </span>
          {!collapsed && (
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-sans text-[13px] font-medium text-text-primary">{displayName}</span>
              <span className="truncate font-sans text-[11px] text-text-secondary">{roleLabel}</span>
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-[4px]">
          <Link
            href={pathname}
            locale={otherLocale}
            aria-label={t("switchLanguage")}
            className="flex size-8 items-center justify-center rounded-lg text-[12px] font-semibold text-text-secondary hover:bg-bg-surface-alt"
          >
            {otherLocale.toUpperCase()}
          </Link>
          <button
            type="button"
            onClick={async () => {
              await createClient().auth.signOut();
              router.push("/");
            }}
            aria-label={t("logOut")}
            title={t("logOut")}
            className="flex size-8 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-surface-alt"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </>
  );
}

export function AdminSidebarNav({
  adminName,
  role,
  mobileOpen = false,
  onCloseMobile,
}: {
  adminName?: string;
  role: "admin" | "accountant";
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Mobile drawer: only exists in the DOM while open, so there is no
          transform/fixed-position state that can get stuck across a zoom
          or resize event — it's mounted or it isn't. */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onCloseMobile} aria-hidden="true" />
          <aside className="fixed inset-y-0 start-0 z-50 flex h-full w-[240px] flex-col border-e border-border-default bg-bg-surface lg:hidden">
            <SidebarContent adminName={adminName} role={role} collapsed={false} onCloseMobile={onCloseMobile} isMobile />
          </aside>
        </>
      )}

      {/* Desktop sidebar: always in normal flow on lg+, never fixed/translated,
          so there is nothing for a stuck transform state to happen to. */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-e border-border-default bg-bg-surface lg:flex",
          collapsed ? "lg:w-[76px]" : "lg:w-[240px]",
        )}
      >
        <SidebarContent adminName={adminName} role={role} collapsed={collapsed} onToggleCollapsed={() => setCollapsed((c) => !c)} isMobile={false} />
      </aside>
    </>
  );
}
