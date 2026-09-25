import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { coverKey } from "@/lib/events/cover-upload";
import { CoverError, issueCoverUpload, removeCover, setCover } from "@/lib/events/cover-service";

/**
 * Hackathon cover images: only the organization's owners and admins can
 * upload or change a cover, keys are scoped to their hackathon, and removing
 * falls back to the category photo (coverUrl null).
 */

const TEST_KEY = `covers-int-${Date.now().toString(36)}`;
const userIds: string[] = [];
let orgId = "";
let eventId = "";
let otherEventId = "";
let owner = "";
let member = "";

async function createUser(label: string) {
  const key = `${TEST_KEY}-${label}`;
  const user = await prisma.user.create({
    data: {
      email: `${key}@hackvillage.test`,
      name: `Cover ${label}`,
      handle: key.slice(-24),
      emailVerified: new Date(),
      primaryRole: "ORGANIZER",
      onboardingCompletedAt: new Date(),
    },
  });
  userIds.push(user.id);
  return user.id;
}

async function createEvent(slug: string) {
  const now = Date.now();
  const event = await prisma.event.create({
    data: {
      orgId,
      slug,
      title: "Cover Test Hackathon",
      venueType: "ONLINE",
      startsAt: new Date(now + 10 * 86_400_000),
      endsAt: new Date(now + 12 * 86_400_000),
      registrationDeadline: new Date(now + 8 * 86_400_000),
      rolesWanted: [],
      status: "DRAFT",
    },
  });
  return event.id;
}

beforeAll(async () => {
  owner = await createUser("owner");
  member = await createUser("member");
  const org = await prisma.organization.create({
    data: { name: "Cover Test Org", slug: TEST_KEY, ownerId: owner },
  });
  orgId = org.id;
  await prisma.orgMember.createMany({
    data: [
      { orgId, userId: owner, role: "OWNER", status: "ACTIVE" },
      { orgId, userId: member, role: "MEMBER", status: "ACTIVE" },
    ],
  });
  eventId = await createEvent(`${TEST_KEY}-a`);
  otherEventId = await createEvent(`${TEST_KEY}-b`);
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { entityId: { in: [eventId, otherEventId] } } });
  await prisma.organization.deleteMany({ where: { id: orgId } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("hackathon covers", () => {
  it("issues an upload scoped to the hackathon for its owner", async () => {
    const target = await issueCoverUpload({
      userId: owner,
      eventId,
      contentType: "image/webp",
      sizeBytes: 250_000,
    });
    expect(target.key).toMatch(new RegExp(`^covers/${eventId}/[a-f0-9]{16}\\.webp$`));
    expect(target.uploadUrl).toBeTruthy();
  });

  it("explains that uploads are off on Vercel until R2 is configured", async () => {
    process.env.VERCEL = "1";
    try {
      await expect(
        issueCoverUpload({ userId: owner, eventId, contentType: "image/webp", sizeBytes: 1000 }),
      ).rejects.toThrow(/aren't switched on yet/);
    } finally {
      delete process.env.VERCEL;
    }
  });

  it("refuses members, wrong types, and oversized files", async () => {
    await expect(
      issueCoverUpload({ userId: member, eventId, contentType: "image/webp", sizeBytes: 1000 }),
    ).rejects.toThrow(CoverError);
    await expect(
      issueCoverUpload({ userId: owner, eventId, contentType: "image/gif", sizeBytes: 1000 }),
    ).rejects.toThrow(/JPEG, PNG, or WebP/);
    await expect(
      issueCoverUpload({
        userId: owner,
        eventId,
        contentType: "image/webp",
        sizeBytes: 20 * 1024 * 1024,
      }),
    ).rejects.toThrow(/under 10MB/);
  });

  it("sets the cover from an issued key and logs it", async () => {
    const key = coverKey(eventId, "image/webp");
    const { coverUrl } = await setCover({ userId: owner, eventId, key });

    const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
    expect(event.coverUrl).toBe(coverUrl);
    expect(coverUrl).toContain(key);
    const log = await prisma.auditLog.findFirst({
      where: { entityId: eventId, action: "event.cover_updated" },
    });
    expect(log).not.toBeNull();
  });

  it("refuses a key issued for a different hackathon", async () => {
    await expect(
      setCover({ userId: owner, eventId, key: coverKey(otherEventId, "image/webp") }),
    ).rejects.toThrow(/doesn't belong/);
  });

  it("removes the cover so the category photo shows again", async () => {
    await removeCover({ userId: owner, eventId });
    const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
    expect(event.coverUrl).toBeNull();
  });
});
