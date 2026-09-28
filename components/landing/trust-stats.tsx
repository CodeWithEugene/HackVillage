"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";

export interface TrustStat {
  value: string;
  label: string;
  href: string;
  link: string;
}

/** How long each stat stays active while the band cycles on its own. */
const CYCLE_MS = 6000;
const RAY_COUNT = 140;

interface Ray {
  angle: number;
  /** 0–1 share of the fan's reach this ray gets at rest. */
  reach: number;
  alpha: number;
  /** Current (eased) values, drawn each frame. */
  len: number;
  lit: number;
}

function seededRays(): Ray[] {
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: RAY_COUNT }, (_, i) => {
    const reach = 0.35 + rand() * 0.65;
    return {
      angle: Math.PI * (0.05 + (0.9 * i) / (RAY_COUNT - 1)),
      reach,
      alpha: 0.35 + rand() * 0.55,
      len: reach,
      lit: 0.6,
    };
  });
}

/**
 * Each stat drives the fan into a state that shows what the number means:
 * 100% lights every ray, 50% lights half, 1hr sweeps like a clock hand,
 * and 0% keeps every ray at full reach (nothing is cut from anyone's
 * prize) with a glow rippling outward from the centre.
 */
function targetFor(stat: number, ray: Ray, index: number, time: number) {
  const t = index / (RAY_COUNT - 1);
  switch (stat) {
    case 1:
      return { len: t < 0.5 ? ray.reach : ray.reach * 0.55, lit: t < 0.5 ? 1 : 0.18 };
    case 2: {
      const hand = (time / 2600) % 1;
      const d = t - hand;
      const near = Math.exp(-(d * d) / 0.006);
      return { len: ray.reach * (0.7 + 0.35 * near), lit: 0.22 + 0.78 * near };
    }
    case 3: {
      // Every ray keeps its full reach (nothing is cut), while a soft glow
      // ripples out from the centre to both edges, over and over.
      const ripple = ((time / 2400) % 1) * 0.5;
      const d = Math.abs(t - 0.5) - ripple;
      const near = Math.exp(-(d * d) / 0.004);
      return { len: ray.reach * (0.94 + 0.1 * near), lit: 0.5 + 0.5 * near };
    }
    default:
      return { len: ray.reach, lit: 1 };
  }
}

type Rgb = [number, number, number];

function toRgb(value: string, fallback: Rgb): Rgb {
  const hex = value.trim().replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return fallback;
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
}

