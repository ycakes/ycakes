import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ContactModal } from "@/components/layout/ContactModal";
import { CONTACT_INSTAGRAM_URL, CONTACT_PHONE_DISPLAY, CONTACT_WHATSAPP_URL } from "@/lib/contact";

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
          <div className="relative h-[70px] w-[140px] overflow-hidden rounded-2xl bg-bg-surface-alt transition-transform duration-150 hover:scale-105">
            <Image
              src="/images/brand/footer-logo.png"
              alt="YCakes"
              fill
              sizes="140px"
              className="object-contain p-2"
            />
          </div>
          <p className="max-w-[300px] text-sm text-text-on-brand-muted">{t("tagline")}</p>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-base font-semibold text-white">{t("quickLinks")}</p>
          {quickLinks.map((link) =>
            link.key === "contact" ? (
              <ContactModal
                key={link.key}
                className="inline-block w-fit text-start text-sm text-text-on-brand-muted transition-transform duration-150 hover:scale-105"
              >
                {t(link.key)}
              </ContactModal>
            ) : (
              <Link
                key={link.key}
                href={link.href}
                className="inline-block w-fit text-sm text-text-on-brand-muted transition-transform duration-150 hover:scale-105"
              >
                {t(link.key)}
              </Link>
            ),
          )}
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-base font-semibold text-white">{t("getInTouch")}</p>
          <a
            href={CONTACT_WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="flex w-fit items-center gap-2.5 text-sm text-text-on-brand-muted transition-transform duration-150 hover:scale-105"
          >
            <Image src="/icons/whatsapp.svg" alt="" width={18} height={18} />
            {CONTACT_PHONE_DISPLAY}
          </a>
          <a
            href={CONTACT_INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="flex w-fit items-center gap-2.5 text-sm text-text-on-brand-muted transition-transform duration-150 hover:scale-105"
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
