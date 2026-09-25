import type { Metadata } from "next";

import { OAuthPopupDone } from "@/components/auth/oauth-popup-pages";

export const metadata: Metadata = { title: "Signed In", robots: { index: false } };

/** Last stop inside the sign in popup: tells the original tab, then closes. */
export default function OAuthDonePage() {
  return <OAuthPopupDone />;
}
