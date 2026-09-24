import { prisma } from "@/lib/db";
import { getStoragePort, validateMediaUpload } from "@/lib/ports/storage";
import { sendNotification } from "@/lib/notifications/send";
import {
  manualTrustAdjustmentEmail,
  mediaAppealGrantedEmail,
  mediaPenaltyEmail,
} from "@/lib/notifications/templates/trust";
import { appUrl } from "@/lib/url";
import { trustScoreFrom } from "@/services/media/trust";

/**
 * Media Vault service (Phase 7 — plan §10.6): 48-hour gallery deadline with
 * Trust Penalty enforcement, media approval, notifications. The cron enforces
 * the deadline mechanically — never organizer goodwill.
 */

export class MediaError extends Error {
  constructor(
    message: string,
    public code: "NOT_FOUND" | "FORBIDDEN" | "WRONG_STATE" | "BAD_FILE" | "ALREADY_PENALIZED"
  ) {
    super(message);
  }
}

async function requireOrgAdmin(eventId: string, userId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      org: { include: { members: { where: { userId, status: "ACTIVE" } } } },
    },
  });
  if (!event) throw new MediaError("Event not found.", "NOT_FOUND");
  const membership = event.org.members[0];
  if (!membership || membership.role === "MEMBER") {
    throw new MediaError("Only organization admins manage the media vault.", "FORBIDDEN");
  }
  return event;
}

// ── Uploads ──────────────────────────────────────────────────────────────

export async function createUploadTarget(input: {
  eventId: string;
  userId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
}) {
  await requireOrgAdmin(input.eventId, input.userId);
  // Past the deadline, uploads still land (better late than never) — the
  // penalty already applies and the organizer sees it on their surfaces.

  const validationError = validateMediaUpload(input.contentType, input.sizeBytes);
  if (validationError) throw new MediaError(validationError, "BAD_FILE");

  const target = await getStoragePort().createUploadTarget({
    eventId: input.eventId,
    filename: input.filename,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
  });
  return target;
}

/** After the client uploaded to the target, register the asset. */
export async function registerMediaAsset(input: {
  eventId: string;
  userId: string;
  key: string;
  kind: "PHOTO" | "VIDEO";
  caption?: string;
}): Promise<void> {
  await requireOrgAdmin(input.eventId, input.userId);

  const url = getStoragePort().publicUrlFor(input.key);
  await prisma.mediaAsset.create({
    data: {
      eventId: input.eventId,
      r2Key: input.key,
      url,
      kind: input.kind,
      caption: input.caption ?? null,
      uploadedBy: input.userId,
      status: "PENDING",
    },
  });
}

export async function setMediaStatus(
  assetId: string,
  userId: string,
  status: "APPROVED" | "HIDDEN"
): Promise<void> {
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: assetId },
    include: {
      event: {
        include: {
          org: { include: { members: { where: { userId, status: "ACTIVE" } } } },
        },
      },
    },
  });
  if (!asset) throw new MediaError("Asset not found.", "NOT_FOUND");
  const membership = asset.event.org.members[0];
  if (!membership || membership.role === "MEMBER") {
    throw new MediaError("Only organization admins manage media.", "FORBIDDEN");
  }
  await prisma.mediaAsset.update({ where: { id: assetId }, data: { status } });
}

// ── The 48-hour deadline (cron, plan §10.6) ─────────────────────────────

export interface DeadlineOutcome {
  checked: number;
  penalized: number;
}

/**
 * Enforce the deadline: events past endsAt + 48h with zero APPROVED assets
 * get a −10 MEDIA_PENALTY TrustEvent exactly once (idempotent via the
 * existing-penalty check). Never affects payouts (prize ≠ media).
 */
