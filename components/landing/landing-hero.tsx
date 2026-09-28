import { LandingLink } from "@/components/landing/landing-link";
import { HOST_HACKATHON_HREF } from "@/lib/auth/signup-links";

/*
 * The ribbon's two edges, as cubic Béziers from the top of the hero to its
 * right edge. Strands are drawn by interpolating between them, so they
 * always sit inside the band and follow its curve.
 */
const EDGE_A = [
  [330, -20],
  [400, 250],
  [620, 420],
  [1020, 430],
] as const;
const EDGE_B = [
  [610, -20],
  [480, 330],
  [650, 650],
  [1020, 720],
] as const;

function lerpCurve(t: number): string {
  const p = EDGE_A.map(([ax, ay], i) => {
    const [bx, by] = EDGE_B[i];
    return `${(ax + (bx - ax) * t).toFixed(1)} ${(ay + (by - ay) * t).toFixed(1)}`;
  });
  return `M ${p[0]} C ${p[1]}, ${p[2]}, ${p[3]}`;
}

const STRANDS = Array.from({ length: 48 }, (_, i) => lerpCurve(i / 47));

const BAND = `M 330 -20 C 400 250, 620 420, 1020 430 L 1020 720 C 650 650, 480 330, 610 -20 Z`;
const FOLD = `M 520 -20 C 540 250, 700 470, 1020 560 L 1020 660 C 700 600, 560 330, 600 -20 Z`;

/**
 * The hero ribbon: a broad band in the brand blues, a darker fold across
 * it, and combed strands for the silky texture, bleeding off the top-right
 * corner. Pure SVG, so it themes with the tokens and costs nothing to load.
 */
function HeroRibbon() {
  return (
    <svg
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
        <path d={BAND} fill="url(#lp-ribbon-fill)" opacity="0.35" filter="url(#lp-ribbon-glow)" />
        <path d={BAND} fill="url(#lp-ribbon-fill)" />
        <path d={FOLD} fill="url(#lp-ribbon-fold)" />
        <g fill="none" stroke="#fff" strokeOpacity="0.28" strokeWidth="0.7">
          {STRANDS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </g>
    </svg>
  );
}

export function LandingHero() {
  return (
    <section className="lp-hero" aria-labelledby="lp-hero-heading">
      <HeroRibbon />
      <div className="lp-frame lp-hero-inner">
        <p className="lp-hero-ticker">
          Prize pools escrowed before a hackathon goes live: <span>100%</span>
        </p>
        <h1 id="lp-hero-heading" className="lp-hero-heading">
          Hackathon infrastructure that pays winners on time.{" "}
          <span>
            Escrow the full prize pool before launch, pay winners half the moment results land, and
            turn every submission into a verified Proof-of-Work portfolio.
          </span>
        </h1>
        <div className="lp-hero-actions">
          <LandingLink href="/hackathons">Browse Hackathons</LandingLink>
          <LandingLink href={HOST_HACKATHON_HREF} variant="secondary">
            Host A Hackathon
          </LandingLink>
        </div>
      </div>
    </section>
  );
}
