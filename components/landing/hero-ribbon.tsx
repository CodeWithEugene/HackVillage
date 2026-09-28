"use client";

import { useEffect, useRef } from "react";

type Point = readonly [number, number];
type Curve = readonly [Point, Point, Point, Point];

/*
 * The ribbon's two edges at rest, as cubic Béziers from the top of the
 * hero to its right edge (viewBox 1000 x 800). Every frame nudges their
 * points along slow sine waves, out of step with each other, so the band
 * breathes and twists the way a silk ribbon drifts.
 */
const EDGE_A: Curve = [
  [330, -20],
  [400, 250],
  [620, 420],
  [1020, 430],
];
const EDGE_B: Curve = [
  [610, -20],
  [480, 330],
  [650, 650],
  [1020, 720],
];

/** Per point: [x amplitude, y amplitude, speed, phase]. */
const DRIFT_A = [
  [26, 0, 0.32, 0.0],
  [70, 36, 0.46, 1.1],
  [60, 44, 0.38, 2.3],
  [0, 46, 0.3, 0.6],
] as const;
const DRIFT_B = [
  [30, 0, 0.36, 2.0],
  [84, 40, 0.42, 3.4],
  [70, 52, 0.34, 0.4],
  [0, 58, 0.28, 2.8],
] as const;

/** Overall tempo of the drift; 1 is the speeds listed above. */
const TEMPO = 1.4;
const STRAND_COUNT = 48;
/** How far behind the first strand the last one runs, in seconds: a wave across the band. */
const STRAND_LAG = 1.6;

function drift(base: Curve, amp: typeof DRIFT_A | typeof DRIFT_B, t: number): Point[] {
  return base.map(([x, y], i) => {
    const [ax, ay, speed, phase] = amp[i] ?? [0, 0, 0, 0];
    return [x + ax * Math.sin(t * speed + phase), y + ay * Math.cos(t * speed * 0.9 + phase)];
  });
}

function lerp(a: Point[], b: Point[], f: number): Point[] {
  return a.map(([ax, ay], i) => {
    const [bx, by] = b[i] ?? [ax, ay];
    return [ax + (bx - ax) * f, ay + (by - ay) * f];
  });
}

const fmt = ([x, y]: Point) => `${x.toFixed(1)} ${y.toFixed(1)}`;
const curve = (p: Point[]) => `M ${fmt(p[0]!)} C ${fmt(p[1]!)}, ${fmt(p[2]!)}, ${fmt(p[3]!)}`;
/** A closed band: along `a`, down the right edge, and back along `b`. */
const band = (a: Point[], b: Point[]) =>
  `${curve(a)} L ${fmt(b[3]!)} C ${fmt(b[2]!)}, ${fmt(b[1]!)}, ${fmt(b[0]!)} Z`;

function frame(t: number) {
  const a = drift(EDGE_A, DRIFT_A, t);
  const b = drift(EDGE_B, DRIFT_B, t);
  const strands = Array.from({ length: STRAND_COUNT }, (_, i) => {
    const f = i / (STRAND_COUNT - 1);
    const lagged = t - f * STRAND_LAG;
    return curve(lerp(drift(EDGE_A, DRIFT_A, lagged), drift(EDGE_B, DRIFT_B, lagged), f));
  });
  return {
    band: band(a, b),
    fold: band(lerp(a, b, 0.42), lerp(a, b, 0.78)),
    strands,
    tilt: 6 * Math.sin(t * 0.2),
  };
}

const INITIAL = frame(0);

/**
 * The hero ribbon: a broad band in the brand blues, a darker fold across it
 * and combed strands for the silky texture, bleeding off the top-right
 * corner and up behind the transparent header. The server renders the
 * resting pose; on the client it drifts continuously, pausing off-screen
 * and holding still for reduced motion.
 */
export function HeroRibbon() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const glow = svg.querySelector<SVGPathElement>("[data-part=glow]");
    const body = svg.querySelector<SVGPathElement>("[data-part=band]");
    const fold = svg.querySelector<SVGPathElement>("[data-part=fold]");
    const fill = svg.querySelector<SVGLinearGradientElement>("#lp-ribbon-fill");
    const strands = Array.from(svg.querySelectorAll<SVGPathElement>("[data-part=strand]"));

    let raf = 0;
    let visible = true;
    const start = performance.now();

    const tick = (now: number) => {
      const next = frame(((now - start) / 1000) * TEMPO);
      glow?.setAttribute("d", next.band);
      body?.setAttribute("d", next.band);
      fold?.setAttribute("d", next.fold);
      fill?.setAttribute("gradientTransform", `rotate(${next.tilt.toFixed(2)} 0.5 0.5)`);
      strands.forEach((path, i) => path.setAttribute("d", next.strands[i] ?? ""));
      raf = visible ? requestAnimationFrame(tick) : 0;
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      if (visible && !raf) raf = requestAnimationFrame(tick);
    });
    observer.observe(svg);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      className="lp-ribbon"
      viewBox="0 0 1000 800"
      preserveAspectRatio="xMaxYMin slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lp-ribbon-fill" x1="0.2" y1="0" x2="0.9" y2="0.9">
          <stop offset="0%" stopColor="var(--color-brand-soft)" />
          <stop offset="40%" stopColor="var(--color-brand)" />
          <stop offset="75%" stopColor="var(--lp-blue-deep)" />
          <stop offset="100%" stopColor="var(--lp-navy)" />
        </linearGradient>
        <linearGradient id="lp-ribbon-fold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--lp-blue-deep)" stopOpacity="0" />
          <stop offset="45%" stopColor="var(--lp-blue-deep)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--lp-navy)" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="lp-ribbon-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="78%" stopColor="#fff" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id="lp-ribbon-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="36" />
        </filter>
        <mask id="lp-ribbon-mask">
          <rect width="1000" height="800" fill="url(#lp-ribbon-fade)" />
        </mask>
      </defs>
      <g mask="url(#lp-ribbon-mask)">
        <path
          data-part="glow"
          d={INITIAL.band}
          fill="url(#lp-ribbon-fill)"
          opacity="0.35"
          filter="url(#lp-ribbon-glow)"
        />
        <path data-part="band" d={INITIAL.band} fill="url(#lp-ribbon-fill)" />
        <path data-part="fold" d={INITIAL.fold} fill="url(#lp-ribbon-fold)" />
        <g fill="none" stroke="#fff" strokeOpacity="0.28" strokeWidth="0.7">
          {INITIAL.strands.map((d, i) => (
            <path key={i} data-part="strand" d={d} />
          ))}
        </g>
      </g>
    </svg>
  );
}
