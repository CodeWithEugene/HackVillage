import Image from "next/image";

import { LandingLink } from "@/components/landing/landing-link";
import { PageHero } from "@/components/patterns/page-hero";
import { HOST_HACKATHON_HREF } from "@/lib/auth/signup-links";
const STEPS = [
  {
    number: "01",
    image: "organizers-planning-hackathon-at-laptop",
    intro: "Set the challenge, put up the money, and give great ideas somewhere to start.",
    title: "The Prize Is Already There",
    description:
      "Post your challenge and the roles you're looking for. Before anyone signs up, you put the full prize amount in, so builders know it's real, not a promise.",
    alt: "Kenyan hackathon organizers planning a challenge together at a laptop",
  },
  {
    number: "02",
    image: "developers-building-at-nairobi-hackathon",
    intro: "Bring the right people together and turn one idea into a working project.",
    title: "Builders Team Up",
    description:
      "People join, find teammates, and build their project together, all in one shared space, from first idea to final demo.",
    alt: "Three Kenyan developers collaborating on a project at a Nairobi hackathon",
  },
  {
    number: "03",
    image: "developer-demoing-project-to-hackathon-judges",
    intro: "Give every project a fair review and feedback they can actually use.",
    title: "Everyone Gets Judged the Same Way",
    description:
      "Teams submit their work. Judges score every project against the same scorecard and leave notes builders can learn from.",
    alt: "A Kenyan developer demonstrating his project to two hackathon judges",
  },
  {
    number: "04",
    image: "hackathon-winners-checking-payout-beside-trophy",
    intro: "Celebrate the work, reward the winners, and let anyone check the receipts.",
    title: "Winners Get Paid Instantly",
    description:
      "The moment winners are announced, half their prize lands in their account, instantly. The rest follows once they deliver, and anyone can check it actually happened.",
    alt: "Two Kenyan hackathon winners checking their prize payout beside a trophy",
  },
];

/**
 * The /how-it-works page body: the shared page hero, then the four steps as
 * story cards in the ruled frame. The copy is unchanged from the original
 * section.
 */
export function HowItWorks() {
  return (
    <>
      <PageHero
        id="how-it-works-heading"
        kicker="How It Works"
        title={
          <>
            From First Idea <span>to Final Payday.</span>
          </>
        }
        lead={
          <>
            One simple flow: lock in the prize money, bring people together, judge everyone the same
            way, and pay winners the moment they&apos;re announced.
          </>
        }
      >
        <div className="lp-hero-actions">
          <LandingLink href="/hackathons">Browse Hackathons</LandingLink>
          <LandingLink href={HOST_HACKATHON_HREF} variant="secondary">
            Host A Hackathon
          </LandingLink>
        </div>
      </PageHero>

      <section id="how-it-works" className="lp-section" aria-label="The four steps">
        <div className="lp-frame lp-block lp-divided">
          <ol className="hiw-steps">
            {STEPS.map((step) => (
              <li key={step.number} className="hiw-step">
                <span className="hiw-number" aria-hidden="true">
                  {step.number}
                </span>
                <p className="hiw-intro">{step.intro}</p>
                <div className="hiw-photo">
                  <Image
                    src={`/marketing/process/${step.image}.webp`}
                    alt={step.alt}
                    fill
                    sizes="(max-width: 599px) 94vw, (max-width: 1023px) 46vw, 23vw"
                    className="object-cover"
                  />
                </div>
                <h3 className="hiw-title">{step.title}</h3>
                <p className="hiw-description">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
