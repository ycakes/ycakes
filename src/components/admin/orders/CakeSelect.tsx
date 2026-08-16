"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Bilingual } from "@/types/catalog";

export type SelectableCake = { id: string; name: Bilingual; category_id: string; active: boolean };

// Searchable single-select over active+inactive cakes, plus a "Custom /
// Other" option with no backing cakes row (order_items.cake_id is
// nullable specifically for this — see 20260816210000_manual_order_entry.sql).
// No Base UI combobox primitive is used here — this is a plain filtered
// list behind a text input, matching the scale of the admin catalog
// (dozens of cakes, not thousands) rather than pulling in a new dependency.
export function CakeSelect({
  locale,
  cakes,
  value,
  onSelect,
}: {
  locale: "en" | "ar";
  cakes: SelectableCake[];
  value: { cakeId: string | null; label: string };
  onSelect: (cakeId: string | null, label: string, categoryId: string | null) => void;
}) {
  const t = useTranslations("Admin.orders");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return cakes;
    return cakes.filter((c) => c.name.en.toLowerCase().includes(needle) || c.name.ar.toLowerCase().includes(needle));
  }, [cakes, query]);

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => {
          setQuery("");
          setOpen(true);
        }}
        className="flex w-full items-center justify-between rounded-xl border-[1.5px] border-border-default bg-bg-surface p-2.5 text-start text-sm text-text-primary"
      >
        <span className="truncate">{value.label || t("selectCake")}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute start-0 top-full z-50 mt-1 flex w-full max-w-[320px] flex-col gap-1 rounded-2xl border border-border-default bg-bg-surface p-2 shadow-lg">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchCakePlaceholder")}
              className="w-full rounded-lg border border-border-default bg-bg-subtle p-2 text-sm text-text-primary focus:outline-none"
            />
            <div className="flex max-h-64 flex-col overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  onSelect(null, t("customOther"), null);
                  setOpen(false);
                }}
                className="rounded-lg px-2 py-2 text-start text-sm font-medium text-brand-primary hover:bg-bg-surface-alt"
              >
                {t("customOther")}
              </button>
              {filtered.map((cake) => (
                <button
                  key={cake.id}
                  type="button"
                  onClick={() => {
                    onSelect(cake.id, cake.name[locale], cake.category_id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-start text-sm text-text-primary hover:bg-bg-surface-alt",
                    !cake.active && "opacity-50",
                  )}
                >
                  <span className="truncate">{cake.name[locale]}</span>
                  {!cake.active && <span className="shrink-0 text-xs text-text-secondary">{t("inactive")}</span>}
                </button>
              ))}
              {filtered.length === 0 && <p className="px-2 py-2 text-sm text-text-secondary">{t("noSearchResults")}</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
