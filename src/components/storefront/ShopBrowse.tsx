import { NavBar } from "@/components/layout/NavBar";
import { Footer } from "@/components/layout/Footer";
import { Divider } from "@/components/storefront/Divider";
import { FilterChip } from "@/components/storefront/FilterChip";
import { ProductCard } from "@/components/storefront/ProductCard";
import { Pagination } from "@/components/storefront/Pagination";
import { Link } from "@/i18n/navigation";
import type { Cake, Category } from "@/types/catalog";

const PAGE_SIZE = 12;

export function ShopBrowse({
  locale,
  categories,
  activeSlug,
  subcategories = [],
  activeSubcategoryId = null,
  breadcrumbLabel,
  pageTitle,
  pageSubtitle,
  cakes,
  currentPage,
  basePath,
  filterAllLabel,
  breadcrumbHomeLabel,
  breadcrumbShopLabel,
  emptyMessage,
}: {
  locale: "en" | "ar";
  categories: Category[];
  activeSlug: string | null;
  subcategories?: Category[];
  activeSubcategoryId?: string | null;
  breadcrumbLabel: string;
  pageTitle: string;
  pageSubtitle: string;
  cakes: Cake[];
  currentPage: number;
  basePath: string;
  filterAllLabel: string;
  breadcrumbHomeLabel: string;
  breadcrumbShopLabel: string;
  emptyMessage: string;
}) {
  const totalPages = Math.max(1, Math.ceil(cakes.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, currentPage), totalPages);
  const pageCakes = cakes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <main className="flex flex-col bg-bg-page">
      <NavBar />
      <div className="flex flex-col gap-6 px-6 pb-10 pt-8 md:px-[100px]">
        <p className="text-[13px] text-text-secondary">
          <Link href="/">{breadcrumbHomeLabel}</Link>
          {"  /  "}
          <Link href="/shop">{breadcrumbShopLabel}</Link>
          {"  /  "}
          <span>{breadcrumbLabel}</span>
        </p>
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-extrabold text-brand-primary md:text-[40px]">
            {pageTitle}
          </h1>
          <p className="text-base font-medium text-text-secondary">{pageSubtitle}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <FilterChip href="/shop" label={filterAllLabel} active={activeSlug === null} />
          {categories.map((category) => (
            <FilterChip
              key={category.id}
              href={`/shop/${category.slug}`}
              label={category.name[locale]}
              active={activeSlug === category.slug}
            />
          ))}
        </div>
        {subcategories.length > 0 && (
          <div className="flex flex-wrap gap-2 ps-4">
            <FilterChip href={basePath} label={filterAllLabel} active={!activeSubcategoryId} />
            {subcategories.map((sub) => (
              <FilterChip
                key={sub.id}
                href={`${basePath}?subcategory=${sub.id}`}
                label={sub.name[locale]}
                active={activeSubcategoryId === sub.id}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-10 px-6 pb-16 md:px-[100px]">
        {pageCakes.length === 0 ? (
          <p className="py-16 text-center text-text-secondary">{emptyMessage}</p>
        ) : (
          <div className="flex flex-wrap gap-6">
            {pageCakes.map((cake, index) => (
              <ProductCard key={cake.id} cake={cake} priority={index < 3} />
            ))}
          </div>
        )}
        <Pagination
          basePath={basePath}
          currentPage={page}
          totalPages={totalPages}
          extraParams={activeSubcategoryId ? { subcategory: activeSubcategoryId } : undefined}
        />
      </div>

      <Divider />
      <Footer />
    </main>
  );
}
