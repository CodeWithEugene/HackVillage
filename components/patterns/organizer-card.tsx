import { ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { formatKes } from "@/lib/utils";

const joinedFormat = new Intl.DateTimeFormat("en-KE", {
  month: "short",
  year: "numeric",
  timeZone: "Africa/Nairobi",
});

interface OrganizerCardProps {
  org: {
    id: string;
    name: string;
    about: string | null;
    trustScore: number;
    kycStatus: "NONE" | "PENDING" | "VERIFIED" | "FAILED";
    createdAt: Date;
  };
}

/** Who runs this hackathon, and their track record on the platform. */
export async function OrganizerCard({ org }: OrganizerCardProps) {
  const [hosted, escrowed] = await Promise.all([
    prisma.event.count({ where: { orgId: org.id, publishedAt: { not: null } } }),
    prisma.prizeBreakdown.aggregate({
      _sum: { amountKes: true },
      where: { event: { orgId: org.id, prizeVerifiedAt: { not: null } } },
    }),
  ]);

  const stats = [
    { label: "Hackathons hosted", value: String(hosted) },
    { label: "Prizes escrowed", value: formatKes(escrowed._sum.amountKes ?? 0) },
    { label: "On HackVillage since", value: joinedFormat.format(org.createdAt) },
  ];

  return (
    <Card>
      <CardTitle>Organizer</CardTitle>
      <p className="mt-2 text-lg font-bold text-ink">{org.name}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {org.kycStatus === "VERIFIED" ? (
          <Badge variant="brand">
            <ShieldCheck aria-hidden className="size-3.5" /> Verified Organizer
          </Badge>
        ) : null}
        <Badge variant="success">Trust score {org.trustScore}</Badge>
      </div>
      {org.about ? (
        <p className="mt-3 text-sm leading-6 whitespace-pre-line text-body-copy">{org.about}</p>
      ) : null}

      <dl className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-brand/10 p-3 text-center">
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0">
            <dt className="text-[11px] leading-4 text-ink-soft">{stat.label}</dt>
            <dd className="mt-1 font-display text-sm font-bold text-ink">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <CardDescription>
        {org.kycStatus === "VERIFIED" ? "Business details checked by HackVillage. " : null}
        Trust scores move with payout speed, media delivery, and milestone honesty.
      </CardDescription>
    </Card>
  );
}
