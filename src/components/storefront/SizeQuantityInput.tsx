"use client";

import { useMemo, useState } from "react";
import type { Size } from "@/types/catalog";

/** Candy Corner quantity sizing: type any number, snap to the nearest valid size.
 * Stepper buttons move between valid sizes (e.g. 6 → 12 → 24…), not by 1. */
export function SizeQuantityInput({
  sizes,
  selectedSizeId,
  onSelect,
  mustBeLabel,
  minimumLabel,
}: {
  sizes: Size[];
  selectedSizeId: string | null;
  onSelect: (sizeId: string | null) => void;
  mustBeLabel: (a: number, b: number) => string;
  minimumLabel: (min: number) => string;
}) {
  const sorted = useMemo(() => [...sizes].sort((a, b) => a.min_qty - b.min_qty), [sizes]);

  const [inputValue, setInputValue] = useState(() => {
    const selected = sorted.find((s) => s.id === selectedSizeId);
    return selected ? String(selected.min_qty) : "";
  });

  const typed = Number(inputValue);
  const hasTyped = inputValue !== "" && Number.isFinite(typed) && typed > 0;
  const exactMatch = sorted.find((s) => s.min_qty === typed);
  const invalid = hasTyped && !exactMatch;
  const belowMinimum = invalid && sorted.length > 0 && typed < sorted[0].min_qty;

  const lower = invalid ? [...sorted].reverse().find((s) => s.min_qty < typed) : undefined;
  const upper = invalid ? sorted.find((s) => s.min_qty > typed) : undefined;

  function commit(raw: string) {
    setInputValue(raw);
    const n = Number(raw);
    const match = sorted.find((s) => s.min_qty === n);
    onSelect(match ? match.id : null);
  }

  function pick(size: Size) {
    setInputValue(String(size.min_qty));
    onSelect(size.id);
  }

  function step(direction: 1 | -1) {
    const currentIndex = sorted.findIndex((s) => s.id === selectedSizeId);
    let nextIndex: number;
    if (currentIndex === -1) {
      nextIndex = direction === 1 ? (upper ? sorted.indexOf(upper) : 0) : lower ? sorted.indexOf(lower) : 0;
    } else {
      nextIndex = currentIndex + direction;
    }
    nextIndex = Math.min(Math.max(nextIndex, 0), sorted.length - 1);
    pick(sorted[nextIndex]);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex w-40 shrink-0 items-center overflow-hidden rounded-2xl border-[1.5px] border-border-default bg-bg-surface">
        <button
          type="button"
          onClick={() => step(-1)}
          className="flex h-11 w-9 items-center justify-center text-base font-semibold text-text-primary"
          aria-label="Previous size"
        >
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          value={inputValue}
          onChange={(e) => commit(e.target.value)}
          className="h-11 w-full border-x-[1.5px] border-border-default bg-transparent text-center text-[15px] text-text-primary focus:outline-none"
        />
        <button
          type="button"
          onClick={() => step(1)}
          className="flex h-11 w-9 items-center justify-center text-base font-semibold text-text-primary"
          aria-label="Next size"
        >
          +
        </button>
      </div>
      {invalid && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-red-600">
          {belowMinimum ? (
            <>
              <span>{minimumLabel(sorted[0].min_qty)}</span>
              <button
                type="button"
                onClick={() => pick(sorted[0])}
                className="rounded-full border-[1.5px] border-border-default bg-bg-surface px-3 py-1 text-text-primary"
              >
                {sorted[0].min_qty}
              </button>
            </>
          ) : (
            (lower || upper) && (
              <>
                <span>{mustBeLabel(lower?.min_qty ?? 0, upper?.min_qty ?? 0)}</span>
                {lower && (
                  <button
                    type="button"
                    onClick={() => pick(lower)}
                    className="rounded-full border-[1.5px] border-border-default bg-bg-surface px-3 py-1 text-text-primary"
                  >
                    {lower.min_qty}
                  </button>
                )}
                {upper && (
                  <button
                    type="button"
                    onClick={() => pick(upper)}
                    className="rounded-full border-[1.5px] border-border-default bg-bg-surface px-3 py-1 text-text-primary"
                  >
                    {upper.min_qty}
                  </button>
                )}
              </>
            )
          )}
        </div>
      )}
    </div>
  );
}
