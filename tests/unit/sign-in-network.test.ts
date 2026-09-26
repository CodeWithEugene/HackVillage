import { describe, expect, it } from "vitest";

import { describeSignIn } from "@/lib/auth/sign-in-context";
import { isCloudflareIp } from "@/lib/net/cloudflare";

const NOW = new Date("2026-09-25T18:57:00Z");

function ctx(headers: Record<string, string>) {
  return describeSignIn({ headers: new Headers(headers), provider: "credentials", now: NOW });
}

// What production actually received: Cloudflare's Maputo edge connecting to
// Vercel, so Vercel geolocated the edge rather than the visitor in Nairobi.
const CLOUDFLARE_EDGE = {
  "x-forwarded-for": "172.68.10.20",
  "x-vercel-ip-city": "Maputo",
  "x-vercel-ip-country": "MZ",
  "x-vercel-ip-timezone": "Africa/Maputo",
};

describe("isCloudflareIp", () => {
  it("recognizes Cloudflare edges, IPv4 and IPv6", () => {
    expect(isCloudflareIp("172.68.10.20")).toBe(true);
    expect(isCloudflareIp("172.69.1.1")).toBe(true);
    expect(isCloudflareIp("104.16.0.1")).toBe(true);
    expect(isCloudflareIp("2606:4700::1111")).toBe(true);
  });

  it("rejects everything else", () => {
    expect(isCloudflareIp("41.90.64.10")).toBe(false);
    expect(isCloudflareIp("76.76.21.9")).toBe(false);
    expect(isCloudflareIp("2001:db8::1")).toBe(false);
    expect(isCloudflareIp("not an ip")).toBe(false);
  });
});

describe("describeSignIn behind Cloudflare", () => {
  it("reports the visitor's IP and location, not the Cloudflare edge's", () => {
    const result = ctx({
      ...CLOUDFLARE_EDGE,
      "cf-connecting-ip": "41.90.64.10",
      "cf-ipcountry": "KE",
      "cf-ipcity": "Nairobi",
      "cf-timezone": "Africa/Nairobi",
    });
    expect(result.ip).toBe("41.90.64.10");
    expect(result.location).toBe("Nairobi, Kenya");
    expect(result.time).toBe("Friday, 25 September 2026 at 21:57 EAT");
  });

  it("falls back to the country when Cloudflare sends no city", () => {
    const result = ctx({
      ...CLOUDFLARE_EDGE,
      "cf-connecting-ip": "41.90.64.10",
      "cf-ipcountry": "KE",
    });
    expect(result.location).toBe("Kenya");
    expect(result.location).not.toContain("Maputo");
  });

  it("handles IPv6 visitors and Tor exits", () => {
    const result = ctx({
      ...CLOUDFLARE_EDGE,
      "cf-connecting-ip": "2c0f:fe38:2000::1",
      "cf-ipcountry": "T1",
    });
    expect(result.ip).toBe("2c0f:fe38:2000::1");
    expect(result.location).toBe("Tor network");
  });

  it("ignores cf-* headers sent straight to Vercel, since anyone can forge them", () => {
    const result = ctx({
      "x-forwarded-for": "198.51.100.7",
      "x-vercel-ip-city": "Lagos",
      "x-vercel-ip-country": "NG",
      "cf-connecting-ip": "203.0.113.99",
      "cf-ipcity": "Nairobi",
      "cf-ipcountry": "KE",
    });
    expect(result.ip).toBe("198.51.100.7");
    expect(result.location).toBe("Lagos, Nigeria");
  });

  it("ignores a malformed cf-connecting-ip", () => {
    const result = ctx({ ...CLOUDFLARE_EDGE, "cf-connecting-ip": "<script>" });
    expect(result.ip).toBe("172.68.10.20");
  });

  it("treats Cloudflare's unknown country code as unknown", () => {
    const result = ctx({
      ...CLOUDFLARE_EDGE,
      "cf-connecting-ip": "41.90.64.10",
      "cf-ipcountry": "XX",
    });
    expect(result.location).toBe("Unknown location");
  });
});
