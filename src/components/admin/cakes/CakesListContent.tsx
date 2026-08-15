"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { FilterChip } from "@/components/storefront/FilterChip";
import { Pagination } from "@/components/storefront/Pagination";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { RowActions } from "@/components/admin/RowActions";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
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
}) {
  const t = useTranslations("Admin.table");
  const tCommon = useTranslations("Common");
  const [rows, setRows] = useState(cakes);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function handleDelete(id: string) {
    setError(null);
    const { error: deleteError } = await supabase.from("cakes").delete().eq("id", id);
    if (deleteError) {
      setError(t("saveFailed"));
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
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

  const paginationParams: Record<string, string> = Object.fromEntries(query.entries());
  if (sort) paginationParams.sort = sort;
  if (dir) paginationParams.dir = dir;

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
      header: "",
      render: (row) => <RowActions itemLabel={row.name.en} editHref={`/admin/cakes/${row.id}`} onDelete={() => handleDelete(row.id)} />,
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-text-primary">{t("cakes")}</h1>
        <Link href="/admin/cakes/new">
          <Button type="button" variant="brand-primary">
            {t("add")}
          </Button>
        </Link>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <FilterChip href={basePath} label={t("all")} active={!activeCategory} />
        {topLevel.map((category) => (
          <FilterChip key={category.id} href={`${basePath}?category=${category.slug}`} label={category.name.en} active={activeCategory === category.slug} />
        ))}
      </div>
      {activeCategory === "candy-corner" && (
        <div className="flex flex-wrap gap-2 ps-4">
          {subcategories.map((sub) => (
            <FilterChip key={sub.id} href={`${basePath}?category=candy-corner&subcategory=${sub.id}`} label={sub.name.en} active={activeSubcategory === sub.id} />
          ))}
        </div>
      )}
      <AdminTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        emptyMessage={t("noResults")}
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
