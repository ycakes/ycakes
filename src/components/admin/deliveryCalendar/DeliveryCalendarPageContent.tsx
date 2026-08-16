"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Block = { id: string; blocked_date: string };

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

// Parses a plain "YYYY-MM-DD" string as local-date components — `new
// Date(iso)` parses it as UTC midnight, which can display as the previous
// day in timezones behind UTC.
function parseISODate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function DeliveryCalendarPageContent({ locale, initialBlocks }: { locale: "en" | "ar"; initialBlocks: Block[] }) {
  const t = useTranslations("Admin.deliveryCalendar");
  const [blocks, setBlocks] = useState(initialBlocks);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const today = startOfDay(new Date());
  const [viewMonth, setViewMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const supabase = createClient();

  const blockedByDate = new Map(blocks.map((b) => [b.blocked_date, b.id]));

  async function toggleDate(iso: string) {
    setError(null);
    setPending(iso);
    const existingId = blockedByDate.get(iso);
    if (existingId) {
      const { error: deleteError } = await supabase.from("delivery_calendar_blocks").delete().eq("id", existingId);
      setPending(null);
      if (deleteError) {
        setError(t("saveFailed"));
        return;
      }
      setBlocks((prev) => prev.filter((b) => b.id !== existingId));
    } else {
      const { data, error: insertError } = await supabase
        .from("delivery_calendar_blocks")
        .insert({ blocked_date: iso })
        .select("id, blocked_date")
        .single();
      setPending(null);
      if (insertError || !data) {
        setError(t("saveFailed"));
        return;
      }
      setBlocks((prev) => [...prev, data as Block].sort((a, b) => a.blocked_date.localeCompare(b.blocked_date)));
    }
  }

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  const weekdayFormatter = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
  const weekdayLabels = Array.from({ length: 7 }, (_, i) => weekdayFormatter.format(new Date(2024, 0, i + 7)));
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(viewMonth);
  const dateFormatter = new Intl.DateTimeFormat(locale, { weekday: "short", year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="font-heading text-2xl font-bold text-brand-primary">{t("title")}</h1>
      <p className="text-sm text-text-secondary">{t("hint")}</p>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex w-full max-w-[560px] flex-col gap-4 rounded-3xl border border-border-default bg-bg-surface p-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewMonth(new Date(year, month - 1, 1))}
              className="flex size-8 items-center justify-center rounded-full text-text-primary hover:bg-bg-surface-alt"
              aria-label="Previous month"
            >
              ‹
            </button>
            <p className="text-lg font-semibold text-text-primary">{monthLabel}</p>
            <button
              type="button"
              onClick={() => setViewMonth(new Date(year, month + 1, 1))}
              className="flex size-8 items-center justify-center rounded-full text-text-primary hover:bg-bg-surface-alt"
              aria-label="Next month"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-text-secondary">
            {weekdayLabels.map((wl, i) => (
              <div key={i}>{wl}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((date, i) => {
              if (!date) return <div key={i} />;
              const iso = toISODate(date);
              const isPast = date < today;
              const isToday = iso === toISODate(today);
              const isBlocked = blockedByDate.has(iso);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={isPast || pending === iso}
                  onClick={() => toggleDate(iso)}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-[10px] border-[1.5px] border-transparent text-sm text-text-primary disabled:cursor-not-allowed",
                    isPast && "text-text-secondary/40",
                    !isPast && !isBlocked && "hover:bg-bg-surface-alt",
                    isToday && !isBlocked && "border-brand-primary",
                    isBlocked && "border-status-cancelled bg-status-cancelled/10 font-semibold text-status-cancelled",
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex w-full max-w-[376px] flex-col gap-3 rounded-3xl border border-border-default bg-bg-surface p-6">
          <p className="text-xl font-semibold text-text-primary">{t("blockedDates")}</p>
          {blocks.length === 0 && <p className="text-sm text-text-secondary">{t("noBlockedDates")}</p>}
          {blocks.map((block) => (
            <div key={block.id} className="flex items-center justify-between rounded-xl bg-bg-subtle px-3 py-2.5">
              <p className="text-sm font-medium text-text-primary">{dateFormatter.format(parseISODate(block.blocked_date))}</p>
              <button
                type="button"
                onClick={() => toggleDate(block.blocked_date)}
                className="text-[13px] font-semibold text-status-cancelled"
              >
                {t("remove")}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
