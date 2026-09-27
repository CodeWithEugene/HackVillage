import { describe, expect, it, vi } from "vitest";

// The action imports Next + auth modules; the validation we test runs BEFORE
// any of that is touched.
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("next/navigation", () => ({ redirect: () => undefined }));
vi.mock("@/lib/auth/guards", () => ({
  requireUser: async () => ({ id: "u1", email: "u1@example.com", handle: "u1", roles: [] }),
}));

import { chooseRoleAction } from "@/lib/onboarding/actions";

describe("chooseRoleAction input validation", () => {
  it("rejects a role outside the enum at runtime (server actions take untrusted input)", async () => {
    // A forged client can send anything — the type is a compile-time hint only.
    await expect(chooseRoleAction("ADMIN" as never)).rejects.toThrow();
    await expect(chooseRoleAction("" as never)).rejects.toThrow();
    await expect(chooseRoleAction(42 as never)).rejects.toThrow();
  });
});
