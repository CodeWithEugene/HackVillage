import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import {
  cancelEventAsAdmin,
  cancelEventAsOrganizer,
  EventCancelError,
} from "@/lib/events/cancel";

/**
 * Event cancellation (audit remediation): the organizer self-service matrix
 * (draft/unfunded only, never with a vault) and the admin cancel (audited
 * reason, pre-winners only, vault refund when money is locked).
 */
const TEST_KEY = `cancel-int-${Date.now().toString(36)}`;
const userIds: string[] = [];
const orgIds: string[] = [];

async function createUser(label: string, role: "DEVELOPER" | "ORGANIZER" = "DEVELOPER", admin = false) {
  const user = await prisma.user.create({
    data: {
      email: `${TEST_KEY}-${label}@hackvillage.test`,
      name: `Cancel ${label}`,
      handle: `${TEST_KEY}-${label}`.slice(-28),
      emailVerified: new Date(),
      primaryRole: role,
      onboardingCompletedAt: new Date(),
    },
  });
  userIds.push(user.id);
  if (admin) await prisma.roleGrant.create({ data: { userId: user.id, role: "ADMIN" } });
  return user;
}

async function createEvent(
  label: string,
  opts: {
    status: "DRAFT" | "PENDING_DEPOSIT" | "LIVE" | "IN_PROGRESS" | "JUDGING" | "WINNERS_ANNOUNCED";
    withVault?: "LOCKED" | "HALF_RELEASED";
    member?: "owner" | "outsider";
  } = { status: "DRAFT" }
) {
  const owner = await createUser(`${label}-own`, "ORGANIZER");
  const org = await prisma.organization.create({
    data: { name: `Cancel Org ${label}`, slug: `${TEST_KEY}-${label}`, ownerId: owner.id },
  });
  orgIds.push(org.id);
  await prisma.orgMember.create({ data: { orgId: org.id, userId: owner.id, role: "OWNER", status: "ACTIVE" } });
  const event = await prisma.event.create({
    data: {
      orgId: org.id,
      slug: `evt-${TEST_KEY}-${label}`,
      title: `Cancel Event ${label}`,
      venueType: "ONLINE",
      startsAt: new Date(Date.now() + 10 * 24 * 3600 * 1000),
      endsAt: new Date(Date.now() + 11 * 24 * 3600 * 1000),
      registrationDeadline: new Date(Date.now() + 9 * 24 * 3600 * 1000),
      problemStatement: "Integration test event for cancellation.",
      status: opts.status,
      publishedAt: opts.status === "DRAFT" ? null : new Date(),
    },
  });
  if (opts.withVault) {
    await prisma.vaultState.create({
      data: { eventId: event.id, amountKes: 100_000, chainState: opts.withVault },
    });
  }
  return { owner, org, event };
}

let adminId = "";
let outsiderId = "";

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  adminId = (await createUser("admin", "DEVELOPER", true)).id;
  outsiderId = (await createUser("outsider")).id;
});

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.roleGrant.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

describe("organizer self-service cancel", () => {
  it("cancels a DRAFT event (CANCELLED + audit)", async () => {
    const { owner, event } = await createEvent("draft");
    const { slug } = await cancelEventAsOrganizer({ eventId: event.id, userId: owner.id });
    expect(slug).toBe(event.slug);
    const stored = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
    expect(stored.status).toBe("CANCELLED");
    const audit = await prisma.auditLog.findFirst({
      where: { entityId: event.id, action: "event.cancelled" },
    });
    expect(audit).not.toBeNull();
  });

  it("cancels a PENDING_DEPOSIT (unfunded) event", async () => {
    const { owner, event } = await createEvent("pending", { status: "PENDING_DEPOSIT" });
    await cancelEventAsOrganizer({ eventId: event.id, userId: owner.id });
    expect((await prisma.event.findUniqueOrThrow({ where: { id: event.id } })).status).toBe(
      "CANCELLED"
    );
  });

  it("refuses non-members and plain members aren't org admins", async () => {
    const { event } = await createEvent("forbidden");
    await expect(
      cancelEventAsOrganizer({ eventId: event.id, userId: outsiderId })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses funded/live events — those take the admin refund path", async () => {
    const { owner, event } = await createEvent("live", { status: "LIVE" });
    await expect(
      cancelEventAsOrganizer({ eventId: event.id, userId: owner.id })
    ).rejects.toMatchObject({ code: "WRONG_STATE" });
  });

  it("refuses a draft that has a vault (money moved — manual unwind)", async () => {
    const { owner, event } = await createEvent("vaulted", { status: "DRAFT", withVault: "LOCKED" });
    await expect(
      cancelEventAsOrganizer({ eventId: event.id, userId: owner.id })
    ).rejects.toMatchObject({ code: "WRONG_STATE", message: expect.stringContaining("vault") });
  });
});

describe("admin cancel", () => {
  it("refuses non-admins", async () => {
    const { event } = await createEvent("notadmin", { status: "LIVE" });
    await expect(
      cancelEventAsAdmin({ eventId: event.id, adminId: outsiderId, reason: "policy violation" })
    ).rejects.toBeInstanceOf(EventCancelError);
  });

  it("refuses post-winners events", async () => {
    const { event } = await createEvent("announced", { status: "WINNERS_ANNOUNCED" });
    await expect(
      cancelEventAsAdmin({ eventId: event.id, adminId, reason: "too late" })
    ).rejects.toMatchObject({ code: "WRONG_STATE" });
  });

  it("cancels a LIVE event with a LOCKED vault: CANCELLED + audit + vault REFUNDED", async () => {
    const { event } = await createEvent("adminrefund", { status: "LIVE", withVault: "LOCKED" });
    const result = await cancelEventAsAdmin({
      eventId: event.id,
      adminId,
      reason: "Organizer violated the code of conduct.",
    });
    expect(result.refunded).toBe(true);

    const stored = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
    expect(stored.status).toBe("CANCELLED");
    const audit = await prisma.auditLog.findFirst({
      where: { entityId: event.id, action: "event.admin-cancelled" },
    });
    expect(audit).not.toBeNull();
    const vault = await prisma.vaultState.findUniqueOrThrow({ where: { eventId: event.id } });
    expect(vault.chainState).toBe("REFUNDED");
  });

  it("cancels a JUDGING event without a vault (no refund)", async () => {
    const { event } = await createEvent("judging", { status: "JUDGING" });
    const result = await cancelEventAsAdmin({ eventId: event.id, adminId, reason: "no show" });
    expect(result.refunded).toBe(false);
    expect((await prisma.event.findUniqueOrThrow({ where: { id: event.id } })).status).toBe(
      "CANCELLED"
    );
  });
});