const rgba = ([r, g, b]: Rgb, a: number) => `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;

/** The theme tokens are hex, so they convert straight to canvas colours. */
function readColors(el: HTMLElement) {
  const css = getComputedStyle(el);
  return {
    ray: toRgb(css.getPropertyValue("--color-ink-soft"), [2, 114, 212]),
    glow: toRgb(css.getPropertyValue("--color-brand"), [4, 161, 241]),
    soft: toRgb(css.getPropertyValue("--color-brand-soft"), [127, 208, 248]),
  };
}

function BurstCanvas({ active }: { active: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rays = seededRays();
    let colors = readColors(canvas);
    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = false;
    const pointer = { x: 0, y: 0, strength: 0, target: 0 };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (time: number, ease: number) => {
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height;
      const reachY = height * 0.92;
      const reachX = Math.min(width * 0.46, reachY * 2.2);

      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(reachX, reachY));
      glow.addColorStop(0, rgba(colors.glow, 0.5));
      glow.addColorStop(0.55, rgba(colors.soft, 0.14));
      glow.addColorStop(1, rgba(colors.soft, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      // The pointer in the fan's own terms: which angle it sits over, and how
      // far out from the root it is (1 = the fan's full reach).
      const nx = (cx - pointer.x) / reachX;
      const ny = (cy - pointer.y) / reachY;
      const pAngle = Math.atan2(ny, nx);
      const pDist = Math.hypot(nx, ny);
      pointer.strength += (pointer.target - pointer.strength) * 0.08;

      ctx.lineWidth = 1;
      rays.forEach((ray, i) => {
        const target = targetFor(activeRef.current, ray, i, time);
        let len = target.len;
        let lit = target.lit;
        if (pointer.strength > 0.01) {
          const d = ray.angle - pAngle;
          const near = Math.exp(-(d * d) / 0.012) * pointer.strength;
          // Rays under the cursor stretch toward it and brighten.
          len += Math.max(0, Math.min(1.08, pDist) - len) * near * 0.9 + near * 0.06;
          lit = Math.min(1, lit + near * 0.8);
        }
        ray.len += (len - ray.len) * ease;
        ray.lit += (lit - ray.lit) * ease;

        const x = cx - Math.cos(ray.angle) * ray.len * reachX;
        const y = cy - Math.sin(ray.angle) * ray.len * reachY;
        const alpha = ray.alpha * ray.lit;
        ctx.strokeStyle = rgba(colors.ray, alpha);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.arc(x, y, 1.6 + ray.lit * 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const loop = (time: number) => {
      draw(time, 0.07);
      frame = visible ? requestAnimationFrame(loop) : 0;
    };
    const start = () => {
      if (!frame && visible && !reduceMotion) frame = requestAnimationFrame(loop);
    };

    resize();
    draw(0, 1);

    const resizeObserver = new ResizeObserver(() => {
      resize();
      draw(performance.now(), 1);
    });
    resizeObserver.observe(canvas);

    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      if (visible) start();
    });
    intersection.observe(canvas);

    // Re-read the palette when the theme switcher flips data-theme.
    const themeObserver = new MutationObserver(() => {
      colors = readColors(canvas);
      draw(performance.now(), 1);
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.target = 1;
      start();
    };
    const onLeave = () => {
      pointer.target = 0;
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);

    // With reduced motion there is no loop, so a stat change redraws once.
    const redraw = () => draw(performance.now(), 1);
    canvas.addEventListener("lp-redraw", redraw);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      themeObserver.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("lp-redraw", redraw);
    };
  }, []);

  useEffect(() => {
    activeRef.current = active;
    canvasRef.current?.dispatchEvent(new Event("lp-redraw"));
  }, [active]);

  return <canvas ref={canvasRef} className="lp-burst" aria-hidden="true" />;
}

/**
 * The stats row as a menu, the way the reference site does it: one stat is
 * active at a time, a gradient indicator slides along the rules to it, the
 * fan below changes to illustrate it, and the row advances on its own until
 * someone picks a stat themselves.
 */
export function TrustStats({ stats }: { stats: TrustStat[] }) {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!auto || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => setActive((i) => (i + 1) % stats.length), CYCLE_MS);
    return () => window.clearTimeout(timer);
  }, [active, auto, paused, stats.length]);

  const choose = useCallback((index: number) => {
    setAuto(false);
    setActive(index);
  }, []);

  return (
    <div
      className="lp-stats-wrap"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        className="lp-stats"
        style={{ "--lp-active": active, "--lp-count": stats.length } as React.CSSProperties}
      >
        <span className="lp-stats-indicator lp-stats-indicator-top" aria-hidden="true" />
        <span className="lp-stats-indicator lp-stats-indicator-bottom" aria-hidden="true" />
        <ul className="lp-stats-list">
          {stats.map((stat, index) => {
            const isActive = index === active;
            return (
              <li key={stat.value} className={isActive ? "lp-stat lp-stat-active" : "lp-stat"}>
                <button
                  type="button"
                  className="lp-stat-button"
                  aria-pressed={isActive}
                  onClick={() => choose(index)}
                >
                  <span className="lp-stat-value">{stat.value}</span>
                  <span className="lp-stat-label">{stat.label}</span>
                </button>
                <Link
                  href={stat.href}
                  className="lp-stat-link"
                  tabIndex={isActive ? undefined : -1}
                  aria-hidden={isActive ? undefined : true}
                >
                  {stat.link}
                  <ChevronRight aria-hidden className="size-3.5" />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <BurstCanvas active={active} />
    </div>
  );
}
