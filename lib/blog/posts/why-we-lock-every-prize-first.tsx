import Link from "next/link";

import type { BlogPost } from "@/lib/blog/types";

function Body() {
  return (
    <>
      <p>
        Ask builders who have done a few hackathons and you will hear the same story. The team wins,
        the photos go up, and then the prize takes months to arrive, arrives smaller than announced,
        or never arrives at all. Nobody planned for it to go wrong. The money simply was never set
        aside.
      </p>
      <p>
        HackVillage exists to make that story impossible. The rule is simple:{" "}
        <strong>the full prize pool is locked in before the hackathon goes live.</strong>
      </p>

      <h2>A Promise Is Not A Prize</h2>
      <p>
        Most hackathons announce a prize and plan to pay it later, from a sponsor invoice, a budget
        line, or a partner who said yes in a meeting. Builders are asked to spend a weekend or a
        month on a promise they cannot check. When the money falls through, the people who did the
        work carry the loss.
      </p>
      <p>
        We think that is backwards. If a prize is real, it can be paid in before anyone starts
        building.
      </p>

      <h2>How The Lock Works</h2>
      <ul>
        <li>
          The organizer sets a prize for each place. The prize pool is their sum, in Kenyan
          shillings.
        </li>
        <li>
          Before the first deposit, the organization passes business verification with the
          HackVillage team.
        </li>
        <li>
          The organizer pays the whole pool through Paystack, our licensed payment provider, plus
          our 5% platform fee on top. The fee never comes out of the prizes.
        </li>
        <li>
          The moment the deposit confirms, the vault locks and the hackathon goes live. Until then,
          it does not appear on the platform at all.
        </li>
      </ul>

      <h2>What Builders Get From It</h2>
      <p>
        Every hackathon you can see on HackVillage has its prize money in place already. You do not
        have to trust a poster, chase an organizer, or wonder whether the budget got cut. If it is
        listed, the money is there.
      </p>
      <p>
        Every lock and every payout is also recorded on a public blockchain, so anyone can check the
        history against the payment provider&apos;s receipts.
      </p>

      <h2>What Organizers Get From It</h2>
      <p>
        Funding up front sounds like extra work, but it is also the strongest signal an organizer
        can send. Serious builders choose hackathons they can trust, and a funded prize pool tells
        them you are serious. It also removes the awkward follow up emails after the event, because
        paying winners is no longer a separate project.
      </p>
      <p>
        Read the full walkthrough in <Link href="/how-escrow-works">How Escrow Works</Link>, or{" "}
        <Link href="/onboarding/organizer">host a hackathon</Link> of your own.
      </p>
    </>
  );
}

export const post: BlogPost = {
  meta: {
    slug: "why-we-lock-every-prize-first",
    title: "Why We Lock Every Prize Before The Hackathon Starts",
    excerpt:
      "Winners chasing prizes for months is the oldest problem in hackathons. Here is how locking the full prize pool up front fixes it for good.",
    category: "Escrow",
    publishedAt: "2026-09-25",
    author: "HackVillage Team",
    readingMinutes: 4,
    cover: "/marketing/how-it-works/launch.webp",
    coverAlt: "Two Kenyan builders planning their project at a laptop",
  },
  Body,
};
