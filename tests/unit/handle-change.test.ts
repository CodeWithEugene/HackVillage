import { beforeEach, describe, expect, it, vi } from "vitest";

const { revalidatePathMock, prismaMock } = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
  prismaMock: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    developerProfile: { upsert: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("next/navigation", () => ({ redirect: () => undefined }));
vi.mock("@/lib/auth/guards", () => ({
  requireUser: async () => ({
    id: "user-1",
    email: "dev@example.com",
    handle: "session-handle",
    roles: ["DEVELOPER"],
  }),
}));
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { updateDeveloperProfileAction } from "@/lib/onboarding/actions";

function formDataFor(handle: string): FormData {
  const data = new FormData();
  data.set("headline", "Full-stack developer, React & Node");
  data.set("handle", handle);
  data.set("visible", "on");
  return data;
}

describe("updateDeveloperProfileAction handle change", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findFirst.mockResolvedValue(null); // handle not taken
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.developerProfile.upsert.mockResolvedValue({});
    prismaMock.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));
  });

  it("revalidates BOTH the old and the new public profile paths on rename", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ handle: "old-handle" });

    const result = await updateDeveloperProfileAction({}, formDataFor("new-handle"));
    expect(result.message).toBeTruthy();

    const paths = revalidatePathMock.mock.calls.map(([p]) => p);
    expect(paths).toContain("/developers/old-handle");
    expect(paths).toContain("/developers/new-handle");
    expect(paths).toContain("/dashboard/profile");
  });

  it("skips the stale-path revalidation when the handle didn't change", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ handle: "new-handle" });

    await updateDeveloperProfileAction({}, formDataFor("new-handle"));

    const paths = revalidatePathMock.mock.calls.map(([p]) => p);
    expect(paths).toContain("/developers/new-handle");
    expect(paths).not.toContain("/developers/old-handle");
  });

  it("treats a case-only change as the same handle (no stale path)", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ handle: "New-Handle" });

    await updateDeveloperProfileAction({}, formDataFor("new-handle"));

    const paths = revalidatePathMock.mock.calls.map(([p]) => p);
    expect(paths).toContain("/developers/new-handle");
    expect(paths.filter((p) => p.startsWith("/developers/"))).toHaveLength(1);
  });
});
