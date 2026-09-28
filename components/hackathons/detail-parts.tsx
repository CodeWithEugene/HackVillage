import Link from "next/link";
import { Check, ChevronRight, Lock } from "lucide-react";

import { LandingLink } from "@/components/landing/landing-link";
import { formatDateTime, keyDates } from "@/lib/events/format";
import { cn, formatKes } from "@/lib/utils";

/*
 * Building blocks for the hackathon detail page, laid out like a customer
 * story: a facts rail beside long-form sections.
 */

export function DetailSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="hkd-section" aria-labelledby={id}>
      <h2 id={id} className="hkd-section-title">
        {title}
      </h2>
      {children}
    </section>
  );
}

export interface RailStat {
  value: string;
  label: string;
}

/** Tick-line stats plus the one action that matters for this visitor. */
export function DetailRail({ stats, action }: { stats: RailStat[]; action: React.ReactNode }) {
  return (
    <aside className="hkd-rail" aria-label="Hackathon at a glance">
      <dl className="hkd-rail-stats">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt>{stat.label}</dt>
            <dd>{stat.value}</dd>
          </div>
        ))}
      </dl>
      <div className="hkd-rail-action">{action}</div>
    </aside>
  );
}

/**
 * The register / workspace / closed call to action, shared by the rail and
 * the mobile bar. Registration is a plain POST form (the API route handles
 * redirects), so it works without JavaScript.
 */
export function RegistrationAction({
  slug,
  open,
  signedIn,
  registered,
}: {
  slug: string;
  open: boolean;
  signedIn: boolean;
  registered: boolean;
}) {
  if (registered) {
    return (
      <div className="hkd-action">
        <p className="hkd-action-note hkd-action-note-ok">
          <Check aria-hidden className="size-4" /> You&apos;re registered
        </p>
        <LandingLink href={`/hackathons/${slug}/workspace`}>Open Team Workspace</LandingLink>
      </div>
    );
  }
  if (!open) {
    return (
      <div className="hkd-action">
        <p className="hkd-action-note">Registration for this hackathon has closed.</p>
        <LandingLink href="/hackathons#directory" variant="secondary">
          Find Another Hackathon
        </LandingLink>
      </div>
    );
  }
  if (!signedIn) {
    return (
      <div className="hkd-action">
        <LandingLink href="/signin">Sign In To Register</LandingLink>
        <p className="hkd-action-note">
          New here? <Link href="/signup">Create a free account</Link>
        </p>
      </div>
    );
  }
  return (
    <form action={`/api/events/${slug}/register`} method="post" className="hkd-action">
      <button type="submit" className="hkd-register btn-pill btn-pill-primary">
        <span className="btn-fill" aria-hidden />
        <span className="btn-content">Register For This Hackathon</span>
      </button>
    </form>
  );
}

/** The escrow promise for this exact pool, in the style of a pull-quote card. */
export function EscrowCallout({ poolKes, verified }: { poolKes: number; verified: boolean }) {
  return (
    <figure className="hkd-callout">
      <span className="hkd-callout-art" aria-hidden="true" />
      <blockquote>
        {verified
          ? `Every shilling of this ${formatKes(poolKes)} prize pool was locked in escrow before the hackathon went live. Winners are paid half the moment results are announced.`
          : `This hackathon's ${formatKes(poolKes)} prize pool is being secured in escrow.`}
      </blockquote>
      <figcaption>
        <Lock aria-hidden className="size-4" />
        {verified ? "Prize Verified · held in the HackVillage PrizeVault" : "Pending verification"}
        <Link href="/trust" className="hkd-callout-link">
          See the public ledger <ChevronRight aria-hidden className="size-3.5" />
        </Link>
      </figcaption>
    </figure>
  );
}

export interface PrizeRow {
  id: string;
  label: string;
  amountKes: number;
  milestoneRequired: boolean;
  winner: { team: string; handle: string } | null;
  firstHalfPaid: boolean;
}

/** Each place, what it pays, how it pays, and who won it once results are out. */
export function PrizeTable({ prizes }: { prizes: PrizeRow[] }) {
  return (
    <div className="hkd-table-wrap">
      <table className="hkd-table">
        <thead>
          <tr>
            <th scope="col">Place</th>
            <th scope="col">Prize</th>
            <th scope="col">How it pays</th>
            <th scope="col">Winner</th>
          </tr>
        </thead>
        <tbody>
          {prizes.map((prize) => (
            <tr key={prize.id}>
              <th scope="row">{prize.label}</th>
              <td className="hkd-table-amount">{formatKes(prize.amountKes)}</td>
              <td>
                {prize.milestoneRequired ? "50% on the day, 50% on milestone" : "100% on the day"}
              </td>
              <td>
                {prize.winner ? (
                  <span className="hkd-winner">
                    <span>
                      {prize.winner.team} ·{" "}
                      <Link href={`/developers/${prize.winner.handle}`}>
                        @{prize.winner.handle}
                      </Link>
                    </span>
                    <span
                      className={cn(
                        "hk-status",
                        prize.firstHalfPaid ? "hk-status-open" : "hk-status-live",
                      )}
                    >
                      <span className="hk-status-dot" aria-hidden="true" />
                      {prize.firstHalfPaid ? "First payout paid" : "Paying now"}
                    </span>
                  </span>
                ) : (
                  <span className="hkd-muted">Announced after judging</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The hackathon's commitments in time, with the next one highlighted. */
export function KeyDates({
  event,
}: {
  event: { registrationDeadline: Date; startsAt: Date; endsAt: Date; mediaDeadlineAt: Date | null };
}) {
  return (
    <>
      <ol className="hkd-dates">
        {keyDates(event).map((date) => (
          <li key={date.label} className={`hkd-date hkd-date-${date.state}`}>
            <span className="hkd-date-mark" aria-hidden="true">
              {date.state === "done" ? <Check className="size-3" /> : null}
            </span>
            <span className="hkd-date-label">
              {date.label}
              {date.state === "next" ? <span className="hkd-date-next">Next</span> : null}
            </span>
            <time dateTime={date.at.toISOString()}>{formatDateTime(date.at)}</time>
          </li>
        ))}
      </ol>
      <p className="hkd-muted hkd-small">All times are Nairobi time (EAT).</p>
    </>
  );
}
