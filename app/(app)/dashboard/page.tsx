import type { Metadata } from "next";
import Link from "next/link";
import { CalendarX2, Rocket } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOnboardedUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireOnboardedUser();
  const firstName = (user.name ?? user.handle).split(" ")[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Welcome back, {firstName}</h1>
          <p className="mt-1 text-sm text-muted">
            Your events, teams, and payouts will live here.
          </p>
        </div>
        <Badge variant="brand">@{user.handle}</Badge>
      </div>

      <EmptyState
        icon={CalendarX2}
        title="No events yet"
        description="Prize Verified events appear here the moment you register. Events land with the platform pilot — you&apos;ll be among the first to know."
        action={
          <Link href="/events">
            <Button>Browse events</Button>
          </Link>
        }
      />

      <Card>
        <CardTitle className="flex items-center gap-2">
          <Rocket aria-hidden className="size-5" /> What&apos;s coming in this build
        </CardTitle>
        <CardDescription>
          Phase 2 brings events and teams; Phase 3 the escrowed Prize Vault; Phase 5 the instant
          50% payouts. Your profile is already building Proof-of-Work history from here on.
        </CardDescription>
      </Card>
    </div>
  );
}
