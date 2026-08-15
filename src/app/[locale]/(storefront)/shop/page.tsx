import { getLocale, getTranslations } from "next-intl/server";
import { ShopBrowse } from "@/components/storefront/ShopBrowse";
import { getAllCakes, getTopLevelCategories } from "@/lib/catalog/queries";

export default async function ShopAllPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const t = await getTranslations("Shop");
  const locale = (await getLocale()) as "en" | "ar";
  const [categories, cakes] = await Promise.all([getTopLevelCategories(), getAllCakes()]);

  return (
    <ShopBrowse
      locale={locale}
      categories={categories}
      activeSlug={null}
      breadcrumbLabel={t("allTitle")}
      pageTitle={t("allTitle")}
      pageSubtitle={t("allSubtitle")}
      cakes={cakes}
      currentPage={Number(page) || 1}
      basePath="/shop"
      filterAllLabel={t("filterAll")}
      breadcrumbHomeLabel={t("breadcrumbHome")}
      breadcrumbShopLabel={t("breadcrumbShop")}
      emptyMessage={t("empty")}
    />
  );
}
