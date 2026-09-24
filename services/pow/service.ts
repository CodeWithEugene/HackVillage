import { prisma } from "@/lib/db";
import { sendNotification } from "@/lib/notifications/send";
import {
  endorsementReceivedEmail,
  introductionAcceptedDeveloperEmail,
  introductionAcceptedPartnerEmail,
  introductionDeclinedPartnerEmail,
  introductionRequestedEmail,
} from "@/lib/notifications/templates/hiring";
import { appUrl } from "@/lib/url";

/**
 * Proof-of-Work service (Phase 6). Every metric derives from platform-
 * verified events — never self-reported (plan §6.6). The portfolio
 * materializes automatically when winners are announced; endorsements are
 * written by judges post-judging; introductions connect hiring partners to
 * verified winners.
 */

export class PowError extends Error {
  constructor(
    message: string,
    public code:
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "WRONG_STATE"
      | "ALREADY_EXISTS"
      | "NOT_A_JUDGE"
      | "NOT_A_WINNER"
  ) {
    super(message);
  }
}

// ── Portfolio sync (on winner announcement) ──────────────────────────────

/**
 * Materialize a portfolio item for a winning team's submission, attributed
 * to the team leader (ADR-013 recipient). Idempotent (unique submissionId).
 */
export async function materializePortfolioForWinner(winnerId: string): Promise<number> {
  const winner = await prisma.winner.findUnique({
    where: { id: winnerId },
    include: {
      team: { include: { submission: true } },
    },
  });
  if (!winner || !winner.team.submission) return 0;

  const submission = winner.team.submission;
  const existing = await prisma.portfolioItem.findUnique({
    where: { submissionId: submission.id },
  });
  if (existing) return 0;

  await prisma.portfolioItem.create({
    data: {
      submissionId: submission.id,
      developerId: winner.userId, // the leader — authorship credited per the declared split
      title: `${winner.team.name} — winning submission`,
      summary: submission.description.slice(0, 300),
      repoUrl: submission.repoUrl,
      demoUrl: submission.demoUrl,
      lifecycle: "DEMO",
    },
  });
  return 1;
}

// ── Endorsements (judges endorse winners) ───────────────────────────────

export async function createEndorsement(input: {
  judgeId: string;
  developerId: string;
  eventId: string;
  quote: string;
}): Promise<void> {
  const [judgeAssignment, winnerExists] = await Promise.all([
    prisma.judgeAssignment.findFirst({
      where: { eventId: input.eventId, userId: input.judgeId, status: "ACTIVE" },
    }),
    prisma.winner.findFirst({
      where: { eventId: input.eventId, userId: input.developerId },
      select: { id: true },
    }),
  ]);
  if (!judgeAssignment) {
    throw new PowError("Only this event's judges can endorse its winners.", "NOT_A_JUDGE");
  }
  if (!winnerExists) {
    throw new PowError("Endorsements attach to verified winners of the event.", "NOT_A_WINNER");
  }

  const existing = await prisma.endorsement.findUnique({
    where: {
      judgeId_developerId_eventId: {
        judgeId: input.judgeId,
        developerId: input.developerId,
        eventId: input.eventId,
      },
    },
  });
  if (existing) {
    throw new PowError("You already endorsed this developer for this event.", "ALREADY_EXISTS");
  }

  await prisma.endorsement.create({
    data: {
      judgeId: input.judgeId,
      developerId: input.developerId,
      eventId: input.eventId,
      quote: input.quote,
    },
  });

  const [developer, event] = await Promise.all([
    prisma.user.findUnique({ where: { id: input.developerId }, select: { handle: true, email: true } }),
    prisma.event.findUnique({ where: { id: input.eventId }, select: { title: true } }),
  ]);
  if (developer && event) {
    await sendNotification({
      userId: input.developerId,
      to: developer.email,
      category: "hiring",
      template: endorsementReceivedEmail(event.title, appUrl(`/developers/${developer.handle}`)),
    }).catch((error: unknown) => console.error("[pow] endorsement notification failed", error));
  }
}

export async function setEndorsementVisibility(
  endorsementId: string,
  developerId: string,
  visible: boolean
): Promise<void> {
  const endorsement = await prisma.endorsement.findUnique({ where: { id: endorsementId } });
  if (!endorsement || endorsement.developerId !== developerId) {
    throw new PowError("Endorsement not found.", "NOT_FOUND");
  }
  await prisma.endorsement.update({
    where: { id: endorsementId },
    data: { visibility: visible ? "PUBLISHED" : "HIDDEN" },
  });
}

// ── Verified PoW metrics (public profile numbers) ───────────────────────

export interface PowMetrics {
  eventsParticipated: number;
  wins: number;
  winRate: number | null;
  totalWonKes: number;
  endorsementCount: number;
  portfolioCount: number;
}

export async function computePowMetrics(developerId: string): Promise<PowMetrics> {
  const [participated, wins, endorsements, portfolio] = await Promise.all([
    prisma.registration.count({
      where: {
        userId: developerId,
        status: { not: "CANCELLED" },
        event: { status: { in: ["SETTLED", "WINNERS_ANNOUNCED", "JUDGING"] } },
      },
    }),
    prisma.winner.findMany({
      where: { userId: developerId },
      select: { amountKes: true },
    }),
    prisma.endorsement.count({
      where: { developerId, visibility: "PUBLISHED" },
    }),
    prisma.portfolioItem.count({ where: { developerId } }),
  ]);

  const winCount = wins.length;
  const totalWonKes = wins.reduce((sum, win) => sum + win.amountKes, 0);
  return {
    eventsParticipated: participated,
    wins: winCount,
    winRate: participated > 0 ? Math.round((winCount / participated) * 1000) / 10 : null,
    totalWonKes,
    endorsementCount: endorsements,
    portfolioCount: portfolio,
  };
}

