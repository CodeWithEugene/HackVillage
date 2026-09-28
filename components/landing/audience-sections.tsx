import Image from "next/image";
import {
  CalendarCheck,
  Camera,
  ListChecks,
  Plus,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { JourneyCarousel } from "@/components/landing/journey-carousel";
import { LandingLink, TextLink } from "@/components/landing/landing-link";

const ORGANIZER_FACTS = [
  { value: "100%", label: "deposited before launch" },
  { value: "5%", label: "platform fee, paid on top of the pool" },
  { value: "30 days", label: "for each winner's milestone" },
] as const;

const ORGANIZER_ROWS: { Icon: LucideIcon; title: string; body: string }[] = [
  {
    Icon: ListChecks,
    title: "Judges score every team against the same rubric.",
    body: "Invite judges by email, set weighted criteria, and send every team written feedback alongside its scores, so results are something people can check rather than argue about.",
  },
  {
    Icon: Camera,
    title: "Photos and recaps are due within 48 hours of the close.",
    body: "Media lands on the hackathon page while people still care, and the deadline counts toward the organizer's public Trust Score.",
  },
  {
    Icon: CalendarCheck,
    title: "Three months later, winners check in on what they shipped.",
    body: "Legacy check-ins keep a record of what happened after demo day, and disputes go to the HackVillage team with the money still locked in escrow.",
  },
];

const JOURNEY = [
  {
    image: "kenyan-developer-building-hackathon-project",
    alt: "Kenyan software engineer building her hackathon project",
    title: "Build with a team.",
    body: "Form a team or join one with an invite code, then ship before the deadline.",
    href: "/hackathons",
    link: "Find a hackathon",
  },
  {
    image: "developer-demoing-mobile-app",
    alt: "Kenyan developer demonstrating the mobile app he built",
    title: "Demo to real judges.",
    body: "Every team is scored on the same published rubric and gets written feedback.",
    href: "/blog/judging-scorecards-teams-trust",
    link: "How judging works",
  },
  {
    image: "hackathon-winner-with-trophy-and-laptop",
    alt: "Kenyan hackathon winner holding her trophy and laptop",
    title: "Win a funded prize.",
    body: "The prize was deposited in escrow before you wrote a single line of code.",
    href: "/how-escrow-works",
    link: "How escrow works",
  },
  {
    image: "developer-receiving-hackathon-prize-payout",
    alt: "Kenyan developer checking his phone after receiving a prize payout",
    title: "Get paid in minutes.",
    body: "Half your prize goes to M-Pesa or your bank the moment results are announced.",
    href: "/blog/how-winners-get-paid",
    link: "How winners get paid",
  },
  {
    image: "engineer-presenting-portfolio-to-hiring-manager",
    alt: "Kenyan engineer presenting her project portfolio to a hiring manager",
    title: "Get hired on proof.",
    body: "Hiring teams request intros from your verified Proof-of-Work profile.",
    href: "/blog/proof-of-work-portfolio",
    link: "Build your portfolio",
  },
] as const;

function OrganizersBlock() {
  return (
    <section className="lp-section" aria-labelledby="lp-organizers-heading">
      <div className="lp-frame lp-block lp-split lp-divided">
        <div>
          <h2 id="lp-organizers-heading" className="lp-split-heading">
            Host a hackathon people trust from day one
          </h2>
          <LandingLink href="/for-organizers" className="mt-6">
            HackVillage For Organizers
          </LandingLink>
        </div>
        <p className="lp-split-text">
          Deposit the prize pool once through Paystack and HackVillage handles the rest: the Prize
          Verified badge, judge invitations, results, payouts and a paper trail anyone can check.
        </p>
      </div>

      <div className="lp-frame lp-block-flush">
        <div className="lp-story">
          <div className="lp-story-head">
            <span className="lp-story-mark">
              <ShieldCheck aria-hidden className="size-5" />
            </span>
            <p>Every prize pool is funded before registration opens.</p>
            <TextLink href="/how-escrow-works" className="lp-story-link">
              Read how escrow works
            </TextLink>
          </div>
          <div className="lp-story-photo">
            <Image
              src="/marketing/how-it-works/organizers-planning-hackathon-challenge.webp"
              alt="Kenyan organizers planning a hackathon challenge at a laptop"
              fill
              sizes="(max-width: 1280px) 100vw, 1216px"
              className="object-cover object-[center_28%]"
            />
          </div>
          <dl className="lp-story-facts">
            {ORGANIZER_FACTS.map((fact) => (
              <div key={fact.value}>
                <dt>{fact.value}</dt>
                <dd>{fact.label}</dd>
              </div>
            ))}
          </dl>
          <div className="lp-accordion">
            {ORGANIZER_ROWS.map(({ Icon, title, body }) => (
              <details key={title} className="lp-accordion-row">
                <summary>
                  <span className="lp-accordion-mark" aria-hidden="true">
                    <Icon className="size-4" />
                  </span>
                  <span className="lp-accordion-title">{title}</span>
                  <span className="lp-accordion-toggle" aria-hidden="true">
                    <Plus className="size-4" />
                  </span>
                </summary>
                <p>{body}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BuildersBlock() {
  return (
    <section className="lp-section" aria-labelledby="lp-builders-heading">
      <div className="lp-frame lp-block lp-split lp-divided">
        <div>
          <h2 id="lp-builders-heading" className="lp-split-heading">
            Build a portfolio that proves what you shipped
          </h2>
          <LandingLink href="/hackathons" className="mt-6">
            Explore Hackathons
          </LandingLink>
        </div>
        <p className="lp-split-text">
          Join a team, ship your project and get half your prize the moment you win. Every result,
          endorsement and payout lands on your public developer profile.
        </p>
      </div>

      <div className="lp-frame lp-block-flush">
        <JourneyCarousel label="The builder journey">
          {JOURNEY.map((step) => (
            <li key={step.image} className="lp-journey-card">
              <div className="lp-journey-photo">
                <Image
                  src={`/marketing/journey/${step.image}.webp`}
                  alt={step.alt}
                  fill
                  sizes="(max-width: 640px) 75vw, 280px"
                  className="object-cover"
                />
              </div>
              <p className="lp-journey-text">
                <strong>{step.title}</strong> {step.body}
              </p>
              <TextLink href={step.href}>{step.link}</TextLink>
            </li>
          ))}
        </JourneyCarousel>

        <figure className="lp-quote">
          <blockquote>
            &ldquo;If the prize isn&apos;t in the vault, the hackathon doesn&apos;t go live. Every
            payout after that is on the record.&rdquo;
          </blockquote>
          <figcaption>
            <strong>The HackVillage escrow rule,</strong> enforced in code since v1.0
          </figcaption>
          <TextLink href="/trust">See the public ledger</TextLink>
        </figure>
      </div>
    </section>
  );
}

/** Who HackVillage is for: organizers first, then builders. */
export function AudienceSections() {
  return (
    <>
      <OrganizersBlock />
      <BuildersBlock />
    </>
  );
}
