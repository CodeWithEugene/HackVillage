import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { KybForm } from "@/components/organizer/kyb-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireSurface } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { isOrgKind, ORG_KIND_LABELS } from "@/lib/orgs/details";
import { canSubmitKyb, KYB_REQUIREMENTS } from "@/lib/orgs/kyb";

export const metadata: Metadata = { title: "Verify Your Organization" };

const STATUS = {
  NONE: { label: "Not Started", tone: "warning" },
  PENDING: { label: "In Review", tone: "warning" },
  VERIFIED: { label: "Verified", tone: "success" },
  FAILED: { label: "Needs Attention", tone: "danger" },
} as const;

interface PageProps {
  searchParams: Promise<{ welcome?: string }>;
}

export default async function OrganizerVerificationPage({ searchParams }: PageProps) {
  const user = await requireSurface("organizer");
  const welcome = (await searchParams).welcome === "1";

  const membership = await prisma.orgMember.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    select: { role: true, org: { include: { kybSubmission: true } } },
  });
  if (!membership) {
    return (
      <Card>
        <CardTitle>Set Up Your Organization First</CardTitle>
        <CardDescription>
          Verification belongs to an organization, so create or join one first.
        </CardDescription>
        <Link href="/onboarding/organizer" className="mt-4 inline-block">
          <Button arrow>Set Up Organization</Button>
        </Link>
      </Card>
    );
  }

  const { org } = membership;
  const submission = org.kybSubmission;
  const status = STATUS[org.kycStatus];
  const canManage = membership.role === "OWNER" || membership.role === "ADMIN";
  const kind = isOrgKind(org.kind) ? org.kind : null;
  const requirements = kind ? KYB_REQUIREMENTS[kind] : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {welcome ? (
        <Card className="border-brand/40 bg-brand/10">
          <CardTitle>{org.name} Is Set Up</CardTitle>
          <CardDescription>
            You can create and draft hackathons now. Before your first deposit, HackVillage checks
            your business details, which takes up to 48 hours. Start now so it never holds up your
            launch, or come back to it any time.
          </CardDescription>
          <Link href="/organizer" className="mt-4 inline-block">
            <Button variant="secondary" size="sm">
              Do This Later
            </Button>
          </Link>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Verify Your Organization</h1>
          <p className="mt-1 text-sm text-muted">
            {org.name}
            {kind ? ` · ${ORG_KIND_LABELS[kind]}` : ""}
          </p>
        </div>
        <Badge variant={status.tone}>{status.label}</Badge>
      </div>

      <StatusCard status={org.kycStatus} reviewNote={submission?.reviewNote ?? null} />

      {canSubmitKyb(org.kycStatus) ? (
        <Card>
          <CardTitle>Business Details</CardTitle>
          {!canManage ? (
            <CardDescription>
              Ask an owner or admin of {org.name} to submit these details.
            </CardDescription>
          ) : !requirements ? (
            <>
              <CardDescription>
                Tell us what kind of organization you are first, so we ask for the right details.
              </CardDescription>
              <Link href="/organizer#public-profile" className="mt-4 inline-block">
                <Button variant="secondary" arrow>
                  Complete Your Profile
                </Button>
              </Link>
            </>
          ) : (
            <div className="mt-4">
              <KybForm
                orgId={org.id}
                registrationLabel={requirements.registrationLabel}
                kraPinRequired={requirements.kraPinRequired}
                previous={submission}
              />
            </div>
          )}
        </Card>
      ) : submission ? (
        <Card>
          <CardTitle>What You Submitted</CardTitle>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <Detail label="Registered legal name" value={submission.legalName} />
            <Detail
              label={requirements?.registrationLabel ?? "Registration number"}
              value={submission.registrationNumber}
            />
            <Detail label="KRA PIN" value={submission.kraPin ?? "Not given"} />
            <Detail
              label="Authorized signatory"
              value={`${submission.signatoryName}, ${submission.signatoryRole}`}
            />
          </dl>
        </Card>
      ) : null}

      {requirements && org.kycStatus !== "VERIFIED" ? (
        <Card>
          <CardTitle>Documents To Have Ready</CardTitle>
          <CardDescription>
            A reviewer may ask you for these during the review. You don&apos;t need to send them
            now.
          </CardDescription>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-body-copy">
            {requirements.documents.map((document) => (
              <li key={document}>{document}</li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

function StatusCard({
  status,
  reviewNote,
}: {
  status: keyof typeof STATUS;
  reviewNote: string | null;
}) {
  if (status === "VERIFIED") {
    return (
      <Card>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck aria-hidden className="size-5" /> You&apos;re Verified
        </CardTitle>
        <CardDescription>
          Your hackathons carry the Verified Organizer badge, and you can fund prize pools.
        </CardDescription>
        <Link href="/organizer" className="mt-4 inline-block">
          <Button arrow>Go To Your Hackathons</Button>
        </Link>
      </Card>
    );
  }
  if (status === "PENDING") {
    return (
      <Card>
        <CardTitle>Your Details Are In Review</CardTitle>
        <CardDescription>
          We review new organizations within 48 hours and email you the moment there&apos;s a
          decision. You can keep drafting hackathons meanwhile.
        </CardDescription>
      </Card>
    );
  }
  if (status === "FAILED") {
    return (
      <Card className="border-danger/40">
        <CardTitle>We Couldn&apos;t Verify You Yet</CardTitle>
        <CardDescription>
          {reviewNote ? `The reviewer said: ${reviewNote}` : "The reviewer needs more information."}{" "}
          Fix the details below and submit again.
        </CardDescription>
      </Card>
    );
  }
  return (
    <Card>
      <CardTitle>Why We Verify</CardTitle>
      <CardDescription>
        Organizers hold real prize money in escrow, so we confirm who you are before your first
        deposit. Builders see a Verified Organizer badge on every hackathon you run.
      </CardDescription>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink">{value}</dd>
    </div>
  );
}
