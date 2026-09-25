import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import {
  OrgProfileError,
  updateOrgProfileAsAdmin,
  updateOrgProfileAsMember,
} from "@/lib/orgs/service";

/**
 * Organizer profile editing: owners and admins edit their own profile, the
 * name locks after KYB, members can't edit, and HackVillage admins can fill
 * in any profile with a logged reason.
 */

const TEST_KEY = `orgprof-int-${Date.now().toString(36)}`;
const userIds: string[] = [];
let orgId = "";
let owner = "";
let member = "";
let admin = "";

async function createUser(label: string) {
  const key = `${TEST_KEY}-${label}`;
  const user = await prisma.user.create({
    data: {
      email: `${key}@hackvillage.test`,
      name: `Org ${label}`,
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
    data: { name: "Profile Test Org", slug: TEST_KEY, ownerId: owner },
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

describe("organizer profile editing", () => {
  it("lets the owner rename and describe an unverified organization, with an audit entry", async () => {
    await updateOrgProfileAsMember(owner, orgId, {
      about: " We run hackathons. ",
      name: "Renamed Org",
    });

    const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    expect(org.about).toBe("We run hackathons.");
    expect(org.name).toBe("Renamed Org");
    const log = await prisma.auditLog.findFirst({
      where: { entityId: orgId, action: "org.profile_updated", actorId: owner },
    });
    expect(log).not.toBeNull();
  });

  it("refuses edits from a plain member", async () => {
    await expect(updateOrgProfileAsMember(member, orgId, { about: "Hijacked" })).rejects.toThrow(
      OrgProfileError,
    );
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    expect(org.about).toBe("We run hackathons.");
  });

  it("locks the name once KYB verifies the organization but still saves the about", async () => {
    await prisma.organization.update({ where: { id: orgId }, data: { kycStatus: "VERIFIED" } });
    await updateOrgProfileAsMember(owner, orgId, {
      about: "Updated story.",
      name: "Sneaky Rename",
    });

    const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    expect(org.name).toBe("Renamed Org");
    expect(org.about).toBe("Updated story.");
  });

  it("lets a HackVillage admin change a verified name with a logged reason", async () => {
    await updateOrgProfileAsAdmin(
      admin,
      orgId,
      { about: "Filled in by HackVillage.", name: "Official Name Ltd" },
      "match KYB documents",
    );

    const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    expect(org.name).toBe("Official Name Ltd");
    expect(org.about).toBe("Filled in by HackVillage.");
    const log = await prisma.auditLog.findFirst({
      where: { entityId: orgId, actorId: admin, action: "org.profile_updated" },
    });
    expect(log?.reason).toBe("match KYB documents");
  });

  it("requires a reason from admins and refuses non-admins", async () => {
    await expect(
      updateOrgProfileAsAdmin(admin, orgId, { about: "No reason" }, " "),
    ).rejects.toThrow("Add a reason for the audit log.");
    await expect(
      updateOrgProfileAsAdmin(owner, orgId, { about: "Not an admin" }, "trying anyway"),
    ).rejects.toThrow("Admins only.");
  });
});
