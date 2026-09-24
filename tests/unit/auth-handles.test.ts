import { describe, expect, it } from "vitest";

import {
  candidateHandles,
  firstAvailableHandle,
  RESERVED_HANDLES,
  sanitizeHandleStem,
  stemFromEmail,
  validateHandle,
} from "@/lib/auth/handles";

describe("validateHandle", () => {
  it("accepts legal handles", () => {
    expect(validateHandle("eugene")).toBeNull();
    expect(validateHandle("dev-254")).toBeNull();
    expect(validateHandle("a1b2c3")).toBeNull();
  });

  it("rejects short, long, uppercase and bad-character handles", () => {
    expect(validateHandle("ab")).toContain("at least 3");
    expect(validateHandle("x".repeat(31))).toContain("at most 30");
    expect(validateHandle("Eugene")).toContain("lowercase");
    expect(validateHandle("-eugene")).toContain("letters, numbers and hyphens");
    expect(validateHandle("eugene!")).toContain("letters, numbers and hyphens");
    expect(validateHandle("eu-gene-")).toContain("letters, numbers and hyphens");
  });

  it("rejects reserved platform words", () => {
    expect(validateHandle("admin")).toContain("reserved");
    expect(validateHandle("trust")).toContain("reserved");
    expect(validateHandle("dashboard")).toContain("reserved");
    expect(RESERVED_HANDLES.has("events")).toBe(true);
  });
});

describe("handle derivation from email", () => {
  it("sanitizes stems", () => {
    expect(sanitizeHandleStem("Eugene.Mutembei")).toBe("eugene-mutembei");
    expect(sanitizeHandleStem("eug--gene!!")).toBe("eug-gene");
    expect(sanitizeHandleStem("  ")).toBe("");
  });

  it("derives stems from email local parts", () => {
    expect(stemFromEmail("eugene.mutembei@gmail.com")).toBe("eugene-mutembei");
    expect(stemFromEmail("a@x.com")).toBe("a");
  });

  it("falls back when the local part is unusable", () => {
    expect(stemFromEmail("---@x.com")).toBe("developer");
  });
});

describe("candidateHandles collision resolution", () => {
  it("yields the base first, then numbered suffixes", () => {
    expect(candidateHandles("eugene").slice(0, 3)).toEqual(["eugene", "eugene-2", "eugene-3"]);
  });

  it("skips reserved stems", () => {
    expect(candidateHandles("admin")).not.toContain("admin");
    expect(candidateHandles("admin")[0]).toBe("admin-2");
  });

  it("always produces at least one candidate", () => {
    expect(candidateHandles("??").length).toBeGreaterThan(0);
  });
});

describe("firstAvailableHandle", () => {
  it("returns the first untaken candidate", () => {
    expect(firstAvailableHandle(["eugene", "eugene-2"], ["eugene"])).toBe("eugene-2");
  });

  it("is case-insensitive against taken handles", () => {
    expect(firstAvailableHandle(["eugene"], ["EUGENE"])).toBeNull();
  });

  it("returns null when everything is taken", () => {
    expect(firstAvailableHandle(["a", "b"], ["a", "b"])).toBeNull();
  });
});
