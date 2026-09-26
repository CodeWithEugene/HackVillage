import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Sparkle } from "@/components/patterns/sparkle";
import { HOST_HACKATHON_HREF } from "@/lib/auth/signup-links";

const ARC_TEXT = "Verified. Paid. Proven.";

interface PillPhotoProps {
  name: string;
  alt: string;
  className?: string;
}

function PillPhoto({ name, alt, className }: PillPhotoProps) {
  return (
    <div className={className ? `journey-pill ${className}` : "journey-pill"}>
      <Image
        src={`/marketing/journey/${name}.webp`}
        alt={alt}
        fill
        sizes="(max-width: 1023px) 45vw, 14vw"
        className="object-cover"
      />
    </div>
  );
}

export function BuilderJourney() {
  return (
    <section className="site-container builder-journey" aria-labelledby="builder-journey-heading">
      <div className="journey-column journey-column-left">
        <div className="journey-copy">
          <Sparkle className="journey-star journey-star-left" />
          <h2 id="builder-journey-heading" className="journey-display">
            <span className="journey-heading-desktop">
              Build
              <br />
              Ship
              <br />
              Win
            </span>
            <span className="journey-heading-mobile">Build, Ship, Win</span>
          </h2>
          <p className="journey-text">
            Every prize is fully deposited before the first line of code, so builders across
            Africa compete for money that is already there.
          </p>
          <Link href={HOST_HACKATHON_HREF} className="journey-action btn-pill">
            <span className="btn-fill" aria-hidden />
            <span className="btn-content">
              Host A Hackathon <ArrowUpRight aria-hidden size={16} className="btn-arrow" />
            </span>
          </Link>
        </div>
        <div className="journey-pair journey-pair-left">
          <PillPhoto name="build" alt="Kenyan software engineer building her hackathon project" />
          <PillPhoto
            name="ship"
            alt="Kenyan developer demonstrating the mobile app he built"
          />
        </div>
      </div>

      <div className="journey-center">
        <svg className="journey-arc" viewBox="0 0 416 709" aria-hidden="true">
          <path id="journey-arc-path" d="M 0 141 A 257 257 0 0 1 416 141" fill="none" />
          <text textAnchor="middle">
            <textPath href="#journey-arc-path" startOffset="50%">
              {ARC_TEXT}
            </textPath>
          </text>
        </svg>
        <div className="journey-pill journey-pill-center">
          <Image
            src="/marketing/journey/win.webp"
            alt="Kenyan hackathon winner holding her trophy and laptop"
            fill
            sizes="(max-width: 1023px) 80vw, 26vw"
            className="object-cover"
          />
        </div>
      </div>

      <div className="journey-column journey-column-right">
        <div className="journey-pair journey-pair-right">
          <PillPhoto
            name="paid"
            alt="Kenyan developer checking his phone after receiving a prize payout"
          />
          <PillPhoto
            name="hired"
            alt="Kenyan engineer presenting her project portfolio to a hiring manager"
          />
        </div>
        <div className="journey-copy journey-copy-right">
          <Sparkle className="journey-star journey-star-right" />
          <p className="journey-text">
            Half your prize lands the moment you win. Ship your milestone and the rest follows, with
            every payout recorded on a public ledger.
          </p>
          <div className="journey-final-row">
            <p className="journey-display">
              Get Paid
              <br />
              Get Seen
              <br />
              Get Hired
            </p>
            <Link href="/hackathons" className="journey-action btn-pill">
              <span className="btn-fill" aria-hidden />
              <span className="btn-content">
                Explore Hackathons <ArrowUpRight aria-hidden size={16} className="btn-arrow" />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
