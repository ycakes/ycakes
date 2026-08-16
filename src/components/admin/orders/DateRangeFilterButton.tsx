"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DateRange = { from: string | null; to: string | null };

function toISODate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatShort(iso: string, locale: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(new Date(y, m - 1, d));
}

export function DateRangeFilterButton({
  locale,
  label,
  value,
  onChange,
}: {
  locale: "en" | "ar";
  label: string;
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  const t = useTranslations("Admin.orders");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<DateRange>(value);
  const [viewMonth, setViewMonth] = useState(() => {
    const base = value.from ? new Date(value.from) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const buttonLabel =
    value.from && value.to
      ? value.from === value.to
        ? `${label}: ${formatShort(value.from, locale)}`
        : `${label}: ${formatShort(value.from, locale)} – ${formatShort(value.to, locale)}`
      : `${label}: ${t("any")}`;

  function openPicker() {
    setPending(value);
    const base = value.from ? new Date(value.from) : new Date();
    setViewMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    setOpen(true);
  }

  function handleDayClick(iso: string) {
    setPending((prev) => {
      if (prev.from && !prev.to) {
        return iso < prev.from ? { from: iso, to: prev.from } : { from: prev.from, to: iso };
      }
      if (prev.from && prev.to && prev.from === prev.to && prev.from === iso) {
        return { from: iso, to: iso };
      }
      return { from: iso, to: null };
    });
  }

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  const weekdayFormatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const weekdayLabels = Array.from({ length: 7 }, (_, i) => weekdayFormatter.format(new Date(2024, 0, i + 7)));
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(viewMonth);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={openPicker}
        className="flex shrink-0 items-center gap-2 rounded-full border-[1.5px] border-border-default bg-bg-surface px-[14px] py-[10px] text-sm font-medium text-text-primary"
      >
        <Calendar className="size-[14px] text-text-secondary" />
        {buttonLabel}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border-default bg-bg-surface p-4 shadow-lg">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setViewMonth(new Date(year, month - 1, 1))}
                  className="flex size-8 items-center justify-center rounded-full text-text-primary"
                  aria-label="Previous month"
                >
                  ‹
                </button>
                <p className="text-sm font-semibold text-text-primary">{monthLabel}</p>
                <button
                  type="button"
                  onClick={() => setViewMonth(new Date(year, month + 1, 1))}
                  className="flex size-8 items-center justify-center rounded-full text-text-primary"
                  aria-label="Next month"
                >
                  ›
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs text-text-secondary">
                {weekdayLabels.map((wl, i) => (
                  <div key={i}>{wl}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((date, i) => {
                  if (!date) return <div key={i} />;
                  const iso = toISODate(date);
                  const inRange = pending.from && pending.to && iso >= pending.from && iso <= pending.to;
                  const isEndpoint = iso === pending.from || iso === pending.to;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleDayClick(iso)}
                      className={cn(
                        "flex aspect-square items-center justify-center rounded-full text-sm text-text-primary hover:bg-bg-surface-alt",
                        inRange && !isEndpoint && "bg-brand-primary/15",
                        isEndpoint && "bg-brand-primary text-text-on-brand hover:bg-brand-primary",
                      )}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-text-secondary">{t("dateRangeHint")}</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="brand-primary"
                  size="sm"
                  className="flex-1 justify-center"
                  disabled={!pending.from}
                  onClick={() => {
                    const from = pending.from!;
                    const to = pending.to ?? pending.from!;
                    onChange({ from, to });
                    setOpen(false);
                  }}
                >
                  {t("apply")}
                </Button>
                <Button
                  type="button"
                  variant="brand-ghost"
                  size="sm"
                  className="flex-1 justify-center bg-bg-surface"
                  onClick={() => {
                    onChange({ from: null, to: null });
                    setOpen(false);
                  }}
                >
                  {t("any")}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
