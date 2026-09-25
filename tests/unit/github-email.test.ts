import { describe, expect, it } from "vitest";

import { pickVerifiedGithubEmail } from "@/lib/auth/github-email";

describe("pickVerifiedGithubEmail", () => {
  it("prefers the verified primary address and lowercases it", () => {
    expect(
      pickVerifiedGithubEmail([
        { email: "other@example.com", primary: false, verified: true },
        { email: "Me@Example.com", primary: true, verified: true },
      ]),
    ).toBe("me@example.com");
  });

  it("falls back to another verified address when the primary isn't verified", () => {
    expect(
      pickVerifiedGithubEmail([
        { email: "victim@example.com", primary: true, verified: false },
        { email: "mine@example.com", primary: false, verified: true },
      ]),
    ).toBe("mine@example.com");
  });

  it("never returns an unverified address", () => {
    expect(
      pickVerifiedGithubEmail([{ email: "victim@example.com", primary: true, verified: false }]),
    ).toBeNull();
  });

  it("copes with junk from the API", () => {
    expect(pickVerifiedGithubEmail(null)).toBeNull();
    expect(pickVerifiedGithubEmail({ message: "Bad credentials" })).toBeNull();
    expect(pickVerifiedGithubEmail([null, 3, { email: 5, verified: true }])).toBeNull();
  });
});
