import type { Metadata } from "next";

import { LegalDocument } from "@/components/patterns/legal-document";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How HackVillage collects, uses, shares, and protects your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument title="Privacy Policy" lastUpdated="September 24, 2026">
      <p>
        HackVillage (&ldquo;HackVillage&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is an open-source
        hackathon platform operated by Technetium Kenya. This policy explains what data we
        collect when you use{" "}
        <a href="https://www.hackvillage.xyz">hackvillage.xyz</a>, why we collect it, who we
        share it with, and the choices and rights you have over it.
      </p>
      <p>
        HackVillage is built for radical transparency around prize money: escrow deposits and
        payouts are attested on a public ledger, and developer Proof-of-Work profiles are
        public by design. Sections below call out exactly which data is public and which is
        private.
      </p>

      <h2>1. Information We Collect</h2>
      <h3>Account Information</h3>
      <p>
        When you sign up, we collect your name, email address, and a password (stored as a
        salted hash, and we never see or store it in plain text) or, if you sign in with Google or
        GitHub, the profile information those providers share with us (name, email, and public
        profile photo).
      </p>
      <h3>Profile And Proof-of-Work Data</h3>
      <p>
        Developer accounts have a public handle and profile page showing verified event
        participation, win/loss record, judge endorsements, and (where you connect it) public
        GitHub contribution activity. We do not accept self-reported stats; profile metrics are
        derived only from verified platform activity.
      </p>
      <h3>Event, Team, And Submission Data</h3>
      <p>
        Event details, team rosters, project submissions, judge scores and feedback, and hiring
        introduction requests are stored to run the judging and payout workflow, and are shown
        to the relevant organizers, teammates, and judges for that event.
      </p>
      <h3>Payment And Payout Data</h3>
      <p>
        HackVillage does not store your card, bank account, or M-Pesa number. Deposits and
        payouts are processed by <strong>Paystack</strong>, a licensed payment service provider,
        which independently verifies organizer businesses (KYB) and winner payout recipients
        (KYC) under its own privacy and compliance program. We store only the transaction
        references, amounts, and status needed to reconcile the ledger.
      </p>
      <h3>Technical Data</h3>
      <p>
        We use session cookies to keep you signed in (via Auth.js), and we log request metadata
        (IP address, user agent, timestamps) for security, rate-limiting, and abuse prevention.
        We use Vercel Analytics for aggregate, privacy-respecting traffic metrics; it does not
        use cookies or track individuals across sites.
      </p>

      <h2>2. What&apos;s Public Vs. Private</h2>
      <p>
        Because trust is the product, some data is intentionally public once you opt in to it:
      </p>
      <ul>
        <li>Developer Proof-of-Work profiles (handle, verified win rate, events, endorsements).</li>
        <li>
          The public trust ledger at <a href="/trust">/trust</a>: every prize deposit and payout,
          with amount and a payment-provider reference, attested to a public blockchain.
        </li>
        <li>Organizer trust scores and event history.</li>
      </ul>
      <p>
        Everything else (your email, password, payout account details, private messages, and
        draft submissions) is private and visible only to you, the relevant event organizers
        and judges, and HackVillage staff where necessary to operate the service.
      </p>

      <h2>3. How We Use Your Information</h2>
      <ul>
        <li>To create and secure your account, and authenticate you on future visits.</li>
        <li>To run events: registration, team formation, judging, results, and payouts.</li>
        <li>To verify prize pools are fully escrowed before an event is marked Prize Verified.</li>
        <li>To build and display your Proof-of-Work profile from verified activity.</li>
        <li>To send transactional email (verification, password reset, event and payout notices).</li>
        <li>To detect fraud, enforce our Terms of Service, and keep the platform secure.</li>
        <li>To comply with financial record-keeping and tax obligations.</li>
      </ul>
      <p>We do not sell your personal data, and we do not run third-party advertising.</p>

      <h2>4. Who We Share Data With</h2>
      <p>
        We share the minimum data necessary with the following processors, each bound by their
        own data protection obligations:
      </p>
      <ul>
        <li>
          <strong>Paystack</strong>: deposits, payouts, KYB/KYC verification.
        </li>
        <li>
          <strong>Vercel</strong>: application hosting and analytics.
        </li>
        <li>
          <strong>Neon</strong>: our PostgreSQL database.
        </li>
        <li>
          <strong>Cloudflare</strong>: media storage (submission files, event assets) and DNS.
        </li>
        <li>
          <strong>Brevo</strong>: transactional email delivery (verification, password reset,
          notifications).
        </li>
        <li>
          <strong>Google / GitHub</strong>: only if you choose to sign in with them.
        </li>
        <li>
          <strong>Polygon</strong> (public blockchain): escrow and payout attestations. See the
          note on blockchain data below.
        </li>
      </ul>
      <p>
        We disclose data to law enforcement or regulators only when legally required, and we
        never share your data with third parties for their own marketing purposes.
      </p>

      <h2>5. A Note On Blockchain Data</h2>
      <p>
        Escrow deposits and payouts are attested to the Polygon blockchain so anyone can verify
        that prize money was real. Entries on a public blockchain are <strong>immutable</strong>:
        once written, they cannot be edited or deleted, by us or anyone else. Attestations
        contain transaction amounts and references, not your name, email, or other personal
        identifiers.
      </p>

      <h2>6. Data Retention</h2>
      <p>
        We keep payout and financial records for at least seven years to meet financial
        record-keeping norms. Account and profile data is kept for as long as your account is
        active. Marketing communications data is deleted on request. Public ledger and Proof-of-
        Work records persist as a historical record of verified events even after an account is
        deleted, but are no longer linked to your private contact information.
      </p>

      <h2>7. Your Rights</h2>
      <p>
        Under Kenya&apos;s Data Protection Act, 2019 (and equivalent laws where you live), you
        have the right to:
      </p>
      <ul>
        <li>Access a copy of the personal data we hold about you.</li>
        <li>Correct inaccurate or incomplete data.</li>
        <li>Export your data in a portable format.</li>
        <li>
          Delete your account and associated private data, subject to payout, tax, and fraud-
          prevention records we&apos;re legally required to retain.
        </li>
        <li>Withdraw consent for optional communications at any time.</li>
      </ul>
      <p>
        To exercise any of these rights, email{" "}
        <a href="mailto:info@hackvillage.xyz">info@hackvillage.xyz</a>. We&apos;ll respond within
        30 days.
      </p>

      <h2>8. Cookies</h2>
      <p>
        We use one essential session cookie to keep you signed in. It is not used for
        advertising or cross-site tracking, and it expires when you sign out or your session
        lapses.
      </p>

      <h2>9. Children&apos;s Privacy</h2>
      <p>
        HackVillage is not directed at children under 18. If you believe a minor has created an
        account, contact us and we&apos;ll remove it.
      </p>

      <h2>10. International Data Transfers</h2>
      <p>
        Our infrastructure providers (Vercel, Neon, Cloudflare) operate global networks, which
        means your data may be processed outside Kenya. Each provider maintains its own
        security and compliance program; we select processors that offer contractual data
        protection commitments equivalent to Kenya&apos;s Data Protection Act.
      </p>

      <h2>11. Security</h2>
      <p>
        Passwords are hashed with Argon2. Sessions use signed, httpOnly cookies. Data in transit
        is encrypted with TLS. Access to production data is limited to the people who need it to
        operate the platform.
      </p>

      <h2>12. Changes To This Policy</h2>
      <p>
        We&apos;ll update the &ldquo;Last updated&rdquo; date above whenever this policy changes,
        and post material changes prominently on the site before they take effect.
      </p>

      <h2>13. Contact</h2>
      <p>
        Questions about this policy or your data? Email{" "}
        <a href="mailto:info@hackvillage.xyz">info@hackvillage.xyz</a>.
      </p>
    </LegalDocument>
  );
}
