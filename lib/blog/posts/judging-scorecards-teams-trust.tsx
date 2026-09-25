import Link from "next/link";

import type { BlogPost } from "@/lib/blog/types";

function Body() {
  return (
    <>
      <p>
        Teams forgive a lot at a hackathon: slow Wi-Fi, cold coffee, a demo that crashes once. What
        they don&apos;t forgive is judging that feels random. On HackVillage, every hackathon is
        judged against a scorecard you set up in advance, and every judge uses the same one. Here is
        how to build a scorecard that teams will trust, even when they don&apos;t win.
      </p>

      <h2>Pick Three To Eight Criteria</h2>
      <p>
        A scorecard needs at least three criteria and holds at most eight. Fewer than three and one
        big idea decides everything. More than eight and judges start guessing. Good criteria are
        things a judge can see in a demo and a repository, for example:
      </p>
      <ul>
        <li>Does it solve the problem in the brief, for the people the brief names?</li>
        <li>Does it actually work, end to end, in the demo?</li>
        <li>Is the code and design quality strong enough to build on?</li>
        <li>Could this realistically reach users in Kenya, and how?</li>
      </ul>

      <h2>Weight What Matters Most</h2>
      <p>
        Give each criterion a weight, and make the weights add up to 100. If impact matters twice as
        much as polish, say so in the weights, not in a private conversation with the judges. Share
        the scorecard with teams at kickoff so they know what they are building toward.
      </p>

      <h2>Lock It Before Judging Opens</h2>
      <p>
        You can edit the scorecard until judging opens. After that it locks, so nobody can move the
        goalposts once the demos are in. Invite your judges early too, so they can read the brief
        and the criteria before the hackathon ends.
      </p>

      <h2>How Scores Become Rankings</h2>
      <p>
        Judges score each criterion from 0 to 10. A judge&apos;s score for a team is the weighted
        average across your criteria, and a team&apos;s final score is the average across every
        judge who reviewed it. Teams with the same score share a rank, so a tie is never broken by
        accident.
      </p>

      <h2>Feedback Comes Before Scores Count</h2>
      <p>
        A judge can&apos;t finalize a review until they have scored every criterion and left the
        team at least one strength, one thing to improve, and one next step. Each point needs to be
        specific enough to act on. Once a judge finalizes, the review locks.
      </p>
      <p>
        This is the part teams remember. A team that finishes fifth with three useful notes often
        comes back stronger to your next hackathon.
      </p>
      <p>
        Ready to set one up? <Link href="/onboarding/organizer">Host a hackathon</Link> and build
        your scorecard from your hackathon page.
      </p>
    </>
  );
}

export const post: BlogPost = {
  meta: {
    slug: "judging-scorecards-teams-trust",
    title: "How To Build A Judging Scorecard Teams Trust",
    excerpt:
      "Pick clear criteria, weight what matters, and lock it before judging opens. Here is how HackVillage scorecards keep judging fair.",
    category: "Organizers",
    publishedAt: "2026-09-22",
    author: "HackVillage Team",
    readingMinutes: 4,
    cover: "/marketing/how-it-works/judge.webp",
    coverAlt: "A Kenyan developer demonstrating his project to a judge at a hackathon",
  },
  Body,
};
