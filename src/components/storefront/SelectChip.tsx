"use client";

import { cn } from "@/lib/utils";

export function SelectChip({
  label,
  selected,
  onSelect,
  disabled,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "flex shrink-0 items-center rounded-full px-3 py-2 text-[15px] font-medium disabled:cursor-not-allowed disabled:opacity-40",
        selected
          ? "bg-brand-primary text-text-on-brand"
          : "border-[1.5px] border-border-default bg-bg-surface text-text-primary",
      )}
    >
      {label}
    </button>
  );
}
