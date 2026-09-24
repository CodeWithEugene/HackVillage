import { prisma } from "@/lib/db";
import {
  DEFAULT_RUBRIC,
  feedbackGateSatisfied,
  type Criterion,
  type FeedbackKind,
} from "@/lib/judging/compute";
import { sendMail } from "@/lib/ports/mail";
import { sendNotification } from "@/lib/notifications/send";
import { judgeInvitedEmail, judgeRespondedEmail, judgingOpenEmail } from "@/lib/notifications/templates/judging";
import { appUrl } from "@/lib/url";

/**
 * Judging service (Phase 4). Authorization passes explicit userIds — the
 * server actions resolve sessions; the service re-verifies roles. The
 * finalization gate is enforced HERE (plan §17 exit criterion): a forged
 * client cannot bypass it because it never depends on client state.
 */

export class JudgingError extends Error {
  constructor(
    message: string,
    public code:
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "WRONG_STATE"
      | "NOT_ACTIVE_JUDGE"
      | "ALREADY_FINALIZED"
      | "GATE_UNMET"
      | "SCORES_INCOMPLETE"
  ) {
    super(message);
  }
}

async function requireOrgAdmin(eventId: string, userId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { org: { include: { members: { where: { userId, status: "ACTIVE" } } } } },
  });
  if (!event) throw new JudgingError("Event not found.", "NOT_FOUND");
  const membership = event.org.members[0];
  if (!membership || membership.role === "MEMBER") {
    throw new JudgingError("Only organization admins can manage judging.", "FORBIDDEN");
  }
  return event;
}

async function requireActiveJudge(eventId: string, userId: string) {
  const assignment = await prisma.judgeAssignment.findFirst({
    where: { eventId, userId, status: "ACTIVE" },
  });
  if (!assignment) {
    throw new JudgingError("You're not an active judge for this event.", "NOT_ACTIVE_JUDGE");
  }
  return assignment;
}

// ── Judge management ─────────────────────────────────────────────────────

export async function inviteJudge(
  eventId: string,
  organizerId: string,
  judgeHandle: string
): Promise<void> {
  const event = await requireOrgAdmin(eventId, organizerId);

  const judge = await prisma.user.findFirst({
    where: { handle: { equals: judgeHandle, mode: "insensitive" }, deletedAt: null },
    select: { id: true, email: true },
  });
  if (!judge) throw new JudgingError("No HackVillage user has that handle.", "NOT_FOUND");

  const participation = await prisma.teamMember.findFirst({
    where: { userId: judge.id, status: "JOINED", team: { eventId } },
    select: { id: true },
  });
  if (participation) {
    throw new JudgingError(
      "That developer is participating — judges can't judge their own event.",
      "WRONG_STATE"
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.judgeAssignment.upsert({
      where: { eventId_userId: { eventId, userId: judge.id } },
      create: { eventId, userId: judge.id, status: "INVITED" },
      update: { status: "INVITED" },
    });
    await tx.roleGrant.upsert({
      where: { userId_role: { userId: judge.id, role: "JUDGE" } },
      create: { userId: judge.id, role: "JUDGE" },
      update: {},
    });
  });

  await sendNotification({
    userId: judge.id,
    to: judge.email,
    category: "judging",
    template: judgeInvitedEmail(event.title, appUrl("/judge")),
  });
}

export async function respondToInvite(
  assignmentId: string,
  userId: string,
  accept: boolean
): Promise<void> {
  const assignment = await prisma.judgeAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      user: { select: { name: true, handle: true } },
      event: { select: { title: true, org: { select: { owner: { select: { id: true, email: true } } } } } },
    },
  });
  if (!assignment || assignment.userId !== userId) {
    throw new JudgingError("Invitation not found.", "NOT_FOUND");
  }
  await prisma.judgeAssignment.update({
    where: { id: assignmentId },
    data: { status: accept ? "ACTIVE" : "DECLINED" },
  });

  await sendMail({
    to: assignment.event.org.owner.email,
    ...judgeRespondedEmail(assignment.user.name ?? assignment.user.handle, assignment.event.title, accept),
  });
}

export async function removeJudge(assignmentId: string, organizerId: string): Promise<void> {
  const assignment = await prisma.judgeAssignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) throw new JudgingError("Invitation not found.", "NOT_FOUND");
  await requireOrgAdmin(assignment.eventId, organizerId);
  await prisma.judgeAssignment.update({
    where: { id: assignmentId },
    data: { status: "DECLINED" },
  });
}

// ── Rubric + judging window ──────────────────────────────────────────────

export async function saveRubric(
  eventId: string,
  organizerId: string,
  criteria: Criterion[]
): Promise<void> {
  const event = await requireOrgAdmin(eventId, organizerId);
  if (["JUDGING", "WINNERS_ANNOUNCED", "SETTLED"].includes(event.status)) {
    throw new JudgingError("The rubric locks when judging opens.", "WRONG_STATE");
  }
  const total = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  if (total !== 100) {
    throw new JudgingError(`Weights add up to ${total} — they must total 100.`, "WRONG_STATE");
  }

  await prisma.rubric.upsert({
    where: { eventId },
    create: { eventId, criteria: criteria as unknown as object },
    update: { criteria: criteria as unknown as object },
  });
}

