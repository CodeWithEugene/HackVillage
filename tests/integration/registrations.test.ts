import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { setRegistrationStatus } from "@/lib/events/registrations";

/**
 * Registration transitions: the receipt emails (in the action layer) send
 * only when `changed` is true — so re-clicks, double submits, and repeat
 * cancels must all be no-op transitions.
 */
const TEST_KEY = `reg-int-${Date.now().toString(36)}`;
const userIds: string[] = [];
let eventId = "";

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const owner = await prisma.user.create({
    data: {
      email: `${TEST_KEY}-owner@hackvillage.test`,
      name: "Reg Owner",
      handle: `${TEST_KEY}-o`.slice(-28),
      emailVerified: new Date(),
      primaryRole: "ORGANIZER",
      onboardingCompletedAt: new Date(),
    },
  });
  userIds.push(owner.id);
  const org = await prisma.organization.create({
    data: { name: `Reg Org ${TEST_KEY}`, slug: TEST_KEY, ownerId: owner.id },
  });
  const event = await prisma.event.create({
    data: {
      orgId: org.id,
      slug: `evt-${TEST_KEY}`,
      title: "Registration Transitions Event",
      venueType: "ONLINE",
      startsAt: new Date(Date.now() + 10 * 24 * 3600 * 1000),
      endsAt: new Date(Date.now() + 11 * 24 * 3600 * 1000),
      registrationDeadline: new Date(Date.now() + 9 * 24 * 3600 * 1000),
      problemStatement: "Integration test event for registration transitions.",
      status: "LIVE",
      publishedAt: new Date(),
    },
  });
  eventId = event.id;
  const user = await prisma.user.create({
    data: {
      email: `${TEST_KEY}-dev@hackvillage.test`,
      name: "Reg Dev",
      handle: `${TEST_KEY}-d`.slice(-28),
      emailVerified: new Date(),
      primaryRole: "DEVELOPER",
      onboardingCompletedAt: new Date(),
    },
  });
  userIds.push(user.id);
});

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { slug: TEST_KEY } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

describe("setRegistrationStatus transitions", () => {
  it("register → changed; register again → no-op (no duplicate receipt)", async () => {
    const userId = userIds[1]!;
    expect(await setRegistrationStatus({ eventId, userId, status: "REGISTERED" })).toEqual({
      changed: true,
    });
    expect(await setRegistrationStatus({ eventId, userId, status: "REGISTERED" })).toEqual({
      changed: false,
    });
    // Double-click race: both clickers await; the second create hits P2002
    // then the conditional flip is a no-op.
    const [a, b] = await Promise.all([
      setRegistrationStatus({ eventId, userId, status: "REGISTERED" }),
      setRegistrationStatus({ eventId, userId, status: "REGISTERED" }),
    ]);
    expect(a.changed || b.changed).toBe(false);
  });

  it("cancel → changed; cancel again → no-op", async () => {
    const userId = userIds[1]!;
    expect(await setRegistrationStatus({ eventId, userId, status: "CANCELLED" })).toEqual({
      changed: true,
    });
    expect(await setRegistrationStatus({ eventId, userId, status: "CANCELLED" })).toEqual({
      changed: false,
    });
    const row = await prisma.registration.findFirst({ where: { eventId, userId } });
    expect(row?.status).toBe("CANCELLED");
  });

  it("re-registering after a cancel is a real transition again", async () => {
    const userId = userIds[1]!;
    expect(await setRegistrationStatus({ eventId, userId, status: "REGISTERED" })).toEqual({
      changed: true,
    });
    const row = await prisma.registration.findFirst({ where: { eventId, userId } });
    expect(row?.status).toBe("REGISTERED");
  });

  it("cancelling a never-registered user is a no-op, not a row creation", async () => {
    const fresh = await prisma.user.create({
      data: {
        email: `${TEST_KEY}-fresh@hackvillage.test`,
        name: "Reg Fresh",
        handle: `${TEST_KEY}-f`.slice(-28),
        primaryRole: "DEVELOPER",
      },
    });
    userIds.push(fresh.id);
    expect(await setRegistrationStatus({ eventId, userId: fresh.id, status: "CANCELLED" })).toEqual({
      changed: false,
    });
    expect(await prisma.registration.findFirst({ where: { eventId, userId: fresh.id } })).toBeNull();
  });
});
