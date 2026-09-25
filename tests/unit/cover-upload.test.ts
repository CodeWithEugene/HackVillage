import { describe, expect, it } from "vitest";

import {
  COVER_HEIGHT,
  COVER_MIN_HEIGHT,
  COVER_MIN_WIDTH,
  COVER_WIDTH,
  coverCropRect,
  coverKey,
  isCoverKeyFor,
  validateCoverSource,
  validateCoverUpload,
} from "@/lib/events/cover-upload";

describe("cover size spec", () => {
  it("is 1600 by 900, a 16:9 frame", () => {
    expect([COVER_WIDTH, COVER_HEIGHT]).toEqual([1600, 900]);
    expect(COVER_WIDTH / COVER_HEIGHT).toBeCloseTo(16 / 9);
    expect([COVER_MIN_WIDTH, COVER_MIN_HEIGHT]).toEqual([1200, 675]);
  });
});

describe("validateCoverSource", () => {
  it("accepts photos at least 1200 by 675 once cropped to 16:9", () => {
    expect(validateCoverSource(1600, 900)).toBeNull();
    expect(validateCoverSource(4000, 3000)).toBeNull(); // crops to 4000x2250
  });

  it("rejects photos too small for a sharp cover", () => {
    expect(validateCoverSource(1000, 600)).toMatch(/at least 1200 × 675/);
    // Tall portrait: 1200 wide but the 16:9 crop is only 1200x675, which is fine...
    expect(validateCoverSource(1200, 2000)).toBeNull();
    // ...while an 1100 wide portrait can't fill the frame.
    expect(validateCoverSource(1100, 2000)).toMatch(/at least 1200 × 675/);
  });
});

describe("coverCropRect", () => {
  it("keeps a 16:9 image whole", () => {
    expect(coverCropRect(1600, 900)).toEqual({ sx: 0, sy: 0, sw: 1600, sh: 900 });
  });

  it("trims the top and bottom of a tall image around its center", () => {
    expect(coverCropRect(1600, 1600)).toEqual({ sx: 0, sy: 350, sw: 1600, sh: 900 });
  });

  it("trims the sides of a wide image around its center", () => {
    expect(coverCropRect(3200, 900)).toEqual({ sx: 800, sy: 0, sw: 1600, sh: 900 });
  });
});

describe("validateCoverUpload", () => {
  it("accepts the processed WebP", () => {
    expect(validateCoverUpload("image/webp", 300_000)).toBeNull();
  });

  it("rejects other types and oversized files", () => {
    expect(validateCoverUpload("image/gif", 1000)).toMatch(/JPEG, PNG, or WebP/);
    expect(validateCoverUpload("image/webp", 11 * 1024 * 1024)).toMatch(/under 10MB/);
  });
});

describe("cover keys", () => {
  it("scopes each cover to its hackathon, named for its format", () => {
    const key = coverKey("evt_123", "image/webp");
    expect(key).toMatch(/^covers\/evt_123\/[a-f0-9]{16}\.webp$/);
    expect(isCoverKeyFor("evt_123", key)).toBe(true);
    expect(coverKey("evt_123", "image/jpeg")).toMatch(/\.jpg$/);
    expect(isCoverKeyFor("evt_123", coverKey("evt_123", "image/png"))).toBe(true);
  });

  it("refuses keys for another hackathon or with path tricks", () => {
    expect(isCoverKeyFor("evt_123", coverKey("evt_999", "image/webp"))).toBe(false);
    expect(isCoverKeyFor("evt_123", "covers/evt_123/../evt_999/x.webp")).toBe(false);
    expect(isCoverKeyFor("evt_123", "covers/evt_123/not-hex.webp")).toBe(false);
  });
});
