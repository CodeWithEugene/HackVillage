import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { KybDecisionForm } from "@/components/admin/kyb-decision-form";
import { prisma } from "@/lib/db";
import { formatOrgLocation, isOrgKind, ORG_KIND_LABELS } from "@/lib/orgs/details";
import { KYB_REQUIREMENTS } from "@/lib/orgs/kyb";

export const metadata: Metadata = { title: "Admin · KYB" };

export default async function AdminKybPage() {
  const orgs = await prisma.organization.findMany({
    where: { kycStatus: { in: ["PENDING", "FAILED"] } },
    include: {
      members: {
        where: { role: "OWNER", status: "ACTIVE" },
        take: 1,
        include: { user: { select: { email: true } } },
      },
      kybSubmission: true,
    },
    orderBy: [{ kycStatus: "desc" }, { updatedAt: "desc" }],
  });

  const verified = await prisma.organization.count({ where: { kycStatus: "VERIFIED" } });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold text-ink">KYB Review Queue</h1>
        <Badge variant="success">{verified} verified</Badge>
      </div>
      <p className="max-w-2xl text-sm text-muted">
        Business verification gates the first deposit of every organization (CBK compliance via the
        licensed PSP). Manual review now; Paystack-automated at go-live. Every decision is written
        to the append-only audit log.
      </p>

      {orgs.length === 0 ? (
        <Card>
          <CardTitle>Queue Is Clear</CardTitle>
          <p className="mt-2 text-sm text-muted">No organizations are waiting for review.</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {orgs.map((org) => (
            <li key={org.id}>
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">{org.name}</p>
                    <p className="text-xs text-muted">
                      hackvillage.xyz/organizers/{org.slug}
                      {org.members[0] ? ` · owner ${org.members[0].user.email}` : ""}
                    </p>
                  </div>
                  <Badge variant={org.kycStatus === "PENDING" ? "warning" : "danger"}>
                    {org.kycStatus.toLowerCase()}
                  </Badge>
                </div>
                <SubmissionDetails org={org} />
                <KybDecisionForm orgId={org.id} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface ReviewOrg {
  kind: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  socialUrl: string | null;
  contactPhone: string | null;
  kybSubmission: {
    legalName: string;
    registrationNumber: string;
    kraPin: string | null;
    signatoryName: string;
    signatoryRole: string;
    notes: string | null;
    submittedAt: Date;
    reviewNote: string | null;
  } | null;
}

/** What the organizer sent, next to their profile details, for the reviewer to check. */
function SubmissionDetails({ org }: { org: ReviewOrg }) {
  const kind = isOrgKind(org.kind) ? org.kind : null;
  const submission = org.kybSubmission;
  const rows: Array<[string, string | null]> = [
    ["Kind", kind ? ORG_KIND_LABELS[kind] : null],
    ["Location", formatOrgLocation(org)],
    ["Contact phone", org.contactPhone],
    ["Website", org.website],
    ["Social", org.socialUrl],
  ];
  if (submission) {
    rows.push(
      ["Legal name", submission.legalName],
      [kind ? KYB_REQUIREMENTS[kind].registrationLabel : "Registration number", submission.registrationNumber],
      ["KRA PIN", submission.kraPin],
      ["Signatory", `${submission.signatoryName}, ${submission.signatoryRole}`],
      ["Submitted", submission.submittedAt.toISOString().slice(0, 16).replace("T", " ") + " UTC"],
      ["Organizer notes", submission.notes],
      ["Last review note", submission.reviewNote],
    );
  }

  return (
    <div className="mt-4">
      {submission ? null : (
        <p className="mb-2 text-xs font-semibold text-warning">
          Requested before structured details existed. Reject with a note asking for their
          details, and they can resubmit from their Verification page.
        </p>
      )}
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="break-words text-ink">{value ?? "Not given"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
