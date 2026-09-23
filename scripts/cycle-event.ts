/**
 * Dev utility — drive the seeded fintech event through judging → winners →
 * payouts, exercising the real service paths in simulation mode.
 *
 *   npm run dev:cycle -- fintech-for-matatu-culture
 */
import { prisma } from "@/lib/db";
import {
  JudgingError,
  openJudging,
  saveScores,
  addFeedback,
  finalizeReview,
} from "@/services/judging/service";
import { announceWinners, executePayout, confirmMilestone } from "@/services/payout/service";
import { DEFAULT_RUBRIC } from "@/lib/judging/compute";
import { computeEventResults } from "@/services/judging/results";

async function main(): Promise<void> {
  const slug = process.argv[2] ?? "fintech-for-matatu-culture";
  const event = await prisma.event.findFirst({
    where: { slug },
    include: {
      org: { include: { members: { where: { role: "OWNER", status: "ACTIVE" } } } },
      judges: { where: { status: "ACTIVE" } },
      teams: {
        where: { status: { not: "DISBANDED" }, submission: { isNot: null } },
        include: { leader: { include: { profile: true } } },
      },
    },
  });
  if (!event) throw new Error("event not found");
  const organizerId = event.org.members[0]?.userId;
  if (!organizerId) throw new Error("no organizer");

  // 1. Open judging.
  await openJudging(event.id, organizerId);
  console.log("✓ judging opened");

  // 2. Every active judge scores + feedbacks + finalizes every team.
  for (const judge of event.judges) {
    for (const team of event.teams) {
      await saveScores(
        team.id,
        judge.userId,
        DEFAULT_RUBRIC.map((c) => ({ criterionId: c.id, value: 8 }))
      );
      await addFeedback(team.id, judge.userId, "STRENGTH", "Offline-first approach was excellent throughout.");
      await addFeedback(team.id, judge.userId, "IMPROVEMENT", "The USSD fallback needs error handling for retries.");
      await addFeedback(team.id, judge.userId, "NEXT_STEP", "Add a pilot with one matatu crew before scaling.");
      await finalizeReview(team.id, judge.userId);
    }
  }
  console.log(`✓ ${event.judges.length} judge(s) finalized ${event.teams.length} team(s)`);

  // 3. Recipient for team leaders lacking one.
  for (const team of event.teams) {
    if (!team.leader.profile?.payoutRecipientCode) {
      const { savePayoutRecipient } = await import("@/services/payout/service");
      await savePayoutRecipient(team.leaderId, {
        type: "MPESA",
        name: team.leader.name ?? "Leader",
        accountNumber: "254712345678",
      });
      console.log(`✓ recipient for @${team.leader.handle}`);
    }
  }

  // 4. Results → placements.
  const results = await computeEventResults(event.id);
  if (!results || results.results.length === 0) throw new Error("no results");
  const placements = results.results
    .sort((a, b) => a.weightedScore - b.weightedScore)
    .map((result, index) => ({ place: index + 1, teamId: result.teamId }));
  console.log("✓ placements:", JSON.stringify(placements.map((p) => p.place)));

  // 5. Announce + pay.
  await announceWinners({ eventId: event.id, organizerId, placements });
  console.log("✓ winners announced");

  const payouts = await prisma.payout.findMany({
    where: { winner: { eventId: event.id }, tranche: "INSTANT" },
  });
  for (const payout of payouts) {
    const result = await executePayout(payout.id);
    console.log(`✓ instant payout ${payout.id.slice(-6)} → ${result.outcome}`);
  }

  // 6. Milestones.
  const winners = await prisma.winner.findMany({ where: { eventId: event.id } });
  for (const winner of winners) {
    if (winner.milestoneRequired) {
      const result = await confirmMilestone(winner.id, organizerId);
      if (result.outcome === "queued") {
        const payout = await prisma.payout.findUnique({
          where: { idempotencyKey: `${winner.id}:MILESTONE` },
        });
        if (payout) {
          const executed = await executePayout(payout.id);
          console.log(`✓ milestone payout ${payout.id.slice(-6)} → ${executed.outcome}`);
        }
      }
    }
  }

  // 7. Final state.
  const [finalEvent, vault] = await Promise.all([
    prisma.event.findUnique({ where: { id: event.id } }),
    prisma.vaultState.findUnique({ where: { eventId: event.id } }),
  ]);
  console.log(
    `FINAL: event=${finalEvent?.status} vault=${vault?.chainState} paid=${await prisma.payout.count({ where: { winner: { eventId: event.id }, status: "SUCCEEDED" } })}`
  );
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((error) => {
  if (error instanceof JudgingError) {
    console.error(`JudgingError (${error.code}): ${error.message}`);
  } else {
    console.error(error);
  }
  process.exit(1);
});
