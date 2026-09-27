import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { decideKyb, KybDecisionError } from "@/lib/orgs/verification-service";

/**
 * KYB decision precondition: only PENDING organizations can receive a
 * decision — re-deciding a VERIFIED/FAILED org would clobber the audited
 * outcome and re-mail the organizer.
 */
const TEST_KEY = `kyb-int-${Date.now().toString(36)}`;
const userIds: string[] = [];
const orgIds: string[] = [];
let adminId = "";
let plainUserId = "";

async function createUser(label: string, admin = false) {
  const user = await prisma.user.create({
    data: {
      email: `${TEST_KEY}-${label}@hackvillage.test`,
      name: `KYB ${label}`,
      handle: `${TEST_KEY}-${label}`.slice(-28),
      emailVerified: new Date(),
      primaryRole: "DEVELOPER",
      onboardingCompletedAt: new Date(),
    },
  });
  userIds.push(user.id);
  if (admin) await prisma.roleGrant.create({ data: { userId: user.id, role: "ADMIN" } });
  return user;
}

async function createOrg(label: string, kycStatus: "NONE" | "PENDING" | "VERIFIED" | "FAILED") {
  const owner = await createUser(`owner-${label}`);
  const org = await prisma.organization.create({
    data: { name: `KYB Org ${label}`, slug: `${TEST_KEY}-${label}`, ownerId: owner.id, kycStatus },
  });
  orgIds.push(org.id);
  return org;
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  adminId = (await createUser("admin", true)).id;
  plainUserId = (await createUser("plain")).id;
});

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.roleGrant.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

describe("decideKyb precondition", () => {
  it("refuses non-admins", async () => {
    const org = await createOrg("nonadmin", "PENDING");
    await expect(
      decideKyb({ adminId: plainUserId, orgId: org.id, decision: "APPROVE", reason: "looks fine" })
    ).rejects.toBeInstanceOf(KybDecisionError);
    expect((await prisma.organization.findUniqueOrThrow({ where: { id: org.id } })).kycStatus).toBe(
      "PENDING"
    );
  });

  it("refuses orgs that aren't PENDING — a VERIFIED org can't be re-decided", async () => {
    const org = await createOrg("verified", "VERIFIED");
    await expect(
      decideKyb({ adminId, orgId: org.id, decision: "REJECT", reason: "second thoughts" })
    ).rejects.toThrow(/isn't awaiting review/);
    expect((await prisma.organization.findUniqueOrThrow({ where: { id: org.id } })).kycStatus).toBe(
      "VERIFIED"
    );
  });

  it("decides a PENDING org and audit-logs it; a second decision is then refused", async () => {
    const org = await createOrg("pending", "PENDING");

    const outcome = await decideKyb({
      adminId,
      orgId: org.id,
      decision: "APPROVE",
      reason: "documents verified",
    });
    expect(outcome.orgName).toContain("KYB Org pending");

    const stored = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } });
    expect(stored.kycStatus).toBe("VERIFIED");
    const audit = await prisma.auditLog.findFirst({
      where: { entityId: org.id, action: "kyc.approved" },
    });
    expect(audit).not.toBeNull();

    // And now the precondition blocks any further decisions.
    await expect(
      decideKyb({ adminId, orgId: org.id, decision: "REJECT", reason: "changed my mind" })
    ).rejects.toThrow(/isn't awaiting review/);
    expect((await prisma.organization.findUniqueOrThrow({ where: { id: org.id } })).kycStatus).toBe(
      "VERIFIED"
    );
  });

  it("rejects a PENDING org with a reason, landing on FAILED", async () => {
    const org = await createOrg("rejectme", "PENDING");
    await decideKyb({ adminId, orgId: org.id, decision: "REJECT", reason: "blurry documents" });
    expect((await prisma.organization.findUniqueOrThrow({ where: { id: org.id } })).kycStatus).toBe(
      "FAILED"
    );
  });
});
