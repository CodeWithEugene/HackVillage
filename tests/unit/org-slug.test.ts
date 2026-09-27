import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  createWithOrgSlugRetry,
  isOrgSlugUniqueViolation,
  orgSlugCandidates,
  orgSlugStem,
} from "@/lib/organizations/slug";

function p2002(target: string[]): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "6.19.3",
    meta: { target },
  });
}

describe("orgSlugStem / candidates", () => {
  it("slugifies names and reserves platform routes", () => {
    expect(orgSlugStem("Nairobi AI Builders!")).toBe("nairobi-ai-builders");
    expect(orgSlugCandidates("Nairobi AI Builders")[0]).toBe("nairobi-ai-builders");
    expect(orgSlugCandidates("admin")).toEqual([]);
    expect(orgSlugCandidates("ab")).toEqual([]);
  });
});

describe("isOrgSlugUniqueViolation", () => {
  it("matches only P2002 on slug", () => {
    expect(isOrgSlugUniqueViolation(p2002(["slug"]))).toBe(true);
    expect(isOrgSlugUniqueViolation(p2002(["id"]))).toBe(false);
    expect(isOrgSlugUniqueViolation(new Error("nope"))).toBe(false);
  });
});

describe("createWithOrgSlugRetry", () => {
  it("returns the first successful create", async () => {
    const tried: string[] = [];
    const result = await createWithOrgSlugRetry(["a", "b", "c"], async (slug) => {
      tried.push(slug);
      return `org-${slug}`;
    });
    expect(result).toBe("org-a");
    expect(tried).toEqual(["a"]);
  });

  it("retries the next candidate on a slug race, then succeeds", async () => {
    const tried: string[] = [];
    const result = await createWithOrgSlugRetry(["a", "b", "c"], async (slug) => {
      tried.push(slug);
      if (slug !== "c") throw p2002(["slug"]);
      return `org-${slug}`;
    });
    expect(result).toBe("org-c");
    expect(tried).toEqual(["a", "b", "c"]);
  });

  it("is bounded: gives up after maxAttempts with the last violation", async () => {
    const tried: string[] = [];
    await expect(
      createWithOrgSlugRetry(
        ["a", "b", "c", "d", "e", "f", "g"],
        async (slug) => {
          tried.push(slug);
          throw p2002(["slug"]);
        },
        5
      )
    ).rejects.toMatchObject({ code: "P2002" });
    expect(tried).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("rethrows non-slug errors immediately", async () => {
    const tried: string[] = [];
    await expect(
      createWithOrgSlugRetry(["a", "b"], async (slug) => {
        tried.push(slug);
        throw new Error("database on fire");
      })
    ).rejects.toThrow("database on fire");
    expect(tried).toEqual(["a"]);
  });

  it("rethrows unique violations on other fields", async () => {
    await expect(
      createWithOrgSlugRetry(["a", "b"], async () => {
        throw p2002(["ownerId"]);
      })
    ).rejects.toMatchObject({ code: "P2002" });
  });
});
