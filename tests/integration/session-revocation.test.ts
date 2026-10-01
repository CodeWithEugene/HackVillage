import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { isSessionCurrent, revokeAllSessions } from "@/lib/auth/session-version";
import { prisma } from "@/lib/db";

/**
 * Session revocation against a live Postgres: a token issued before
 * revokeAllSessions stops being current, and a fresh sign-in (which adopts
 * the new version) is current again.
 */
const KEY = `sessrev-${Date.now().toString(36)}`;
let userId = "";

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      email: `${KEY}@hackvillage.test`,
      handle: KEY.slice(-24),
      primaryRole: "DEVELOPER",
      emailVerified: new Date(),
      onboardingCompletedAt: new Date(),
    },
  });
  userId = user.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
});

async function owner() {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { sessionVersion: true, deletedAt: true },
  });
}

describe("session revocation", () => {
  it("new accounts start at version 0, so existing tokens stay valid", async () => {
    expect((await owner())?.sessionVersion).toBe(0);
    expect(isSessionCurrent(0, await owner())).toBe(true);
  });

  it("revokeAllSessions ends tokens issued under the old version", async () => {
    const issuedUnder = (await owner())!.sessionVersion;
    await revokeAllSessions(userId);
    expect(isSessionCurrent(issuedUnder, await owner())).toBe(false);
  });

  it("a fresh sign-in adopts the new version and is current", async () => {
    const current = (await owner())!.sessionVersion;
    expect(current).toBe(1);
    expect(isSessionCurrent(current, await owner())).toBe(true);
  });

  it("works inside a transaction alongside the change that triggers it", async () => {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { name: "Renamed" } });
      await revokeAllSessions(userId, tx);
    });
    expect((await owner())?.sessionVersion).toBe(2);
  });
});
