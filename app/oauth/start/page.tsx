import type { Metadata } from "next";

import { OAuthPopupStart } from "@/components/auth/oauth-popup-pages";

export const metadata: Metadata = { title: "Signing In", robots: { index: false } };

/** First stop inside the sign in popup: hands off to Google or GitHub. */
export default async function OAuthStartPage({
  searchParams,
}: {
  searchParams: Promise<{ provider?: string }>;
}) {
  const { provider } = await searchParams;
  return <OAuthPopupStart provider={provider ?? null} />;
}
