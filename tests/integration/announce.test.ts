import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { announceHackathonToBuilders, HACKATHON_LIVE_NOTIFICATION } from "@/lib/events/announce";

/**
 * The "new Prize Verified hackathon" alert: verified builders with hackathon
 * updates on hear about it once; opted-out builders, the host's own team,
 * demo accounts, unverified emails and demo hackathons never do.
 */

const KEY = `announce-int-${Date.now().toString(36)}`;
const DAY = 24 * 60 * 60 * 1000;
const userIds: string[] = [];
let orgId = "";
let eventId = "";
let demoEventId = "";
const people: Record<string, string> = {};

async function builder(
  label: string,
  options: { email?: string; verified?: boolean; developer?: boolean } = {},
) {
  const user = await prisma.user.create({
    data: {
      email: options.email ?? `${KEY}-${label}@builders.example.net`,
      name: `Builder ${label}`,
      handle: `${KEY}-${label}`.slice(-28),
      emailVerified: options.verified === false ? null : new Date(),
      primaryRole: "DEVELOPER",
      onboardingCompletedAt: new Date(),
    },
  });
  if (options.developer !== false)
    await prisma.roleGrant.create({ data: { userId: user.id, role: "DEVELOPER" } });
  userIds.push(user.id);
  people[label] = user.id;
  return user.id;
}

async function hackathon(slug: string, isDemo: boolean) {
  const now = Date.now();
  const event = await prisma.event.create({
    data: {
      orgId,
      slug,
      title: `Announce Test ${slug}`,
      venueType: "PHYSICAL",
      location: "Nairobi",
      startsAt: new Date(now + 10 * DAY),
      endsAt: new Date(now + 12 * DAY),
      registrationDeadline: new Date(now + 8 * DAY),
      status: "LIVE",
      publishedAt: new Date(),
      prizeVerifiedAt: new Date(),
      isDemo,
    },
  });
  await prisma.prizeBreakdown.create({
    data: { eventId: event.id, place: 1, label: "1st", amountKes: 50_000 },
  });
  return event.id;
}

beforeAll(async () => {
  const owner = await builder("owner", { developer: false });
  const org = await prisma.organization.create({
    data: { name: "Announce Org", slug: KEY, ownerId: owner },
  });
  orgId = org.id;
  await prisma.orgMember.create({
    data: { orgId, userId: owner, role: "OWNER", status: "ACTIVE" },
  });

  await builder("eager");
  const optedOut = await builder("opted-out");
  await prisma.notificationPreference.create({ data: { userId: optedOut, eventUpdates: false } });
  const teammate = await builder("teammate");
  await prisma.orgMember.create({
    data: { orgId, userId: teammate, role: "MEMBER", status: "ACTIVE" },
  });
  await builder("demo", { email: `${KEY}-demo@hackvillage.dev` });
  await builder("unverified", { verified: false });

  eventId = await hackathon(`${KEY}-real`, false);
  demoEventId = await hackathon(`${KEY}-demo`, true);
});

afterAll(async () => {
  // The announcement reaches every eligible builder in the database, not just
  // this file's fixtures, so clean up by hackathon as well as by user.
  for (const id of [eventId, demoEventId]) {
    await prisma.notification.deleteMany({
      where: { type: HACKATHON_LIVE_NOTIFICATION, payload: { path: ["eventId"], equals: id } },
    });
  }
  await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.prizeBreakdown.deleteMany({ where: { eventId: { in: [eventId, demoEventId] } } });
  await prisma.event.deleteMany({ where: { id: { in: [eventId, demoEventId] } } });
  await prisma.orgMember.deleteMany({ where: { orgId } });
  await prisma.organization.deleteMany({ where: { id: orgId } });
  await prisma.notificationPreference.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.roleGrant.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("announceHackathonToBuilders", () => {
  it("tells only verified builders with hackathon updates on, outside the host's team", async () => {
    const told = await announceHackathonToBuilders(eventId);
    const notified = await prisma.notification.findMany({
      where: { type: HACKATHON_LIVE_NOTIFICATION, userId: { in: userIds } },
      select: { userId: true },
    });
    const notifiedIds = notified.map((n) => n.userId);
    expect(notifiedIds).toContain(people.eager);
    for (const skipped of ["opted-out", "teammate", "demo", "unverified", "owner"]) {
      expect(notifiedIds).not.toContain(people[skipped]);
    }
    expect(told).toBeGreaterThanOrEqual(1);
  });

  it("never tells the same builder twice, even if the job runs again", async () => {
    await announceHackathonToBuilders(eventId);
    const count = await prisma.notification.count({
      where: { type: HACKATHON_LIVE_NOTIFICATION, userId: people.eager },
    });
    expect(count).toBe(1);
  });

  it("never announces a demo hackathon", async () => {
    expect(await announceHackathonToBuilders(demoEventId)).toBe(0);
  });
});
