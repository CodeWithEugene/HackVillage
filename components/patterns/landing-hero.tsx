import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CircuitLines } from "@/components/patterns/circuit-lines";

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
        <CircuitLines className="hero-circuit hero-circuit-left" />
        <CircuitLines className="hero-circuit hero-circuit-right" />

        <div className="hero-copy">
          <p className="hero-eyebrow">Open source. Real people. Real impact.</p>
          <h1 id="hero-heading" className="hero-heading">
            Great Hackathons.
            <br />
            <span>From Start to Finish.</span>
          </h1>
          <p className="hero-description">
            From team formation to judging and payouts, bring your hackathon together in one place.
            Every event is <strong>Prize Verified</strong> — with funds secured before the building
            begins.
          </p>
          <div className="hero-actions">
            <Link href="/events" className="hero-action-primary">
              Browse Hackathons <ArrowUpRight aria-hidden="true" size={17} />
            </Link>
            <Link href="/onboarding/organizer" className="hero-action-secondary">
              Host a Hackathon <ArrowUpRight aria-hidden="true" size={16} />
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
            name="coding-focus"
            alt="Kenyan software engineer concentrating on her laptop in a sunlit workspace"
          />
        </div>
        <div className="hero-column hero-column-left">
          <Photo name="speaker" alt="Kenyan tech speaker sharing ideas at a developer event" />
          <Photo
            name="team-build"
            alt="Two Kenyan developers collaborating on a hackathon project"
          />
        </div>
        <Photo
          name="center-developer"
          alt="Kenyan software engineer in a blue overshirt holding her laptop"
          center
        />
        <div className="hero-column hero-column-right">
          <Photo
            name="hackathon-pair"
            alt="Two Kenyan engineers sharing a laugh while coding together"
          />
          <Photo
            name="community"
            alt="Developers exchanging ideas around a table at a Nairobi tech gathering"
          />
        </div>
        <div className="hero-column hero-column-edge-right">
          <Photo
            name="event-arrival"
            alt="Kenyan developer arriving at a tech event with his laptop"
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
