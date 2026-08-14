import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ShopBrowse } from "@/components/storefront/ShopBrowse";
import {
  getCakesByCategorySlug,
  getCategoryBySlug,
  getTopLevelCategories,
} from "@/lib/catalog/queries";

export default async function ShopCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { category: slug } = await params;
  const { page } = await searchParams;
  const t = await getTranslations("Shop");
  const locale = (await getLocale()) as "en" | "ar";

  const category = await getCategoryBySlug(slug);
  if (!category || category.parent_id !== null) notFound();

  const [categories, cakes] = await Promise.all([
    getTopLevelCategories(),
    getCakesByCategorySlug(slug),
  ]);

  return (
    <ShopBrowse
      locale={locale}
      categories={categories}
      activeSlug={slug}
      breadcrumbLabel={category.name[locale]}
      pageTitle={category.name[locale]}
      pageSubtitle={t(`subtitle.${slug}` as never)}
      cakes={cakes}
      currentPage={Number(page) || 1}
      basePath={`/shop/${slug}`}
      filterAllLabel={t("filterAll")}
      breadcrumbHomeLabel={t("breadcrumbHome")}
      breadcrumbShopLabel={t("breadcrumbShop")}
      emptyMessage={t("empty")}
    />
  );
}
