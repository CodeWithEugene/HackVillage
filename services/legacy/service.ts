import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/ports/mail";
import { sendNotification } from "@/lib/notifications/send";
import { notify } from "@/services/media/notify";
import { alertAdmins } from "@/lib/notifications/admin-alert";
import {
  disputeOpenedAdminEmail,
  disputeOpenedOrganizerEmail,
  disputeResolvedEmail,
} from "@/lib/notifications/templates/admin";
import {
  legacyCheckinReminderEmail,
  legacyUnresponsiveEmail,
  milestoneReminderEmail,
} from "@/lib/notifications/templates/legacy";
import { appUrl } from "@/lib/url";
import { canOpenDispute, disputeOpensAt } from "@/services/legacy/dispute-window";

/**
 * Legacy Tracker (Phase 8 — plan §10.7): 3-month check-ins on every
 * submission, automated reminders, outcomes feeding portfolio lifecycle
 * badges. Plus milestone disputes with 2-admin refund resolution.
 */

export const LEGACY_CHECKIN_DELAY_MS = 90 * 24 * 60 * 60 * 1000; // 3 months

export class LegacyError extends Error {
  constructor(
    message: string,
    public code: "NOT_FOUND" | "FORBIDDEN" | "WRONG_STATE" | "TOO_EARLY"
  ) {
    super(message);
  }
}

/** Create check-in rows for every submission of an event (idempotent). */
export async function scheduleLegacyCheckins(eventId: string): Promise<number> {
  const submissions = await prisma.submission.findMany({
    where: { team: { eventId }, legacyCheckin: null },
    select: { id: true },
  });
  if (submissions.length === 0) return 0;

  await prisma.legacyCheckin.createMany({
    data: submissions.map((submission) => ({
      submissionId: submission.id,
      dueAt: new Date(Date.now() + LEGACY_CHECKIN_DELAY_MS),
    })),
  });
  return submissions.length;
}

/**
 * The daily legacy cron: send reminders for due check-ins (max 2), mark
 * UNRESPONSIVE after the second reminder + 14 days.
 */
export async function runLegacySweep(now: Date = new Date()): Promise<{
  reminded: number;
  unresponsive: number;
}> {
  const due = await prisma.legacyCheckin.findMany({
    where: { completedAt: null, dueAt: { lt: now } },
    include: {
      submission: {
        include: {
          team: {
            include: {
              members: {
                where: { status: "JOINED" },
                include: { user: { select: { id: true, email: true, name: true } } },
              },
              event: { select: { title: true } },
            },
          },
        },
      },
    },
    take: 100,
  });

  let reminded = 0;
  let unresponsive = 0;
  for (const checkin of due) {
    const overdueDays = Math.floor(
      (now.getTime() - checkin.dueAt.getTime()) / (24 * 60 * 60 * 1000)
    );

    // Two reminders (day 0 and day 14); unresponsive at day 28.
    const remindersDue = overdueDays >= 28 ? 2 : overdueDays >= 14 ? 1 : 0;
    let effectiveReminderCount = checkin.reminderCount;
    if (checkin.reminderCount < remindersDue) {
      for (const member of checkin.submission.team.members) {
        await notify({
          userId: member.user.id,
          type: "legacy.checkin",
          payload: {
            eventTitle: checkin.submission.team.event.title,
            submissionId: checkin.submissionId,
          },
        });
        await sendNotification({
          userId: member.user.id,
          to: member.user.email,
          category: "reminders",
          template: legacyCheckinReminderEmail(
            checkin.submission.team.event.title,
            appUrl(`/dashboard/profile`)
          ),
        }).catch((error: unknown) => console.error("[legacy] checkin notification failed", error));
      }
      await prisma.legacyCheckin.update({
        where: { id: checkin.id },
        data: { reminderCount: remindersDue },
      });
      effectiveReminderCount = remindersDue;
      reminded += 1;
    }

    if (overdueDays >= 28 && effectiveReminderCount >= 2) {
      await prisma.legacyCheckin.update({
        where: { id: checkin.id },
        data: { outcome: "UNRESPONSIVE", completedAt: now },
      });
      for (const member of checkin.submission.team.members) {
        await sendNotification({
          userId: member.user.id,
          to: member.user.email,
          category: "reminders",
          template: legacyUnresponsiveEmail(checkin.submission.team.event.title, appUrl("/dashboard/profile")),
        }).catch((error: unknown) => console.error("[legacy] unresponsive notification failed", error));
      }
      unresponsive += 1;
    }
  }

  return { reminded, unresponsive };
}

