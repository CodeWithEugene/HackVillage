import type { Metadata } from "next";

import { JoinHiringForm } from "@/components/pow/join-hiring-form";
import { requireOnboardedUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Join As A Hiring Partner" };

export default async function HiringJoinPage() {
  await requireOnboardedUser();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-ink">Hiring Partner</h1>
      </header>
      <JoinHiringForm />
    </div>
  );
}
