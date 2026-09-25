import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { updateOrgProfileAsAdmin, updateOrgProfileAsMember } from "@/lib/orgs/service";
import { KybSubmissionError, submitKyb } from "@/lib/orgs/verification-service";

/**
 * Organizer verification: owners submit structured business details, the
 * organization moves to PENDING, a rejected organization can resubmit, and
 * profile details are validated (with the kind locked after verification).
 */

const TEST_KEY = `orgkyb-int-${Date.now().toString(36)}`;
const userIds: string[] = [];
let orgId = "";
let owner = "";
let member = "";
let admin = "";

const details = {
  kind: "COMPANY",
  city: "Nairobi",
  country: "Kenya",
  website: "example.co.ke",
  socialUrl: "",
  contactPhone: "0712 345 678",
};

const submission = {
  legalName: "Verification Test Limited",
  registrationNumber: "PVT-TEST123",
  kraPin: "P051234567Z",
  signatoryName: "Test Director",
  signatoryRole: "Director",
};

async function createUser(label: string) {
  const key = `${TEST_KEY}-${label}`;
  const user = await prisma.user.create({
    data: {
      email: `${key}@hackvillage.test`,
      name: `Kyb ${label}`,
      handle: key.slice(-24),
      emailVerified: new Date(),
      primaryRole: "ORGANIZER",
      onboardingCompletedAt: new Date(),
    },
  });
  userIds.push(user.id);
  return user.id;
}

beforeAll(async () => {
  owner = await createUser("owner");
  member = await createUser("member");
  admin = await createUser("admin");
  await prisma.roleGrant.create({ data: { userId: admin, role: "ADMIN" } });
  const org = await prisma.organization.create({
    data: { name: "Verification Test Org", slug: TEST_KEY, ownerId: owner },
  });
  orgId = org.id;
  await prisma.orgMember.createMany({
    data: [
      { orgId, userId: owner, role: "OWNER", status: "ACTIVE" },
      { orgId, userId: member, role: "MEMBER", status: "ACTIVE" },
    ],
  });
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { entityId: orgId } });
  await prisma.organization.deleteMany({ where: { id: orgId } });
  await prisma.roleGrant.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("organizer verification", () => {
  it("asks for the organization's kind before business details", async () => {
    await expect(submitKyb(owner, orgId, submission)).rejects.toThrow(
      "Add your organization details on your profile first.",
    );
  });

  it("saves validated profile details, keeping the phone private and normalized", async () => {
    await updateOrgProfileAsMember(owner, orgId, { about: "We host.", details });
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    expect(org).toMatchObject({
      kind: "COMPANY",
      city: "Nairobi",
      website: "https://example.co.ke/",
      socialUrl: null,
      contactPhone: "+254712345678",
    });
  });

  it("refuses submissions from plain members", async () => {
    await expect(submitKyb(member, orgId, submission)).rejects.toThrow(KybSubmissionError);
  });

  it("stores the submission and moves the organization to review", async () => {
    await submitKyb(owner, orgId, { ...submission, kraPin: "p051234567z" });

    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
      include: { kybSubmission: true },
    });
    expect(org.kycStatus).toBe("PENDING");
    expect(org.kybSubmission).toMatchObject({
      legalName: "Verification Test Limited",
      kraPin: "P051234567Z",
      submittedById: owner,
      reviewedAt: null,
    });
    const log = await prisma.auditLog.findFirst({
      where: { entityId: orgId, action: "kyc.requested" },
    });
    expect(log).not.toBeNull();
  });

  it("keeps a pending review read only", async () => {
    await expect(submitKyb(owner, orgId, submission)).rejects.toThrow(
      "Your details are in review.",
    );
  });

  it("lets a rejected organization resubmit, clearing the old review", async () => {
    await prisma.organization.update({ where: { id: orgId }, data: { kycStatus: "FAILED" } });
    await prisma.kybSubmission.update({
      where: { orgId },
      data: { reviewedAt: new Date(), reviewNote: "Registration number didn't match." },
    });

    await submitKyb(owner, orgId, { ...submission, registrationNumber: "PVT-FIXED99" });

    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
      include: { kybSubmission: true },
    });
    expect(org.kycStatus).toBe("PENDING");
    expect(org.kybSubmission).toMatchObject({
      registrationNumber: "PVT-FIXED99",
      reviewedAt: null,
      reviewNote: null,
    });
    expect(await prisma.kybSubmission.count({ where: { orgId } })).toBe(1);
  });

  it("refuses to resubmit once verified", async () => {
    await prisma.organization.update({ where: { id: orgId }, data: { kycStatus: "VERIFIED" } });
    await expect(submitKyb(owner, orgId, submission)).rejects.toThrow("already verified");
  });

  it("locks the kind for a verified organization but lets it update the rest", async () => {
    await updateOrgProfileAsMember(owner, orgId, {
      about: "We host.",
      details: { ...details, kind: "NGO", city: "Mombasa" },
    });
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    expect(org.kind).toBe("COMPANY");
    expect(org.city).toBe("Mombasa");
  });

  it("lets a HackVillage admin save a profile with details still unknown", async () => {
    await updateOrgProfileAsAdmin(
      admin,
      orgId,
      { about: "Filled in.", details: { ...details, contactPhone: "", city: "" } },
      "intake call",
    );
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    expect(org.contactPhone).toBeNull();
    expect(org.city).toBeNull();
  });
});
