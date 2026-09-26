import Link from "next/link";

import type { BlogPost } from "@/lib/blog/types";

function Body() {
  return (
    <>
      <p>
        Winning should feel like winning. On HackVillage, that means money in your account on the
        day results are announced, not an email promising a transfer next quarter. Here is exactly
        how payouts work, from the announcement to the final shilling.
      </p>

      <h2>Before Results: Add Your Payout Method</h2>
      <p>
        Each winning team leader adds a payout method before winners can be announced: an M-Pesa
        number or a bank account. It takes a minute, and it means nothing is waiting on you when the
        moment comes.
      </p>

      <h2>On The Day: Half The Prize, Instantly</h2>
      <p>
        When the organizer announces the winners, the first payout is queued for every winning team
        straight away. For most prizes that is <strong>50% of the prize</strong>. Some organizers
        choose to pay a prize in full on the day, and then you get all of it at once.
      </p>
      <p>
        Our target is for more than nine in ten of these payouts to reach winners within one hour of
        the announcement.
      </p>

      <h2>After Delivery: The Rest Of The Prize</h2>
      <p>
        The second half of a prize is tied to a milestone: usually handing over the working project
        to the organizer. The organizer confirms the milestone, which is due 30 days after the
        winners are announced, and the final payout goes out through the same path as the first.
      </p>
      <p>
        If a confirmation doesn&apos;t come, you can open a dispute from your winnings page after 14
        days. The HackVillage team reviews it, and if you delivered, releases the rest of your
        prize. The money stays locked in escrow the whole time, so it cannot disappear while the
        question is settled.
      </p>

      <h2>How Team Prizes Are Split</h2>
      <p>
        The prize goes to the team leader. When your team submits its project, you declare how the
        prize is split between members, in whole percentages that add up to 100. That split is part
        of the record, and the team settles it among themselves.
      </p>

      <h2>If Something Goes Wrong</h2>
      <ul>
        <li>Failed payouts are retried automatically, then handed to our team to resolve.</li>
        <li>
          Each half of each prize has exactly one payout record, so a retry resends that same payout
          rather than creating a second one.
        </li>
        <li>Until a payout is confirmed as paid, the money stays in escrow.</li>
      </ul>
      <p>
        See every step in <Link href="/how-escrow-works">How Escrow Works</Link>, then{" "}
        <Link href="/hackathons">find a hackathon</Link> worth winning.
      </p>
    </>
  );
}

export const post: BlogPost = {
  meta: {
    slug: "how-winners-get-paid",
    title: "How Winners Get Paid: Half On The Day, The Rest On Delivery",
    excerpt:
      "From adding your M-Pesa number to the final payout, here is exactly how and when HackVillage winners receive their prize.",
    category: "Payouts",
    publishedAt: "2026-09-25",
    author: "HackVillage Team",
    readingMinutes: 4,
    cover: "/marketing/blog/hackathon-winners-checking-prize-payout.webp",
    coverAlt: "Kenyan hackathon winners checking a prize payout beside their trophy",
  },
  Body,
};
