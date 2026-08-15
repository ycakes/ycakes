"use client";

import { cn } from "@/lib/utils";

export function ColorSwatch({
  hex,
  label,
  selected,
  onSelect,
}: {
  hex: string | null;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={label}
      aria-label={label}
      aria-pressed={selected}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full border-2 shadow-sm",
        selected ? "border-brand-secondary" : "border-border-default",
      )}
    >
      <span
        className="size-7 rounded-full ring-1 ring-inset ring-black/10"
        style={{ backgroundColor: hex ?? "#ffffff" }}
      />
    </button>
  );
}
