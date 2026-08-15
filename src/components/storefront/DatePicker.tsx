"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

function toISODate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function DatePicker({
  locale,
  value,
  onChange,
  blockedDates,
}: {
  locale: "en" | "ar";
  value: string | null;
  onChange: (isoDate: string) => void;
  blockedDates: string[];
}) {
  const today = startOfDay(new Date());
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + 1); // earliest reservable date is tomorrow

  const [viewMonth, setViewMonth] = useState(() => new Date(minDate.getFullYear(), minDate.getMonth(), 1));

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  const canGoPrev = new Date(year, month, 1) > new Date(minDate.getFullYear(), minDate.getMonth(), 1);

  const weekdayFormatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
    weekdayFormatter.format(new Date(2024, 0, i + 7)),
  );
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(viewMonth);

  return (
    <div className="flex w-full flex-col gap-3 rounded-2xl border-[1.5px] border-border-default bg-bg-surface p-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewMonth(new Date(year, month - 1, 1))}
          disabled={!canGoPrev}
          className="flex size-8 items-center justify-center rounded-full text-text-primary disabled:opacity-30"
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
        {weekdayLabels.map((label, i) => (
          <div key={i}>{label}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const iso = toISODate(date);
          const disabled = date < minDate || blockedDates.includes(iso);
          const selected = value === iso;
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onChange(iso)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-full text-sm",
                disabled && "text-text-secondary/30 line-through",
                !disabled && !selected && "text-text-primary hover:bg-bg-surface-alt",
                selected && "bg-brand-primary text-text-on-brand",
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
