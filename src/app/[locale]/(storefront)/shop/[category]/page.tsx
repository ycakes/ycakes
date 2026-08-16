import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ShopBrowse } from "@/components/storefront/ShopBrowse";
import {
  getCakesByCategorySlug,
  getCategoryBySlug,
  getSubcategories,
  getTopLevelCategories,
} from "@/lib/catalog/queries";

export default async function ShopCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string; subcategory?: string }>;
}) {
  const { category: slug } = await params;
  const { page, subcategory } = await searchParams;
  const t = await getTranslations("Shop");
  const locale = (await getLocale()) as "en" | "ar";

  const category = await getCategoryBySlug(slug);
  if (!category || category.parent_id !== null) notFound();

  const [categories, subcategories, cakes] = await Promise.all([
    getTopLevelCategories(),
    getSubcategories(category.id),
    getCakesByCategorySlug(slug, subcategory),
  ]);

  return (
    <ShopBrowse
      locale={locale}
      categories={categories}
      activeSlug={slug}
      subcategories={subcategories}
      activeSubcategoryId={subcategory ?? null}
      breadcrumbLabel={category.name[locale]}
      pageTitle={category.name[locale]}
      pageSubtitle={t.has(`subtitle.${slug}` as never) ? t(`subtitle.${slug}` as never) : ""}
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
