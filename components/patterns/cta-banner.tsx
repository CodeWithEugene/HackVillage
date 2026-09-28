import Image from "next/image";

import { NewsletterForm } from "@/components/patterns/newsletter-form";
import { cn } from "@/lib/utils";

/**
 * Final marketing CTA, in the ruled frame: a tinted card split in half, the
 * platform's core promise plus a working newsletter signup on one side and
 * a photo filling the other (photoSide). Browse Events and the build plan
 * are already one click away from the nav and footer, so this section's one
 * job is the list.
 */
export function CtaBanner({ photoSide = "right" }: { photoSide?: "left" | "right" }) {
  return (
    <section className="lp-section">
      <div className="lp-frame lp-block lp-divided">
        <div className={cn("cta-banner", photoSide === "left" && "cta-banner-photo-left")}>
          <div className="cta-banner-content">
            <p className="cta-banner-eyebrow">Stay In The Loop</p>
            <h2 className="cta-banner-heading">
              Organizers ghost winners. <span>We fixed that.</span>
            </h2>
            <p className="cta-banner-text">
              Deposits are locked before the hackathon starts, payouts are recorded on a public
              ledger, and every submission builds a permanent Proof-of-Work portfolio. Subscribe for
              new Prize Verified hackathons as they open.
            </p>
            <NewsletterForm tone="light" />
          </div>

          <div className="cta-banner-photo">
            <Image
              src="/marketing/newsletter/developers-exploring-next-hackathon.webp"
              alt="Two Kenyan developers exploring their next hackathon together"
              fill
              sizes="(max-width: 1023px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
