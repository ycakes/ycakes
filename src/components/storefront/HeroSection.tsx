import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { NavBar } from "@/components/layout/NavBar";
import { Button } from "@/components/ui/button";

const trustBadges = [
  { icon: "/icons/handmade.svg", titleKey: "badgeHandmadeTitle", subtitleKey: "badgeHandmadeSubtitle" },
  { icon: "/icons/premium.svg", titleKey: "badgePremiumTitle", subtitleKey: "badgePremiumSubtitle" },
  { icon: "/icons/delivery.svg", titleKey: "badgeDeliveryTitle", subtitleKey: "badgeDeliverySubtitle" },
] as const;

export function HeroSection() {
  const t = useTranslations("Home");

  return (
    <section className="relative w-full overflow-hidden bg-bg-page">
      <NavBar className="relative z-10" />
      <div className="relative flex flex-col gap-10 px-6 py-16 md:flex-row md:items-center md:px-[100px] md:py-24">
        <div className="flex max-w-[620px] flex-col items-start gap-5">
          <div className="flex items-center gap-1.5">
            <p className="font-script text-3xl font-bold text-brand-secondary">{t("eyebrow")}</p>
            <Image src="/icons/heart.svg" alt="" width={14} height={14} />
          </div>
          <h1 className="font-heading text-[42px] font-extrabold leading-tight text-brand-primary md:text-[60px] md:leading-[66px]">
            {t("headlineLine1")}
            <br />
            <span className="text-brand-secondary">{t("headlineLine2")}</span>
          </h1>
          <p className="max-w-[420px] font-semibold leading-7 text-text-secondary">
            {t("subheadline")}
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Button render={<Link href="/shop" />} variant="brand-primary" size="xl">
              {t("browseCakes")}
            </Button>
            <Button render={<Link href="/shop/custom" />} variant="brand-ghost" size="xl">
              {t("customCake")}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            {trustBadges.map((badge, i) => (
              <div key={badge.titleKey} className="flex items-center gap-2.5">
                {i > 0 && <div className="hidden h-8 w-px bg-border-default sm:block" />}
                <div className="flex size-12 items-center justify-center rounded-full bg-bg-surface-alt">
                  <Image src={badge.icon} alt="" width={24} height={24} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-[13px] font-semibold text-text-primary">{t(badge.titleKey)}</p>
                  <p className="text-[11px] text-text-secondary">{t(badge.subtitleKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative h-[320px] w-full shrink-0 rounded-3xl border-2 border-dashed border-border-default bg-bg-surface-alt/60 md:h-[480px] md:w-[560px]" />
      </div>
    </section>
  );
}
