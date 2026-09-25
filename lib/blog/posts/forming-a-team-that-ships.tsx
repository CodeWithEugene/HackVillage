import Link from "next/link";

import type { BlogPost } from "@/lib/blog/types";

function Body() {
  return (
    <>
      <p>
        The team you walk in with shapes everything that follows. Great teams aren&apos;t always the
        most experienced ones. They are the ones where everyone knows their job and nobody is
        surprised on demo day. Here is how to build one on HackVillage.
      </p>

      <h2>Start Small, Up To Five</h2>
      <p>
        Teams hold up to five people, but you rarely need all five. Three or four people who talk
        often will usually ship more than five who don&apos;t. Every extra person adds another
        opinion to settle before you can build.
      </p>

      <h2>Cover The Roles, Not Just The Stack</h2>
      <p>
        Read the hackathon page for the roles the organizer wants to see. Then make sure your team
        covers the basics:
      </p>
      <ul>
        <li>Someone who can build the core of the product quickly.</li>
        <li>Someone who thinks about the user and the problem in the brief.</li>
        <li>Someone who can design a clear, simple interface.</li>
        <li>Someone who can tell the story in a three minute demo.</li>
      </ul>
      <p>
        One person can cover more than one role. What matters is that nothing is left uncovered.
      </p>

      <h2>Agree On The Split Before You Submit</h2>
      <p>
        When your team submits its project, you declare how any prize would be split between
        members, in whole percentages that add up to 100. The prize is paid to the team leader, and
        the declared split is part of the record. Talk about it early, while everyone is still
        excited, not after the results are in.
      </p>

      <h2>Pick A Leader Who Is Ready To Be Paid</h2>
      <p>
        The team leader adds the payout method, an M-Pesa number or a bank account, before winners
        are announced. Choose someone organized who will actually do it, so your first payout is
        never waiting on you.
      </p>

      <h2>Plan For The Demo From Day One</h2>
      <p>
        Judges score against the hackathon&apos;s published scorecard. Read it at kickoff and build
        toward it. A smaller product that clearly works beats an ambitious one that only works in
        slides.
      </p>
      <p>
        Found your people? <Link href="/hackathons">Pick a hackathon</Link> and register together.
      </p>
    </>
  );
}

export const post: BlogPost = {
  meta: {
    slug: "forming-a-team-that-ships",
    title: "How To Form A Hackathon Team That Ships",
    excerpt:
      "Keep it small, cover the roles, and agree on the prize split early. A practical guide to building a team that finishes strong.",
    category: "Builders",
    publishedAt: "2026-09-08",
    author: "HackVillage Team",
    readingMinutes: 4,
    cover: "/marketing/how-it-works/build.webp",
    coverAlt: "Three Kenyan developers collaborating on a project at a Nairobi hackathon",
  },
  Body,
};
