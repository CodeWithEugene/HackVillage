import Link from "next/link";

import type { BlogPost } from "@/lib/blog/types";

function Body() {
  return (
    <>
      <p>
        Your first hackathon can feel like a lot: new people, a tight deadline, and a panel of
        judges at the end. This guide walks you through a hackathon on HackVillage from the moment
        you find one to the day your work shows up on your profile.
      </p>

      <h2>1. Find A Hackathon That Fits</h2>
      <p>
        Browse <Link href="/hackathons">Hackathons</Link> and switch between Ongoing, Upcoming, and
        Past. Filter by category, such as AI, Fintech, or ClimateTech, to find problems you care
        about. Every hackathon listed already has its full prize pool locked in, so you are never
        building for a prize that might not exist.
      </p>
      <p>
        Open a hackathon to read its problem statement and rules, the prize breakdown, and the key
        dates, including when registration closes.
      </p>

      <h2>2. Register Before The Deadline</h2>
      <p>
        Create your free account, then register from the hackathon page. Registration closes before
        hacking starts, so do it early. Once you&apos;re in, you get a team workspace for that
        hackathon.
      </p>

      <h2>3. Find Your Team</h2>
      <p>
        Teams hold up to five people. Start your own team and invite others, or join a team that
        needs your skills. A good mix matters more than a big team: a builder, someone who thinks
        about the user, and someone who can tell the story is a strong start.
      </p>

      <h2>4. Build, Then Submit</h2>
      <p>
        Build during the hackathon and submit your project before submissions close, with a link to
        your repository and a demo. When you submit, your team also declares how any prize would be
        split between members, so there are no awkward conversations later.
      </p>

      <h2>5. Get Real Feedback</h2>
      <p>
        Judges score every project against the same scorecard. Before their scores count, each judge
        must leave your team at least one strength, one thing to improve, and one next step. Win or
        not, you leave with feedback you can use.
      </p>

      <h2>6. Keep The Proof</h2>
      <p>
        Every submission, win, and judge endorsement builds your Proof of Work profile, a public
        record of what you have actually shipped. It is verified by platform activity, with no self
        reported stats, so it means something to the people who read it.
      </p>
      <p>
        Ready? <Link href="/signup">Create your account</Link> and{" "}
        <Link href="/hackathons">pick your first hackathon</Link>.
      </p>
    </>
  );
}

export const post: BlogPost = {
  meta: {
    slug: "your-first-hackathon",
    title: "A Builder's Guide To Your First Hackathon On HackVillage",
    excerpt:
      "Find a hackathon, form a team, submit, and leave with real feedback and a verified portfolio. Here is how it all works, step by step.",
    category: "Builders",
    publishedAt: "2026-09-25",
    author: "HackVillage Team",
    readingMinutes: 5,
    cover: "/marketing/blog/volunteer-welcoming-developers-to-first-hackathon.webp",
    coverAlt: "A Kenyan volunteer welcoming developers to their first hackathon",
  },
  Body,
};
