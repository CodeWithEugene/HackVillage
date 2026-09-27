import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/guards", () => ({
  currentUser: async () => null,
  requireUser: async () => {
    throw new Error("should not be reached in these tests");
  },
}));

import { POST as mediaUploadPOST } from "@/app/api/dev/media/upload/[key]/route";
import { POST as coverUploadPOST } from "@/app/api/dev/covers/upload/route";

function uploadRequest(contentType: string, body: string, url = "http://localhost/api/dev/media/upload/x") {
  return new Request(url, { method: "POST", headers: { "content-type": contentType }, body });
}

function paramsFor(key: string) {
  return { params: Promise.resolve({ key }) };
}

describe("dev media upload route hardening", () => {
  beforeEach(() => {
    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.R2_BUCKET;
  });

  it("rejects path-traversal keys with a 400 before touching auth or disk", async () => {
    for (const key of [
      "../escape.jpg",
      "events/../escape.jpg",
      "events/ev1/../../../etc/passwd",
      "events/ev1/../../secret.webp",
      "events//photo.jpg",
      "covers/ev1/x.jpg",
      "absolute/path",
    ]) {
      const response = await mediaUploadPOST(uploadRequest("image/jpeg", "bytes"), paramsFor(key));
      expect(response.status, `key: ${key}`).toBe(400);
    }
  });

  it("rejects disallowed content types before auth", async () => {
    const response = await mediaUploadPOST(
      uploadRequest("application/x-msdownload", "MZ"),
      paramsFor("events/clzevent0000000000000001/abc123-photo.jpg")
    );
    expect(response.status).toBe(400);
  });

  it("requires a signed-in caller for a well-formed upload", async () => {
    const response = await mediaUploadPOST(
      uploadRequest("image/jpeg", "bytes"),
      paramsFor("events/clzevent0000000000000001/abc123-photo.jpg")
    );
    expect(response.status).toBe(401);
  });
});

describe("dev cover upload route hardening (parity)", () => {
  it("rejects malformed keys (which include traversal) with a 400", async () => {
    for (const key of ["../../etc/passwd", "covers/../x.webp", "media/ev1/x.webp", ""]) {
      const response = await coverUploadPOST(
        uploadRequest("image/webp", "bytes", `http://localhost/api/dev/covers/upload?key=${encodeURIComponent(key)}`)
      );
      expect(response.status, `key: ${key}`).toBe(400);
    }
  });

  it("requires a signed-in caller for a well-formed key", async () => {
    const response = await coverUploadPOST(
      uploadRequest(
        "image/webp",
        "bytes",
        `http://localhost/api/dev/covers/upload?key=${encodeURIComponent("covers/clzevent0000000000000001/0123456789abcdef.webp")}`
      )
    );
    expect(response.status).toBe(401);
  });
});
