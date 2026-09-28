import Link from "next/link";
import { ArrowUpRight, Check, Lock, ShieldCheck } from "lucide-react";

/*
 * Stripe-style product cards: a title, a corner arrow, and an illustrative
 * mock of the real screen underneath. Every figure in the mocks is sample
 * data, but the rules they show (fee on top, 50/50 tranches, 30-day
 * milestone, rubric feedback gate, public attestations) are the platform's.
 */

interface CardProps {
  title: string;
  href: string;
  className?: string;
  children: React.ReactNode;
}

function PlatformCard({ title, href, className, children }: CardProps) {
  return (
    <article className={className ? `lp-card ${className}` : "lp-card"}>
      <div className="lp-card-head">
        <h3 className="lp-card-title">
          {/* Stretched link: the whole card is clickable, the title is the accessible name. */}
          <Link href={href} className="lp-card-link">
            {title}
          </Link>
        </h3>
        <span className="lp-card-chip" aria-hidden="true">
          <ArrowUpRight className="size-4" />
        </span>
      </div>
      <div className="lp-card-visual" aria-hidden="true">
        {children}
      </div>
    </article>
  );
}

function VaultMock() {
  return (
    <div className="lp-mock-pair">
      <div className="lp-mock lp-mock-vault">
        <p className="lp-mock-kicker">Prize vault</p>
        <p className="lp-mock-title">Nairobi AI Hackathon</p>
        <p className="lp-mock-amount">KES 500,000</p>
        <div className="lp-mock-progress">
          <span style={{ width: "100%" }} />
        </div>
        <div className="lp-mock-row">
          <span>Funded</span>
          <strong>100%</strong>
        </div>
        <span className="lp-mock-badge">
          <ShieldCheck className="size-3.5" /> Prize Verified
        </span>
      </div>
      <div className="lp-mock lp-mock-receipt">
        <div className="lp-mock-browser">
          <span />
          <span />
          <span />
          <em>hackvillage.xyz/organizer/fund</em>
        </div>
        <p className="lp-mock-kicker">Deposit summary</p>
        <dl className="lp-mock-lines">
          <div>
            <dt>Prize pool</dt>
            <dd>KES 500,000</dd>
          </div>
          <div>
            <dt>Platform fee (5%)</dt>
            <dd>KES 25,000</dd>
          </div>
          <div className="lp-mock-total">
            <dt>Total deposited</dt>
            <dd>KES 525,000</dd>
          </div>
        </dl>
        <div className="lp-mock-methods">
          <span className="lp-mock-method lp-mock-method-on">M-Pesa</span>
          <span className="lp-mock-method">Card</span>
          <span className="lp-mock-method">Bank</span>
        </div>
        <p className="lp-mock-locked">
          <Lock className="size-3.5" /> Locked in escrow until winners are announced
        </p>
      </div>
    </div>
  );
}

function PayoutMock() {
  return (
    <div className="lp-mock lp-mock-payout">
      <p className="lp-mock-kicker">1st place · Team Jua</p>
      <p className="lp-mock-amount">KES 250,000</p>
      <ol className="lp-mock-tranches">
        <li className="lp-mock-tranche-done">
          <span className="lp-mock-dot">
            <Check className="size-3" />
          </span>
          <div>
            <strong>Tranche 1 · 50%</strong>
            <span>Paid to M-Pesa, 12 min after results</span>
          </div>
        </li>
        <li>
          <span className="lp-mock-dot">
            <Lock className="size-3" />
          </span>
          <div>
            <strong>Tranche 2 · 50%</strong>
            <span>Releases at milestone, due in 30 days</span>
          </div>
        </li>
      </ol>
      <div className="lp-mock-split">
        <span style={{ width: "50%" }}>Paid</span>
        <span>In escrow</span>
      </div>
    </div>
  );
}

const RUBRIC = [
  { label: "Impact", score: 8 },
  { label: "Execution", score: 9 },
  { label: "Design", score: 7 },
  { label: "Pitch", score: 8 },
];

function JudgingMock() {
  return (
    <div className="lp-mock lp-mock-judging">
      <p className="lp-mock-kicker">Scorecard · Team Jua</p>
      <ul className="lp-mock-rubric">
        {RUBRIC.map((item) => (
          <li key={item.label}>
            <span>{item.label}</span>
            <span className="lp-mock-meter">
              <span style={{ width: `${item.score * 10}%` }} />
            </span>
            <strong>{item.score}</strong>
          </li>
        ))}
      </ul>
      <p className="lp-mock-feedback">
        <Check className="size-3.5" /> Written feedback sent to the team
      </p>
    </div>
  );
}

function PortfolioMock() {
  return (
    <div className="lp-mock lp-mock-profile">
      <div className="lp-mock-person">
        <span className="lp-mock-avatar">WK</span>
        <div>
          <strong>Wanjiku K.</strong>
          <span>@wanjiku · Nairobi</span>
        </div>
      </div>
      <ul className="lp-mock-pills">
        <li>1st · Nairobi AI Hackathon</li>
        <li>Endorsed by 3 judges</li>
        <li>Prize paid</li>
        <li>Open to intros</li>
      </ul>
      <div className="lp-mock-graph">
        {Array.from({ length: 42 }, (_, i) => (
          <span key={i} data-level={(i * 7 + (i % 5) * 3) % 4} />
        ))}
      </div>
    </div>
  );
}

const LEDGER = [
  { hash: "0x7f3a…c21e", kind: "Deposit", amount: "525,000" },
  { hash: "0x19b2…04af", kind: "Payout · T1", amount: "125,000" },
  { hash: "0xc4d8…9b10", kind: "Payout · T1", amount: "75,000" },
  { hash: "0x5e61…a3d7", kind: "Milestone", amount: "125,000" },
];

function LedgerMock() {
  return (
    <div className="lp-mock lp-mock-ledger">
      <p className="lp-mock-kicker">Public attestations</p>
      <ul>
        {LEDGER.map((row) => (
          <li key={row.hash}>
            <code>{row.hash}</code>
            <span>{row.kind}</span>
            <strong>{row.amount}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PlatformGrid() {
  return (
    <section className="lp-section" aria-labelledby="lp-platform-heading">
      <div className="lp-frame lp-block">
        <h2 id="lp-platform-heading" className="lp-statement">
          One platform for the whole hackathon.{" "}
          <span>
            Every tool an organizer needs, from the first deposit to the final payout, designed to
            work on its own or together.
          </span>
        </h2>

        <div className="lp-bento">
          <PlatformCard
            title="Escrow the full prize pool before a hackathon goes live"
            href="/how-escrow-works"
            className="lp-bento-wide"
          >
            <VaultMock />
          </PlatformCard>
          <PlatformCard title="Pay winners the moment results land" href="/how-escrow-works">
            <PayoutMock />
          </PlatformCard>
          <PlatformCard title="Judge with shared rubrics and real feedback" href="/how-it-works">
            <JudgingMock />
          </PlatformCard>
          <PlatformCard title="Turn every result into Proof-of-Work" href="/how-it-works">
            <PortfolioMock />
          </PlatformCard>
          <PlatformCard title="Attest every payout on a public ledger" href="/trust">
            <LedgerMock />
          </PlatformCard>
        </div>
      </div>
    </section>
  );
}
