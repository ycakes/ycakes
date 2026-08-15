"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function QuantityStepper({
  quantity,
  onChange,
  min = 1,
}: {
  quantity: number;
  onChange: (quantity: number) => void;
  min?: number;
}) {
  const t = useTranslations("Common");
  const [inputValue, setInputValue] = useState(String(quantity));
  const [lastQuantity, setLastQuantity] = useState(quantity);

  // Resync the text field when quantity changes from outside (+/- buttons,
  // or another component updating the same cart item) — adjusted during
  // render rather than an effect, per React's guidance on this exact
  // "derived state that should reset on prop change" pattern.
  if (quantity !== lastQuantity) {
    setLastQuantity(quantity);
    setInputValue(String(quantity));
  }

  function commit(raw: string) {
    const parsed = parseInt(raw, 10);
    const next = Number.isFinite(parsed) ? Math.max(min, parsed) : quantity;
    setInputValue(String(next));
    if (next !== quantity) onChange(next);
  }

  return (
    <div className="flex shrink-0 items-center overflow-hidden rounded-2xl border-[1.5px] border-border-default bg-bg-surface">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, quantity - 1))}
        className="flex size-9 items-center justify-center text-base font-semibold text-text-primary transition-transform duration-150 hover:scale-125"
        aria-label={t("decreaseQuantity")}
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value.replace(/[^0-9]/g, ""))}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="h-9 w-11 border-x-[1.5px] border-border-default bg-transparent text-center text-[15px] font-semibold text-text-primary focus:outline-none"
      />
      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        className="flex size-9 items-center justify-center text-base font-semibold text-text-primary transition-transform duration-150 hover:scale-125"
        aria-label={t("increaseQuantity")}
      >
        +
      </button>
    </div>
  );
}
