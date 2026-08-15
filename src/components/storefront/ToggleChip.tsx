"use client";

import { cn } from "@/lib/utils";

export function ToggleChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex shrink-0 items-center rounded-full px-3 py-2 text-sm",
        selected
          ? "bg-brand-primary text-text-on-brand"
          : "border-[1.5px] border-border-default bg-bg-surface text-text-primary",
      )}
    >
      {label}
    </button>
  );
}
