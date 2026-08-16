"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/storefront/ProductCard";
import type { Cake } from "@/types/catalog";

const AUTO_SCROLL_PX_PER_SEC = 22;
const NUDGE_PX = 360;

export function TrendingCarousel({ cakes, priority }: { cakes: Cake[]; priority?: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const pausedRef = useRef(false);
  const lastTsRef = useRef<number | null>(null);

  // Cakes rendered twice back-to-back so the loop can wrap seamlessly:
  // once the scroll position passes the first copy's width, snap back by
  // that same width with no visible jump.
  const loopCakes = cakes.length > 1 ? [...cakes, ...cakes] : cakes;

  useEffect(() => {
    if (cakes.length <= 1) return;
    const track = trackRef.current;
    if (!track) return;

    function tick(ts: number) {
      if (!track) return;
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;

      if (!pausedRef.current) {
        const halfWidth = track.scrollWidth / 2;
        track.scrollLeft += AUTO_SCROLL_PX_PER_SEC * dt;
        if (track.scrollLeft >= halfWidth) {
          track.scrollLeft -= halfWidth;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [cakes.length]);

  function nudge(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    pausedRef.current = true;
    const halfWidth = track.scrollWidth / 2;
    let next = track.scrollLeft + direction * NUDGE_PX;
    if (next < 0) next += halfWidth;
    if (next >= halfWidth) next -= halfWidth;
    track.scrollTo({ left: next, behavior: "smooth" });
    window.setTimeout(() => {
      pausedRef.current = false;
    }, 1200);
  }

  return (
    <div
      className="group/carousel relative"
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
    >
      <div
        ref={trackRef}
        className="flex gap-6 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {loopCakes.map((cake, index) => (
          <ProductCard key={`${cake.id}-${index}`} cake={cake} priority={priority && index < 3} />
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
