import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";

import { LandingLink, TextLink } from "@/components/landing/landing-link";
import { HOST_HACKATHON_HREF } from "@/lib/auth/signup-links";

const GITHUB_URL = "https://github.com/CodeWithEugene/HackVillage";
const BUILD_PLAN_URL = `${GITHUB_URL}/blob/main/docs/BUILD_PLAN.md`;

const STATS = [
  { value: "50/50", label: "split on every milestone prize" },
  { value: "1", label: "idempotency key per winner, per tranche" },
  { value: "100%", label: "open source, from the vault to the UI" },
] as const;

/** Evenly spaced sine strands for the "scale" visual, drawn once on the server. */
const WAVES = Array.from({ length: 36 }, (_, i) => {
  const amp = 30 + i * 2.2;
  const phase = i * 0.09;
  const points = Array.from({ length: 61 }, (_, j) => {
    const x = j * 20;
    const envelope = Math.sin((Math.PI * j) / 60);
    const y = 150 + Math.sin(j / 7 + phase) * amp * envelope - i * 1.4 * envelope;
    return `${j === 0 ? "M" : "L"} ${x} ${y.toFixed(1)}`;
  });
  return points.join(" ");
});

function MoneyFlow() {
  return (
    <div className="lp-flow" aria-label="How prize money moves through HackVillage">
      <ol className="lp-flow-row">
        <li className="lp-flow-node">
          <span>Organizer</span>
          <em>Deposits the full pool</em>
        </li>
        <li className="lp-flow-arrow" aria-hidden="true">
          <ArrowRight className="size-4" />
        </li>
        <li className="lp-flow-node">
          <span>Paystack</span>
          <em>M-Pesa, card or bank</em>
        </li>
        <li className="lp-flow-arrow" aria-hidden="true">
          <ArrowRight className="size-4" />
        </li>
        <li className="lp-flow-node lp-flow-node-core">
          <span>PrizeVault</span>
          <em>Escrow, locked until paid</em>
        </li>
        <li className="lp-flow-arrow" aria-hidden="true">
          <ArrowRight className="size-4" />
        </li>
        <li className="lp-flow-split">
          <div className="lp-flow-node">
            <span>Tranche 1 · 50%</span>
            <em>At results</em>
          </div>
          <div className="lp-flow-node">
            <span>Tranche 2 · 50%</span>
            <em>At milestone</em>
          </div>
        </li>
        <li className="lp-flow-arrow" aria-hidden="true">
          <ArrowRight className="size-4" />
        </li>
        <li className="lp-flow-node">
          <span>Winner</span>
          <em>M-Pesa or bank</em>
        </li>
      </ol>
      <div className="lp-flow-ledger">
        <span className="lp-flow-tag">Every step</span>
        <p>
          Deposits, payouts and milestones are attested on the <strong>public ledger</strong>
        </p>
        <Link href="/trust" className="lp-flow-ledger-link">
          Open the ledger <ArrowUpRight aria-hidden className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}

const PATHS = [
  {
    key: "browse",
    title: "Here to build?",
    body: "Browse Prize Verified hackathons, join a team and compete for money that is already there.",
    href: "/hackathons",
    link: "Browse hackathons",
  },
  {
    key: "host",
    title: "Here to organize?",
    body: "Create your hackathon, fund the pool, invite judges and publish when you are ready.",
    href: HOST_HACKATHON_HREF,
    link: "Host a hackathon",
  },
  {
    key: "code",
    title: "Here to contribute?",
    body: "Run the whole platform locally with seeded demo data and ship your first pull request.",
    href: "/contribute",
    link: "Start contributing",
  },
] as const;

function PathVisual({ kind }: { kind: (typeof PATHS)[number]["key"] }) {
  if (kind === "browse") {
    return (
      <div className="lp-path-visual lp-path-events">
        {["Nairobi AI Hackathon", "Mombasa Fintech Sprint", "Kisumu Climate Build"].map(
          (name, i) => (
            <div key={name} className="lp-path-event" style={{ marginLeft: `${i * 14}px` }}>
              <span>{name}</span>
              <em>
                <Check className="size-3" /> Prize Verified
              </em>
            </div>
          ),
        )}
      </div>
    );
  }
  if (kind === "host") {
    return (
      <div className="lp-path-visual lp-path-steps">
        {["Create the hackathon", "Fund the prize pool", "Invite judges", "Publish"].map(
          (step, i) => (
            <div key={step} className={i < 2 ? "lp-path-step lp-path-step-done" : "lp-path-step"}>
              <span>{i < 2 ? <Check className="size-3" /> : i + 1}</span>
              {step}
            </div>
          ),
        )}
      </div>
    );
  }
  return (
    <pre className="lp-path-visual lp-path-code">
      <code>
        <span className="lp-code-dim">1</span> <span className="lp-code-key">git clone</span>{" "}
        HackVillage
        {"\n"}
        <span className="lp-code-dim">2</span> <span className="lp-code-key">pnpm</span> install
        {"\n"}
        <span className="lp-code-dim">3</span> <span className="lp-code-key">pnpm</span> run
        db:migrate
        {"\n"}
        <span className="lp-code-dim">4</span> <span className="lp-code-key">pnpm</span> run db:seed
        {"\n"}
        <span className="lp-code-dim">5</span> <span className="lp-code-key">pnpm</span> dev
        {"\n"}
        <span className="lp-code-ok">✓ Ready on localhost:3000</span>
      </code>
    </pre>
  );
}

export function OpenInfrastructure() {
  return (
    <section className="lp-dark" aria-labelledby="lp-infra-heading">
      <div className="lp-frame lp-block">
        <h2 id="lp-infra-heading" className="lp-statement">
          Open, auditable infrastructure for every hackathon.{" "}
          <span>Read the code, follow the money, and verify every payout yourself.</span>
        </h2>
        <div className="lp-dark-actions">
          <LandingLink href={GITHUB_URL} external>
            View On GitHub
          </LandingLink>
          <LandingLink href={BUILD_PLAN_URL} variant="inverse" external>
            Read The Build Plan
          </LandingLink>
        </div>
      </div>

      <div className="lp-frame lp-block lp-divided">
        <h3 className="lp-statement lp-statement-sm">
          Follow the money.{" "}
          <span>
            Every shilling takes one path from the organizer&apos;s deposit to the winner&apos;s
            account, and nothing leaves the vault without a record.
          </span>
        </h3>
        <MoneyFlow />
      </div>

      <div className="lp-frame lp-block lp-divided lp-scale">
        <h3 className="lp-statement lp-statement-sm">
          Built so retries never double-pay.{" "}
          <span>
            If a transfer fails, the money stays locked in the vault. No partial payouts, no
            ambiguous states.
          </span>
        </h3>
        <svg
          className="lp-waves"
          viewBox="0 0 1200 300"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="lp-wave-stroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--color-brand-soft)" stopOpacity="0" />
              <stop offset="35%" stopColor="var(--color-brand-soft)" />
              <stop offset="70%" stopColor="var(--color-brand)" />
              <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#lp-wave-stroke)" strokeWidth="1" strokeOpacity="0.55">
            {WAVES.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
        </svg>
        <ul className="lp-dark-stats">
          {STATS.map((stat) => (
            <li key={stat.label}>
              <span className="lp-dark-stat-value">{stat.value}</span>
              <span>{stat.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="lp-frame lp-block lp-divided">
        <h3 className="lp-statement lp-statement-sm">
          Choose how you take part.{" "}
          <span>Build, organize or contribute. Every path starts in the same open project.</span>
        </h3>
        <ul className="lp-paths">
          {PATHS.map((path) => (
            <li key={path.key} className="lp-path">
              <PathVisual kind={path.key} />
              <p>
                <strong>{path.title}</strong> {path.body}
              </p>
              <TextLink href={path.href} className="lp-text-link-inverse">
                {path.link}
              </TextLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
