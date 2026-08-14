import Image from "next/image";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { NavBar } from "@/components/layout/NavBar";
import { Footer } from "@/components/layout/Footer";
import { Divider } from "@/components/storefront/Divider";
import { CakeCustomizer } from "@/components/storefront/CakeCustomizer";
import { Link } from "@/i18n/navigation";
import {
  getCakeById,
  getCategoryById,
  getColors,
  getFlavorsForCategory,
  getShapes,
  getSizesWithTiers,
  getTiers,
  getToppers,
} from "@/lib/catalog/queries";

const NO_FAKE_CAKE_SLUGS = new Set(["bento", "candy-corner"]);

export default async function CakeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Shop");
  const locale = (await getLocale()) as "en" | "ar";

  const cake = await getCakeById(id);
  if (!cake) notFound();

  const category = await getCategoryById(cake.category_id);
  if (!category) notFound();

  const topLevelCategory = category.parent_id
    ? await getCategoryById(category.parent_id)
    : category;
  if (!topLevelCategory) notFound();

  const allowFakeCake = !NO_FAKE_CAKE_SLUGS.has(topLevelCategory.slug);
  const showToppers = topLevelCategory.slug === "custom";

  const [sizes, tiers, flavors, colors, shapes, toppers] = await Promise.all([
    getSizesWithTiers(category.id),
    getTiers(),
    getFlavorsForCategory(category.id),
    getColors(),
    getShapes(),
    showToppers ? getToppers() : Promise.resolve([]),
  ]);

  return (
    <main className="flex flex-col bg-bg-page">
      <NavBar />
      <div className="flex flex-col gap-6 px-6 py-8 md:px-[100px]">
        <p className="text-[13px] text-text-secondary">
          <Link href="/">{t("breadcrumbHome")}</Link>
          {"  /  "}
          <Link href="/shop">{t("breadcrumbShop")}</Link>
          {"  /  "}
          <Link href={`/shop/${topLevelCategory.slug}`}>{topLevelCategory.name[locale]}</Link>
          {"  /  "}
          <span>{cake.name[locale]}</span>
        </p>

        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="flex w-full flex-col gap-4 lg:w-[560px] lg:shrink-0">
            <div className="relative h-[360px] w-full overflow-hidden rounded-3xl border border-border-default bg-bg-page md:h-[480px]">
              {cake.primary_image_url && (
                <Image
                  src={cake.primary_image_url}
                  alt={cake.name[locale]}
                  fill
                  sizes="(min-width: 1024px) 560px, 100vw"
                  priority
                  className="object-contain"
                />
              )}
            </div>
            <h1 className="font-heading text-[28px] font-extrabold text-brand-primary md:text-[32px]">
              {cake.name[locale]}
            </h1>
          </div>

          <CakeCustomizer
            locale={locale}
            cake={cake}
            categorySlug={category.slug}
            sizes={sizes}
            tiers={tiers}
            flavors={flavors}
            colors={colors}
            shapes={shapes}
            toppers={toppers}
            showToppers={showToppers}
            allowFakeCake={allowFakeCake}
          />
        </div>
      </div>

      <Divider />
      <Footer />
    </main>
  );
}
