"use client";

import { useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

/**
 * A horizontally scrolling row with Stripe-style prev/next buttons. The
 * cards are server-rendered children; this only adds the scroll controls,
 * and the row still scrolls by touch, trackpad or keyboard without them.
 */
export function JourneyCarousel({ label, children }: { label: string; children: React.ReactNode }) {
  const trackRef = useRef<HTMLUListElement>(null);

  const scroll = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector("li");
    const step = card ? card.getBoundingClientRect().width + 16 : track.clientWidth * 0.8;
    track.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  return (
    <div className="lp-carousel">
      <div className="lp-carousel-controls">
        <button
          type="button"
          className="lp-carousel-button"
          onClick={() => scroll(-1)}
          aria-label="Previous"
        >
          <ArrowLeft aria-hidden className="size-4" />
        </button>
        <button
          type="button"
          className="lp-carousel-button"
          onClick={() => scroll(1)}
          aria-label="Next"
        >
          <ArrowRight aria-hidden className="size-4" />
        </button>
      </div>
      <ul ref={trackRef} className="lp-carousel-track" aria-label={label}>
        {children}
      </ul>
    </div>
  );
}