export async function openJudging(eventId: string, organizerId: string): Promise<void> {
  const event = await requireOrgAdmin(eventId, organizerId);
  if (event.status !== "LIVE" && event.status !== "IN_PROGRESS") {
    throw new JudgingError("Judging opens after a live event.", "WRONG_STATE");
  }
  if (event.endsAt.getTime() > Date.now()) {
    throw new JudgingError("The event hasn't ended yet.", "WRONG_STATE");
  }

  await prisma.$transaction(async (tx) => {
    await tx.rubric.upsert({
      where: { eventId },
      create: { eventId, criteria: DEFAULT_RUBRIC as unknown as object },
      update: {},
    });
    await tx.event.update({ where: { id: eventId }, data: { status: "JUDGING" } });
  });

  const activeJudges = await prisma.judgeAssignment.findMany({
    where: { eventId, status: "ACTIVE" },
    select: { user: { select: { id: true, email: true } } },
  });
  const judgeUrl = appUrl("/judge");
  for (const assignment of activeJudges) {
    await sendNotification({
      userId: assignment.user.id,
      to: assignment.user.email,
      category: "judging",
      template: judgingOpenEmail(event.title, judgeUrl),
    });
  }
}

// ── Scoring & feedback ───────────────────────────────────────────────────

async function requireScoreable(teamId: string, judgeId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { event: { select: { id: true, status: true } } },
  });
  if (!team) throw new JudgingError("Team not found.", "NOT_FOUND");
  if (team.event.status !== "JUDGING") {
    throw new JudgingError("Judging isn't open for this event.", "WRONG_STATE");
  }
  await requireActiveJudge(team.event.id, judgeId);

  const progress = await prisma.judgingProgress.findUnique({
    where: { judgeId_teamId: { judgeId, teamId } },
  });
  if (progress?.finalizedAt) {
    throw new JudgingError("Your review is finalized — it's locked.", "ALREADY_FINALIZED");
  }
  return team;
}

export async function saveScores(
  teamId: string,
  judgeId: string,
  values: { criterionId: string; value: number }[]
): Promise<void> {
  const team = await requireScoreable(teamId, judgeId);

  const rubric = await prisma.rubric.findUnique({ where: { eventId: team.event.id } });
  if (!rubric) throw new JudgingError("No rubric for this event.", "WRONG_STATE");
  const criteria = (rubric.criteria as unknown as Criterion[]) ?? [];
  const validIds = new Set(criteria.map((c) => c.id));
  for (const entry of values) {
    if (!validIds.has(entry.criterionId)) {
      throw new JudgingError("Unknown criterion in the submitted scores.", "WRONG_STATE");
    }
  }

  await prisma.$transaction(
    values.map((entry) =>
      prisma.score.upsert({
        where: {
          judgeId_teamId_criterionId: {
            judgeId,
            teamId,
            criterionId: entry.criterionId,
          },
        },
        create: { judgeId, teamId, ...entry },
        update: { value: entry.value },
      })
    )
  );
}

export async function addFeedback(
  teamId: string,
  judgeId: string,
  kind: FeedbackKind,
  point: string
): Promise<void> {
  await requireScoreable(teamId, judgeId);
  await prisma.feedback.create({ data: { judgeId, teamId, kind, point } });
}

export async function removeFeedback(feedbackId: string, judgeId: string): Promise<void> {
  const feedback = await prisma.feedback.findUnique({ where: { id: feedbackId } });
  if (!feedback || feedback.judgeId !== judgeId) return;
  const progress = await prisma.judgingProgress.findUnique({
    where: { judgeId_teamId: { judgeId, teamId: feedback.teamId } },
  });
  if (progress?.finalizedAt) return;
  await prisma.feedback.delete({ where: { id: feedbackId } });
}

/**
 * THE GATE (server-enforced): all criteria scored + one feedback point of
 * each kind (STRENGTH, IMPROVEMENT, NEXT_STEP) before finalization.
 */
export async function finalizeReview(teamId: string, judgeId: string): Promise<void> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { event: { select: { id: true, status: true } } },
  });
  if (!team) throw new JudgingError("Team not found.", "NOT_FOUND");
  if (team.event.status !== "JUDGING") {
    throw new JudgingError("Judging isn't open for this event.", "WRONG_STATE");
  }
  await requireActiveJudge(team.event.id, judgeId);

  const progress = await prisma.judgingProgress.findUnique({
    where: { judgeId_teamId: { judgeId, teamId } },
  });
  if (progress?.finalizedAt) {
    throw new JudgingError("Already finalized.", "ALREADY_FINALIZED");
  }

  const [rubric, scores, feedback] = await Promise.all([
    prisma.rubric.findUnique({ where: { eventId: team.event.id } }),
    prisma.score.findMany({ where: { judgeId, teamId } }),
    prisma.feedback.findMany({ where: { judgeId, teamId } }),
  ]);
  if (!rubric) throw new JudgingError("No rubric for this event.", "WRONG_STATE");

  const criteria = (rubric.criteria as unknown as Criterion[]) ?? [];
  const scoredIds = new Set(scores.map((score) => score.criterionId));
  const missing = criteria.filter((criterion) => !scoredIds.has(criterion.id));
  if (missing.length > 0) {
    throw new JudgingError(
      `Score every criterion first — missing: ${missing.map((m) => m.label).join(", ")}.`,
      "SCORES_INCOMPLETE"
    );
  }

  if (!feedbackGateSatisfied(feedback.map((f) => ({ kind: f.kind as FeedbackKind })))) {
    throw new JudgingError(
      "The structured-feedback gate requires one strength, one improvement, and one next step before finalizing.",
      "GATE_UNMET"
    );
  }

  await prisma.judgingProgress.upsert({
    where: { judgeId_teamId: { judgeId, teamId } },
    create: { judgeId, teamId, finalizedAt: new Date() },
    update: { finalizedAt: new Date() },
  });
}
