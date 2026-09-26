import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument } from "@/components/patterns/legal-document";
import { JsonLd } from "@/components/seo/json-ld";
import { faqSchema } from "@/lib/seo/schema";
import { pageOpenGraph } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: "How Escrow Works: Hackathon Prize Money, Secured",
  description:
    "How HackVillage locks 100% of every hackathon prize pool in escrow before the event goes live, and exactly how winners get paid: 50% instantly, 50% on milestone.",
  alternates: { canonical: "/how-escrow-works" },
  openGraph: pageOpenGraph("/how-escrow-works"),
};

/**
 * Mirrors the visible FAQ at the bottom of the page — question-format content
 * is what answer engines (Google featured snippets, ChatGPT, Perplexity)
 * quote for "how do hackathon prizes work" style queries.
 */
const FAQS = [
  {
    question: "How is a hackathon prize pool secured?",
    answer:
      "The organizer deposits 100% of the prize pool, plus a 5% platform fee, through Paystack before the hackathon goes live. Once the deposit clears, the vault locks, the hackathon goes public, and it earns the Prize Verified badge. The money never passes back through the organizer's hands.",
  },
  {
    question: "When do hackathon winners get paid?",
    answer:
      "Winners receive 50% of their prize as soon as results are announced. The platform target is for over 90% of these payouts to arrive within one hour. The remaining 50% releases when the organizer confirms the winning team's milestone, due within 30 days. Prizes without a milestone pay in full on the day.",
  },
  {
    question: "Who holds the prize money during a hackathon?",
    answer:
      "Deposits are collected and held by Paystack, a licensed payment provider, and payouts are sent from that balance straight to winners. Every vault lock and payout is also attested on a public blockchain ledger (Polygon) so anyone can check the history against the payment provider's receipts.",
  },
  {
    question: "Does HackVillage take a fee from hackathon prizes?",
    answer:
      "No. The 5% platform fee is paid by the organizer on top of the prize pool. Winners receive every shilling of the announced prize.",
  },
  {
    question: "What if an organizer does not confirm a winner's milestone?",
    answer:
      "The winner can open a dispute from their winnings page after 14 days. The HackVillage team reviews it, and if the milestone was met, releases the final payout through the same path as every other payout. The money stays locked in escrow while the dispute is open.",
  },
  {
    question: "Can anyone verify that a hackathon prize was actually paid?",
    answer:
      "Yes. The public PrizeVault blockchain record shows the shilling amounts locked and paid for each hackathon, stored as hashed fingerprints that protect personal data. Organizers see their full deposit and payout history on their prize vault page.",
  },
];

/*
 * Every claim here reflects what the escrow and payout services actually do
 * (services/escrow, services/payout, services/legacy). Update this page in the
 * same PR as any change to those flows.
 */
