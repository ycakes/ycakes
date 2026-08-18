"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

export function TopperCard({
  label,
  imageSrc,
  selected,
  onSelect,
}: {
  label: string;
  imageSrc?: string | null;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-24 shrink-0 flex-col items-center gap-1.5 rounded-2xl border-[1.5px] p-2",
        selected
          ? "border-2 border-brand-secondary bg-bg-surface-alt"
          : "border-border-default bg-bg-surface",
      )}
    >
      <div className="relative size-[70px] shrink-0 overflow-hidden rounded-2xl bg-bg-surface-alt">
        {imageSrc && <Image src={imageSrc} alt="" fill sizes="70px" className="object-contain" />}
      </div>
      <p className="w-20 text-center text-xs font-medium text-text-primary">{label}</p>
    </button>
  );
}
