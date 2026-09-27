import type { EventStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendNotification } from "@/lib/notifications/send";
import { eventCancelledEmail } from "@/lib/notifications/templates/events";
import { appUrl } from "@/lib/url";

/**
 * Event cancellation (audit remediation). Two entry points share this module:
 * the organizer self-service cancel (drafts/unfunded only, no vault) and the
 * admin cancel (pre-winners, with vault refund when money is locked).
 */
export class EventCancelError extends Error {
  constructor(
    message: string,
    public code: "NOT_FOUND" | "FORBIDDEN" | "WRONG_STATE"
  ) {
    super(message);
  }
}

/** Organizer self-service: only DRAFT/PENDING_DEPOSIT, and never with a vault. */
export async function cancelEventAsOrganizer(input: {
  eventId: string;
  userId: string;
}): Promise<{ slug: string }> {
  const event = await prisma.event.findUnique({
    where: { id: input.eventId },
    select: {
      id: true,
      orgId: true,
      status: true,
      slug: true,
      vault: { select: { id: true } },
    },
  });
  if (!event) throw new EventCancelError("Hackathon not found.", "NOT_FOUND");

  const membership = await prisma.orgMember.findFirst({
    where: {
      orgId: event.orgId,
      userId: input.userId,
      status: "ACTIVE",
      role: { in: ["OWNER", "ADMIN"] },
    },
    select: { id: true },
  });
  if (!membership) {
    throw new EventCancelError("Only organization owners and admins can cancel a hackathon.", "FORBIDDEN");
  }
  if (event.status !== "DRAFT" && event.status !== "PENDING_DEPOSIT") {
    throw new EventCancelError(
      "Only drafts and unfunded hackathons can be cancelled from here.",
      "WRONG_STATE"
    );
  }
  if (event.vault) {
    // A vault means money moved — unwinding it is the admin/refund path.
    throw new EventCancelError(
      "This hackathon has a prize vault. Contact support@hackvillage.xyz to unwind it safely.",
      "WRONG_STATE"
    );
  }

  await prisma.$transaction(async (tx) => {
    // Conditional on the status checked above, so a hackathon that went live
    // (vault locked) in the meantime is never cancelled from this path.
    const cancelled = await tx.event.updateMany({
      where: { id: event.id, status: { in: ["DRAFT", "PENDING_DEPOSIT"] } },
      data: { status: "CANCELLED" },
    });
    if (cancelled.count === 0) {
      throw new EventCancelError("This hackathon changed state. Refresh the page and try again.", "WRONG_STATE");
    }
    await tx.auditLog.create({
      data: {
        actorId: input.userId,
        action: "event.cancelled",
        entity: "Event",
        entityId: event.id,
        reason: "Cancelled by the organizer.",
      },
    });
  });
  return { slug: event.slug };
}

/** Statuses an admin may still cancel: anything before winners are announced. */
const ADMIN_CANCELLABLE_STATUSES = new Set<EventStatus>([
  "DRAFT",
  "PENDING_DEPOSIT",
  "LIVE",
  "IN_PROGRESS",
  "JUDGING",
]);

/** Admin cancel: audited reason required; refunds a LOCKED/HALF_RELEASED vault. */
export async function cancelEventAsAdmin(input: {
  eventId: string;
  adminId: string;
  reason: string;
}): Promise<{ slug: string; refunded: boolean }> {
  const admin = await prisma.roleGrant.findFirst({
    where: { userId: input.adminId, role: "ADMIN" },
    select: { id: true },
  });
  if (!admin) throw new EventCancelError("Admins only.", "FORBIDDEN");

  const event = await prisma.event.findUnique({
    where: { id: input.eventId },
    select: {
      id: true,
      status: true,
      slug: true,
      title: true,
      vault: { select: { chainState: true } },
      org: { select: { owner: { select: { id: true, email: true } } } },
    },
  });
  if (!event) throw new EventCancelError("Hackathon not found.", "NOT_FOUND");
  if (!ADMIN_CANCELLABLE_STATUSES.has(event.status)) {
    throw new EventCancelError(
      "Hackathons with announced winners can't be cancelled. Resolve payouts and disputes instead.",
      "WRONG_STATE"
    );
  }

  await prisma.$transaction(async (tx) => {
    // Conditional on the status checked above: if winners were announced in
    // the meantime, nothing is cancelled and no refund follows.
    const cancelled = await tx.event.updateMany({
      where: { id: event.id, status: { in: [...ADMIN_CANCELLABLE_STATUSES] } },
      data: { status: "CANCELLED" },
    });
    if (cancelled.count === 0) {
      throw new EventCancelError(
        "This hackathon changed state (winners may have just been announced). Refresh the page.",
        "WRONG_STATE"
      );
    }
    await tx.auditLog.create({
      data: {
        actorId: input.adminId,
        action: "event.admin-cancelled",
        entity: "Event",
        entityId: event.id,
        reason: input.reason,
      },
    });
  });

  // The vault refund runs outside the status transaction: refundLockedVault
  // owns its own state machine + attestation and is idempotent.
  let refunded = false;
  if (event.vault && (event.vault.chainState === "LOCKED" || event.vault.chainState === "HALF_RELEASED")) {
    const { refundLockedVault } = await import("@/services/escrow/refund");
    const result = await refundLockedVault(
      event.id,
      `Admin cancellation: ${input.reason}`,
      input.adminId
    );
    refunded = result.refunded;
  }

  // Post-commit notice — money-relevant, so it always sends (no category);
  // a mail failure must never fail the cancellation.
  await sendNotification({
    userId: event.org.owner.id,
    to: event.org.owner.email,
    template: eventCancelledEmail(event.title, input.reason, appUrl("/organizer")),
  }).catch((error: unknown) =>
    console.error(`[events] admin-cancel notice failed (event=${event.id})`, error)
  );

  return { slug: event.slug, refunded };
}
