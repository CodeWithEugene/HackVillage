"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { submissionWindowOpen } from "@/lib/events/lifecycle";
import { validateSplit, validRepoUrl, type SplitEntry } from "@/lib/events/submission";
import { sendNotification } from "@/lib/notifications/send";
import { submissionSavedEmail } from "@/lib/notifications/templates/teams";
import { appUrl } from "@/lib/url";

export interface SubmissionActionState {
  error?: string;
  message?: string;
}

const submissionSchema = z.object({
  teamId: z.string().cuid(),
  repoUrl: z.string().trim().min(8),
  demoUrl: z
    .string()
    .trim()
    .url("The demo link must be a full URL.")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
  description: z.string().trim().min(40, "Describe the project in at least 40 characters.").max(6000),
  split: z.string(),
});

/**
 * Save the team's submission (create or update) inside the submission window.
 * Any JOINED member may save; the whole team sees one submission (§7.4).
 * Split declaration is validated per ADR-013 and stored for payouts (Phase 5).
 */
export async function saveSubmissionAction(
  _prev: SubmissionActionState,
  formData: FormData
): Promise<SubmissionActionState> {
  const user = await requireUser();
  const parsed = submissionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the submission and try again." };
  }
  const { teamId, repoUrl, demoUrl, description } = parsed.data;

  const repoError = validRepoUrl(repoUrl);
  if (repoError) return { error: repoError };

  let split: SplitEntry[];
  try {
    const parsedSplit = z
      .array(z.object({ userId: z.string(), percent: z.coerce.number() }))
      .safeParse(JSON.parse(parsed.data.split));
    if (!parsedSplit.success) return { error: "The split declaration didn't submit correctly." };
    split = parsedSplit.data;
  } catch {
    return { error: "The split declaration didn't submit correctly." };
  }

  const membership = await prisma.teamMember.findFirst({
    where: { teamId, userId: user.id, status: "JOINED" },
    include: {
      team: {
        include: {
          event: true,
          members: { include: { user: { select: { id: true, email: true } } } },
          submission: true,
        },
      },
    },
  });
  if (!membership) return { error: "Only team members can submit for this team." };

  const { team } = membership;
  if (!submissionWindowOpen(team.event)) {
    return { error: "The submission window has closed for this hackathon." };
  }

  const memberIds = team.members
    .filter((m) => m.status === "JOINED")
    .map((m) => m.userId);
  const splitDecision = validateSplit(split, memberIds);
  if (!splitDecision.ok) return { error: splitDecision.reason! };

  if (team.submission) {
    await prisma.submission.update({
      where: { id: team.submission.id },
      // InputJsonValue cast: the split was JSON.parse'd, so it is plain JSON —
      // TS just can't see the index signature through the SplitEntry type.
      data: {
        repoUrl,
        demoUrl,
        description,
        splitDeclaration: split as unknown as Prisma.InputJsonValue,
      },
    });
  } else {
    await prisma.submission.create({
      data: {
        teamId,
        repoUrl,
        demoUrl,
        description,
        splitDeclaration: split as unknown as Prisma.InputJsonValue,
      },
    });
  }

  const workspaceUrl = appUrl(`/hackathons/${team.event.slug}/workspace`);
  for (const member of team.members.filter((m) => m.status === "JOINED")) {
    await sendNotification({
      userId: member.user.id,
      to: member.user.email,
      category: "teamActivity",
      template: submissionSavedEmail(team.name, team.event.title, workspaceUrl),
    });
  }

  revalidatePath(`/hackathons/${team.event.slug}/workspace`);
  return { message: "Submission saved." };
}
