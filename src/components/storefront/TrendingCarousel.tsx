"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/storefront/ProductCard";
import type { Cake } from "@/types/catalog";

// One ProductCard's width (340px) + the track's gap-6 (24px) — nudging by
// exactly this amount, combined with the track's scroll-snap, always lands
// on a full card instead of stopping mid-card.
const NUDGE_PX = 364;

export function TrendingCarousel({ cakes, priority }: { cakes: Cake[]; priority?: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null);

  function nudge(direction: 1 | -1) {
    trackRef.current?.scrollBy({ left: direction * NUDGE_PX, behavior: "smooth" });
  }

  return (
    <div className="group/carousel relative">
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth scroll-px-1 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {cakes.map((cake, index) => (
          <ProductCard key={cake.id} cake={cake} priority={priority && index < 3} />
        ))}
      </div>
      {cakes.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => nudge(-1)}
            aria-label="Previous"
            className="absolute start-0 top-1/2 hidden size-10 -translate-y-1/2 -translate-x-1/2 items-center justify-center rounded-full border border-border-default bg-bg-surface text-text-primary shadow-md hover:scale-105 sm:flex"
          >
            <ChevronLeft className="size-5 rtl:rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => nudge(1)}
            aria-label="Next"
            className="absolute end-0 top-1/2 hidden size-10 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-border-default bg-bg-surface text-text-primary shadow-md hover:scale-105 sm:flex"
          >
            <ChevronRight className="size-5 rtl:rotate-180" />
          </button>
          <div className="mt-3 flex justify-center gap-3 sm:hidden">
            <button
              type="button"
              onClick={() => nudge(-1)}
              aria-label="Previous"
              className="flex size-9 items-center justify-center rounded-full border border-border-default bg-bg-surface text-text-primary shadow-sm"
            >
              <ChevronLeft className="size-4 rtl:rotate-180" />
            </button>
            <button
              type="button"
              onClick={() => nudge(1)}
              aria-label="Next"
              className="flex size-9 items-center justify-center rounded-full border border-border-default bg-bg-surface text-text-primary shadow-sm"
            >
              <ChevronRight className="size-4 rtl:rotate-180" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
