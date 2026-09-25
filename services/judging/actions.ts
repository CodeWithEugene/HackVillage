"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import {
  feedbackPointSchema,
  rubricSchema,
  scoreValueSchema,
  type Criterion,
} from "@/lib/judging/compute";
import {
  JudgingError,
  addFeedback as addFeedbackService,
  finalizeReview,
  inviteJudge as inviteJudgeService,
  openJudging as openJudgingService,
  removeFeedback,
  removeJudge,
  respondToInvite,
  saveRubric as saveRubricService,
  saveScores as saveScoresService,
} from "@/services/judging/service";

export interface JudgingActionState {
  error?: string;
  message?: string;
}

function toState(error: unknown): JudgingActionState {
  if (error instanceof JudgingError) return { error: error.message };
  console.error("[judging] action failed", error);
  return { error: "Something went wrong. Try again in a moment." };
}

// ── Organizer ────────────────────────────────────────────────────────────

export async function inviteJudgeAction(
  _prev: JudgingActionState,
  formData: FormData
): Promise<JudgingActionState> {
  const user = await requireUser();
  const eventId = z.string().cuid().safeParse(String(formData.get("eventId") ?? ""));
  const handle = z
    .string()
    .trim()
    .min(3)
    .max(30)
    .safeParse(String(formData.get("handle") ?? "").replace(/^@/, ""));
  if (!eventId.success || !handle.success) return { error: "Check the invite details." };

  try {
    await inviteJudgeService(eventId.data, user.id, handle.data);
    const event = await prisma.event.findUnique({
      where: { id: eventId.data },
      select: { slug: true },
    });
    if (event) revalidatePath(`/organizer/hackathons/${event.slug}/judges`);
    return { message: "Invite sent." };
  } catch (error) {
    return toState(error);
  }
}

export async function revokeJudgeAssignmentAction(assignmentId: string): Promise<void> {
  const user = await requireUser();
  try {
    const assignment = await prisma.judgeAssignment.findUnique({
      where: { id: assignmentId },
      include: { event: { select: { slug: true } } },
    });
    await removeJudge(assignmentId, user.id);
    if (assignment) revalidatePath(`/organizer/hackathons/${assignment.event.slug}/judges`);
  } catch (error) {
    console.error("[judging] revoke failed", error);
  }
}

export async function saveRubricAction(
  _prev: JudgingActionState,
  formData: FormData
): Promise<JudgingActionState> {
  const user = await requireUser();
  const eventId = z.string().cuid().safeParse(String(formData.get("eventId") ?? ""));
  if (!eventId.success) return { error: "Unknown hackathon." };

  let criteria: unknown;
  try {
    criteria = JSON.parse(String(formData.get("criteria") ?? "[]"));
  } catch {
    return { error: "The rubric didn't submit correctly. Try again." };
  }

  const parsed = rubricSchema.safeParse(criteria);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the rubric and try again." };
  }

  try {
    await saveRubricService(eventId.data, user.id, parsed.data as Criterion[]);
    const event = await prisma.event.findUnique({
      where: { id: eventId.data },
      select: { slug: true },
    });
    if (event) revalidatePath(`/organizer/hackathons/${event.slug}/rubric`);
    return { message: "Rubric saved." };
  } catch (error) {
    return toState(error);
  }
}

export async function openJudgingAction(eventId: string): Promise<JudgingActionState> {
  const user = await requireUser();
  try {
    await openJudgingService(eventId, user.id);
    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { slug: true } });
    if (event) {
      revalidatePath(`/organizer/hackathons/${event.slug}`);
      revalidatePath("/hackathons");
    }
    return {};
  } catch (error) {
    return toState(error);
  }
}

// ── Judge ────────────────────────────────────────────────────────────────

export async function respondToJudgeInviteAction(
  assignmentId: string,
  accept: boolean
): Promise<void> {
  const user = await requireUser();
  try {
    await respondToInvite(assignmentId, user.id, accept);
  } catch (error) {
    console.error("[judging] invite response failed", error);
  }
  revalidatePath("/judge");
  if (accept) {
    const assignment = await prisma.judgeAssignment.findUnique({
      where: { id: assignmentId },
      include: { event: { select: { slug: true } } },
    });
    if (assignment) redirect(`/judge/hackathons/${assignment.event.slug}`);
  }
}

export async function saveScoresAction(
  _prev: JudgingActionState,
  formData: FormData
): Promise<JudgingActionState> {
  const user = await requireUser();
  const teamId = z.string().cuid().safeParse(String(formData.get("teamId") ?? ""));
  if (!teamId.success) return { error: "Unknown team." };

  const team = await prisma.team.findUnique({
    where: { id: teamId.data },
    include: { event: { select: { id: true, slug: true } } },
  });
  if (!team) return { error: "Unknown team." };

  const rubric = await prisma.rubric.findUnique({ where: { eventId: team.event.id } });
  if (!rubric) return { error: "No rubric for this hackathon." };
  const criteria = (rubric.criteria as unknown as Criterion[]) ?? [];

  const values: { criterionId: string; value: number }[] = [];
  for (const criterion of criteria) {
    const raw = formData.get(`score-${criterion.id}`);
    if (raw === null) continue; // untouched criteria keep existing values
    const parsed = scoreValueSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: `Score for “${criterion.label}” must be a whole number from 0 to 10.` };
    }
    values.push({ criterionId: criterion.id, value: parsed.data });
  }

  try {
    await saveScoresService(teamId.data, user.id, values);
    revalidatePath(`/judge/hackathons/${team.event.slug}/teams/${team.id}`);
    return { message: "Scores saved." };
  } catch (error) {
    return toState(error);
  }
}

export async function saveFeedbackAction(
  _prev: JudgingActionState,
  formData: FormData
): Promise<JudgingActionState> {
  const user = await requireUser();
  const teamId = z.string().cuid().safeParse(String(formData.get("teamId") ?? ""));
  const kind = z.enum(["STRENGTH", "IMPROVEMENT", "NEXT_STEP"]).safeParse(
    String(formData.get("kind") ?? "")
  );
  const point = feedbackPointSchema.safeParse(String(formData.get("point") ?? ""));
  if (!teamId.success || !kind.success || !point.success) {
    return { error: point.error?.issues[0]?.message ?? "Check the feedback and try again." };
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId.data },
    include: { event: { select: { slug: true } } },
  });
  if (!team) return { error: "Unknown team." };

  try {
    await addFeedbackService(teamId.data, user.id, kind.data, point.data);
    revalidatePath(`/judge/hackathons/${team.event.slug}/teams/${team.id}`);
    return { message: "Feedback added." };
  } catch (error) {
    return toState(error);
  }
}

export async function deleteFeedbackAction(feedbackId: string): Promise<void> {
  const user = await requireUser();
  const feedback = await prisma.feedback.findUnique({
    where: { id: feedbackId },
    include: { team: { include: { event: { select: { slug: true } } } } },
  });
  await removeFeedback(feedbackId, user.id);
  if (feedback) {
    revalidatePath(`/judge/hackathons/${feedback.team.event.slug}/teams/${feedback.teamId}`);
  }
}

export async function finalizeTeamAction(teamId: string): Promise<JudgingActionState> {
  const user = await requireUser();
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { event: { select: { slug: true } } },
  });
  if (!team) return { error: "Unknown team." };

  try {
    await finalizeReview(teamId, user.id);
    revalidatePath(`/judge/hackathons/${team.event.slug}`);
    revalidatePath(`/judge/hackathons/${team.event.slug}/teams/${teamId}`);
    return { message: "Review finalized." };
  } catch (error) {
    return toState(error);
  }
}
