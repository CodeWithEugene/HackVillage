import Link from "next/link";

import type { BlogPost } from "@/lib/blog/types";

function Body() {
  return (
    <>
      <p>
        The best builders are picky about where they spend their weekends. They choose hackathons
        with real prizes, clear problems, and organizers who follow through. Here is a practical
        checklist for running a hackathon on HackVillage that builders will trust and come back to.
      </p>

      <h2>Get Verified Early</h2>
      <p>
        Your organization needs business verification before its first deposit. Request it from the
        prize vault page as soon as you create your first hackathon. The HackVillage team usually
        reviews it within 48 hours, and verified organizers carry a Verified Organizer badge on
        their hackathons.
      </p>

      <h2>Write A Problem Worth Solving</h2>
      <ul>
        <li>Name who the problem affects and why it matters now.</li>
        <li>
          Pick up to three categories, such as Fintech or HealthTech, so the right builders find you
          through the category filter.
        </li>
        <li>List the roles you need so teams can form around them.</li>
        <li>Keep the rules short and specific: team size, stack limits, and IP terms.</li>
      </ul>

      <h2>Set Prizes You Can Fund Today</h2>
      <p>
        Set a prize for each place, with a minimum pool of KES 10,000. You fund the full pool plus
        our 5% fee before the hackathon goes live. Decide whether each prize pays half on the day
        and half on a milestone (the default), or pays in full on the day.
      </p>

      <h2>Add A Cover That Tells The Story</h2>
      <p>
        Upload a cover image from your hackathon page. Covers are 1600 by 900 pixels. Choose a photo
        at least 1200 by 675 pixels and we will crop and resize it for you. Cards show a wider
        slice, so keep the main subject near the middle.
      </p>

      <h2>Judge Fairly And Kindly</h2>
      <p>
        Invite judges and set a scorecard before the hackathon ends. Every judge scores every
        project against the same criteria and leaves each team a strength, an improvement, and a
        next step. Builders remember hackathons that taught them something.
      </p>

      <h2>Follow Through After The Demo</h2>
      <ul>
        <li>Announce winners promptly. Half of each prize pays out on the spot.</li>
        <li>
          Deliver hackathon photos within 48 hours. Missing that standard costs your trust score 10
          points.
        </li>
        <li>
          Confirm each winner&apos;s milestone within 30 days so the rest of their prize is
          released.
        </li>
      </ul>
      <p>
        Your trust score and track record appear on every hackathon you host, so following through
        is how you build a reputation builders notice.{" "}
        <Link href="/onboarding/organizer">Host a hackathon</Link> when you&apos;re ready.
      </p>
    </>
  );
}

export const post: BlogPost = {
  meta: {
    slug: "running-a-hackathon-builders-trust",
    title: "How To Run A Hackathon Builders Trust",
    excerpt:
      "A practical checklist for organizers: get verified, write a sharp brief, fund real prizes, judge fairly, and follow through after the demo.",
    category: "Organizers",
    publishedAt: "2026-09-25",
    author: "HackVillage Team",
    readingMinutes: 5,
    cover: "/marketing/hero/kenya/speaker.webp",
    coverAlt: "A Kenyan speaker addressing builders at a hackathon",
  },
  Body,
};