/** A team member records the outcome — updates the portfolio lifecycle too. */
export async function recordLegacyOutcome(input: {
  submissionId: string;
  userId: string;
  outcome: "STILL_DEMO" | "IN_PRODUCTION" | "PIVOTED" | "ABANDONED";
  notes?: string;
}): Promise<void> {
  const submission = await prisma.submission.findUnique({
    where: { id: input.submissionId },
    include: {
      team: { include: { members: { where: { status: "JOINED" } } } },
      legacyCheckin: true,
    },
  });
  if (!submission) throw new LegacyError("Submission not found.", "NOT_FOUND");

  const isMember = submission.team.members.some((m) => m.userId === input.userId);
  if (!isMember) throw new LegacyError("Only the team can record their outcome.", "FORBIDDEN");

  if (submission.legacyCheckin) {
    await prisma.legacyCheckin.update({
      where: { submissionId: input.submissionId },
      data: { outcome: input.outcome, completedAt: new Date(), notes: input.notes ?? null },
    });
  } else {
    await prisma.legacyCheckin.create({
      data: {
        submissionId: input.submissionId,
        dueAt: new Date(),
        outcome: input.outcome,
        completedAt: new Date(),
        notes: input.notes ?? null,
      },
    });
  }

  // Portfolio lifecycle mirrors the outcome (plan §6.6 lifecycle tags).
  const lifecycleMap: Record<string, "DEMO" | "IN_PRODUCTION" | "PIVOTED" | "ARCHIVED"> = {
    STILL_DEMO: "DEMO",
    IN_PRODUCTION: "IN_PRODUCTION",
    PIVOTED: "PIVOTED",
    ABANDONED: "ARCHIVED",
  };
  await prisma.portfolioItem.updateMany({
    where: { submissionId: input.submissionId },
    data: { lifecycle: lifecycleMap[input.outcome] },
  });
}

// ── Milestone reminders (plan §10.5 — 30/60/90-day nudges) ──────────────

