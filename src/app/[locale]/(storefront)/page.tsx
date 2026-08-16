import { getLocale, getTranslations } from "next-intl/server";
import { HeroSection } from "@/components/storefront/HeroSection";
import { CategoryCard } from "@/components/storefront/CategoryCard";
import { Divider } from "@/components/storefront/Divider";
import { Footer } from "@/components/layout/Footer";
import { TrendingCarousel } from "@/components/storefront/TrendingCarousel";
import { getTopLevelCategories, getTrendingCakesByCategory, getTrendingCategoryOrder } from "@/lib/catalog/queries";

export default async function HomePage() {
  const t = await getTranslations("Home");
  const locale = (await getLocale()) as "en" | "ar";
  const [categories, trendingByCategory, trendingOrder] = await Promise.all([
    getTopLevelCategories(),
    getTrendingCakesByCategory(4),
    getTrendingCategoryOrder(),
  ]);

  const trendingOrderById = new Map(trendingOrder.map((c) => [c.id, c]));
  const trendingCategories = categories
    .filter((category) => trendingOrderById.get(category.id)?.show_trending !== false)
    .sort(
      (a, b) =>
        (trendingOrderById.get(a.id)?.trending_sort_order ?? 0) - (trendingOrderById.get(b.id)?.trending_sort_order ?? 0),
    );

  return (
    <main className="flex flex-col bg-bg-surface-alt">
      <HeroSection />
      <Divider />

      <section className="flex w-full flex-col items-center gap-12 px-6 pb-16 pt-8 md:px-[100px]">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-[13px] font-semibold tracking-[1.04px] text-brand-secondary">
            {t("collectionEyebrow")}
          </p>
          <h2 className="font-heading text-3xl font-extrabold text-brand-primary md:text-[40px]">
            {t("shopByCategory")}
          </h2>
          <div className="mt-1 h-[3px] w-16 rounded-full bg-brand-secondary" />
        </div>
        <div className="flex w-full max-w-[1240px] flex-wrap items-start justify-center gap-6">
          {categories.map((category, index) => (
            <CategoryCard
              key={category.id}
              category={category}
              subtitle={t.has(`categorySubtitle.${category.slug}` as never) ? t(`categorySubtitle.${category.slug}` as never) : ""}
              priority={index < 3}
            />
          ))}
        </div>
      </section>
      <Divider />

      <section className="flex w-full flex-col items-center gap-12 px-6 pb-16 pt-8 md:px-[100px]">
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="font-heading text-3xl font-extrabold text-brand-primary md:text-[40px]">
            {t("trendingCakes")}
          </h2>
          <div className="h-[3px] w-16 rounded-full bg-brand-secondary" />
        </div>
        <div className="flex w-full max-w-[1352px] flex-col gap-10">
          {trendingCategories.map((category, categoryIndex) => {
            const cakes = trendingByCategory[category.slug] ?? [];
            if (cakes.length === 0) return null;
            return (
              <div
                key={category.id}
                className="flex flex-col gap-6 rounded-[32px] border border-border-default bg-bg-surface-alt/60 p-5 sm:p-8"
              >
                <h3 className="font-heading text-2xl font-bold text-brand-primary">
                  {category.name[locale]}
                </h3>
                <TrendingCarousel cakes={cakes} priority={categoryIndex === 0} />
              </div>
            );
          })}
        </div>
      </section>
      <Divider />

      <Footer />
    </main>
  );
}
