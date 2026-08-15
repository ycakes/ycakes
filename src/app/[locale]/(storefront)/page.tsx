import { getLocale, getTranslations } from "next-intl/server";
import { HeroSection } from "@/components/storefront/HeroSection";
import { CategoryCard } from "@/components/storefront/CategoryCard";
import { ProductCard } from "@/components/storefront/ProductCard";
import { Divider } from "@/components/storefront/Divider";
import { Footer } from "@/components/layout/Footer";
import { getTopLevelCategories, getTrendingCakesByCategory } from "@/lib/catalog/queries";

export default async function HomePage() {
  const t = await getTranslations("Home");
  const locale = (await getLocale()) as "en" | "ar";
  const [categories, trendingByCategory] = await Promise.all([
    getTopLevelCategories(),
    getTrendingCakesByCategory(4),
  ]);

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
              subtitle={t(`categorySubtitle.${category.slug}` as never)}
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
          {categories.map((category, categoryIndex) => {
            const cakes = trendingByCategory[category.slug] ?? [];
            if (cakes.length === 0) return null;
            return (
              <div key={category.id} className="flex flex-col gap-6">
                <h3 className="font-heading text-2xl font-bold text-brand-primary">
                  {category.name[locale]}
                </h3>
                <div className="flex gap-6 overflow-x-auto pb-2">
                  {cakes.map((cake, cakeIndex) => (
                    <ProductCard key={cake.id} cake={cake} priority={categoryIndex === 0 && cakeIndex < 3} />
                  ))}
                </div>
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
