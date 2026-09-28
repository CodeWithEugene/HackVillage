import { LandingLink } from "@/components/landing/landing-link";

/**
 * A short, plain answer to "What is HackVillage?" for visitors, search
 * engines and AI answer engines. It names the brand both ways people search
 * for it and states only what the platform already enforces in code, so an
 * engine quoting it never repeats something that isn't true.
 */
export function LandingAbout() {
  return (
    <section className="lp-section" aria-labelledby="about-hackvillage">
      <div className="lp-frame lp-block lp-split lp-split-solo lp-divided">
        <div>
          <h2 id="about-hackvillage" className="lp-split-heading">
            What Is HackVillage?
          </h2>
          <LandingLink href="/how-it-works" className="mt-6">
            How It Works
          </LandingLink>
        </div>
        <p className="lp-split-text">
          <strong>HackVillage</strong> (also written Hack Village) is an open-source hackathon
          platform for Kenya and Africa. Organizers deposit the full prize pool into escrow before a
          hackathon goes live, so every prize listed here is funded, and winners are paid half of
          their prize as soon as results are announced. Every result also builds the winner&apos;s
          Proof-of-Work developer profile.
        </p>
      </div>
    </section>
  );
}
