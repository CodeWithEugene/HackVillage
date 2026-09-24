import type { Metadata } from "next";
import Link from "next/link";
import { CalendarX2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Events",
  description: "Browse Prize Verified hackathons and tech events on HackVillage.",
};

export default function EventsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16">
      <header className="mb-10 text-center">
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
          Prize Verified events
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          Every event here has 100% of its prize pool locked in escrow before it
          went live.
        </p>
      </header>

      <EmptyState
        icon={CalendarX2}
        title="No events yet — the first one lands here"
        description="The platform launches with its first Prize Verified event. Want to host it? The organizer flow opens with the platform pilot — reach out on GitHub."
        action={
          <a href="https://github.com/CodeWithEugene/HackVillage">
            <Button>Host the first event</Button>
          </a>
        }
      />

      <p className="mt-8 text-center text-sm text-muted">
        Developers: check back soon, or{" "}
        <Link href="/" className="font-semibold text-ink underline">
          learn how HackVillage protects your winnings
        </Link>
        .
      </p>
    </div>
  );
}
