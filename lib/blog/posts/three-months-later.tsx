import Link from "next/link";

import type { BlogPost } from "@/lib/blog/types";

function Body() {
  return (
    <>
      <p>
        Most hackathon projects stop the moment the demo ends. The laptops close, the repository
        goes quiet, and nobody ever finds out what happened next. We think that is a waste of good
        work, so every HackVillage hackathon ends with a small promise to come back.
      </p>

      <h2>A Check In, Three Months On</h2>
      <p>
        When a hackathon&apos;s winners are announced, we schedule a check in for every submitted
        project, not just the winners. About three months later, each team gets a short prompt
        asking where the project stands.
      </p>

      <h2>Four Honest Answers</h2>
      <ul>
        <li>
          <strong>Still a demo.</strong> It works, but it hasn&apos;t gone further yet.
        </li>
        <li>
          <strong>In production.</strong> Real people are using it.
        </li>
        <li>
          <strong>Pivoted.</strong> The idea changed into something new.
        </li>
        <li>
          <strong>Abandoned.</strong> The team moved on, and that is fine to say.
        </li>
      </ul>
      <p>
        Any team member can answer, and can add a short note about what happened. It takes about a
        minute.
      </p>

      <h2>Why Your Answer Matters</h2>
      <p>
        Your answer updates the project on your Proof of Work portfolio, so a project that shipped
        is shown as in production and an abandoned one is archived. Over time, these answers also
        show which hackathons lead to real products, which helps organizers and sponsors design
        better challenges.
      </p>

      <h2>Gentle Reminders</h2>
      <p>
        If a check in goes unanswered, we send a reminder when it is due and one more two weeks
        later. After that we stop asking and mark it as unanswered. No nagging beyond that.
      </p>
      <p>
        Every project deserves a second chapter. <Link href="/hackathons">Find a hackathon</Link>{" "}
        and start the first one.
      </p>
    </>
  );
}

export const post: BlogPost = {
  meta: {
    slug: "three-months-later",
    title: "Three Months Later: Why We Check In On Every Project",
    excerpt:
      "Every HackVillage project gets a check in three months after the hackathon. Here is what we ask, and what your answer changes.",
    category: "Updates",
    publishedAt: "2026-09-11",
    author: "HackVillage Team",
    readingMinutes: 3,
    cover: "/marketing/hero/kenya/hackathon-pair.webp",
    coverAlt: "Two Kenyan engineers sharing a laugh while coding together",
  },
  Body,
};
