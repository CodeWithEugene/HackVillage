import { describe, expect, it } from "vitest";

import { canJoinTeam, MAX_TEAM_MEMBERS, validTeamName } from "@/lib/teams/policy";
import { validateSplit, validRepoUrl } from "@/lib/events/submission";

describe("canJoinTeam", () => {
  const open = { status: "OPEN" as const, joinedCount: 2 };

  it("accepts a registered non-member while the team is open", () => {
    expect(canJoinTeam(open, false, true).ok).toBe(true);
  });

  it("blocks full, locked, and disbanded teams", () => {
    expect(canJoinTeam({ status: "OPEN", joinedCount: MAX_TEAM_MEMBERS }, false, true).reason).toContain("5");
    expect(canJoinTeam({ status: "LOCKED", joinedCount: 2 }, false, true).reason).toContain("locked");
    expect(canJoinTeam({ status: "DISBANDED", joinedCount: 2 }, false, true).reason).toContain("disbanded");
  });

  it("blocks duplicates and closed registration", () => {
    expect(canJoinTeam(open, true, true).reason).toContain("already");
    expect(canJoinTeam(open, false, false).reason).toContain("closed");
  });
});

describe("validTeamName", () => {
  it("accepts readable names and rejects degenerate ones", () => {
    expect(validTeamName("The Salamanders")).toBeNull();
    expect(validTeamName("ab")).toContain("at least 3");
    expect(validTeamName("x".repeat(41))).toContain("at most 40");
  });
});

describe("validateSplit (ADR-013)", () => {
  const members = ["u_1", "u_2", "u_3"];

  it("accepts a complete, member-only, 100% split", () => {
    expect(
      validateSplit(
        [
          { userId: "u_1", percent: 60 },
          { userId: "u_2", percent: 40 },
        ],
        members
      )
    ).toEqual({ ok: true });
  });

  it("rejects non-100 totals with the actual sum in the reason", () => {
    const result = validateSplit([{ userId: "u_1", percent: 60 }], members);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("60");
  });

  it("rejects non-members and duplicates", () => {
    expect(validateSplit([{ userId: "intruder", percent: 100 }], members).reason).toContain("not a member");
    expect(
      validateSplit(
        [
          { userId: "u_1", percent: 50 },
          { userId: "u_1", percent: 50 },
        ],
        members
      ).reason
    ).toContain("twice");
  });

  it("rejects non-integer or out-of-range percents", () => {
    expect(validateSplit([{ userId: "u_1", percent: 100.5 }], members).reason).toContain("whole numbers");
    expect(validateSplit([{ userId: "u_1", percent: 120 }], members).reason).toContain("whole numbers");
  });

  it("rejects empty declarations", () => {
    expect(validateSplit([], members).reason).toContain("split");
  });
});

describe("validRepoUrl", () => {
  it("accepts well-formed repository links", () => {
    expect(validRepoUrl("https://github.com/dala-rail/matatu-pay")).toBeNull();
    expect(validRepoUrl("https://gitlab.com/group/project/")).toBeNull();
  });

  it("rejects non-repo URLs and other schemes", () => {
    expect(validRepoUrl("github.com/dala-rail/matatu-pay")).not.toBeNull();
    expect(validRepoUrl("http://github.com/dala-rail/matatu-pay")).not.toBeNull();
    expect(validRepoUrl("https://example.com")).not.toBeNull();
  });
});
