import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/**
 * Left half of the auth pages: a full height photo with a brand message in
 * the top left corner and a payout proof card in the bottom right corner.
 */
export function AuthVisual() {
  return (
    <aside className="auth-visual" aria-label="About HackVillage">
      <Image
        src="/marketing/hero/kenya/center-developer.webp"
        alt=""
        fill
        priority
        sizes="50vw"
        className="object-cover object-top"
      />
      <div className="auth-visual-scrim" aria-hidden />

      <div className="auth-visual-intro">
        <p className="auth-visual-eyebrow">✦ Prize Verified Hackathons</p>
        <p className="auth-visual-heading">Build, Ship, Win.</p>
        <p className="auth-visual-text">
          Every prize is locked in escrow before a hackathon goes live.
        </p>
        <Link href="/hackathons" className="auth-visual-primary btn-pill">
          <span className="btn-fill" aria-hidden />
          <span className="btn-content">
            Explore Hackathons <ArrowUpRight aria-hidden size={16} className="btn-arrow" />
          </span>
        </Link>
      </div>

      <div className="auth-visual-card">
        <p className="auth-visual-stat">50%</p>
        <p className="auth-visual-card-text">
          of every prize is paid the instant winners are announced. The rest follows at your
          milestone.
        </p>
        <Link href="/#how-it-works" className="auth-visual-secondary btn-pill">
          <span className="btn-fill" aria-hidden />
          <span className="btn-content">
            How Escrow Works <ArrowUpRight aria-hidden size={16} className="btn-arrow" />
          </span>
        </Link>
      </div>
    </aside>
  );
}
