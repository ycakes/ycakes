"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Menu as MenuIcon, User, X } from "lucide-react";
import { Menu } from "@base-ui/react/menu";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useCartCount } from "@/store/cart";
import { useSession } from "@/hooks/useSession";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ContactModal } from "@/components/layout/ContactModal";

const navLinks = [
  { href: "/", key: "home" },
  { href: "/shop", key: "shop" },
  { href: "/shop/custom", key: "customCakes" },
  { href: "/#footer", key: "contact" },
] as const;

export function NavBar({ className }: { className?: string }) {
  const t = useTranslations("NavBar");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const cartCount = useCartCount();
  const { session, isAdmin } = useSession();
  const otherLocale = locale === "en" ? "ar" : "en";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const closeMenuTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openProfileMenu() {
    if (closeMenuTimer.current) clearTimeout(closeMenuTimer.current);
    setProfileMenuOpen(true);
  }

  function scheduleCloseProfileMenu() {
    closeMenuTimer.current = setTimeout(() => setProfileMenuOpen(false), 150);
  }

  useEffect(() => {
    return () => {
      if (closeMenuTimer.current) clearTimeout(closeMenuTimer.current);
    };
  }, []);

  async function handleLogOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  // Most-specific href wins so /shop/custom highlights "Custom Cakes" only,
  // while any other /shop/[category] still highlights "Shop".
  const activeHref = [...navLinks]
    .sort((a, b) => b.href.length - a.href.length)
    .find((link) => pathname === link.href || pathname.startsWith(`${link.href}/`))?.href;

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative flex h-20 w-full items-center justify-between gap-3 px-4 drop-shadow-[0px_1px_1.5px_rgba(43,30,25,0.08)] sm:h-24 sm:px-6 md:px-[100px]">
        <Link
          href="/"
          className="relative h-12 w-20 shrink-0 transition-transform duration-150 hover:scale-105 sm:h-16 sm:w-28"
        >
          <Image
            src="/images/brand/logo.png"
            alt="YCakes"
            fill
            sizes="112px"
            className="object-contain"
            priority
          />
        </Link>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 text-[15px] font-normal md:flex">
          {navLinks.map((link) => {
            const active = activeHref === link.href;
            const linkClassName = cn(
              "inline-block text-text-primary transition-transform duration-150 hover:scale-110",
              active && "text-brand-secondary underline underline-offset-4",
            );
            if (link.key === "contact") {
              return (
                <ContactModal key={link.key} className={linkClassName}>
                  {t(link.key)}
                </ContactModal>
              );
            }
            return (
              <Link key={link.key} href={link.href} className={linkClassName}>
                {t(link.key)}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href={pathname}
            locale={otherLocale}
            className="rounded-full border border-border-default bg-bg-surface px-2.5 py-1.5 text-[13px] font-semibold text-text-primary shadow-sm transition-transform duration-150 hover:scale-105"
          >
            {otherLocale.toUpperCase()}
          </Link>
          {session ? (
            <Menu.Root open={profileMenuOpen} onOpenChange={setProfileMenuOpen}>
              <Menu.Trigger
                aria-label={t("profile")}
                onMouseEnter={openProfileMenu}
                onMouseLeave={scheduleCloseProfileMenu}
                className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border-default bg-bg-surface text-text-primary shadow-sm transition-transform duration-150 hover:scale-105 sm:size-11"
              >
                <User className="size-4" />
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner side="bottom" align="center" sideOffset={8} className="z-30">
                  <Menu.Popup
                    onMouseEnter={openProfileMenu}
                    onMouseLeave={scheduleCloseProfileMenu}
                    className="w-max rounded-2xl border border-border-default bg-bg-surface p-1.5 shadow-md"
                  >
                    <Menu.LinkItem
                      render={<Link href="/profile" />}
                      className="block w-full cursor-pointer whitespace-nowrap rounded-xl px-4 py-2 text-center text-sm text-text-primary data-[highlighted]:bg-bg-surface-alt"
                    >
                      {t("profileLink")}
                    </Menu.LinkItem>
                    {isAdmin && (
                      <Menu.LinkItem
                        render={<Link href="/admin" />}
                        className="block w-full cursor-pointer whitespace-nowrap rounded-xl px-4 py-2 text-center text-sm text-text-primary data-[highlighted]:bg-bg-surface-alt"
                      >
                        {t("dashboard")}
                      </Menu.LinkItem>
                    )}
                    <Menu.Item
                      onClick={handleLogOut}
                      className="block w-full cursor-pointer whitespace-nowrap rounded-xl px-4 py-2 text-center text-sm text-text-primary data-[highlighted]:bg-bg-surface-alt"
                    >
                      {t("logOut")}
                    </Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          ) : (
            <Link
              href="/login"
              aria-label={t("profile")}
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border-default bg-bg-surface text-text-primary shadow-sm transition-transform duration-150 hover:scale-105 sm:size-11"
            >
              <User className="size-4" />
            </Link>
          )}
          <Link
            href="/cart"
            className="relative flex size-10 shrink-0 items-center justify-center rounded-full border border-border-default bg-bg-surface shadow-sm transition-transform duration-150 hover:scale-105 sm:size-11"
          >
            {cartCount > 0 && (
              <span className="absolute -top-1 end-0 flex size-4 items-center justify-center rounded-full bg-brand-secondary text-[10px] font-semibold text-text-on-brand">
                {cartCount}
              </span>
            )}
            <Image src="/icons/cart.svg" alt="" width={20} height={20} />
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? t("closeMenu") : t("openMenu")}
            aria-expanded={mobileOpen}
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border-default bg-bg-surface text-text-primary shadow-sm transition-transform duration-150 hover:scale-105 md:hidden"
          >
            {mobileOpen ? <X className="size-5" /> : <MenuIcon className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="absolute inset-x-0 top-full z-20 flex flex-col gap-1 border-t border-border-default bg-bg-surface px-4 py-3 shadow-md md:hidden">
          {navLinks.map((link) => {
            const active = activeHref === link.href;
            const linkClassName = cn(
              "rounded-xl px-3 py-2.5 text-start text-[15px] text-text-primary",
              active && "bg-bg-surface-alt text-brand-secondary",
            );
            if (link.key === "contact") {
              return (
                <ContactModal key={link.key} className={linkClassName}>
                  {t(link.key)}
                </ContactModal>
              );
            }
            return (
              <Link
                key={link.key}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={linkClassName}
              >
                {t(link.key)}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
