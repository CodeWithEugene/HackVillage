/**
 * A short, plain answer to "What is HackVillage?" for visitors, search
 * engines and AI answer engines. It names the brand both ways people search
 * for it and states only what the platform already enforces in code, so an
 * engine quoting it never repeats something that isn't true.
 */
export function LandingAbout() {
  return (
    <section className="site-container py-16" aria-labelledby="about-hackvillage">
      <div className="mx-auto max-w-3xl text-center">
        <h2 id="about-hackvillage" className="font-display text-2xl font-bold text-ink sm:text-3xl">
          What Is HackVillage?
        </h2>
        <p className="mt-5 text-lg leading-8 text-body-copy">
          <strong className="text-ink">HackVillage</strong> (also written Hack Village) is an
          open-source hackathon platform for Kenya and Africa. Organizers deposit the full prize
          pool into escrow before a hackathon goes live, so every prize listed here is funded, and
          winners are paid half of their prize as soon as results are announced. Every result also
          builds the winner&apos;s Proof-of-Work developer profile.
        </p>
      </div>
    </section>
  );
}
