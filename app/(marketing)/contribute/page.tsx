import type { Metadata } from "next";

import { LegalDocument } from "@/components/patterns/legal-document";
import { pageOpenGraph } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: "Contribute To Open-Source Hackathon Infrastructure",
  description:
    "HackVillage is open source. Report bugs, suggest features, improve the docs, or send a pull request to the hackathon platform with escrowed prizes.",
  alternates: { canonical: "/contribute" },
  openGraph: pageOpenGraph("/contribute"),
};

const REPO = "https://github.com/CodeWithEugene/HackVillage";

/*
 * Facts here mirror the repo (package.json scripts and engines, .env.example,
 * commitlint scopes, CI workflow, SECURITY.md). Keep them in sync when those
 * change, and prefer this page over CONTRIBUTING.md where the two differ.
 */
export default function ContributePage() {
  return (
    <LegalDocument
      title="Contribute To HackVillage"
      intro="HackVillage is open source, including the escrow and judging logic, so anyone can check how prize money is handled and help make it better. Every contribution counts, from a bug report to a full feature."
      lastUpdated="September 25, 2026"
    >
      <h2>1. Ways To Contribute</h2>
      <p>You don&apos;t need to write code to make a real difference:</p>
      <ul>
        <li>
          <strong>Report bugs:</strong> found something broken? Open a detailed issue.
        </li>
        <li>
          <strong>Suggest features:</strong> have an idea that fits the roadmap? Start with an
          issue.
        </li>
        <li>
          <strong>Write code:</strong> fix a bug, build a roadmap feature, or make something faster.
        </li>
        <li>
          <strong>Improve the docs:</strong> the README, this guide, or code comments that explain
          why something works the way it does.
        </li>
        <li>
          <strong>Review the escrow contract:</strong> the PrizeVault contract is public. Read it,
          flag concerns, and open an issue with your findings.
        </li>
        <li>
          <strong>Design and UX:</strong> propose improvements in an issue with mockups or
          wireframes attached.
        </li>
        <li>
          <strong>Testing:</strong> add coverage, especially for edge cases in escrow and payouts.
        </li>
      </ul>

      <h2>2. Before You Start</h2>
      <p>
        By taking part you agree to our{" "}
        <a href={`${REPO}/blob/main/CODE_OF_CONDUCT.md`} target="_blank" rel="noopener noreferrer">
          Code of Conduct
        </a>
        . For anything bigger than a small fix, open an issue first and agree on the approach before
        writing code. It saves everyone time.
      </p>

      <h2>3. Reporting Bugs</h2>
      <p>
        Search the{" "}
        <a href={`${REPO}/issues`} target="_blank" rel="noopener noreferrer">
          existing issues
        </a>{" "}
        first, then open a{" "}
        <a
          href={`${REPO}/issues/new?template=bug_report.md`}
          target="_blank"
          rel="noopener noreferrer"
        >
          bug report
        </a>{" "}
        with:
      </p>
      <ul>
        <li>Numbered steps to reproduce it.</li>
        <li>What you expected to happen, and what actually happened (with any error message).</li>
        <li>Your OS, Node.js version, and browser. Never paste real secrets.</li>
        <li>How serious it is: does it block escrow, payouts, or judging, or is it cosmetic?</li>
      </ul>
      <p>
        For escrow or payout bugs, include the payment reference or transaction hash if you have
        one.
      </p>

      <h2>4. Suggesting Features</h2>
      <p>
        Open a{" "}
        <a
          href={`${REPO}/issues/new?template=feature_request.md`}
          target="_blank"
          rel="noopener noreferrer"
        >
          feature request
        </a>{" "}
        describing the problem it solves, your proposed solution, the alternatives you ruled out,
        and how it fits the roadmap. Large changes, such as new escrow flows or payment rails, need
        rough agreement in the issue before any code is written.
      </p>

      <h2>5. Development Setup</h2>
      <p>You&apos;ll need:</p>
      <ul>
        <li>
          <strong>Node.js 22.13 or newer</strong> (CI runs Node 24).
        </li>
        <li>
          <strong>pnpm</strong>, the only package manager the project uses. The version is pinned in{" "}
          <code>package.json</code>, so run <code>corepack enable</code> to get the right one.
        </li>
        <li>
          <strong>PostgreSQL 15 or newer</strong>, running locally.
        </li>
        <li>
          <strong>Git.</strong>
        </li>
      </ul>
      <pre>
        <code>{`# Fork on GitHub, then clone your fork
git clone https://github.com/<your-username>/HackVillage.git
cd HackVillage
git remote add upstream ${REPO}.git

pnpm install
cp .env.example .env      # then fill in your values

pnpm run db:migrate       # create the database tables
pnpm run db:seed          # optional: realistic Nairobi demo data
pnpm dev                  # http://localhost:3000`}</code>
      </pre>
      <p>
        To get started you only need <code>DATABASE_URL</code>, <code>DIRECT_URL</code>,{" "}
        <code>NEXTAUTH_SECRET</code>, <code>NEXTAUTH_URL</code>, and{" "}
        <code>NEXT_PUBLIC_APP_URL</code>. Everything else in <code>.env.example</code> is optional:
      </p>
      <ul>
        <li>
          Without Paystack keys, deposits and payouts run in <strong>simulation mode</strong>, so
          you can test the whole escrow flow without real money.
        </li>
        <li>Without an RPC URL and contract address, blockchain records are simulated too.</li>
        <li>Without a Brevo key, emails are printed to the console instead of sent.</li>
        <li>Google and GitHub sign in only appear once their client IDs are set.</li>
      </ul>
      <p>
        Two helpers speed up local work: <code>pnpm run dev:fund -- &lt;slug&gt;</code> funds a
        pending hackathon through the real escrow path, and{" "}
        <code>pnpm run dev:cycle -- &lt;slug&gt;</code> runs the full judging, winners, and payout
        cycle.
      </p>

      <h2>6. Project Structure</h2>
      <ul>
        <li>
          <code>app/</code>: Next.js App Router pages and layouts.
        </li>
        <li>
          <code>components/</code>: shared React components (UI primitives and patterns).
        </li>
        <li>
          <code>lib/</code>: auth, database, queue, environment, and the ports that talk to
          Paystack, the blockchain, email, and storage.
        </li>
        <li>
          <code>services/</code>: escrow, payouts, judging, media, legacy check ins, and Proof of
          Work profiles.
        </li>
        <li>
          <code>contracts/</code>: the PrizeVault and PrizeVaultFactory Solidity contracts.
        </li>
        <li>
          <code>db/</code>: the Prisma schema, migrations, and seed data.
        </li>
        <li>
          <code>tests/</code>: unit tests and integration tests that run against a real PostgreSQL
          database.
        </li>
      </ul>

      <h2>7. Branches And Commit Messages</h2>
      <p>
        <code>main</code> is production and is protected, so every change lands through a pull
        request. Branch from <code>main</code> with a clear name, such as{" "}
        <code>feature/team-invites</code> or <code>fix/payout-retry</code>, and open your pull
        request against <code>main</code>.
      </p>
      <p>
        Commit messages follow{" "}
        <a
          href="https://www.conventionalcommits.org/en/v1.0.0/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Conventional Commits
        </a>
        , and CI checks every one:
      </p>
      <pre>
        <code>{`<type>(<scope>): <short summary>

feat(escrow): lock the prize pool when a hackathon is published
fix(payout): prevent a duplicate payout on retry`}</code>
      </pre>
      <ul>
        <li>
          <strong>Types:</strong> feat, fix, docs, style, refactor, test, chore, perf, ci.
        </li>
        <li>
          <strong>Scopes:</strong> escrow, payout, profiles, events, auth, db, contracts, ui, api,
          docs, ci.
        </li>
        <li>
          Breaking changes include <code>BREAKING CHANGE:</code> in the commit footer.
        </li>
      </ul>

      <h2>8. Pull Requests</h2>
      <ul>
        <li>Keep each pull request to one feature or fix.</li>
        <li>
          Fill in the pull request template: a summary, why the change is needed, and how you tested
          it.
        </li>
        <li>
          Link the issue it resolves with <code>Closes #123</code>.
        </li>
        <li>
          Wait for CI to pass: linting, type checks, unit and integration tests against PostgreSQL,
          smart contract tests, and a production build.
        </li>
        <li>Ask a maintainer to review, and never merge your own pull request.</li>
        <li>
          Never include secrets, credentials, or <code>.env</code> files.
        </li>
      </ul>

      <h2>9. Code Style</h2>
      <ul>
        <li>
          TypeScript everywhere in <code>app/</code>, <code>components/</code>, <code>lib/</code>,
          and <code>services/</code>, in strict mode.
        </li>
        <li>
          No <code>any</code>. When a type is truly unknown, use <code>unknown</code> and narrow it.
        </li>
        <li>
          Prefer named exports and React Server Components. Only reach for client components when
          you need interactivity, and never fetch data in them.
        </li>
        <li>
          Wrap every call to Paystack or the blockchain in error handling, and keep each service
          function to a single job.
        </li>
        <li>
          Before committing, run <code>pnpm run lint</code>, <code>pnpm run typecheck</code>, and{" "}
          <code>pnpm run format</code>.
        </li>
      </ul>

      <h2>10. Testing</h2>
      <pre>
        <code>{`pnpm test                  # everything
pnpm run test:unit         # pure logic only
pnpm run test:integration  # against your local PostgreSQL
pnpm run contracts:test    # Hardhat tests for the contracts`}</code>
      </pre>
      <ul>
        <li>New code comes with tests. Escrow and payout code needs strong coverage.</li>
        <li>
          Money paths are tested against a real database, never mocks. Failure and rollback paths
          must be covered.
        </li>
        <li>Tests never make live calls to Paystack or a public blockchain.</li>
      </ul>

      <h2>11. Working With The Escrow Layer</h2>
      <p>
        <code>services/escrow/</code>, <code>services/payout/</code>, and <code>contracts/</code>{" "}
        handle real prize money, so they carry extra rules:
      </p>
      <ul>
        <li>
          <strong>Open an issue first</strong> for any change here, even one that looks like a small
          fix, and wait for a maintainer to agree on the approach.
        </li>
        <li>
          <strong>Never remove or weaken rollback logic.</strong> If a payment or network call
          fails, the money stays locked in the vault. No partial or ambiguous states.
        </li>
        <li>
          <strong>Every payout must be idempotent.</strong> A retry must never pay anyone twice.
        </li>
        <li>
          <strong>Contract changes</strong> need a testnet deployment (Polygon Amoy) and an updated
          ABI in the pull request.
        </li>
        <li>
          <strong>Two maintainer approvals</strong> are needed to merge anything in these folders.
        </li>
      </ul>
      <p>
        Read <a href="/how-escrow-works">How Escrow Works</a> for the full picture of how the money
        moves.
      </p>

      <h2>12. Reporting Security Issues</h2>
      <p>
        <strong>Please don&apos;t report security vulnerabilities in public issues.</strong> Use{" "}
        <a href={`${REPO}/security/advisories/new`} target="_blank" rel="noopener noreferrer">
          GitHub&apos;s private vulnerability reporting
        </a>{" "}
        (preferred), or email <a href="mailto:cyberuhurultd@gmail.com">cyberuhurultd@gmail.com</a>{" "}
        with the subject <code>[SECURITY] HackVillage</code>. We acknowledge reports within 72 hours
        and triage them within 7 days. See the{" "}
        <a href={`${REPO}/blob/main/SECURITY.md`} target="_blank" rel="noopener noreferrer">
          security policy
        </a>{" "}
        for details.
      </p>

      <h2>13. License</h2>
      <p>
        HackVillage is licensed under the Apache License 2.0. By contributing, you agree that your
        contributions are licensed under the same terms, and you keep the copyright to your own
        work.
      </p>

      <h2>14. Get Started</h2>
      <p>
        Browse the{" "}
        <a href={`${REPO}/issues`} target="_blank" rel="noopener noreferrer">
          open issues
        </a>
        , star the{" "}
        <a href={REPO} target="_blank" rel="noopener noreferrer">
          repository
        </a>
        , or email us at <a href="mailto:info@hackvillage.xyz">info@hackvillage.xyz</a> if you
        aren&apos;t sure where to begin.
      </p>
    </LegalDocument>
  );
}
