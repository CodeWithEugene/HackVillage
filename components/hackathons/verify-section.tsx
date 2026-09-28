import Link from "next/link";
import { Landmark, Lock, Wallet, type LucideIcon } from "lucide-react";

import { TextLink } from "@/components/landing/landing-link";
import { HOST_HACKATHON_HREF } from "@/lib/auth/signup-links";
import { formatEventDates } from "@/lib/events/format";
import type { ListingCard } from "@/lib/events/listing";

const STEPS: { Icon: LucideIcon; title: string; body: string; href: string; link: string }[] = [
  {
    Icon: Wallet,
    title: "The organizer deposits the full pool.",
    body: "Through Paystack, by M-Pesa, card or bank, with the 5% platform fee paid on top.",
    href: "/how-escrow-works",
    link: "How escrow works",
  },
  {
    Icon: Lock,
    title: "The vault locks and the badge appears.",
    body: "Only then does the hackathon go live here with the Prize Verified badge.",
    href: "/trust",
    link: "See the public ledger",
  },
  {
    Icon: Landmark,
    title: "Winners are paid 50/50.",
    body: "Half the moment results are announced, the rest when the milestone is delivered.",
    href: "/blog/how-winners-get-paid",
    link: "How winners get paid",
  },
];

/**
 * How every listed prize is verified, plus the listing's plain-language
 * summary for search and answer engines (kept word for word from the
 * previous page, so nothing an engine quotes changes).
 */
export function VerifySection({ recent }: { recent: ListingCard[] }) {
  return (
    <section className="lp-section" aria-labelledby="listing-about">
      <div className="lp-frame lp-block lp-divided">
        <div className="lp-split hk-about">
          <h2 id="listing-about" className="lp-split-heading">
            Hackathons With Prizes You Can Verify
          </h2>
          <div className="hk-about-text">
            <p>
              HackVillage lists hackathons in Nairobi, across Kenya, Africa-wide and fully online:
              fintech, agri-tech, civic tech, clean energy, AI and more. A hackathon appears here
              only after its organizer has deposited 100% of the prize pool into escrow and earned
              the{" "}
              <Link href="/how-escrow-works" className="font-semibold text-ink underline">
                Prize Verified
              </Link>{" "}
              badge. Winners are paid 50% within an hour of results and 50% on milestone delivery,
              with every payout recorded on a public ledger.
            </p>
            {recent.length > 0 ? (
              <p className="hk-about-small">
                Recently listed:{" "}
                {recent.map((event, index) => (
                  <span key={event.slug}>
                    {index > 0 ? " · " : ""}
                    <Link href={`/hackathons/${event.slug}`} className="underline hover:text-ink">
                      {event.title}
                    </Link>{" "}
                    ({formatEventDates(event.startsAt, event.endsAt)})
                  </span>
                ))}
                .
              </p>
            ) : null}
            <p className="hk-about-small">
              Running your own?{" "}
              <Link href={HOST_HACKATHON_HREF} className="font-semibold text-ink underline">
                Host a hackathon
              </Link>{" "}
              and see{" "}
              <Link href="/how-it-works" className="font-semibold text-ink underline">
                how judging and payouts work
              </Link>
              .
            </p>
          </div>
        </div>
        <ol className="lp-features hk-steps">
          {STEPS.map(({ Icon, title, body, href, link }, index) => (
            <li key={title}>
              <span className="lp-feature-icon">
                <Icon aria-hidden className="size-4" />
              </span>
              <p>
                <span className="hk-step-number">{index + 1}.</span> <strong>{title}</strong> {body}
              </p>
              <TextLink href={href}>{link}</TextLink>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
