import { describe, expect, it } from "vitest";

import { pickVerifiedGithubEmail } from "@/lib/auth/github-email";
import { oauthSignInAllowed } from "@/lib/auth/oauth-linking";

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

describe("oauthSignInAllowed", () => {
  it("lets verified Google and GitHub sign-ins through", () => {
    expect(
      oauthSignInAllowed({
        provider: "google",
        email: "a@b.co",
        profile: { email_verified: true },
      }),
    ).toBe(true);
    expect(oauthSignInAllowed({ provider: "github", email: "a@b.co", profile: {} })).toBe(true);
  });

  it("refuses Google profiles whose email Google hasn't verified", () => {
    expect(
      oauthSignInAllowed({
        provider: "google",
        email: "a@b.co",
        profile: { email_verified: false },
      }),
    ).toBe(false);
    expect(oauthSignInAllowed({ provider: "google", email: "a@b.co", profile: {} })).toBe(false);
    expect(
      oauthSignInAllowed({
        provider: "google",
        email: "a@b.co",
        profile: { email_verified: "true" },
      }),
    ).toBe(false);
  });

  it("refuses GitHub accounts with no verified email", () => {
    expect(oauthSignInAllowed({ provider: "github", email: null, profile: {} })).toBe(false);
  });

  it("leaves email and password sign-ins to their own checks", () => {
    expect(
      oauthSignInAllowed({ provider: "credentials", email: "a@b.co", profile: undefined }),
    ).toBe(true);
  });
});