// ── Hiring partners & introductions ─────────────────────────────────────

export async function becomeHiringPartner(userId: string, companyName: string): Promise<void> {
  const existing = await prisma.roleGrant.findFirst({ where: { userId, role: "HIRING" } });
  if (existing) return;
  await prisma.$transaction([
    prisma.roleGrant.create({ data: { userId, role: "HIRING" } }),
    prisma.developerProfile.upsert({
      where: { userId },
      create: { userId, headline: `Hiring partner — ${companyName}` },
      update: {},
    }),
    // Track the partner's company on their profile via headline (lightweight
    // v1; a dedicated HiringPartner org model arrives with v1.1 depth).
  ]);
}

export async function requestIntroduction(input: {
  partnerId: string;
  developerId: string;
  eventId: string;
  message: string;
}): Promise<void> {
  const grant = await prisma.roleGrant.findFirst({
    where: { userId: input.partnerId, role: "HIRING" },
  });
  if (!grant) {
    throw new PowError("Join as a hiring partner first.", "FORBIDDEN");
  }

  const winner = await prisma.winner.findFirst({
    where: { eventId: input.eventId, userId: input.developerId },
  });
  if (!winner) {
    throw new PowError("Introductions anchor on verified winners.", "NOT_A_WINNER");
  }

  const existing = await prisma.introduction.findUnique({
    where: {
      hiringPartnerId_developerId_eventId: {
        hiringPartnerId: input.partnerId,
        developerId: input.developerId,
        eventId: input.eventId,
      },
    },
  });
  if (existing && existing.status === "REQUESTED") {
    throw new PowError("You already have a pending intro request here.", "ALREADY_EXISTS");
  }
  if (existing) {
    throw new PowError("This introduction already exists.", "ALREADY_EXISTS");
  }

  await prisma.introduction.create({
    data: {
      hiringPartnerId: input.partnerId,
      developerId: input.developerId,
      eventId: input.eventId,
      message: input.message,
    },
  });

  const [partner, developer, event] = await Promise.all([
    prisma.user.findUnique({ where: { id: input.partnerId }, select: { name: true, email: true } }),
    prisma.user.findUnique({ where: { id: input.developerId }, select: { email: true } }),
    prisma.event.findUnique({ where: { id: input.eventId }, select: { title: true } }),
  ]);
  if (partner && developer && event) {
    await sendNotification({
      userId: input.developerId,
      to: developer.email,
      category: "hiring",
      template: introductionRequestedEmail(partner.name ?? "A hiring partner", event.title, appUrl("/dashboard/intros")),
    }).catch((error: unknown) => console.error("[pow] introduction notification failed", error));
  }
}

export async function respondToIntroduction(
  introductionId: string,
  developerId: string,
  accept: boolean
): Promise<void> {
  const introduction = await prisma.introduction.findUnique({
    where: { id: introductionId },
    include: {
      hiringPartner: { select: { id: true, name: true, email: true } },
      developer: { select: { name: true, handle: true } },
      event: { select: { title: true } },
    },
  });
  if (!introduction || introduction.developerId !== developerId) {
    throw new PowError("Introduction not found.", "NOT_FOUND");
  }
  if (introduction.status !== "REQUESTED") {
    throw new PowError("This introduction was already handled.", "WRONG_STATE");
  }

  await prisma.introduction.update({
    where: { id: introductionId },
    data: {
      status: accept ? "ACCEPTED" : "DECLINED",
      respondedAt: new Date(),
    },
  });

  const developerName = introduction.developer.name ?? introduction.developer.handle;
  if (accept) {
    const developerContact = await prisma.user.findUnique({
      where: { id: developerId },
      select: { email: true },
    });
    if (!developerContact) return;

    await sendNotification({
      userId: developerId,
      to: developerContact.email,
      category: "hiring",
      template: introductionAcceptedDeveloperEmail(
        introduction.hiringPartner.name ?? "The hiring partner",
        introduction.hiringPartner.email,
        introduction.event.title
      ),
    }).catch((error: unknown) => console.error("[pow] intro accepted developer email failed", error));

    await sendNotification({
      userId: introduction.hiringPartner.id,
      to: introduction.hiringPartner.email,
      category: "hiring",
      template: introductionAcceptedPartnerEmail(developerName, developerContact.email, introduction.event.title),
    }).catch((error: unknown) => console.error("[pow] intro accepted partner email failed", error));
  } else {
    await sendNotification({
      userId: introduction.hiringPartner.id,
      to: introduction.hiringPartner.email,
      category: "hiring",
      template: introductionDeclinedPartnerEmail(developerName),
    }).catch((error: unknown) => console.error("[pow] intro declined email failed", error));
  }
}

/** Contact exchange happens on acceptance — emails flow both ways. */
export async function acceptedIntroductionContacts(
  developerId: string
): Promise<{ partnerEmail: string; partnerName: string | null; message: string; eventTitle: string }[]> {
  const introductions = await prisma.introduction.findMany({
    where: { developerId, status: "ACCEPTED" },
    include: {
      hiringPartner: { select: { email: true, name: true } },
      event: { select: { title: true } },
    },
    orderBy: { respondedAt: "desc" },
  });
  return introductions.map((intro) => ({
    partnerEmail: intro.hiringPartner.email,
    partnerName: intro.hiringPartner.name,
    message: intro.message,
    eventTitle: intro.event.title,
  }));
}
