import { describe, expect, it, vi } from "vitest";

import { sendWithinLimit } from "@/lib/auth/sign-in-alert";

const message = { to: "a@hackvillage.test", subject: "Hi", html: "<p>Hi</p>", text: "Hi" };

describe("sendWithinLimit", () => {
  it("reports a delivered email as sent", async () => {
    const send = vi.fn().mockResolvedValue({ delivered: true });
    await expect(sendWithinLimit("test", message, send, 50)).resolves.toBe("sent");
    expect(send).toHaveBeenCalledWith(message);
  });

  it("reports dev and test runs, where the port only prints, as not sent", async () => {
    const send = vi.fn().mockResolvedValue({ delivered: false });
    await expect(sendWithinLimit("test", message, send, 50)).resolves.toBe("not-sent");
  });

  it("gives up on a slow provider instead of holding the sign in", async () => {
    const send = vi.fn(() => new Promise<{ delivered: boolean }>(() => {}));
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const started = Date.now();
    await expect(sendWithinLimit("test", message, send, 30)).resolves.toBe("timeout");
    expect(Date.now() - started).toBeLessThan(1000);
    errors.mockRestore();
  });

  it("never throws when the provider errors", async () => {
    const send = vi.fn().mockRejectedValue(new Error("network down"));
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(sendWithinLimit("test", message, send, 50)).resolves.toBe("failed");
    errors.mockRestore();
  });
});
