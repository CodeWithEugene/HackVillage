import { prisma } from "@/lib/db";
import { coverKey, isCoverKeyFor, validateCoverUpload } from "@/lib/events/cover-upload";
import { getStoragePort, type UploadTarget } from "@/lib/ports/storage";

export class CoverError extends Error {}

/** The dev-only route the browser posts to when storage runs locally. */
export const DEV_COVER_UPLOAD_PATH = "/api/dev/covers/upload";

/** Only owners and admins of the hackathon's organization manage its cover. */
export async function authorizeCoverEdit(userId: string, eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, slug: true, orgId: true },
  });
  if (!event) throw new CoverError("Hackathon not found.");
  const membership = await prisma.orgMember.findFirst({
    where: { orgId: event.orgId, userId, status: "ACTIVE", role: { in: ["OWNER", "ADMIN"] } },
    select: { id: true },
  });
  if (!membership)
    throw new CoverError("Only organization owners and admins can change the cover.");
  return event;
}

export async function issueCoverUpload(input: {
  userId: string;
  eventId: string;
  contentType: string;
  sizeBytes: number;
}): Promise<UploadTarget & { mode: "r2" | "local" }> {
  await authorizeCoverEdit(input.userId, input.eventId);
  const problem = validateCoverUpload(input.contentType, input.sizeBytes);
  if (problem) throw new CoverError(problem);

  const storage = getStoragePort();
  const target = await storage.createUploadTargetForKey({
    key: coverKey(input.eventId, input.contentType),
    contentType: input.contentType,
    devUploadPath: DEV_COVER_UPLOAD_PATH,
  });
  return { ...target, mode: storage.mode };
}

/** Points the hackathon at an uploaded cover. The key must be one we issued for it. */
export async function setCover(input: { userId: string; eventId: string; key: string }) {
  const event = await authorizeCoverEdit(input.userId, input.eventId);
  if (!isCoverKeyFor(input.eventId, input.key)) {
    throw new CoverError("That upload doesn't belong to this hackathon.");
  }
  const coverUrl = getStoragePort().urlForKey(input.key);
  await prisma.$transaction([
    prisma.event.update({ where: { id: event.id }, data: { coverUrl } }),
    prisma.auditLog.create({
      data: {
        actorId: input.userId,
        action: "event.cover_updated",
        entity: "Event",
        entityId: event.id,
        meta: { key: input.key },
      },
    }),
  ]);
  return { slug: event.slug, coverUrl };
}

/** Back to the category photo. */
export async function removeCover(input: { userId: string; eventId: string }) {
  const event = await authorizeCoverEdit(input.userId, input.eventId);
  await prisma.$transaction([
    prisma.event.update({ where: { id: event.id }, data: { coverUrl: null } }),
    prisma.auditLog.create({
      data: {
        actorId: input.userId,
        action: "event.cover_removed",
        entity: "Event",
        entityId: event.id,
      },
    }),
  ]);
  return { slug: event.slug };
}
