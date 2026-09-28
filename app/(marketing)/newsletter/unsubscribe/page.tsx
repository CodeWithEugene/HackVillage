import type { Metadata } from "next";

import { NewsletterUnsubscribeClient } from "@/components/newsletter/newsletter-unsubscribe-client";

// Tokenized utility page reached from email links — never search-facing.
export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

export default async function NewsletterUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <div className="lp">
      <section className="hk-hero pg-utility">
        <div className="lp-frame pg-utility-frame">
          <div className="w-full max-w-md">
            <NewsletterUnsubscribeClient token={token ?? ""} />
          </div>
        </div>
      </section>
    </div>
  );
}
