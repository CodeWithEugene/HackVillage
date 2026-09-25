import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Sparkle } from "@/components/patterns/sparkle";

const STEPS = [
  {
    number: "01",
    image: "launch",
    intro: "Set the challenge, put up the money, and give great ideas somewhere to start.",
    title: "The Prize Is Already There",
    description:
      "Post your challenge and the roles you're looking for. Before anyone signs up, you put the full prize amount in, so builders know it's real, not a promise.",
    alt: "Kenyan hackathon organizers planning a challenge together at a laptop",
  },
  {
    number: "02",
    image: "build",
    intro: "Bring the right people together and turn one idea into a working project.",
    title: "Builders Team Up",
    description:
      "People join, find teammates, and build their project together, all in one shared space, from first idea to final demo.",
    alt: "Three Kenyan developers collaborating on a project at a Nairobi hackathon",
  },
  {
    number: "03",
    image: "judge",
    intro: "Give every project a fair review and feedback they can actually use.",
    title: "Everyone Gets Judged the Same Way",
    description:
      "Teams submit their work. Judges score every project against the same scorecard and leave notes builders can learn from.",
    alt: "A Kenyan developer demonstrating his project to a judge at a hackathon",
  },
  {
    number: "04",
    image: "reward",
    intro: "Celebrate the work, reward the winners, and let anyone check the receipts.",
    title: "Winners Get Paid Instantly",
    description:
      "The moment winners are announced, half their prize lands in their account, instantly. The rest follows once they deliver, and anyone can check it actually happened.",
    alt: "Two Kenyan hackathon winners celebrating together with their trophy",
  },
];

/** `headingLevel` is h1 on the standalone /how-it-works page; it looks the same either way. */
export function HowItWorks({ headingLevel = "h2" }: { headingLevel?: "h1" | "h2" }) {
  const Heading = headingLevel;
  return (
    <section
      id="how-it-works"
      className="site-container how-it-works"
      aria-labelledby="how-it-works-heading"
    >
      <header className="how-it-works-header">
        <Sparkle className="how-it-works-star how-it-works-star-left" />
        <Sparkle className="how-it-works-star how-it-works-star-right" />
        <div className="how-it-works-heading-block">
          <p className="how-it-works-eyebrow">How It Works</p>
          <Heading id="how-it-works-heading" className="how-it-works-title">
            From First Idea
            <br />
            <span>to Final Payday.</span>
          </Heading>
        </div>
        <p className="how-it-works-description">
          One simple flow: lock in the prize money, bring people together, judge everyone the same
          way, and pay winners the moment they&apos;re announced.
        </p>
        {/* Same pills as the home page hero. */}
        <div className="hero-actions">
          <Link href="/hackathons" className="hero-action-primary btn-pill">
            <span className="btn-fill" aria-hidden />
            <span className="btn-content">
              Browse Hackathons <ArrowUpRight aria-hidden="true" size={17} className="btn-arrow" />
            </span>
          </Link>
          <Link href="/onboarding/organizer" className="hero-action-secondary btn-pill">
            Host A Hackathon <ArrowUpRight aria-hidden="true" size={16} className="btn-arrow" />
          </Link>
        </div>
      </header>
      <ol className="how-it-works-grid">
        {STEPS.map((step) => (
          <li key={step.number} className="how-it-works-step">
            <span className="how-it-works-number" aria-hidden="true">
              {step.number}
            </span>
            <p className="how-it-works-intro">{step.intro}</p>
            <div className="how-it-works-photo">
              <Image
                src={`/marketing/how-it-works/${step.image}.webp`}
                alt={step.alt}
                fill
                sizes="(max-width: 599px) 94vw, (max-width: 1023px) 46vw, 23vw"
                className="object-cover"
              />
              <div className="how-it-works-caption">
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
