import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Sparkle } from "@/components/patterns/sparkle";
import { HOST_HACKATHON_HREF } from "@/lib/auth/signup-links";

function Photo({ name, alt, center = false }: { name: string; alt: string; center?: boolean }) {
  return (
    <div className={center ? "hero-photo hero-photo-center" : "hero-photo"}>
      <Image
        src={`/marketing/hero/kenya/${name}.webp`}
        alt={alt}
        fill
        priority={center}
        sizes={center ? "(max-width: 640px) 280px, 30vw" : "(max-width: 640px) 240px, 22vw"}
        className="object-cover"
      />
    </div>
  );
}

export function LandingHero() {
  return (
    <section className="landing-hero font-display" aria-labelledby="hero-heading">
      <div className="hero-intro">
        <div className="hero-copy">
          <Sparkle className="hero-star hero-star-left" />
          <Sparkle className="hero-star hero-star-right" />
          <p className="hero-eyebrow">Open source. Real people. Real impact.</p>
          <h1 id="hero-heading" className="hero-heading">
            Great Hackathons.
            <br />
            <span>From Start to Finish.</span>
          </h1>
          <p className="hero-description">
            From team formation to judging and payouts, bring your hackathon together in one place.
            Every hackathon is <strong>Prize Verified</strong>, with funds secured before the building
            begins.
          </p>
          <div className="hero-actions">
            <Link href="/hackathons" className="hero-action-primary btn-pill">
              <span className="btn-fill" aria-hidden />
              <span className="btn-content">
                Browse Hackathons <ArrowUpRight aria-hidden="true" size={17} className="btn-arrow" />
              </span>
            </Link>
            <Link href={HOST_HACKATHON_HREF} className="hero-action-secondary btn-pill">
              Host A Hackathon <ArrowUpRight aria-hidden="true" size={16} className="btn-arrow" />
            </Link>
          </div>
        </div>
      </div>

      <div className="hero-collage">
        <div className="hero-column hero-column-edge-left">
          <p className="hero-side-note">
            Great people.
            <br />
            Bold ideas.
            <br />
            Real rewards.
          </p>
          <Photo
            name="kenyan-software-engineer-coding-on-laptop"
            alt="Kenyan software engineer concentrating on her laptop in a sunlit workspace"
          />
        </div>
        <div className="hero-column hero-column-left">
          <Photo name="kenyan-tech-speaker-at-hackathon" alt="Kenyan tech speaker sharing ideas at a hackathon" />
          <Photo
            name="kenyan-developers-collaborating-at-hackathon"
            alt="Two Kenyan developers collaborating on a hackathon project"
          />
        </div>
        <Photo
          name="kenyan-software-engineer-holding-laptop"
          alt="Kenyan software engineer in a blue overshirt holding her laptop"
          center
        />
        <div className="hero-column hero-column-right">
          <Photo
            name="kenyan-engineers-coding-together"
            alt="Two Kenyan engineers sharing a laugh while coding together"
          />
          <Photo
            name="nairobi-tech-community-gathering"
            alt="Developers exchanging ideas around a table at a Nairobi tech gathering"
          />
        </div>
        <div className="hero-column hero-column-edge-right">
          <Photo
            name="kenyan-developer-arriving-at-hackathon"
            alt="Kenyan developer arriving at a hackathon with his laptop"
          />
          <p className="hero-side-note">
            Connect.
            <br />
            Create.
            <br />
            Grow.
          </p>
        </div>
      </div>
    </section>
  );
}