export async function enforceMediaDeadlines(now: Date = new Date()): Promise<DeadlineOutcome> {
  const candidates = await prisma.event.findMany({
    where: {
      status: { in: ["WINNERS_ANNOUNCED", "SETTLED", "JUDGING"] },
      mediaDeadlineAt: { lt: now },
    },
    select: {
      id: true,
      title: true,
      orgId: true,
      mediaDeadlineAt: true,
      org: { select: { name: true, trustScore: true, members: { where: { role: "OWNER", status: "ACTIVE" }, take: 1, include: { user: { select: { email: true } } } } } },
      _count: { select: { media: { where: { status: "APPROVED" } } } },
    },
  });

  let penalized = 0;
  for (const event of candidates) {
    if (event._count.media > 0) continue; // approved gallery exists

    // Idempotence: one media penalty per (org, event title window).
    const existing = await prisma.trustEvent.findFirst({
      where: {
        orgId: event.orgId,
        type: "MEDIA_PENALTY",
        reason: { contains: event.id },
      },
    });
    if (existing) continue;

    // The owner gets the notification (and the email below).
    const owner = await prisma.orgMember.findFirst({
      where: { orgId: event.orgId, role: "OWNER", status: "ACTIVE" },
      select: { userId: true, user: { select: { id: true, email: true } } },
    });

    await prisma.$transaction([
      prisma.trustEvent.create({
        data: {
          orgId: event.orgId,
          type: "MEDIA_PENALTY",
          delta: -10,
          reason: `48-hour media deadline missed for ${event.title} (${event.id}).`,
        },
      }),
      prisma.organization.update({
        where: { id: event.orgId },
        data: { trustScore: trustScoreFrom(event.org.trustScore, -10) },
      }),
      prisma.notification.create({
        data: {
          userId: owner?.user.id ?? "unknown",
          type: "media.penalty",
          payload: { eventId: event.id, eventTitle: event.title, delta: -10 },
        },
      }),
    ]);

    if (owner) {
      await sendNotification({
        userId: owner.user.id,
        to: owner.user.email,
        category: "eventUpdates",
        template: mediaPenaltyEmail(event.title, event.org.name, appUrl("/organizer")),
      }).catch(() => undefined);
    }
    penalized += 1;
  }

  return { checked: candidates.length, penalized };
}

// ── Trust events (manual adjustments + appeals — admin) ─────────────────

export async function applyManualTrustAdjustment(input: {
  adminId: string;
  orgId: string;
  delta: number;
  reason: string;
}): Promise<void> {
  const admin = await prisma.roleGrant.findFirst({
    where: { userId: input.adminId, role: "ADMIN" },
  });
  if (!admin) throw new MediaError("Admins only.", "FORBIDDEN");
  if (Math.abs(input.delta) > 50) {
    throw new MediaError("Manual adjustments are capped at ±50.", "WRONG_STATE");
  }

  const org = await prisma.organization.findUnique({
    where: { id: input.orgId },
    include: { owner: { select: { id: true, email: true } } },
  });
  if (!org) throw new MediaError("Organization not found.", "NOT_FOUND");

  await prisma.$transaction([
    prisma.trustEvent.create({
      data: {
        orgId: input.orgId,
        type: input.delta >= 0 ? "MANUAL_ADJUST" : "MANUAL_ADJUST",
        delta: input.delta,
        reason: input.reason,
        actorId: input.adminId,
      },
    }),
    prisma.organization.update({
      where: { id: input.orgId },
      data: { trustScore: trustScoreFrom(org.trustScore, input.delta) },
    }),
    prisma.auditLog.create({
      data: {
        actorId: input.adminId,
        action: "trust.adjust",
        entity: "Organization",
        entityId: input.orgId,
        reason: input.reason,
      },
    }),
  ]);

  await sendNotification({
    userId: org.owner.id,
    to: org.owner.email,
    category: "eventUpdates",
    template: manualTrustAdjustmentEmail(org.name, input.delta, input.reason),
  }).catch((error: unknown) => console.error("[media] trust adjustment notification failed", error));
}

export async function grantMediaAppeal(input: {
  adminId: string;
  orgId: string;
  originalReason: string;
  note: string;
}): Promise<void> {
  const admin = await prisma.roleGrant.findFirst({
    where: { userId: input.adminId, role: "ADMIN" },
  });
  if (!admin) throw new MediaError("Admins only.", "FORBIDDEN");

  const org = await prisma.organization.findUnique({
    where: { id: input.orgId },
    include: { owner: { select: { id: true, email: true } } },
  });
  if (!org) throw new MediaError("Organization not found.", "NOT_FOUND");

  await prisma.$transaction([
    prisma.trustEvent.create({
      data: {
        orgId: input.orgId,
        type: "APPEAL_GRANTED",
        delta: 10,
        reason: `Media penalty appeal granted: ${input.note} (reversing: ${input.originalReason.slice(0, 120)})`,
        actorId: input.adminId,
      },
    }),
    prisma.organization.update({
      where: { id: input.orgId },
      data: { trustScore: trustScoreFrom(org.trustScore, 10) },
    }),
    prisma.auditLog.create({
      data: {
        actorId: input.adminId,
        action: "trust.appeal-granted",
        entity: "Organization",
        entityId: input.orgId,
        reason: input.note,
      },
    }),
  ]);

  await sendNotification({
    userId: org.owner.id,
    to: org.owner.email,
    category: "eventUpdates",
    template: mediaAppealGrantedEmail(org.name, input.note),
  }).catch((error: unknown) => console.error("[media] appeal notification failed", error));
}
