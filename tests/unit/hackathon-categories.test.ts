import { describe, expect, it } from "vitest";

import {
  categoryLabel,
  HACKATHON_CATEGORIES,
  isCategory,
  MAX_CATEGORIES,
  parseCategoryList,
} from "@/lib/events/categories";

describe("HACKATHON_CATEGORIES", () => {
  it("has unique keys and Title Case labels", () => {
    const keys = HACKATHON_CATEGORIES.map((category) => category.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const { label } of HACKATHON_CATEGORIES) {
      expect(label[0]).toBe(label[0].toUpperCase());
    }
  });
});

describe("parseCategoryList", () => {
  it("keeps known categories in the order given", () => {
    expect(parseCategoryList("fintech,ai")).toEqual(["fintech", "ai"]);
  });

  it("drops unknown values, blanks, and duplicates", () => {
    expect(parseCategoryList(" ai , , crypto-casino, ai ,web3")).toEqual(["ai", "web3"]);
  });

  it(`caps a hackathon at ${MAX_CATEGORIES} categories`, () => {
    expect(parseCategoryList("ai,web3,fintech,health")).toEqual(["ai", "web3", "fintech"]);
  });

  it("treats missing input as no categories", () => {
    expect(parseCategoryList(undefined)).toEqual([]);
    expect(parseCategoryList("")).toEqual([]);
  });
});

describe("isCategory and categoryLabel", () => {
  it("recognises keys and names them", () => {
    expect(isCategory("ai")).toBe(true);
    expect(isCategory("AI")).toBe(false);
    expect(categoryLabel("health")).toBe("HealthTech");
  });
});
