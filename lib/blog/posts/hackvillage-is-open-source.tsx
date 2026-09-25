import Link from "next/link";

import type { BlogPost } from "@/lib/blog/types";

function Body() {
  return (
    <>
      <p>
        A platform that holds prize money should be one you can inspect. That is why HackVillage is
        open source under the Apache 2.0 license. Anyone can read how escrow, payouts, and judging
        work, and anyone can help make them better.
      </p>

      <h2>Why Open Source</h2>
      <ul>
        <li>
          <strong>Trust you can check.</strong> The rules that decide how prizes are locked and paid
          live in public code, not in a policy document.
        </li>
        <li>
          <strong>Built with the community it serves.</strong> African builders and organizers know
          what hackathons here need, and they can shape the platform directly.
        </li>
        <li>
          <strong>Free to learn from.</strong> Students and junior developers can study a real,
          production system end to end.
        </li>
      </ul>

      <h2>What It Is Built With</h2>
      <p>
        HackVillage is a TypeScript app built on Next.js and PostgreSQL, with a Solidity contract
        that records prize attestations. You can run the whole thing locally, with payments and the
        blockchain simulated, so you never need real keys to contribute.
      </p>

      <h2>Ways To Help</h2>
      <ul>
        <li>Report a bug with clear steps to reproduce it.</li>
        <li>Improve the docs, or fix a confusing piece of copy.</li>
        <li>Pick up an open issue and send a pull request.</li>
        <li>Review the escrow contract and payout logic with fresh eyes.</li>
      </ul>

      <h2>Extra Care Around Money</h2>
      <p>
        Changes to escrow, payouts, or the contract go through a stricter process: open an issue
        first, and expect two maintainer approvals before anything merges. Every payout must stay
        safe to retry, and funds must stay locked whenever something fails.
      </p>
      <p>
        Everything you need to get started is in our{" "}
        <Link href="/contribute">contributor guide</Link>. We would love your help.
      </p>
    </>
  );
}

export const post: BlogPost = {
  meta: {
    slug: "hackvillage-is-open-source",
    title: "HackVillage Is Open Source: Here Is How To Help",
    excerpt:
      "The code that locks and pays out every prize is public under Apache 2.0. Here is why, and how you can contribute.",
    category: "Updates",
    publishedAt: "2026-09-04",
    author: "HackVillage Team",
    readingMinutes: 3,
    cover: "/marketing/hero/kenya/coding-focus.webp",
    coverAlt: "Kenyan software engineer concentrating on her laptop in a sunlit workspace",
  },
  Body,
};
