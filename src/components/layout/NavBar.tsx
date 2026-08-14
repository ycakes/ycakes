"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useCartCount } from "@/store/cart";
import { cn } from "@/lib/utils";

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
  const cartCount = useCartCount();
  const otherLocale = locale === "en" ? "ar" : "en";

  return (
    <div
      className={cn(
        "flex h-24 w-full items-center justify-between px-6 md:px-[100px] drop-shadow-[0px_1px_1.5px_rgba(43,30,25,0.08)]",
        className,
      )}
    >
      <Link href="/" className="relative h-16 w-28 shrink-0">
        <Image
          src="/images/brand/logo.png"
          alt="YCakes"
          fill
          className="object-contain"
          priority
        />
      </Link>

      <nav className="hidden items-center gap-6 text-[15px] font-normal md:flex">
        {navLinks.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.key}
              href={link.href}
              className={cn(
                "text-text-primary",
                active && "text-brand-secondary underline underline-offset-4",
              )}
            >
              {t(link.key)}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3">
        <Link
          href={pathname}
          locale={otherLocale}
          className="rounded-full border border-border-default px-2 py-1.5 text-[13px] font-semibold text-text-primary"
        >
          {otherLocale.toUpperCase()}
        </Link>
        <Link href="/cart" className="relative flex size-[30px] items-center justify-center">
          {cartCount > 0 && (
            <span className="absolute -top-1 end-0 flex size-4 items-center justify-center rounded-full bg-brand-secondary text-[10px] font-semibold text-text-on-brand">
              {cartCount}
            </span>
          )}
          <Image src="/icons/cart.svg" alt="" width={26} height={26} />
        </Link>
      </div>
    </div>
  );
}
