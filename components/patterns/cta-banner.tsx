import Image from "next/image";

import { NewsletterForm } from "@/components/patterns/newsletter-form";

/**
 * Final marketing CTA: a gradient banner (brand blues, blurred color blobs,
 * a grain overlay) carrying the platform's core promise plus a working
 * newsletter signup. Browse Events and the build plan are already one click
 * away from the nav and footer, so this section's one job is the list.
 */
export function CtaBanner() {
  return (
    <section className="site-container pb-20">
      <div className="cta-banner">
        <div className="cta-banner-blobs" aria-hidden="true">
          <span className="cta-blob cta-blob-1" />
          <span className="cta-blob cta-blob-2" />
          <span className="cta-blob cta-blob-3" />
          <span className="cta-banner-noise" />
        </div>

        <div className="cta-banner-content">
          <p className="cta-banner-eyebrow">Stay In The Loop</p>
          <h2 className="cta-banner-heading">
            Organizers ghost winners. <span>We fixed that.</span>
          </h2>
          <p className="cta-banner-text">
            Deposits are locked before the event starts, payouts are recorded on a public ledger,
            and every submission builds a permanent Proof-of-Work portfolio. Subscribe for new
            Prize Verified events as they open.
          </p>
          <NewsletterForm />
        </div>

        <div className="cta-banner-photo">
          <Image
            src="/marketing/hero/kenya/hackathon-pair.webp"
            alt="Two Kenyan engineers sharing a laugh while coding together"
            fill
            sizes="(max-width: 1023px) 90vw, 420px"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
