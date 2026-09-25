import Link from "next/link";

import type { BlogPost } from "@/lib/blog/types";

function Body() {
  return (
    <>
      <p>
        Anyone can write &quot;hackathon winner&quot; on a CV. Very few people can prove it. Your
        HackVillage Proof of Work profile is built from what actually happened on the platform, so
        the people who read it can take it at face value.
      </p>

      <h2>Your Wins Write Themselves</h2>
      <p>
        When winners are announced, each winning submission becomes a portfolio item on the team
        leader&apos;s profile automatically, with its repository and demo links. You don&apos;t fill
        in a form or upload a certificate. The record comes straight from the results.
      </p>

      <h2>The Numbers Are Earned</h2>
      <p>Your profile shows a small set of stats, all counted from platform activity:</p>
      <ul>
        <li>Hackathons you took part in</li>
        <li>Wins, and your win rate</li>
        <li>The total prize money you have won</li>
        <li>Endorsements from judges</li>
      </ul>
      <p>There are no self reported numbers, which is exactly why they carry weight.</p>

      <h2>Endorsements From The People Who Judged You</h2>
      <p>
        Only the judges of a hackathon can endorse its winners, and only for that hackathon. An
        endorsement is a short, specific note from someone who saw your work up close. You stay in
        control: you can choose which endorsements appear on your profile.
      </p>

      <h2>Keep Each Project&apos;s Story Current</h2>
      <p>
        Every portfolio item carries a status: still a demo, in production, pivoted, or archived.
        When you check in on a project a few months after the hackathon, its status updates. A demo
        that became a live product tells a hiring team far more than the demo alone.
      </p>

      <h2>Introductions, On Your Terms</h2>
      <p>
        Hiring partners can ask to be introduced to winners of a hackathon. You get the request, see
        who is asking, and accept or decline. Your contact details are only shared if you accept.
      </p>
      <p>
        The fastest way to start your record is to <Link href="/hackathons">join a hackathon</Link>{" "}
        and ship something you are proud of.
      </p>
    </>
  );
}

export const post: BlogPost = {
  meta: {
    slug: "proof-of-work-portfolio",
    title: "Turn Hackathon Wins Into A Portfolio Hiring Teams Believe",
    excerpt:
      "Your Proof of Work profile is built from verified results, judge endorsements, and real project outcomes. Here is how it works.",
    category: "Builders",
    publishedAt: "2026-09-18",
    author: "HackVillage Team",
    readingMinutes: 4,
    cover: "/marketing/hero/kenya/center-developer.webp",
    coverAlt: "Kenyan software engineer in a blue overshirt holding her laptop",
  },
  Body,
};
