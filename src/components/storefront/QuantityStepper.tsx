"use client";

export function QuantityStepper({
  quantity,
  onChange,
  min = 1,
}: {
  quantity: number;
  onChange: (quantity: number) => void;
  min?: number;
}) {
  return (
    <div className="flex shrink-0 items-center overflow-hidden rounded-2xl border-[1.5px] border-border-default bg-bg-surface">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, quantity - 1))}
        className="flex size-9 items-center justify-center text-base font-semibold text-text-primary"
        aria-label="Decrease quantity"
      >
        −
      </button>
      <div className="flex h-9 w-11 items-center justify-center border-x-[1.5px] border-border-default text-[15px] font-semibold text-text-primary">
        {quantity}
      </div>
      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        className="flex size-9 items-center justify-center text-base font-semibold text-text-primary"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
