import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { coverFor } from "@/lib/events/covers";
import { RENAMED_IMAGES } from "@/lib/seo/renamed-images";

const PUBLIC = path.join(process.cwd(), "public");

describe("renamed marketing images", () => {
  it("points every old path at a file that exists, and leaves no old file behind", () => {
    for (const [oldPath, newPath] of Object.entries(RENAMED_IMAGES)) {
      expect(existsSync(path.join(PUBLIC, newPath)), newPath).toBe(true);
      expect(existsSync(path.join(PUBLIC, oldPath)), oldPath).toBe(false);
    }
  });

  it("uses descriptive, lowercase, hyphenated file names", () => {
    for (const newPath of Object.values(RENAMED_IMAGES)) {
      const name = path.basename(newPath, ".webp");
      expect(name).toMatch(/^[a-z0-9]+(-[a-z0-9]+){2,}$/);
    }
  });

  it("only references marketing images that exist", () => {
    const paths = execSync(
      String.raw`git grep -hoE '"/marketing/[a-z0-9/_-]+\.webp"' -- app components lib db/seeds`,
      { encoding: "utf8" },
    )
      .split("\n")
      .filter(Boolean)
      .map((quoted) => quoted.slice(1, -1));
    expect(paths.length).toBeGreaterThan(20);
    const missing = [...new Set(paths)].filter(
      (image) => !(image in RENAMED_IMAGES) && !existsSync(path.join(PUBLIC, image)),
    );
    expect(missing).toEqual([]);
  });
});

describe("coverFor with stock photos", () => {
  it("swaps both the original and the renamed stock photos for the category cover", () => {
    const category = coverFor({ coverUrl: null, categories: ["ai"] });
    const stock = Object.entries(RENAMED_IMAGES).find(([oldPath]) =>
      oldPath.startsWith("/marketing/hero/kenya/"),
    );
    expect(stock).toBeDefined();
    const [oldPath, newPath] = stock!;
    expect(coverFor({ coverUrl: oldPath, categories: ["ai"] })).toBe(category);
    expect(coverFor({ coverUrl: newPath, categories: ["ai"] })).toBe(category);
  });
});