export default function HowEscrowWorksPage() {
  return (
    <>
      <JsonLd data={faqSchema(FAQS)} />
      <LegalDocument
        title="How Escrow Works"
        intro="Every prize on HackVillage is fully funded before a single line of code is written. Here is exactly how the money moves, from the organizer's deposit to the winner's account."
        lastUpdated="September 25, 2026"
      >
        <h2>1. The Short Version</h2>
        <ul>
          <li>
            Organizers deposit <strong>100% of the prize pool</strong> before their hackathon can go
            live. No deposit, no hackathon.
          </li>
          <li>
            Once the money is in, the hackathon earns the <strong>Prize Verified</strong> badge, so
            developers know the prize exists before they start building.
          </li>
          <li>
            Winners get <strong>50% the moment results are announced</strong> and the other 50% when
            the organizer confirms the project milestone. Some prizes pay in full on the day.
          </li>
          <li>
            HackVillage&apos;s 5% platform fee is paid by the organizer on top of the pool. Winners
            receive every shilling of the announced prize.
          </li>
        </ul>

        <h2>2. Who Holds The Money</h2>
        <p>
          Deposits are collected and held through <strong>Paystack</strong>, our licensed payment
          provider, and payouts are sent from that balance straight to winners. After an organizer
          deposits, the prize money never passes back through their hands.
        </p>
        <p>
          Every step is also recorded on a public blockchain (Polygon) by our PrizeVault contract.
          The contract doesn&apos;t hold money. It keeps a tamper-proof record of when a pool was
          locked and when each payout was made, so anyone can check the history against the payment
          provider&apos;s receipts.
        </p>

        <h2>3. Step 1: Verify Your Organization</h2>
        <p>
          Before an organization&apos;s first deposit, an owner or admin requests business
          verification (KYB) from the prize vault page. The HackVillage team reviews it, usually
          within 48 hours, and every decision is written to our audit log. Deposits stay closed
          until verification is approved, and verified organizers show a Verified Organizer badge on
          their hackathons.
        </p>

        <h2>4. Step 2: Declare The Prize Pool</h2>
        <p>
          When you create a hackathon, you set a prize for each place. The prize pool is the sum of
          those prizes, in Kenyan shillings, with a minimum of KES 10,000. For each prize you also
          choose whether the second half depends on a milestone (the default) or whether the whole
          prize pays out on the day.
        </p>

        <h2>5. Step 3: Fund 100% Of The Pool</h2>
        <p>
          Publishing a hackathon puts it into <strong>Pending Deposit</strong>. From the prize vault
          page, an organization owner or admin pays the full remaining pool plus the 5% platform fee
          in one Paystack checkout. For example, a KES 500,000 pool is a KES 525,000 checkout. The
          fee is kept separate and never reduces the prizes.
        </p>
        <p>
          A checkout that isn&apos;t completed expires after 24 hours, and we email you so you can
          start a new one.
        </p>

        <h2>6. Step 4: The Vault Locks And The Hackathon Goes Live</h2>
        <p>
          As soon as Paystack confirms the payment and the deposit covers the full pool, three
          things happen together: the vault locks, the hackathon goes live, and the Prize Verified
          badge appears on its page. The blockchain record of the lock follows right after.
          Registered developers are notified that the prize is secured.
        </p>

        <h2>7. Step 5: Winners Are Paid On The Day</h2>
        <p>
          Before results can be announced, each winning team leader adds a payout method: an M-Pesa
          number or a bank account. When the organizer announces the winners, the first payout is
          queued for every winning team immediately.
        </p>
        <ul>
          <li>Prizes with a milestone pay 50% now. Prizes without one pay 100% now.</li>
          <li>
            Our target is for more than 90% of these payouts to reach winners within one hour of the
            announcement.
          </li>
          <li>
            The prize goes to the team leader. When a team submits its project, it declares how the
            prize is split between members. That split is part of the record, and the team settles
            it among themselves.
          </li>
        </ul>

        <h2>8. Step 6: The Milestone Releases The Rest</h2>
        <p>
          The second half of a prize is released when the organizer confirms the winning team&apos;s
          milestone, which is due 30 days after the winners are announced. Organizers get reminders
          while a milestone is overdue.
        </p>
        <p>
          If a milestone confirmation doesn&apos;t come, the winner can open a dispute from their
          winnings page after 14 days. The HackVillage team reviews it, and if the milestone was
          met, releases the final payout through the same path as every other payout. The money
          stays locked in escrow while the dispute is open.
        </p>

        <h2>9. When Something Goes Wrong</h2>
        <ul>
          <li>
            <strong>A payout fails:</strong> we retry it automatically, then hand it to the
            HackVillage team for manual review. The money stays in escrow until a payout is
            confirmed as paid.
          </li>
          <li>
            <strong>No double records:</strong> each half of each prize has exactly one payout
            record, so a retry resends that same payout instead of creating a new one.
          </li>
          <li>
            <strong>Nightly checks:</strong> every night we compare our records against the ledger
            and flag anything that doesn&apos;t match to the team.
          </li>
        </ul>

        <h2>10. Cancellations And Refunds</h2>
        <p>
          If you need to cancel a hackathon before it goes live, email us at{" "}
          <a href="mailto:info@hackvillage.xyz">info@hackvillage.xyz</a>. We&apos;ll refund what you
          deposited, including the platform fee. Once a hackathon is live, its prize pool is
          committed to the developers taking part.
        </p>

        <h2>11. What Is Public</h2>
        <p>
          The blockchain record shows each hackathon and the shilling amounts locked and paid out.
          Payment references and winner handles are stored there only as scrambled fingerprints
          (hashes), so they can be checked without being exposed. Organizers see their full deposit
          and payout history on their prize vault page.
        </p>
        <p>
          Each organizer also carries a public trust score, which starts at 100. For example,
          missing the 48-hour standard for delivering hackathon photos costs 10 points. Read more in
          our <Link href="/privacy">Privacy Policy</Link>.
        </p>

        <h2>12. A Note On Our Pilot</h2>
        <p>
          HackVillage is in its pilot. Until our live payment keys and the audited blockchain
          contract are switched on, deposits, payouts and blockchain records run in test mode.
          Everything described on this page works the same way in test mode, without real money
          moving.
        </p>

        <h2>13. Frequently Asked Questions</h2>
        {FAQS.map((faq) => (
          <div key={faq.question}>
            <h3>{faq.question}</h3>
            <p>{faq.answer}</p>
          </div>
        ))}

        <h2>14. More Questions</h2>
        <p>
          Ask us anything about escrow or payouts at{" "}
          <a href="mailto:info@hackvillage.xyz">info@hackvillage.xyz</a>, or see our{" "}
          <Link href="/terms">Terms of Service</Link>.
        </p>
      </LegalDocument>
    </>
  );
}
