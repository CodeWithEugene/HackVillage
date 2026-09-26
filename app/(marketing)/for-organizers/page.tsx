import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument } from "@/components/patterns/legal-document";
import { JsonLd } from "@/components/seo/json-ld";
import { HOST_HACKATHON_HREF } from "@/lib/auth/signup-links";
import { pageOpenGraph } from "@/lib/seo/metadata";
import { breadcrumbSchema, faqSchema } from "@/lib/seo/schema";

export const metadata: Metadata = {
  title: "How It Works For Organizers: Host A Hackathon With Escrowed Prizes",
  description:
    "Everything organizers need to host a hackathon on HackVillage: setup, verification, the 5% fee, funding the prize vault, judging, instant payouts, milestones and your public trust score.",
  alternates: { canonical: "/for-organizers" },
  openGraph: pageOpenGraph("/for-organizers"),
};

/** Mirrors the visible FAQ at the bottom of the page (FAQPage structured data). */
const FAQS = [
  {
    question: "How much does it cost to host a hackathon on HackVillage?",
    answer:
      "Creating an organization and drafting hackathons is free. When you fund a hackathon, you pay a 5% platform fee on top of the prize pool, so a KES 500,000 pool is a KES 525,000 deposit. Winners receive the full prize.",
  },
  {
    question: "What is the smallest prize pool I can offer?",
    answer: "The prize pool must be at least KES 10,000 in total across all prize places.",
  },
  {
    question: "Why do I have to deposit the prize before the hackathon goes live?",
    answer:
      "Builders only see hackathons whose full prize pool is already in escrow, which is what earns the Prize Verified badge. It proves the prize is real, so stronger builders sign up and nobody has to trust a promise.",
  },
  {
    question: "Can I pay prizes in full on the day?",
    answer:
      "Yes. Each prize place can either pay half on the day and half when the winning team delivers a milestone, or pay in full as soon as results are announced. Half and half is the default.",
  },
  {
    question: "What happens if I miss the 48-hour media deadline?",
    answer:
      "If a hackathon has no approved photos or videos 48 hours after it ends, your organization's trust score drops by 10 points. You can appeal from your organizer page.",
  },
];

/*
 * Every rule here mirrors the code that enforces it: lib/events (wizard,
 * publish gate, categories), lib/env (fee, minimum pool), services/escrow
 * (deposits), services/judging (scorecards, feedback gate), services/payout
 * (announcement gate, tranches), services/media and services/legacy
 * (media deadline, trust score, milestones, check-ins), lib/orgs (profile,
 * verification). Update this page in the same PR as any change to them.
 */
