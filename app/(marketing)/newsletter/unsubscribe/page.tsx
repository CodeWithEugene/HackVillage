import type { Metadata } from "next";

import { NewsletterUnsubscribeClient } from "@/components/newsletter/newsletter-unsubscribe-client";

export const metadata: Metadata = { title: "Unsubscribe" };

export default async function NewsletterUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <NewsletterUnsubscribeClient token={token ?? ""} />
      </div>
    </div>
  );
}
