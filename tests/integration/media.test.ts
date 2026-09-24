import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import {
  MediaError,
  applyManualTrustAdjustment,
  createUploadTarget,
  enforceMediaDeadlines,
  registerMediaAsset,
  setMediaStatus,
} from "@/services/media/service";
import { mediaDeadlineFor } from "@/services/media/trust";

/**
 * Media vault & trust integration (Phase 7): the 48h deadline penalty is
 * mechanical and idempotent, appeals reverse it, uploads gate on org admins,
 * and file validation rejects bad input.
 */

const TEST_KEY = `media-int-${Date.now().toString(36)}`;
let orgId: string | null = null;
let adminId: string | null = null;

let world: {
  eventId: string;
  organizerId: string;
  outsiderId: string;
  orgId: string;
};

async function createUser(label: string, asAdmin = false) {
  const key = `${TEST_KEY}-${label}`;
  const user = await prisma.user.create({
    data: {
      email: `${key}@hackvillage.test`,
      name: `Media ${label}`,
      handle: key.slice(-24),
      emailVerified: new Date(),
      primaryRole: asAdmin ? "DEVELOPER" : "ORGANIZER",
      onboardingCompletedAt: new Date(),
    },
  });
  if (asAdmin) await prisma.roleGrant.create({ data: { userId: user.id, role: "ADMIN" } });
  return user;
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");

  const organizer = await createUser("organizer");
  const outsider = await createUser("outsider");
  const admin = await createUser("admin", true);
  adminId = admin.id;

  const org = await prisma.organization.create({
    data: {
      name: `Media Org ${TEST_KEY}`,
      slug: TEST_KEY,
      ownerId: organizer.id,
      kycStatus: "VERIFIED",
      trustScore: 100,
    },
  });
  orgId = org.id;
  await prisma.orgMember.create({
    data: { orgId: org.id, userId: organizer.id, role: "OWNER", status: "ACTIVE" },
  });

  // A concluded event whose media deadline is already in the past.
  const endsAt = new Date(Date.now() - 72 * 3600 * 1000);
  const event = await prisma.event.create({
    data: {
      orgId: org.id,
      slug: `evt-${TEST_KEY}`,
      title: "Media Integration Event",
      venueType: "ONLINE",
      startsAt: new Date(endsAt.getTime() - 48 * 3600 * 1000),
      endsAt,
      registrationDeadline: new Date(endsAt.getTime() - 96 * 3600 * 1000),
      problemStatement: "Media integration event.",
      status: "SETTLED",
      prizeVerifiedAt: new Date(),
      publishedAt: new Date(endsAt.getTime() - 120 * 3600 * 1000),
      mediaDeadlineAt: mediaDeadlineFor(endsAt),
    },
  });

  world = { eventId: event.id, organizerId: organizer.id, outsiderId: outsider.id, orgId: org.id };
});

afterAll(async () => {
  if (orgId) {
    await prisma.organization.delete({ where: { id: orgId } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { email: { contains: TEST_KEY } } });
  }
  await prisma.$disconnect();
});