export default function ForOrganizersPage() {
  return (
    <LegalDocument
      title="How It Works For Organizers"
      intro="Run a hackathon builders trust from day one. This guide covers everything, from setting up your organization to the final payout, and what you gain at every step."
      lastUpdated="September 26, 2026"
    >
      <JsonLd
        data={[
          faqSchema(FAQS),
          breadcrumbSchema([{ name: "How It Works For Organizers", path: "/for-organizers" }]),
        ]}
      />

      <h2>1. Why Host On HackVillage</h2>
      <ul>
        <li>
          <strong>Builders believe your prize is real.</strong> Your hackathon only goes public once
          the full prize pool is in escrow, and it carries the <strong>Prize Verified</strong>{" "}
          badge. Strong builders skip hackathons where prizes might never arrive; yours removes that
          doubt before they register.
        </li>
        <li>
          <strong>Payouts run themselves.</strong> When you announce winners, half of each prize is
          sent automatically, and the rest follows when you confirm the milestone. No spreadsheets,
          no bank runs, no chasing winners for details.
        </li>
        <li>
          <strong>You get working solutions, not just pitches.</strong> By default, the second half
          of each prize is tied to a milestone you set, such as a handover of the working project.
          Winners are paid to finish, so you get something you can use.
        </li>
        <li>
          <strong>Judging that holds up to scrutiny.</strong> Every judge scores every team against
          the same scorecard you set in advance, and must leave written feedback before their scores
          count. Fewer complaints, clearer results.
        </li>
        <li>
          <strong>A public track record.</strong> Your organization profile, verification badge and
          trust score appear on every hackathon you host. Following through builds a reputation that
          brings better builders back each time.
        </li>
        <li>
          <strong>Outcomes you can report on.</strong> Three months after every hackathon, each team
          is asked what became of their project, so you can see which challenges turned into real
          products.
        </li>
      </ul>

      <h2>2. What It Costs</h2>
      <p>
        Creating an account, setting up your organization and drafting hackathons is free. You only
        pay when you fund a hackathon:
      </p>
      <ul>
        <li>
          A <strong>5% platform fee</strong>, paid on top of the prize pool. For example, a KES
          500,000 pool is a KES 525,000 deposit.
        </li>
        <li>
          Winners always receive <strong>100% of the announced prize</strong>. The fee is never
          taken out of prize money.
        </li>
        <li>
          The prize pool must be at least <strong>KES 10,000</strong> in total.
        </li>
      </ul>

      <h2>3. Set Up Your Organization</h2>
      <p>
        Hackathons belong to an organization, so your first step is to{" "}
        <Link href={HOST_HACKATHON_HREF}>create an organizer account</Link> and set one up.
        You&apos;ll tell us:
      </p>
      <ul>
        <li>
          Your organization&apos;s name and what kind of organization it is: a company, university
          or school, community or club, nonprofit, or government agency.
        </li>
        <li>Where you&apos;re based, and optionally your website and main social link.</li>
        <li>
          A contact phone number. Only the HackVillage team sees it; it never appears on your
          hackathons.
        </li>
      </ul>
      <p>
        Your name, kind, location, links and about text make up the organizer card that builders see
        on every hackathon you host. You can edit them anytime from your organizer page.
      </p>
      <p>
        <strong>Bring your team.</strong> Share an invite code (valid for 7 days) so colleagues can
        join your organization. Owners and admins create and manage hackathons, judging, funding and
        payouts.
      </p>

      <h2>4. Get Verified</h2>
      <p>
        Because organizers hold real prize money in escrow, we check who you are before your first
        deposit. Start it right after setup so it never holds up your launch:
      </p>
      <ol>
        <li>
          Open <strong>Verification</strong> from your organizer page and submit your registered
          legal name, registration number, KRA PIN (optional for communities and government
          agencies) and an authorized signatory.
        </li>
        <li>
          The HackVillage team reviews it, usually within 48 hours, and emails you the decision. A
          reviewer may ask for documents such as your registration certificate.
        </li>
        <li>
          Once verified, your hackathons carry the <strong>Verified Organizer</strong> badge and you
          can fund prize pools. If something needs fixing, you&apos;ll see the reviewer&apos;s note
          and can resubmit.
        </li>
      </ol>
      <p>You can create and draft hackathons while verification is in review.</p>

      <h2>5. Create Your Hackathon</h2>
      <p>The hackathon builder walks you through five steps:</p>
      <ol>
        <li>
          <strong>Basics:</strong> title, summary, dates, when registration closes, and whether
          it&apos;s in person, online or hybrid. Registration must close before the hackathon
          starts.
        </li>
        <li>
          <strong>Problem:</strong> the problem statement and rules. Name who the problem affects
          and why it matters; it&apos;s what draws the right builders.
        </li>
        <li>
          <strong>Prizes:</strong> one prize per place, and for each one, whether it pays half on
          the day and half on a milestone, or in full on the day.
        </li>
        <li>
          <strong>Teams:</strong> how many teams can take part (from 2 to 200) and the roles you
          want, such as developers, designers or data scientists. Teams hold up to five people.
        </li>
        <li>
          <strong>Review:</strong> check everything before saving your draft.
        </li>
      </ol>
      <p>
        Pick up to <strong>three categories</strong> (for example AI, Fintech or ClimateTech) so
        builders find you through the category filter, and upload a cover image. Covers are 1600 by
        900 pixels; choose a photo at least 1200 by 675 and we crop and resize it for you.
      </p>

      <h2>6. Publish And Fund The Prize Vault</h2>
      <ol>
        <li>
          <strong>Publish</strong> your draft. We check it has a title, a problem statement, at
          least one prize, a pool of at least KES 10,000, and dates in the right order.
        </li>
        <li>
          <strong>Fund the vault</strong> from the hackathon&apos;s Prize Vault page. The deposit
          covers the prize pool plus the 5% fee, through our payment partner, Paystack. A checkout
          you start but don&apos;t complete expires after 24 hours, and you can start a new one
          anytime.
        </li>
        <li>
          The moment the full pool is locked, your hackathon <strong>goes live</strong> with the
          Prize Verified badge and opens for registration.
        </li>
      </ol>
      <p>
        After the deposit, the money never passes back through your hands: payouts go from escrow
        straight to winners. Read <Link href="/how-escrow-works">How Escrow Works</Link> for every
        step of how prize money is held and paid.
      </p>

      <h2>7. Set Up Judging</h2>
      <ul>
        <li>
          <strong>Invite judges</strong> by their HackVillage handle. They accept or decline from
          their dashboard.
        </li>
        <li>
          <strong>Build your scorecard</strong> before judging opens: three to eight criteria, with
          weights that add up to 100. It locks when judging opens, so nobody can move the goalposts.
        </li>
        <li>
          Judges score each criterion from 0 to 10. A team&apos;s result is the average of every
          judge&apos;s weighted score, and teams with the same score share a rank.
        </li>
        <li>
          Before a judge&apos;s review counts, they must leave each team at least one strength, one
          thing to improve and one next step. Every team leaves with feedback, win or not.
        </li>
      </ul>
      <p>
        See{" "}
        <Link href="/blog/judging-scorecards-teams-trust">
          How To Build A Judging Scorecard Teams Trust
        </Link>{" "}
        for tips on choosing criteria.
      </p>

      <h2>8. Announce Winners And Pay Out</h2>
      <p>When the hackathon ends, you open judging. You can announce results once:</p>
      <ul>
        <li>every active judge has finalized a review for every submitted team, and</li>
        <li>
          each winning team leader has added a payout method (an M-Pesa number or bank account).
        </li>
      </ul>
      <p>
        When you announce, the first payout for every winning team is sent straight away: half of
        the prize, or all of it for prizes set to pay in full. Winners and every participant are
        told the results automatically.
      </p>

      <h2>9. After The Hackathon</h2>
      <ul>
        <li>
          <strong>Share media within 48 hours.</strong> Upload photos (JPEG, PNG or WebP) and short
          videos (MP4), up to 15 MB each, and approve at least one within 48 hours of the hackathon
          ending. Missing that costs your trust score 10 points; you can appeal if something got in
          the way.
        </li>
        <li>
          <strong>Confirm milestones within 30 days.</strong> When a winning team delivers, confirm
          the milestone and the rest of their prize is released. We send reminders if a confirmation
          is overdue, and if it stays unconfirmed 14 days after you announced the winners, the
          winner can open a dispute. The HackVillage team reviews it, and the money stays in escrow
          until it&apos;s settled.
        </li>
        <li>
          <strong>Endorse great builders.</strong> Your judges can endorse the winners they judged,
          which appears on those builders&apos; Proof-of-Work profiles.
        </li>
        <li>
          <strong>See what happened next.</strong> About three months later, every team is asked
          whether their project is still a demo, in production, pivoted or set aside.
        </li>
      </ul>

      <h2>10. Your Trust Score</h2>
      <p>
        Every organization starts with a trust score of 100, shown on each hackathon you host
        alongside how many hackathons you&apos;ve run and how much prize money you&apos;ve escrowed.
      </p>
      <ul>
        <li>A missed 48-hour media deadline takes away 10 points, unless an appeal is granted.</li>
        <li>The HackVillage team can adjust a score, always with a recorded reason.</li>
        <li>The score never drops below 0 and tops out at 150.</li>
      </ul>
      <p>
        Read{" "}
        <Link href="/blog/the-48-hour-media-standard">The 48 Hour Media Standard, Explained</Link>{" "}
        for how to hit the media deadline every time.
      </p>

      <h2>11. Frequently Asked Questions</h2>
      {FAQS.map((faq) => (
        <div key={faq.question}>
          <h3>{faq.question}</h3>
          <p>{faq.answer}</p>
        </div>
      ))}

      <h2>12. Ready To Host?</h2>
      <p>
        <Link href={HOST_HACKATHON_HREF}>Create your organizer account</Link> to get started, or
        read{" "}
        <Link href="/blog/running-a-hackathon-builders-trust">
          How To Run A Hackathon Builders Trust
        </Link>{" "}
        for a practical checklist. Questions? Email{" "}
        <a href="mailto:info@hackvillage.xyz">info@hackvillage.xyz</a>.
      </p>
    </LegalDocument>
  );
}
