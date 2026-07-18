import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="shell">
      <p className="brand">HackVillage</p>
      <h1>You&apos;re offline</h1>
      <p className="lede">
        Browse and payout flows need a connection. Cached pages will return when
        you&apos;re back online.
      </p>
    </main>
  );
}
