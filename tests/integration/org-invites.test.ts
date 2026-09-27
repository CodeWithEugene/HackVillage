import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { acceptOrgInvitation } from "@/lib/organizations/accept-invitation";
import { generateInviteCode, inviteExpiryFrom } from "@/lib/organizations/invitations";

/**
 * Invitation acceptance: claim-first concurrency (two racing accepts → one
 * membership), email-bound targeted invites, and the onboarding fields the
 * accept mirrors from joinOrganizationAction.
 */
const TEST_KEY = `invite-int-${Date.now().toString(36)}`;
const userIds: string[] = [];
let orgId = "";
let ownerId = "";
let ownerEmail = "";

async function createUser(label: string) {
  const user = await prisma.user.create({
    data: {
      email: `${TEST_KEY}-${label}@hackvillage.test`,
      name: `Invite ${label}`,
      handle: `${TEST_KEY}-${label}`.slice(-28),
      emailVerified: new Date(),
      primaryRole: "DEVELOPER",
      onboardingCompletedAt: new Date(),
    },
  });
  userIds.push(user.id);
  return user;
}

async function createInvite(email: string) {
  return prisma.orgInvitation.create({
    data: {
      orgId,
      email,
      role: "MEMBER",
      token: generateInviteCode(),
      expiresAt: inviteExpiryFrom(),
    },
  });
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const owner = await createUser("owner");
  ownerId = owner.id;
  ownerEmail = owner.email;
  const org = await prisma.organization.create({
    data: { name: `Invite Org ${TEST_KEY}`, slug: TEST_KEY, ownerId },
  });
  orgId = org.id;
  await prisma.orgMember.create({
    data: { orgId, userId: ownerId, role: "OWNER", status: "ACTIVE" },
  });
});

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: orgId } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

describe("acceptOrgInvitation", () => {
  it("binds targeted invites to the invitee's email — forwarded codes fail", async () => {
    const invited = await createUser("invited");
    const forwardTarget = await createUser("sneaky");
    const invite = await createInvite(invited.email);

    const wrong = await acceptOrgInvitation({
      token: invite.token,
      user: { id: forwardTarget.id, email: forwardTarget.email },
    });
    expect(wrong).toMatchObject({ ok: false });

    const right = await acceptOrgInvitation({
      token: invite.token,
      user: { id: invited.id, email: invited.email },
    });
    expect(right).toMatchObject({ ok: true, orgId });

    const membership = await prisma.orgMember.findFirst({
      where: { orgId, userId: invited.id },
    });
    expect(membership).toMatchObject({ role: "MEMBER", status: "ACTIVE" });
  });

  it("marks the accepter ORGANIZER with onboarding completed (the dead-end fix)", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userIds[userIds.length - 2]! } });
    expect(user.primaryRole).toBe("ORGANIZER");
    expect(user.onboardingCompletedAt).not.toBeNull();
  });

  it("claim-first: two concurrent accepts produce exactly ONE membership", async () => {
    const racer1 = await createUser("racer1");
    const racer2 = await createUser("racer2");
    // Hand-shared code: stored email is the creator's (an active member's).
    const invite = await createInvite(ownerEmail);

    const [first, second] = await Promise.all([
      acceptOrgInvitation({ token: invite.token, user: { id: racer1.id, email: racer1.email } }),
      acceptOrgInvitation({ token: invite.token, user: { id: racer2.id, email: racer2.email } }),
    ]);
    const wins = [first, second].filter((r) => r.ok);
    expect(wins).toHaveLength(1);

    const members = await prisma.orgMember.findMany({
      where: { orgId, userId: { in: [racer1.id, racer2.id] } },
    });
    expect(members).toHaveLength(1);

    const stored = await prisma.orgInvitation.findUniqueOrThrow({ where: { id: invite.id } });
    expect(stored.acceptedAt).not.toBeNull();

    // And the claimed invite can't be accepted again.
    const again = await acceptOrgInvitation({
      token: invite.token,
      user: { id: racer2.id, email: racer2.email },
    });
    expect(again).toMatchObject({ ok: false });
  });

  it("rejects expired and unknown tokens", async () => {
    const user = await createUser("late");
    const expired = await prisma.orgInvitation.create({
      data: {
        orgId,
        email: ownerEmail,
        role: "MEMBER",
        token: generateInviteCode(),
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    expect(
      await acceptOrgInvitation({ token: expired.token, user: { id: user.id, email: user.email } })
    ).toMatchObject({ ok: false });
    expect(
      await acceptOrgInvitation({ token: "nope-nope", user: { id: user.id, email: user.email } })
    ).toMatchObject({ ok: false });
  });

  it("hand-shared codes (stored email = an active member's) are not email-bound", async () => {
    const joiner = await createUser("joiner");
    const invite = await createInvite(ownerEmail);
    const result = await acceptOrgInvitation({
      token: invite.token,
      user: { id: joiner.id, email: joiner.email },
    });
    expect(result).toMatchObject({ ok: true });
  });
});