describe("media vault (integration)", () => {
  it("gates uploads on organization admins", async () => {
    await expect(
      createUploadTarget({
        eventId: world.eventId,
        userId: world.outsiderId,
        filename: "photo.jpg",
        contentType: "image/jpeg",
        sizeBytes: 1024,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("validates file types and sizes at the port boundary", async () => {
    await expect(
      createUploadTarget({
        eventId: world.eventId,
        userId: world.organizerId,
        filename: "virus.exe",
        contentType: "application/x-msdownload",
        sizeBytes: 1024,
      })
    ).rejects.toMatchObject({ code: "BAD_FILE" });

    await expect(
      createUploadTarget({
        eventId: world.eventId,
        userId: world.organizerId,
        filename: "huge.jpg",
        contentType: "image/jpeg",
        sizeBytes: 20 * 1024 * 1024,
      })
    ).rejects.toMatchObject({ code: "BAD_FILE" });
  });

  it("issues a local upload target and registers the asset", async () => {
    const target = await createUploadTarget({
      eventId: world.eventId,
      userId: world.organizerId,
      filename: "team-photo.jpg",
      contentType: "image/jpeg",
      sizeBytes: 2048,
    });
    expect(target.key).toContain(`events/${world.eventId}/`);
    expect(target.uploadUrl).toContain("/api/dev/media/upload/");

    await registerMediaAsset({
      eventId: world.eventId,
      userId: world.organizerId,
      key: target.key,
      kind: "PHOTO",
      caption: "The winning team celebrates",
    });

    const asset = await prisma.mediaAsset.findUnique({ where: { r2Key: target.key } });
    expect(asset).toMatchObject({ status: "PENDING", kind: "PHOTO" });

    await setMediaStatus(asset!.id, world.organizerId, "APPROVED");
    const approved = await prisma.mediaAsset.findUnique({ where: { id: asset!.id } });
    expect(approved?.status).toBe("APPROVED");
  });

  it("THE DEADLINE: penalizes exactly once, never affects payouts", async () => {
    // Remove the approved asset so the deadline check finds an empty gallery.
    await prisma.mediaAsset.deleteMany({ where: { eventId: world.eventId } });

    const first = await enforceMediaDeadlines();
    expect(first.penalized).toBeGreaterThanOrEqual(1);

    const org = await prisma.organization.findUnique({ where: { id: world.orgId } });
    expect(org?.trustScore).toBe(90); // 100 - 10

    const trustEvents = await prisma.trustEvent.findMany({
      where: { orgId: world.orgId, type: "MEDIA_PENALTY" },
    });
    expect(trustEvents).toHaveLength(1); // idempotent

    // The event still SETTLED — the penalty is reputational, never monetary.
    const event = await prisma.event.findUnique({ where: { id: world.eventId } });
    expect(event?.status).toBe("SETTLED");

    // Second run: no double penalty.
    const second = await enforceMediaDeadlines();
    const orgAfter = await prisma.organization.findUnique({ where: { id: world.orgId } });
    expect(orgAfter?.trustScore).toBe(90);
    expect(second.penalized).toBe(0);
  });

  it("the owner got a notification for the penalty", async () => {
    const ownerMembership = await prisma.orgMember.findFirst({
      where: { orgId: world.orgId, role: "OWNER" },
    });
    const notification = await prisma.notification.findFirst({
      where: { userId: ownerMembership!.userId, type: "media.penalty" },
    });
    expect(notification).not.toBeNull();
  });

  it("appeals reverse the penalty (admin-only, audit-logged)", async () => {
    await expect(
      applyManualTrustAdjustment({
        adminId: world.outsiderId,
        orgId: world.orgId,
        delta: 10,
        reason: "Not an admin trying to adjust trust.",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const { grantMediaAppeal } = await import("@/services/media/service");
    const penalty = await prisma.trustEvent.findFirst({
      where: { orgId: world.orgId, type: "MEDIA_PENALTY" },
    });
    await grantMediaAppeal({
      adminId: adminId!,
      orgId: world.orgId,
      originalReason: penalty?.reason ?? "",
      note: "Organizer had a hospital emergency; gallery uploaded within 72h.",
    });

    const org = await prisma.organization.findUnique({ where: { id: world.orgId } });
    expect(org?.trustScore).toBe(100); // 90 + 10 appeal

    const audit = await prisma.auditLog.findFirst({
      where: { action: "trust.appeal-granted", entityId: world.orgId },
    });
    expect(audit?.reason).toContain("hospital");
  });

  it("manual adjustments apply with caps and audit logs", async () => {
    await expect(
      applyManualTrustAdjustment({
        adminId: adminId!,
        orgId: world.orgId,
        delta: 100,
        reason: "Way over the cap.",
      })
    ).rejects.toMatchObject({ code: "WRONG_STATE" });

    await applyManualTrustAdjustment({
      adminId: adminId!,
      orgId: world.orgId,
      delta: 5,
      reason: "Exceptional community feedback bonus.",
    });
    const org = await prisma.organization.findUnique({ where: { id: world.orgId } });
    expect(org?.trustScore).toBe(105);
  });
});
