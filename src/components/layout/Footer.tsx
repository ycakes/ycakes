import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const quickLinks = [
  { href: "/", key: "home" },
  { href: "/shop", key: "shop" },
  { href: "/shop/custom", key: "customCakes" },
  { href: "/#footer", key: "contact" },
] as const;

export function Footer() {
  const t = useTranslations("Footer");

  return (
    <footer
      id="footer"
      className="flex w-full flex-col gap-10 bg-brand-primary px-6 pb-8 pt-16 md:px-[100px]"
    >
      <div className="flex flex-col gap-10 md:flex-row md:gap-[100px]">
        <div className="flex w-full max-w-[320px] flex-col gap-4">
          <div className="relative h-[70px] w-[140px] overflow-hidden rounded-2xl bg-bg-surface-alt">
            <Image
              src="/images/brand/footer-logo.png"
              alt="YCakes"
              fill
              className="object-contain p-2"
            />
          </div>
          <p className="max-w-[300px] text-sm text-text-on-brand-muted">{t("tagline")}</p>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-base font-semibold text-white">{t("quickLinks")}</p>
          {quickLinks.map((link) => (
            <Link key={link.key} href={link.href} className="text-sm text-text-on-brand-muted">
              {t(link.key)}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-base font-semibold text-white">{t("getInTouch")}</p>
          <a
            href="https://wa.me/201001234567"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 text-sm text-text-on-brand-muted"
          >
            <Image src="/icons/whatsapp.svg" alt="" width={18} height={18} />
            +20 100 123 4567
          </a>
          <a
            href="https://instagram.com/ycakes.eg"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 text-sm text-text-on-brand-muted"
          >
            <Image src="/icons/instagram.svg" alt="" width={18} height={18} />
            @ycakes.eg
          </a>
        </div>
      </div>

      <div className="h-px w-full bg-white/15" />
      <p className="w-full text-center text-[13px] text-text-on-brand-muted">
        {t("copyright", { year: new Date().getFullYear() })}
      </p>
    </footer>
  );
}