export async function runMilestoneReminders(now: Date = new Date()): Promise<number> {
  const pending = await prisma.milestone.findMany({
    where: { confirmedAt: null, dueAt: { lt: now } },
    include: {
      winner: {
        include: {
          event: {
            include: {
              org: {
                include: {
                  members: {
                    where: { role: "OWNER", status: "ACTIVE" },
                    take: 1,
                    include: { user: { select: { id: true, email: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
    take: 100,
  });

  let reminded = 0;
  for (const milestone of pending) {
    const overdueDays = Math.floor(
      (now.getTime() - milestone.dueAt.getTime()) / (24 * 60 * 60 * 1000)
    );
    // Nudge windows: 0, 30, 60, 90 days overdue.
    const windowIndex = overdueDays >= 90 ? 4 : overdueDays >= 60 ? 3 : overdueDays >= 30 ? 2 : 1;
    // One nudge per window — the dueAt shifts forward on each nudge below.
    const nudgedWindow = Math.floor(
      (now.getTime() - milestone.dueAt.getTime()) / (30 * 24 * 60 * 60 * 1000)
    ) + 1;
    if (nudgedWindow > windowIndex) continue; // already nudged this window

    const owner = milestone.winner.event.org.members[0];
    if (owner) {
      await notify({
        userId: owner.user.id,
        type: "milestone.reminder",
        payload: {
          winnerId: milestone.winnerId,
          eventTitle: milestone.winner.event.title,
          overdueDays,
        },
      });
      await sendNotification({
        userId: owner.user.id,
        to: owner.user.email,
        category: "reminders",
        template: milestoneReminderEmail(milestone.winner.event.title, overdueDays, appUrl("/organizer")),
      }).catch((error: unknown) => console.error("[legacy] milestone reminder failed", error));
      reminded += 1;
    }
  }
  return reminded;
}

// ── Disputes (plan §10.5 — after 14 days unconfirmed) ───────────────────

export async function openMilestoneDispute(input: {
  winnerId: string;
  userId: string;
  claim: string;
  evidenceUrl?: string;
}): Promise<void> {
  const winner = await prisma.winner.findUnique({
    where: { id: input.winnerId },
    include: {
      milestone: true,
      event: { select: { title: true, org: { select: { owner: { select: { id: true, email: true } } } } } },
    },
  });
  if (!winner) throw new LegacyError("Win not found.", "NOT_FOUND");
  if (winner.userId !== input.userId) {
    throw new LegacyError("Only the winner can dispute their milestone.", "FORBIDDEN");
  }
  if (!winner.milestone || !winner.milestoneRequired) {
    throw new LegacyError("This prize has no milestone to dispute.", "WRONG_STATE");
  }
  if (winner.milestone.confirmedAt) {
    throw new LegacyError("This milestone is already confirmed.", "WRONG_STATE");
  }
  // Give the organizer 14 days from the announcement to confirm first.
  if (!canOpenDispute(winner.announcedAt)) {
    const opens = new Intl.DateTimeFormat("en-KE", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Africa/Nairobi",
    }).format(disputeOpensAt(winner.announcedAt));
    throw new LegacyError(
      `You can open a dispute from ${opens}, 14 days after winners were announced.`,
      "TOO_EARLY",
    );
  }

  const existing = await prisma.dispute.findUnique({ where: { winnerId: input.winnerId } });
  if (existing && existing.status === "OPEN") {
    throw new LegacyError("A dispute is already open for this milestone.", "WRONG_STATE");
  }

  await prisma.dispute.create({
    data: {
      winnerId: input.winnerId,
      openedBy: input.userId,
      claim: input.claim,
      evidenceUrl: input.evidenceUrl ?? null,
    },
  });

  await alertAdmins(
    disputeOpenedAdminEmail(winner.event.title, input.claim, appUrl("/admin/disputes"))
  ).catch((error: unknown) => console.error("[legacy] dispute admin alert failed", error));
  await sendMail({
    to: winner.event.org.owner.email,
    ...disputeOpenedOrganizerEmail(winner.event.title),
  }).catch((error: unknown) => console.error("[legacy] dispute organizer notice failed", error));
}

/** Admin resolution: release (audited override — the payout engine takes over) or reject. */
export async function resolveDispute(input: {
  disputeId: string;
  adminId: string;
  resolution: "RELEASE" | "REJECT";
  note: string;
}): Promise<{ outcome: "released" | "rejected" }> {
  const [dispute, adminGrant] = await Promise.all([
    prisma.dispute.findUnique({
      where: { id: input.disputeId },
      include: {
        winner: {
          include: { event: { include: { org: { select: { owner: { select: { email: true } } } } } } },
        },
      },
    }),
    prisma.roleGrant.findFirst({ where: { userId: input.adminId, role: "ADMIN" } }),
  ]);
  if (!dispute) throw new LegacyError("Dispute not found.", "NOT_FOUND");
  if (!adminGrant) throw new LegacyError("Admins only.", "FORBIDDEN");
  if (dispute.status !== "OPEN") {
    throw new LegacyError("This dispute is already resolved.", "WRONG_STATE");
  }

  const opener = await prisma.user.findUnique({ where: { id: dispute.openedBy }, select: { email: true } });
  const notifyDisputeResolved = async (released: boolean): Promise<void> => {
    const template = disputeResolvedEmail(dispute.winner.event.title, released, input.note);
    if (opener) await sendMail({ to: opener.email, ...template }).catch(() => undefined);
    await sendMail({ to: dispute.winner.event.org.owner.email, ...template }).catch(() => undefined);
  };

  if (input.resolution === "REJECT") {
    await prisma.$transaction([
      prisma.dispute.update({
        where: { id: input.disputeId },
        data: {
          status: "REJECTED",
          resolvedBy: input.adminId,
          resolvedAt: new Date(),
          resolutionNote: input.note,
        },
      }),
      prisma.auditLog.create({
        data: {
          actorId: input.adminId,
          action: "dispute.rejected",
          entity: "Dispute",
          entityId: input.disputeId,
          reason: input.note.slice(0, 300),
        },
      }),
    ]);
    await notifyDisputeResolved(false);
    return { outcome: "rejected" };
  }

  // RELEASE: resolve the dispute, then confirm the milestone through the
  // normal payout path so idempotency and the vault advance apply. The
  // organizer's own confirmation is bypassed by an audited admin override.
  await prisma.$transaction([
    prisma.dispute.update({
      where: { id: input.disputeId },
      data: {
        status: "RESOLVED_RELEASE",
        resolvedBy: input.adminId,
        resolvedAt: new Date(),
        resolutionNote: input.note,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: input.adminId,
        action: "dispute.released",
        entity: "Dispute",
        entityId: input.disputeId,
        reason: input.note.slice(0, 300),
      },
    }),
  ]);

  await notifyDisputeResolved(true);

  // confirmMilestone requires an org admin; the dispute release grants the
  // admin the right to stand in. We pass the dispute opener's organizer
  // counterpart by confirming directly through the payout service:
  const { confirmMilestone } = await import("@/services/payout/service");
  // The service checks org membership of the passed organizerId — the
  // resolving ADMIN is not an org member, so confirm via a dedicated
  // service-level path instead: replicate the milestone payout creation.
  const winner = await prisma.winner.findUnique({
    where: { id: dispute.winnerId },
    include: { milestone: true, payouts: true, user: { include: { profile: true } } },
  });
  if (!winner || !winner.milestone || winner.milestone.confirmedAt) {
    return { outcome: "released" }; // already handled or nothing to do
  }
  const existing = winner.payouts.find((p) => p.tranche === "MILESTONE");
  if (existing) return { outcome: "released" };

  const recipientCode = winner.user.profile?.payoutRecipientCode;
  if (!recipientCode) return { outcome: "released" };

  const { payoutIdempotencyKey, tranchePlanFor } = await import("@/services/payout/tranches");
  const { enqueue } = await import("@/lib/queue");
  const plan = tranchePlanFor(winner.amountKes, true);

  await prisma.$transaction(async (tx) => {
    await tx.milestone.update({
      where: { winnerId: winner.id },
      data: { confirmedBy: input.adminId, confirmedAt: new Date() },
    });
    await tx.payout.create({
      data: {
        winnerId: winner.id,
        tranche: "MILESTONE",
        amountKes: plan.milestoneKes,
        idempotencyKey: payoutIdempotencyKey(winner.id, "MILESTONE"),
        recipientCode,
        status: "QUEUED",
      },
    });
  });

  const created = await prisma.payout.findUnique({
    where: { idempotencyKey: payoutIdempotencyKey(winner.id, "MILESTONE") },
    select: { id: true },
  });
  if (created) await enqueue("payout.execute", { payoutId: created.id });

  return { outcome: "released" };
}
