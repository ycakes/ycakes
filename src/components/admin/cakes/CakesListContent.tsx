"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Search, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { FilterChip } from "@/components/storefront/FilterChip";
import { Pagination } from "@/components/storefront/Pagination";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { RowActions } from "@/components/admin/RowActions";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { deleteFromCloudinary } from "@/lib/admin/cloudinaryUpload";
import type { Cake, Category } from "@/types/catalog";

type Row = Cake & { active: boolean };

export function CakesListContent({
  topLevel,
  subcategories,
  activeCategory,
  activeSubcategory,
  cakes,
  categoriesById,
  sort,
  dir,
  currentPage,
  totalPages,
  search,
}: {
  topLevel: Category[];
  subcategories: Category[];
  activeCategory: string | null;
  activeSubcategory: string | null;
  cakes: Row[];
  categoriesById: Record<string, Category>;
  sort: string;
  dir: "asc" | "desc";
  currentPage: number;
  totalPages: number;
  search: string;
}) {
  const t = useTranslations("Admin.table");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const [rows, setRows] = useState(cakes);
  const [prevCakes, setPrevCakes] = useState(cakes);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(search);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = createClient();

  // Resync to the server-provided rows whenever the URL-driven query (filter/
  // sort/page/search) changes, without needing to remount the whole
  // component — a remount (via a changing `key`) would drop input focus
  // every time the debounced search updates the URL. Adjusting state during
  // render (React's recommended pattern) instead of in an effect avoids an
  // extra render pass.
  if (cakes !== prevCakes) {
    setPrevCakes(cakes);
    setRows(cakes);
  }

  async function handleDelete(id: string) {
    setError(null);
    const { data: cakeImages } = await supabase.from("cake_images").select("public_id").eq("cake_id", id);
    const { error: deleteError } = await supabase.from("cakes").delete().eq("id", id);
    if (deleteError) {
      setError(t("saveFailed"));
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    await Promise.all(
      (cakeImages ?? [])
        .map((img) => img.public_id)
        .filter((publicId): publicId is string => !!publicId)
        .map((publicId) => deleteFromCloudinary(publicId)),
    );
  }

  async function toggleActive(id: string, active: boolean) {
    setError(null);
    const { error: updateError } = await supabase.from("cakes").update({ active }).eq("id", id);
    if (updateError) {
      setError(t("saveFailed"));
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, active } : r)));
  }

  const basePath = "/admin/cakes";
  const query = new URLSearchParams();
  if (activeCategory) query.set("category", activeCategory);
  if (activeSubcategory) query.set("subcategory", activeSubcategory);
  if (search) query.set("search", search);

  const paginationParams: Record<string, string> = Object.fromEntries(query.entries());
  if (sort) paginationParams.sort = sort;
  if (dir) paginationParams.dir = dir;

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      if (searchInput === search) return;
      const q = new URLSearchParams(query);
      q.delete("search");
      q.delete("page");
      if (searchInput.trim()) q.set("search", searchInput.trim());
      const qs = q.toString();
      router.push(qs ? `${basePath}?${qs}` : basePath);
    }, 350);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const columns: AdminTableColumn<Row>[] = [
    {
      header: t("cake"),
      sortKey: "name",
      render: (row) => (
        <Link href={`/admin/cakes/${row.id}`} className="flex items-center gap-2">
          {row.primary_image_url ? (
            <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-bg-surface-alt">
              <Image src={row.primary_image_url} alt="" fill sizes="40px" className="object-cover" />
            </span>
          ) : (
            <span className="size-10 shrink-0 rounded-lg bg-bg-surface-alt" />
          )}
          <span className="text-sm font-medium text-text-primary">{row.name.en}</span>
        </Link>
      ),
    },
    { header: t("category"), render: (row) => categoriesById[row.category_id]?.name.en ?? "" },
    {
      header: t("priceModifier"),
      sortKey: "price",
      render: (row) => tCommon("egpPrice", { amount: row.base_price }),
    },
    {
      header: t("active"),
      render: (row) => <Switch checked={row.active} onCheckedChange={(checked) => toggleActive(row.id, checked)} />,
    },
    {
      header: t("actions"),
      align: "end",
      render: (row) => <RowActions itemLabel={row.name.en} editHref={`/admin/cakes/${row.id}`} onDelete={() => handleDelete(row.id)} />,
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-brand-primary">{t("cakes")}</h1>
        <div className="flex items-center gap-2">
          <Link href="/admin/cakes/trending">
            <Button type="button" variant="brand-secondary" size="xl" className="px-5 py-3 text-base">
              <TrendingUp className="size-4" />
              {t("trendingCakes")}
            </Button>
          </Link>
          <Link href="/admin/cakes/new">
            <Button type="button" variant="brand-primary" size="xl" className="px-5 py-3 text-base">
              {t("addCake")}
            </Button>
          </Link>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-col gap-3 rounded-3xl border border-border-default bg-bg-surface p-4">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-xl border-[1.5px] border-border-default bg-bg-surface-alt py-2.5 ps-9 pe-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip href={search ? `${basePath}?search=${encodeURIComponent(search)}` : basePath} label={t("all")} active={!activeCategory} />
          {topLevel.map((category) => {
            const q = new URLSearchParams({ category: category.slug });
            if (search) q.set("search", search);
            return (
              <FilterChip key={category.id} href={`${basePath}?${q.toString()}`} label={category.name.en} active={activeCategory === category.slug} />
            );
          })}
        </div>
        {activeCategory === "candy-corner" && (
          <div className="flex flex-wrap gap-2 ps-4">
            <FilterChip href={`${basePath}?${new URLSearchParams({ category: "candy-corner", ...(search ? { search } : {}) }).toString()}`} label={t("all")} active={!activeSubcategory} />
            {subcategories.map((sub) => {
              const q = new URLSearchParams({ category: "candy-corner", subcategory: sub.id });
              if (search) q.set("search", search);
              return (
                <FilterChip key={sub.id} href={`${basePath}?${q.toString()}`} label={sub.name.en} active={activeSubcategory === sub.id} />
              );
            })}
          </div>
        )}
      </div>
      <AdminTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        emptyMessage={search ? t("noSearchResults") : t("noResults")}
        rowHeight="64"
        currentSortKey={sort}
        currentSortDir={dir}
        buildSortHref={(key, nextDir) => {
          const q = new URLSearchParams(query);
          q.set("sort", key);
          q.set("dir", nextDir);
          return `${basePath}?${q.toString()}`;
        }}
      />
      <Pagination
        basePath={basePath}
        currentPage={currentPage}
        totalPages={totalPages}
        extraParams={paginationParams}
      />
    </div>
  );
}
