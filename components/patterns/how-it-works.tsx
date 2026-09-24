import Image from "next/image";

const STEPS = [
  {
    number: "01",
    image: "launch",
    intro: "Set the challenge. Secure the prizes. Give great ideas a place to start.",
    title: "Launch With Trust",
    description:
      "Publish your brief and roles. Deposit the full prize pool to earn the Prize Verified badge.",
    alt: "Kenyan hackathon organizers planning a challenge together at a laptop",
  },
  {
    number: "02",
    image: "build",
    intro: "Bring the right people together and turn one idea into a working project.",
    title: "Team Up & Build",
    description:
      "Developers join your hackathon, form teams, and manage their projects in one shared workspace.",
    alt: "Three Kenyan developers collaborating on a project at a Nairobi hackathon",
  },
  {
    number: "03",
    image: "judge",
    intro: "Give every project a fair, structured review and feedback they can use.",
    title: "Showcase & Judge",
    description:
      "Teams submit their work. Judges score against a clear rubric and share structured feedback.",
    alt: "A Kenyan developer demonstrating his project to a judge at a hackathon",
  },
  {
    number: "04",
    image: "reward",
    intro: "Celebrate the work. Reward the winners. Every outcome stays verifiable.",
    title: "Celebrate & Reward",
    description:
      "Winners receive 50% instantly, with the rest tied to milestones. Every payout goes on the public ledger.",
    alt: "Two Kenyan hackathon winners celebrating together with their trophy",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="site-container how-it-works"
      aria-labelledby="how-it-works-heading"
    >
      <header className="how-it-works-header">
        <div className="how-it-works-heading-block">
          <p className="how-it-works-eyebrow">How It Works</p>
          <h2 id="how-it-works-heading">
            From the First Idea
            <br />
            <span>to the Final Payout.</span>
          </h2>
        </div>
        <p className="how-it-works-description">
          One flow from launch to payout: deposit the prize, welcome builders, judge fairly, and
          pay out the moment winners are announced.
        </p>
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
