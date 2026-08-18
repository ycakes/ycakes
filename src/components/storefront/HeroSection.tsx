import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
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
  const locale = useLocale();

  return (
    <section className="relative min-h-[480px] w-full overflow-hidden bg-bg-page sm:min-h-[560px] md:min-h-0">
      {/* Full-bleed at every breakpoint — the section's own min-height (not
          content-driven stacking) keeps the aspect ratio close enough to the
          photo's own that object-cover doesn't crop it down to a sliver on
          narrow screens. Arabic swaps to a separately-shot mirrored photo
          (hero-flipped.jpg) so the cake ends up on the same side as the (now
          right-aligned) text's empty space — a CSS flip also mirrored the
          logo baked into the photo itself, so it isn't used. */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero/herobgphone.jpg"
          alt=""
          fill
          priority
          sizes="(min-width: 768px) 0px, 100vw"
          className="object-cover md:hidden"
        />
        <Image
          src={locale === "ar" ? "/images/hero/hero-flipped.jpg" : "/images/hero/hero.jpg"}
          alt=""
          fill
          priority
          sizes="(min-width: 768px) 100vw, 0px"
          className="hidden object-cover md:block"
        />
      </div>
      <NavBar className="relative z-20" />
      <div className="relative z-10 flex flex-col gap-6 px-6 py-8 md:flex-row md:items-center md:gap-10 md:px-[100px] md:py-24">
        <div className="flex max-w-[620px] flex-col items-start gap-4 md:gap-5">
          <div className="flex items-center gap-1.5">
            <p className="font-script text-2xl font-bold text-brand-secondary sm:text-3xl">{t("eyebrow")}</p>
            <Image src="/icons/heart.svg" alt="" width={14} height={14} />
          </div>
          <h1 className="font-heading text-[32px] font-extrabold leading-tight text-brand-primary sm:text-[42px] md:text-[60px] md:leading-[66px]">
            {t("headlineLine1")}
            <br />
            <span className="text-brand-secondary">{t("headlineLine2")}</span>
          </h1>
          <p className="max-w-[420px] text-[15px] font-bold leading-7 text-text-primary">
            {t("subheadline")}
          </p>
          <div className="flex flex-wrap gap-3 pt-1 md:gap-4 md:pt-2">
            <Button render={<Link href="/shop" />} nativeButton={false} variant="brand-primary" size="xl">
              {t("browseCakes")}
            </Button>
            <Button
              render={<Link href="/shop/custom" />}
              nativeButton={false}
              variant="brand-ghost"
              size="xl"
              className="hover:bg-bg-surface-alt/50"
            >
              {t("customCake")}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1 md:gap-4 md:pt-2">
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
      </div>
    </section>
  );
}
