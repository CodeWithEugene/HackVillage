import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { getPaystackPort } from "@/lib/ports/paystack";
import { executePayout } from "@/services/payout/service";

/**
 * Money-path race and retry fixes: a transfer request that throws (timeout,
 * dropped connection) must never be retried under a new reference unless the
 * provider confirms the first attempt is dead.
 */

const KEY = `payamb-int-${Date.now().toString(36)}`;
const DAY = 24 * 60 * 60 * 1000;
const userIds: string[] = [];
let orgId = "";
let eventId = "";
let winnerId = "";

async function user(label: string) {
  const created = await prisma.user.create({
    data: {
      email: `${KEY}-${label}@payouts.example.net`,
      name: `Payout ${label}`,
      handle: `${KEY}-${label}`.slice(-28),
      emailVerified: new Date(),
      primaryRole: "DEVELOPER",
      onboardingCompletedAt: new Date(),
    },
  });
  userIds.push(created.id);
  return created.id;
}

async function freshPayout(label: string) {
  return prisma.payout.create({
    data: {
      winnerId,
      tranche: "INSTANT",
      amountKes: 10_000,
      idempotencyKey: `${winnerId}:${label}`,
      recipientCode: "RCP_SIM_AMBIGUOUS",
      status: "QUEUED",
    },
  });
}

beforeAll(async () => {
  const owner = await user("owner");
  const leader = await user("leader");
  const org = await prisma.organization.create({ data: { name: "Ambiguous Org", slug: KEY, ownerId: owner } });
  orgId = org.id;
  const now = Date.now();
  const event = await prisma.event.create({
    data: {
      orgId,
      slug: `${KEY}-event`,
      title: "Ambiguous Payout Test",
      venueType: "ONLINE",
      startsAt: new Date(now - 3 * DAY),
      endsAt: new Date(now - DAY),
      registrationDeadline: new Date(now - 4 * DAY),
      status: "WINNERS_ANNOUNCED",
      publishedAt: new Date(),
      prizeVerifiedAt: new Date(),
    },
  });
  eventId = event.id;
  const team = await prisma.team.create({
    data: { eventId, name: "Ambiguous Team", leaderId: leader, inviteCode: KEY.slice(-10) },
  });
  const winner = await prisma.winner.create({
    data: { eventId, teamId: team.id, place: 1, userId: leader, amountKes: 20_000 },
  });
  winnerId = winner.id;
});

beforeEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  vi.restoreAllMocks();
  await prisma.payout.deleteMany({ where: { winnerId } });
  await prisma.winner.deleteMany({ where: { eventId } });
  await prisma.team.deleteMany({ where: { eventId } });
  await prisma.event.deleteMany({ where: { id: eventId } });
  await prisma.organization.deleteMany({ where: { id: orgId } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("executePayout after the transfer request throws", () => {
  it("confirms instead of paying again when the provider says the first attempt succeeded", async () => {
    const payout = await freshPayout("a");
    const port = getPaystackPort();
    const initiate = vi.spyOn(port, "initiateTransfer").mockRejectedValue(new Error("socket hang up"));
    vi.spyOn(port, "transferStatus").mockResolvedValue({ status: "success" });

    const result = await executePayout(payout.id);

    expect(result.outcome).toBe("succeeded");
    expect(initiate).toHaveBeenCalledTimes(1);
    const after = await prisma.payout.findUniqueOrThrow({ where: { id: payout.id } });
    expect(after.status).toBe("SUCCEEDED");
    expect(after.paystackReference).toBe(`trf-${payout.id.toLowerCase()}-1`);
  });

  it("fails into the normal retry path when the provider has no record of the attempt", async () => {
    const payout = await freshPayout("c");
    const port = getPaystackPort();
    vi.spyOn(port, "initiateTransfer").mockRejectedValue(new Error("ECONNRESET"));
    vi.spyOn(port, "transferStatus").mockResolvedValue({ status: "not_found" });

    const result = await executePayout(payout.id);

    expect(result.outcome).toBe("failed");
    const after = await prisma.payout.findUniqueOrThrow({ where: { id: payout.id } });
    expect(after.status).not.toBe("PROCESSING");
    expect(after.status).not.toBe("SUCCEEDED");
    expect(after.attemptCount).toBe(1);
  });

  it("holds the payout when the provider can't be asked, instead of retrying blind", async () => {
    const payout = await freshPayout("b");
    const port = getPaystackPort();
    vi.spyOn(port, "initiateTransfer").mockRejectedValue(new Error("ETIMEDOUT"));
    vi.spyOn(port, "transferStatus").mockResolvedValue({ status: "unknown" });

    const result = await executePayout(payout.id);

    expect(result.outcome).toBe("processing");
    const after = await prisma.payout.findUniqueOrThrow({ where: { id: payout.id } });
    expect(after.status).toBe("PROCESSING");
    expect(after.attemptCount).toBe(1);
    expect(after.paystackReference).toBe(`trf-${payout.id.toLowerCase()}-1`);
    expect(after.lastError).toContain("Ambiguous transfer error (unknown)");
    // A replayed job must stand down rather than start a second transfer.
    expect((await executePayout(payout.id)).outcome).toBe("duplicate");
  });
});
