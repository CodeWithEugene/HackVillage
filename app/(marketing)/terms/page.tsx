import type { Metadata } from "next";

import { LegalDocument } from "@/components/patterns/legal-document";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of HackVillage.",
};

export default function TermsOfServicePage() {
  return (
    <LegalDocument title="Terms of Service" lastUpdated="September 24, 2026">
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your use of HackVillage, operated by
        Technetium Kenya (&ldquo;HackVillage&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). By
        creating an account or using{" "}
        <a href="https://www.hackvillage.xyz">hackvillage.xyz</a>, you agree to these Terms. If
        you don&apos;t agree, please don&apos;t use the platform.
      </p>

      <h2>1. What HackVillage is</h2>
      <p>
        HackVillage is open-source infrastructure for high-impact tech events: organizers host
        Prize Verified hackathons with escrowed prize pools, developers register, form teams,
        and submit projects, judges score submissions, and winners are paid out — 50% instantly
        on results, 50% at milestone completion. Every deposit and payout is attested on a
        public ledger.
      </p>
      <p>
        HackVillage is a coordination and attestation layer, not a bank or payment processor.
        All money movement is custodied and processed by <strong>Paystack</strong>, a licensed
        payment service provider. We do not hold, transmit, or have custody of funds ourselves.
      </p>

      <h2>2. Eligibility and accounts</h2>
      <ul>
        <li>You must be at least 18 years old, or have a parent/guardian&apos;s consent and involvement, to create an account.</li>
        <li>You&apos;re responsible for keeping your login credentials secure and for all activity under your account.</li>
        <li>You must provide accurate information — for organizers, this includes accurate business identity for KYB verification; for winners, accurate payout details for KYC verification.</li>
        <li>One account per person. Organization accounts may have multiple authorized members.</li>
      </ul>

      <h2>3. Organizer obligations</h2>
      <ul>
        <li>
          An event may only display the &ldquo;Prize Verified&rdquo; badge once 100% of its
          declared prize pool is deposited and locked in escrow.
        </li>
        <li>
          Organizers agree to run judging fairly, publish results in good faith, and complete
          the media/recap requirements within the platform&apos;s deadlines.
        </li>
        <li>
          Organizers cannot withdraw escrowed funds except through the platform&apos;s payout
          flow to verified winners, or a refund flow for cancelled events.
        </li>
        <li>
          Falsifying event details, prize pools, or judging results may result in account
          suspension and forfeiture of organizer privileges.
        </li>
      </ul>

      <h2>4. Developer and participant conduct</h2>
      <ul>
        <li>Submissions must be your own or your team&apos;s original work, built within the event&apos;s rules and timeframe, unless an event&apos;s own rules state otherwise.</li>
        <li>Plagiarism, impersonation, vote manipulation, and collusion with judges are prohibited and grounds for disqualification and account suspension.</li>
        <li>You retain ownership of your submissions and project IP. Submitting to an event does not transfer ownership to HackVillage or the organizer, except as that event&apos;s own published rules state.</li>
        <li>Winning-team payout splits, when a team has multiple members, are the team&apos;s own responsibility to agree on before requesting payout.</li>
      </ul>

      <h2>5. Public data and Proof-of-Work profiles</h2>
      <p>
        By participating in events, you consent to your verified participation, results,
        endorsements, and (if connected) public GitHub activity being displayed on your public
        Proof-of-Work profile, and to the related deposit/payout amounts being attested on the
        public trust ledger. See our{" "}
        <a href="/privacy">Privacy Policy</a> for exactly what&apos;s public versus private.
      </p>

      <h2>6. Fees and payments</h2>
      <p>
        HackVillage charges organizers a platform fee (a percentage of the declared prize pool,
        shown before deposit) to fund the escrow attestation, judging tooling, and payout
        infrastructure. All prize amounts are denominated in Kenyan Shillings (KES) unless an
        event states otherwise. Paystack&apos;s own fees for payment processing apply
        separately and are disclosed at checkout.
      </p>

      <h2>7. Open source</h2>
      <p>
        HackVillage&apos;s platform code is open source under the Apache License 2.0, available
        at{" "}
        <a href="https://github.com/CodeWithEugene/HackVillage">
          github.com/CodeWithEugene/HackVillage
        </a>
        . The license covers the software itself — it does not grant rights to the HackVillage
        name, logo, hosted data, or any specific event&apos;s content.
      </p>

      <h2>8. Prohibited conduct</h2>
      <ul>
        <li>Attempting to defraud the escrow, payout, or judging systems.</li>
        <li>Uploading malware, or content that is unlawful, infringing, or harassing.</li>
        <li>Scraping the platform at scale or attempting to bypass rate limits or access controls.</li>
        <li>Using the platform to launder funds or evade KYC/KYB checks.</li>
        <li>Reverse-engineering the escrow or attestation system to falsify verification status.</li>
      </ul>

      <h2>9. Disclaimers</h2>
      <p>
        HackVillage is provided &ldquo;as is.&rdquo; We work to keep escrow, judging, and
        payouts accurate and timely, but we don&apos;t guarantee uninterrupted availability, and
        we&apos;re not liable for losses arising from third-party services we depend on
        (Paystack, Vercel, Neon, Cloudflare, Brevo, the Polygon network) being unavailable or
        acting outside our control.
      </p>

      <h2>10. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, HackVillage and Technetium Kenya are not liable
        for indirect, incidental, or consequential damages arising from your use of the
        platform. Our total liability for any claim is limited to the platform fees you paid us
        in the 12 months before the claim arose. Nothing in these Terms limits liability that
        cannot be limited under Kenyan law, including liability arising from fraud.
      </p>

      <h2>11. Termination</h2>
      <p>
        You may close your account at any time. We may suspend or terminate accounts that
        violate these Terms, with funds already locked in escrow handled per our payout and
        refund rules — never left in an ambiguous or partially-paid state.
      </p>

      <h2>12. Governing law</h2>
      <p>
        These Terms are governed by the laws of Kenya. Disputes will first be attempted to
        resolve informally by contacting{" "}
        <a href="mailto:info@hackvillage.xyz">info@hackvillage.xyz</a>; unresolved disputes fall
        under the jurisdiction of the courts of Kenya.
      </p>

      <h2>13. Changes to these Terms</h2>
      <p>
        We&apos;ll update the &ldquo;Last updated&rdquo; date above when these Terms change, and
        post material changes prominently before they take effect. Continued use of HackVillage
        after changes take effect means you accept the updated Terms.
      </p>

      <h2>14. Contact</h2>
      <p>
        Questions about these Terms? Email{" "}
        <a href="mailto:info@hackvillage.xyz">info@hackvillage.xyz</a>.
      </p>
    </LegalDocument>
  );
}
