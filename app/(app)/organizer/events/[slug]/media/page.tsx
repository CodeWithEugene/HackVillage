import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera } from "lucide-react";

import { MediaGallery } from "@/components/media/media-gallery";
import { MediaUploader } from "@/components/media/media-uploader";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Media Vault" };

export default async function EventMediaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, user] = await Promise.all([params, requireUser()]);

  const event = await prisma.event.findFirst({
    where: { slug },
    include: {
      org: { include: { members: { where: { userId: user.id, status: "ACTIVE" } } } },
      media: { orderBy: { uploadedAt: "desc" } },
    },
  });
  if (!event) notFound();
  const membership = event.org.members[0];
  if (!membership || membership.role === "MEMBER") notFound();

  const deadline = event.mediaDeadlineAt;
  const hoursLeft = deadline
    ? Math.round((deadline.getTime() - Date.now()) / 3_600_000)
    : null;
  const pastDeadline = deadline ? deadline.getTime() < Date.now() : false;
  const approvedCount = event.media.filter((asset) => asset.status === "APPROVED").length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Media Vault</h1>
          <p className="mt-1 text-sm text-muted">
            {event.title} ·{" "}
            <Link href={`/organizer/events/${event.slug}`} className="underline hover:text-ink">
              command center
            </Link>
          </p>
        </div>
        <Badge variant={pastDeadline ? "danger" : approvedCount > 0 ? "success" : "warning"}>
          {pastDeadline
            ? "Deadline passed"
            : approvedCount > 0
              ? `${approvedCount} approved`
              : hoursLeft != null
                ? `${hoursLeft}h to deadline`
                : "48h after the event"}
        </Badge>
      </header>

      {pastDeadline && approvedCount === 0 ? (
        <Card className="border-danger/40">
          <CardTitle className="text-danger">The 48 Hour Window Has Closed</CardTitle>
          <CardDescription>
            A −10 trust penalty applies to {event.org.name} for missing the media deadline. You can
            still upload the gallery — late is far better than never — and appeal from your
            organizer page if there were extraordinary circumstances.
          </CardDescription>
        </Card>
      ) : null}

      {!pastDeadline && approvedCount === 0 ? (
        <Card className="border-warning/40">
          <CardTitle className="flex items-center gap-2">
            <Camera aria-hidden className="size-5" /> The 48 Hour Promise
          </CardTitle>
          <CardDescription>
            High-res photos land within 48 hours of the event — that&apos;s the HackVillage
            standard. Missing it costs −10 trust on the organizer score.
            {hoursLeft != null ? ` You have about ${hoursLeft} hour${hoursLeft === 1 ? "" : "s"}.` : null}
          </CardDescription>
        </Card>
      ) : null}

      <MediaUploader eventId={event.id} />

      <MediaGallery
        assets={event.media.map((asset) => ({
          id: asset.id,
          url: asset.url,
          kind: asset.kind,
          caption: asset.caption,
          status: asset.status,
        }))}
      />
    </div>
  );
}
