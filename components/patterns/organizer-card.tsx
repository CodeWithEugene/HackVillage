import { ExternalLink, MapPin, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { formatOrgLocation, isOrgKind, ORG_KIND_LABELS, type OrgKind } from "@/lib/orgs/details";
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
    kind: OrgKind | null;
    city: string | null;
    country: string | null;
    website: string | null;
    socialUrl: string | null;
  };
}

/** "technetium.co.ke" from "https://www.technetium.co.ke/". */
function linkLabel(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    const host = hostname.replace(/^www\./, "");
    return pathname.length > 1 ? `${host}${pathname.replace(/\/$/, "")}` : host;
  } catch {
    return url;
  }
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

  const location = formatOrgLocation(org);
  const facts = [isOrgKind(org.kind) ? ORG_KIND_LABELS[org.kind] : null, location].filter(Boolean);
  const links = [org.website, org.socialUrl].filter((link): link is string => Boolean(link));

  return (
    <Card>
      <CardTitle>Organizer</CardTitle>
      <p className="mt-2 text-lg font-bold text-ink">{org.name}</p>
      {facts.length > 0 ? (
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
          {location ? <MapPin aria-hidden className="size-3.5 shrink-0" /> : null}
          {facts.join(" · ")}
        </p>
      ) : null}
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
      {links.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {links.map((link) => (
            <li key={link} className="min-w-0">
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-1 font-semibold text-ink-soft hover:text-ink"
              >
                <span className="truncate">{linkLabel(link)}</span>
                <ExternalLink aria-hidden className="size-3.5 shrink-0" />
              </a>
            </li>
          ))}
        </ul>
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
